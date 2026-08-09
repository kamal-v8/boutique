'use strict';

const grpc = require('@grpc/grpc-js');
const { pool, insertOrder, loadOrder } = require('./db');

const handlers = {
  async CreateOrder(call, callback) {
    try {
      const { order } = call.request;
      const id = await insertOrder(order);
      callback(null, await loadOrder(id));
    } catch (e) {
      console.error('[orderservice] create order error:', e);
      callback({ code: grpc.status.INTERNAL, message: 'failed to create order' });
    }
  },

  async GetOrder(call, callback) {
    try {
      const o = await loadOrder(call.request.id);
      if (!o) return callback({ code: grpc.status.NOT_FOUND, message: 'order not found' });
      callback(null, o);
    } catch (e) {
      console.error(e);
      callback({ code: grpc.status.INTERNAL, message: 'failed to get order' });
    }
  },

  async ListOrders(call, callback) {
    try {
      const { user_id: userId, page, page_size: pageSize } = call.request;
      const p = Math.max(1, page || 1);
      const ps = Math.min(100, Math.max(1, pageSize || 10));
      const totalRes = await pool.query('SELECT COUNT(*) AS c FROM orders WHERE user_id = $1', [userId]);
      const total = Number(totalRes.rows[0].c);
      const res = await pool.query(
        'SELECT id FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, ps, (p - 1) * ps]
      );
      const orders = [];
      for (const r of res.rows) orders.push(await loadOrder(r.id));
      callback(null, { orders, total });
    } catch (e) {
      console.error(e);
      callback({ code: grpc.status.INTERNAL, message: 'failed to list orders' });
    }
  },

  async UpdateOrderStatus(call, callback) {
    try {
      const { id, status, tracking_id } = call.request;
      const res = await pool.query(
        'UPDATE orders SET status = $2, tracking_id = COALESCE($3, tracking_id) WHERE id = $1 RETURNING id',
        [id, status, tracking_id || null]
      );
      if (!res.rows.length) return callback({ code: grpc.status.NOT_FOUND, message: 'order not found' });
      callback(null, await loadOrder(id));
    } catch (e) {
      console.error(e);
      callback({ code: grpc.status.INTERNAL, message: 'failed to update order' });
    }
  },

  async GetAllOrders(call, callback) {
    try {
      const { page, page_size: pageSize } = call.request;
      const p = Math.max(1, page || 1);
      const ps = Math.min(100, Math.max(1, pageSize || 10));
      const totalRes = await pool.query('SELECT COUNT(*) AS c FROM orders');
      const total = Number(totalRes.rows[0].c);
      const res = await pool.query('SELECT id FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2', [ps, (p - 1) * ps]);
      const orders = [];
      for (const r of res.rows) orders.push(await loadOrder(r.id));
      callback(null, { orders, total });
    } catch (e) {
      console.error(e);
      callback({ code: grpc.status.INTERNAL, message: 'failed to list orders' });
    }
  },
};

module.exports = { handlers };
