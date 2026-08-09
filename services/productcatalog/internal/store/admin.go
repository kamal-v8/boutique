package store

import (
	"database/sql"
	"log"
	"strings"

	productpb "ecommerce/product"
	commonpb "ecommerce/common"
)

func (s *Store) setCategories(tx *sql.Tx, productID string, cats []string) error {
	if _, err := tx.Exec("DELETE FROM product_categories WHERE product_id = $1", productID); err != nil {
		return err
	}
	seen := map[string]bool{}
	for _, c := range cats {
		c = strings.TrimSpace(c)
		if c == "" || seen[c] {
			continue
		}
		seen[c] = true
		if _, err := tx.Exec("INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING", c); err != nil {
			return err
		}
		if _, err := tx.Exec("INSERT INTO product_categories (product_id, category) VALUES ($1, $2)", productID, c); err != nil {
			return err
		}
	}
	return nil
}

// CreateProduct inserts a new product.
func (s *Store) CreateProduct(p *productpb.Product) (*productpb.Product, error) {
	if p.Price == nil {
		p.Price = &commonpb.Money{CurrencyCode: "USD"}
	}
	if p.Price.CurrencyCode == "" {
		p.Price.CurrencyCode = "USD"
	}
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	p.Id = newID()
	if _, err := tx.Exec(`INSERT INTO products
		(id, name, description, price_units, price_nanos, currency_code, picture, stock, sku, active, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		p.Id, p.Name, p.Description, p.Price.Units, p.Price.Nanos, p.Price.CurrencyCode,
		p.Picture, p.Stock, p.Sku, p.Active, nowUnix()); err != nil {
		return nil, err
	}
	if err := s.setCategories(tx, p.Id, p.Categories); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetProduct(p.Id)
}

// UpdateProduct updates an existing product.
func (s *Store) UpdateProduct(p *productpb.Product) (*productpb.Product, error) {
	if p.Price == nil {
		p.Price = &commonpb.Money{CurrencyCode: "USD"}
	}
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	_, err = tx.Exec(`UPDATE products SET
		name=$2, description=$3, price_units=$4, price_nanos=$5, currency_code=$6,
		picture=$7, stock=$8, sku=$9, active=$10 WHERE id=$1`,
		p.Id, p.Name, p.Description, p.Price.Units, p.Price.Nanos, p.Price.CurrencyCode,
		p.Picture, p.Stock, p.Sku, p.Active)
	if err != nil {
		return nil, err
	}
	if err := s.setCategories(tx, p.Id, p.Categories); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetProduct(p.Id)
}

// DeleteProduct removes a product by ID.
func (s *Store) DeleteProduct(id string) error {
	_, err := s.db.Exec("DELETE FROM products WHERE id = $1", id)
	return err
}

// CheckStock returns availability and remaining count for a quantity request.
func (s *Store) CheckStock(id string, qty int32) (bool, int32, error) {
	var stock int32
	err := s.db.QueryRow("SELECT stock FROM products WHERE id = $1 AND active = TRUE", id).Scan(&stock)
	if err != nil {
		return false, 0, err
	}
	return qty <= stock, stock, nil
}

// UpdateStock adjusts stock by delta (negative decrements) and returns new count.
func (s *Store) UpdateStock(id string, delta int64) (int32, error) {
	var newStock int32
	err := s.db.QueryRow(
		"UPDATE products SET stock = GREATEST(0, stock + $2) WHERE id = $1 RETURNING stock",
		id, delta).Scan(&newStock)
	return newStock, err
}

// Seed inserts a catalog of products + categories if empty.
func (s *Store) Seed() error {
	var count int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM products").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	log.Println("[productcatalog] seeding catalog")
	products := seedProducts()
	for _, p := range products {
		tx, err := s.db.Begin()
		if err != nil {
			return err
		}
		_, err = tx.Exec(`INSERT INTO products
			(id, name, description, price_units, price_nanos, currency_code, picture, stock, sku, active, created_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10)`,
			p.Id, p.Name, p.Description, p.Price.Units, p.Price.Nanos, p.Price.CurrencyCode,
			p.Picture, p.Stock, p.Sku, nowUnix())
		if err != nil {
			tx.Rollback()
			return err
		}
		if err := s.setCategories(tx, p.Id, p.Categories); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}
