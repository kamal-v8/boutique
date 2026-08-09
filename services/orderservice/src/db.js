'use strict';

const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/orders_db',
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT,
      subtotal_units BIGINT NOT NULL,
      subtotal_nanos INT NOT NULL,
      discount_units BIGINT NOT NULL DEFAULT 0,
      discount_nanos INT NOT NULL DEFAULT 0,
      shipping_units BIGINT NOT NULL DEFAULT 0,
      shipping_nanos INT NOT NULL DEFAULT 0,
      total_units BIGINT NOT NULL,
      total_nanos INT NOT NULL,
      coupon_code TEXT,
      status TEXT NOT NULL,
      tracking_id TEXT,
      street TEXT, city TEXT, state TEXT, country TEXT, zip TEXT,
      created_at BIGINT NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INT NOT NULL,
      unit_units BIGINT NOT NULL,
      unit_nanos INT NOT NULL,
      PRIMARY KEY (order_id, product_id)
    );
  `);
}

function uuid() {
  return crypto.randomUUID();
}

function money(u, n) {
  return { units: Number(u || 0), nanos: Number(n || 0), currency_code: 'USD' };
}

async function insertOrder(order) {
  const id = order.id || uuid();
  const a = order.shipping_address || {};
  await pool.query(
    `INSERT INTO orders
      (id, user_id, user_email, subtotal_units, subtotal_nanos, discount_units, discount_nanos,
       shipping_units, shipping_nanos, total_units, total_nanos, coupon_code, status,
       tracking_id, street, city, state, country, zip, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      id, order.user_id, order.user_email || '',
      (order.subtotal || {}).units || 0, (order.subtotal || {}).nanos || 0,
      (order.discount || {}).units || 0, (order.discount || {}).nanos || 0,
      (order.shipping || {}).units || 0, (order.shipping || {}).nanos || 0,
      (order.total || {}).units || 0, (order.total || {}).nanos || 0,
      order.coupon_code || '', order.status || 'CREATED', order.tracking_id || '',
      a.street_address || '', a.city || '', a.state || '', a.country || '', a.zip_code || '',
      order.created_at || Math.floor(Date.now() / 1000),
    ]
  );
  for (const item of order.items || []) {
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_units, unit_nanos)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, item.product_id, item.product_name, item.quantity, (item.unit_price || {}).units || 0, (item.unit_price || {}).nanos || 0]
    );
  }
  return id;
}

async function loadOrder(id) {
  const res = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  if (!res.rows.length) return null;
  const o = res.rows[0];
  const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
  return {
    id: o.id,
    user_id: o.user_id,
    user_email: o.user_email,
    items: items.rows.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: money(i.unit_units, i.unit_nanos),
    })),
    subtotal: money(o.subtotal_units, o.subtotal_nanos),
    discount: money(o.discount_units, o.discount_nanos),
    shipping: money(o.shipping_units, o.shipping_nanos),
    total: money(o.total_units, o.total_nanos),
    coupon_code: o.coupon_code || '',
    shipping_address: {
      street_address: o.street || '',
      city: o.city || '',
      state: o.state || '',
      country: o.country || '',
      zip_code: o.zip || '',
    },
    status: o.status,
    tracking_id: o.tracking_id || '',
    created_at: Number(o.created_at),
  };
}

module.exports = { pool, migrate, insertOrder, loadOrder, money, uuid };
