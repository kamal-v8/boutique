package store

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// Store wraps the PostgreSQL connection for coupons.
type Store struct {
	db *sql.DB
}

// New connects and migrates.
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
	_, err := s.db.Exec(`CREATE TABLE IF NOT EXISTS coupons (
		code              TEXT PRIMARY KEY,
		description       TEXT NOT NULL DEFAULT '',
		type              TEXT NOT NULL,
		value             BIGINT NOT NULL,
		min_subtotal_units BIGINT NOT NULL DEFAULT 0,
		currency_code     TEXT NOT NULL DEFAULT 'USD',
		expires_at        BIGINT NOT NULL DEFAULT 0,
		max_uses          INT  NOT NULL DEFAULT 0,
		used_count        INT  NOT NULL DEFAULT 0,
		active            BOOLEAN NOT NULL DEFAULT TRUE,
		created_at        BIGINT NOT NULL
	)`)
	return err
}

func (s *Store) DB() *sql.DB { return s.db }
func (s *Store) Close() error { return s.db.Close() }
func nowUnix() int64          { return time.Now().Unix() }
