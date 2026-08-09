'use strict';

const argon2 = require('argon2');
const crypto = require('crypto');

const { pool } = require('./db');
const { signAccessToken, newRefreshToken, verifyToken, hashToken, REFRESH_TTL_SECONDS } = require('./auth');

const grpc = require('@grpc/grpc-js');

function uuid() {
  return crypto.randomUUID();
}

function toProtoUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    created_at: Number(row.created_at),
  };
}

// Persist a refresh token and return { access_token, refresh_token, user }.
async function issueTokens(call, userRow) {
  const user = toProtoUser(userRow);
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti, expiresAt } = newRefreshToken(user);
  await pool.query(
    'INSERT INTO refresh_tokens (token_hash, user_id, expires_at, revoked) VALUES ($1, $2, $3, FALSE)',
    [jti, userRow.id, expiresAt]
  );
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user,
  };
}

function validateCredentials(email, password, name) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { code: grpc.status.INVALID_ARGUMENT, message: 'A valid email is required.' };
  }
  if (!password || password.length < 8) {
    return { code: grpc.status.INVALID_ARGUMENT, message: 'Password must be at least 8 characters.' };
  }
  if (name !== undefined && name !== null && name.length > 120) {
    return { code: grpc.status.INVALID_ARGUMENT, message: 'Name is too long.' };
  }
  return null;
}

module.exports = {
  async Register(call, callback) {
    const { email, password, name } = call.request;
    const err = validateCredentials(email, password, name);
    if (err) return callback({ code: err.code, message: err.message });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]).catch((e) => {
      throw new Error('DB_ERROR ' + e.message);
    });
    if (existing.rows.length) {
      return callback({ code: grpc.status.ALREADY_EXISTS, message: 'An account with this email already exists.' });
    }

    const hash = await argon2.hash(password);
    const id = uuid();
    const createdAt = Math.floor(Date.now() / 1000);
    const rowRes = await pool.query(
      `INSERT INTO users (id, email, name, password, role, created_at)
       VALUES ($1, $2, $3, $4, 'customer', $5) RETURNING *`,
      [id, email.toLowerCase(), name || email.split('@')[0], hash, createdAt]
    );
    const result = await issueTokens(call, rowRes.rows[0]);
    callback(null, result);
  },

  async Login(call, callback) {
    const { email, password } = call.request;
    const err = validateCredentials(email, password);
    if (err) return callback({ code: err.code, message: err.message });

    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!res.rows.length) {
      return callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid email or password.' });
    }
    const userRow = res.rows[0];
    const ok = await argon2.verify(userRow.password, password);
    if (!ok) {
      return callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid email or password.' });
    }
    const result = await issueTokens(call, userRow);
    callback(null, result);
  },

  async Refresh(call, callback) {
    const { refresh_token: refreshToken } = call.request;
    if (!refreshToken) {
      return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'refresh_token required.' });
    }
    const jti = hashToken(refreshToken);
    const stored = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = FALSE',
      [jti]
    );
    if (!stored.rows.length || Number(stored.rows[0].expires_at) < Math.floor(Date.now() / 1000)) {
      return callback({ code: grpc.status.UNAUTHENTICATED, message: 'Refresh token is no longer valid.' });
    }
    // Rotate: revoke old, persist new.
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [jti]);
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [stored.rows[0].user_id]);
    if (!userRes.rows.length) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'User not found.' });
    }
    const result = await issueTokens(call, userRes.rows[0]);
    callback(null, result);
  },

  async Logout(call, callback) {
    const { refresh_token: refreshToken } = call.request;
    if (refreshToken) {
      await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [
        hashToken(refreshToken),
      ]);
    }
    callback(null, {});
  },

  async GetUser(call, callback) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [call.request.id]);
    if (!res.rows.length) return callback({ code: grpc.status.NOT_FOUND, message: 'User not found.' });
    callback(null, toProtoUser(res.rows[0]));
  },

  async GetUserByEmail(call, callback) {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [call.request.email.toLowerCase()]);
    if (!res.rows.length) return callback({ code: grpc.status.NOT_FOUND, message: 'User not found.' });
    callback(null, toProtoUser(res.rows[0]));
  },

  async ValidateToken(call, callback) {
    const decoded = verifyToken(call.request.access_token, 'access');
    if (!decoded) return callback(null, { valid: false });
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.sub]);
    if (!res.rows.length) return callback(null, { valid: false });
    callback(null, { valid: true, user: toProtoUser(res.rows[0]) });
  },
};
