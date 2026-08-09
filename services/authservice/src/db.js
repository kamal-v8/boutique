'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/users_db',
});

// Create tables if they do not exist.
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      name       TEXT NOT NULL,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'customer',
      created_at BIGINT NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token_hash    TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      expires_at    BIGINT NOT NULL,
      revoked       BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
}

module.exports = { pool, migrate };
