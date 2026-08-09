package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	productpb "ecommerce/product"
	commonpb "ecommerce/common"
)

// ProductRow is a database row for a product.
type ProductRow struct {
	ID           string
	Name         string
	Description  string
	PriceUnits   int64
	PriceNanos   int32
	CurrencyCode string
	Picture      string
	Stock        int32
	SKU          sql.NullString
	Active       bool
	CreatedAt    int64
}

const productCols = `p.id, p.name, p.description, p.price_units, p.price_nanos,
	p.currency_code, p.picture, p.stock, p.sku, p.active, p.created_at`

func toProto(row ProductRow, categories []string) *productpb.Product {
	return &productpb.Product{
		Id:          row.ID,
		Name:        row.Name,
		Description: row.Description,
		Price: &commonpb.Money{
			CurrencyCode: row.CurrencyCode,
			Units:        row.PriceUnits,
			Nanos:        row.PriceNanos,
		},
		Categories: categories,
		Picture:    row.Picture,
		Stock:      row.Stock,
		Sku:        row.SKU.String,
		Active:     row.Active,
	}
}

func scanProduct(row *sql.Row) (ProductRow, error) {
	var p ProductRow
	err := row.Scan(&p.ID, &p.Name, &p.Description, &p.PriceUnits, &p.PriceNanos,
		&p.CurrencyCode, &p.Picture, &p.Stock, &p.SKU, &p.Active, &p.CreatedAt)
	return p, err
}

func scanProducts(rows *sql.Rows) ([]ProductRow, error) {
	var out []ProductRow
	for rows.Next() {
		var p ProductRow
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.PriceUnits, &p.PriceNanos,
			&p.CurrencyCode, &p.Picture, &p.Stock, &p.SKU, &p.Active, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) categoriesFor(ids []string) (map[string][]string, error) {
	out := map[string][]string{}
	if len(ids) == 0 {
		return out, nil
	}
	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	q := fmt.Sprintf(
		`SELECT pc.product_id, pc.category FROM product_categories pc WHERE pc.product_id IN (%s) ORDER BY pc.category`,
		strings.Join(placeholders, ","),
	)
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var pid, cat string
		if err := rows.Scan(&pid, &cat); err != nil {
			return nil, err
		}
		out[pid] = append(out[pid], cat)
	}
	return out, rows.Err()
}

// ListProducts returns a page of products plus the total count.
func (s *Store) ListProducts(category, query string, page, pageSize int, sort string) ([]*productpb.Product, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 12
	}

	var where []string
	var args []interface{}
	if category != "" {
		where = append(where, "EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category = $"+fmt.Sprint(len(args)+1)+")")
		args = append(args, category)
	}
	if query != "" {
		where = append(where, "(p.name ILIKE $"+fmt.Sprint(len(args)+1)+" OR p.description ILIKE $"+fmt.Sprint(len(args)+2)+")")
		args = append(args, "%"+query+"%", "%"+query+"%")
	}
	whereClause := ""
	if len(where) > 0 {
		whereClause = "WHERE " + strings.Join(where, " AND ")
	}

	var total int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM products p "+whereClause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	order := "p.name ASC"
	switch sort {
	case "price_asc":
		order = "p.price_units ASC, p.price_nanos ASC"
	case "price_desc":
		order = "p.price_units DESC, p.price_nanos DESC"
	case "newest":
		order = "p.created_at DESC"
	}
	q := fmt.Sprintf(`SELECT %s FROM products p %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		productCols, whereClause, order, len(args)+1, len(args)+2)
	args = append(args, pageSize, (page-1)*pageSize)

	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	rowsData, err := scanProducts(rows)
	if err != nil {
		return nil, 0, err
	}
	ids := make([]string, len(rowsData))
	for i, r := range rowsData {
		ids[i] = r.ID
	}
	catMap, err := s.categoriesFor(ids)
	if err != nil {
		return nil, 0, err
	}
	products := make([]*productpb.Product, 0, len(rowsData))
	for _, r := range rowsData {
		products = append(products, toProto(r, catMap[r.ID]))
	}
	return products, total, nil
}

// GetProduct returns a single product by ID.
func (s *Store) GetProduct(id string) (*productpb.Product, error) {
	q := fmt.Sprintf("SELECT %s FROM products p WHERE p.id = $1", productCols)
	row := s.db.QueryRow(q, id)
	p, err := scanProduct(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	catMap, err := s.categoriesFor([]string{p.ID})
	if err != nil {
		return nil, err
	}
	return toProto(p, catMap[p.ID]), nil
}

// ListCategories returns category names with product counts.
func (s *Store) ListCategories() ([]*productpb.Category, error) {
	rows, err := s.db.Query(`
		SELECT c.name, COUNT(pc.product_id) FROM categories c
		LEFT JOIN product_categories pc ON pc.category = c.name
		GROUP BY c.name ORDER BY c.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*productpb.Category
	for rows.Next() {
		var name string
		var cnt int
		if err := rows.Scan(&name, &cnt); err != nil {
			return nil, err
		}
		out = append(out, &productpb.Category{Name: name, ProductCount: int32(cnt)})
	}
	return out, rows.Err()
}
