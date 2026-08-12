package store

import (
	"database/sql"
	"errors"
	"log"
	"strings"

	promopb "ecommerce/promotion"
)

func discountTypeFromString(s string) promopb.DiscountType {
	if s == "FIXED_AMOUNT" {
		return promopb.DiscountType_FIXED_AMOUNT
	}
	return promopb.DiscountType_PERCENT
}

func discountTypeString(t promopb.DiscountType) string {
	if t == promopb.DiscountType_FIXED_AMOUNT {
		return "FIXED_AMOUNT"
	}
	return "PERCENT"
}

func scanCoupon(scanner interface{ Scan(...interface{}) error }) (*promopb.Coupon, error) {
	var code, description, typeStr, currency string
	var value, minSub, expiresAt, createdAt int64
	var maxUses int
	var active bool
	if err := scanner.Scan(&code, &description, &typeStr, &value, &minSub,
		&currency, &expiresAt, &maxUses, &active, &createdAt); err != nil {
		return nil, err
	}
	return &promopb.Coupon{
		Code:             code,
		Description:      description,
		Type:             discountTypeFromString(typeStr),
		Value:            value,
		MinSubtotalUnits: minSub,
		CurrencyCode:     currency,
		ExpiresAt:        expiresAt,
		MaxUses:          int32(maxUses),
		Active:           active,
		CreatedAt:        createdAt,
	}, nil
}

// GetCoupon fetches a coupon by code.
func (s *Store) GetCoupon(code string) (*promopb.Coupon, error) {
	row := s.db.QueryRow(`SELECT code, description, type, value, min_subtotal_units,
		currency_code, expires_at, max_uses, active, created_at FROM coupons WHERE code = $1`, code)
	c, err := scanCoupon(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Store) usedCount(code string) (int, error) {
	var n int
	err := s.db.QueryRow("SELECT used_count FROM coupons WHERE code = $1", code).Scan(&n)
	return n, err
}

// Validate checks a coupon against a subtotal and returns a validation verdict.
func (s *Store) Validate(code string, subtotalUnits int64) (bool, string, int64, error) {
	c, err := s.GetCoupon(code)
	if errors.Is(err, sql.ErrNoRows) {
		return false, "Coupon not found", 0, nil
	}
	if err != nil {
		return false, "", 0, err
	}
	if !c.Active {
		return false, "Coupon is inactive", 0, nil
	}
	if c.ExpiresAt > 0 && c.ExpiresAt < nowUnix() {
		return false, "Coupon has expired", 0, nil
	}
	if c.MaxUses > 0 {
		used, uerr := s.usedCount(code)
		if uerr != nil {
			return false, "", 0, uerr
		}
		if used >= int(c.MaxUses) {
			return false, "Coupon usage limit reached", 0, nil
		}
	}
	if subtotalUnits < c.MinSubtotalUnits {
		return false, "Order subtotal is below the minimum for this coupon", 0, nil
	}
	var discount int64
	if c.Type == promopb.DiscountType_PERCENT {
		discount = subtotalUnits * c.Value / 100
	} else {
		discount = c.Value
	}
	if discount > subtotalUnits {
		discount = subtotalUnits
	}
	return true, "", discount, nil
}

// IncrementUsed bumps the used counter when a coupon is applied.
func (s *Store) IncrementUsed(code string) error {
	_, err := s.db.Exec("UPDATE coupons SET used_count = used_count + 1 WHERE code = $1", code)
	return err
}

// List returns paged coupons.
func (s *Store) List(page, pageSize int) ([]*promopb.Coupon, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	var total int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM coupons").Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.Query(`SELECT code, description, type, value, min_subtotal_units,
		currency_code, expires_at, max_uses, active, created_at FROM coupons
		ORDER BY created_at DESC LIMIT $1 OFFSET $2`, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []*promopb.Coupon
	for rows.Next() {
		c, err := scanCoupon(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, c)
	}
	return out, total, rows.Err()
}

// Upsert inserts or updates a coupon.
func (s *Store) Upsert(c *promopb.Coupon) (*promopb.Coupon, error) {
	if c.CurrencyCode == "" {
		c.CurrencyCode = "USD"
	}
	_, err := s.db.Exec(`INSERT INTO coupons
		(code, description, type, value, min_subtotal_units, currency_code, expires_at, max_uses, active, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT (code) DO UPDATE SET description=$2, type=$3, value=$4,
		min_subtotal_units=$5, currency_code=$6, expires_at=$7, max_uses=$8, active=$9`,
		strings.ToUpper(c.Code), c.Description, discountTypeString(c.Type), c.Value,
		c.MinSubtotalUnits, c.CurrencyCode, c.ExpiresAt, c.MaxUses, c.Active, nowUnix())
	if err != nil {
		return nil, err
	}
	if c.CreatedAt == 0 {
		c.CreatedAt = nowUnix()
	}
	return c, nil
}

// Delete removes a coupon.
func (s *Store) Delete(code string) error {
	_, err := s.db.Exec("DELETE FROM coupons WHERE code = $1", code)
	return err
}

// Seed adds starter coupons if none exist.
func (s *Store) Seed() error {
	var count int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM coupons").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	log.Println("[promotionservice] seeding coupons")
	seed := []*promopb.Coupon{
		{Code: "WELCOME10", Description: "10% off your first order", Type: promopb.DiscountType_PERCENT, Value: 10, MinSubtotalUnits: 0, Active: true},
		{Code: "SAVE20", Description: "20% off orders over $50", Type: promopb.DiscountType_PERCENT, Value: 20, MinSubtotalUnits: 5000, Active: true},
		{Code: "FIVEBUCK", Description: "$5 off any order", Type: promopb.DiscountType_FIXED_AMOUNT, Value: 500, MinSubtotalUnits: 0, Active: true},
	}
	for _, c := range seed {
		if _, err := s.Upsert(c); err != nil {
			return err
		}
	}
	return nil
}
