'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ACCESS_TTL = '15m';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

function newRefreshToken(user) {
  const token = crypto.randomBytes(48).toString('hex');
  return { token, jti: hashToken(token), expiresAt: Math.floor(Date.now() / 1000) + REFRESH_TTL_SECONDS };
}

function verifyToken(token, expectedType) {
  try {
    const decoded = jwt.verify(token, SECRET);
    if (expectedType && decoded.type !== expectedType) return null;
    return decoded;
  } catch {
    return null;
  }
}

module.exports = {
  secret: SECRET,
  signAccessToken,
  newRefreshToken,
  verifyToken,
  hashToken,
  REFRESH_TTL_SECONDS,
};
