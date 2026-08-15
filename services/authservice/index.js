'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const argon2 = require('argon2');
const crypto = require('crypto');

const { pool, migrate } = require('./src/db');
const handlers = require('./src/server');

const PORT = process.env.PORT || '50051';
const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', 'proto');

function loadProtoDef(packages) {
  const definition = protoLoader.loadSync(packages.map((p) => path.join(PROTO_DIR, p + '.proto')), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });
  return grpc.loadPackageDefinition(definition);
}

async function seedUsers() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@boutique.dev').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const demoEmail = (process.env.DEMO_EMAIL || 'demo@boutique.dev').toLowerCase();
  const demoPassword = process.env.DEMO_PASSWORD || 'Demo123!';

  async function seed(email, password, name, role) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return;
    const hash = await argon2.hash(password);
    await pool.query(
      'INSERT INTO users (id, email, name, password, role, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [crypto.randomUUID(), email, name, hash, role, Math.floor(Date.now() / 1000)]
    );
    console.log(`[authservice] seeded ${role}: ${email}`);
  }
  await seed(adminEmail, adminPassword, 'Boutique Admin', 'admin');
  await seed(demoEmail, demoPassword, 'Demo Customer', 'customer');
}

async function main() {
  await migrate();
  await seedUsers();

  const def = loadProtoDef(['user', 'common']);
  const userPkg = def.ecommerce.user;

  const server = new grpc.Server();
  server.addService(userPkg.UserService.service, handlers);
  // Standard grpc.health.v1 health service (for grpc_health_probe).
  const healthProto = protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), {
    keepCase: true,
    longs: String,
    defaults: true,
  });
  const healthPkg = grpc.loadPackageDefinition(healthProto).grpc.health.v1;
  server.addService(healthPkg.Health.service, {
    Check: async (call, callback) => {
      let status = 'SERVING';
      try {
        await pool.query('SELECT 1');
      } catch {
        status = 'NOT_SERVING';
      }
      callback(null, { status });
    },
  });

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[authservice] failed to bind', err);
      process.exit(1);
    }
    server.start();
    console.log(`[authservice] listening on 0.0.0.0:${port}`);
  });

  const shutdown = () => {
    console.log('[authservice] shutting down');
    server.tryShutdown(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  console.error('[authservice] fatal:', e);
  process.exit(1);
});
