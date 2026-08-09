package store

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

// Store wraps the PostgreSQL connection for the product catalog.
type Store struct {
	db *sql.DB
}

// New connects to the database and ensures the schema exists.
func New(databaseURL string) (*Store, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) migrate() error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS products (
			id          TEXT PRIMARY KEY,
			name        TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			price_units BIGINT NOT NULL DEFAULT 0,
			price_nanos INT  NOT NULL DEFAULT 0,
			currency_code TEXT NOT NULL DEFAULT 'USD',
			picture     TEXT NOT NULL DEFAULT '',
			stock       INT  NOT NULL DEFAULT 0,
			sku         TEXT,
			active      BOOLEAN NOT NULL DEFAULT TRUE,
			created_at  BIGINT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS categories (
			name TEXT PRIMARY KEY
		)`,
		`CREATE TABLE IF NOT EXISTS product_categories (
			product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
			category   TEXT NOT NULL REFERENCES categories(name) ON DELETE CASCADE,
			PRIMARY KEY (product_id, category)
		)`,
	}
	for _, q := range stmts {
		if _, err := s.db.Exec(q); err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
	}
	return nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) DB() *sql.DB { return s.db }
