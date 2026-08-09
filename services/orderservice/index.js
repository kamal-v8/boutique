'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const { migrate, pool } = require('./src/db');
const { handlers } = require('./src/handlers');

const PORT = process.env.PORT || '50055';
const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', 'proto');

async function main() {
  await migrate();

  const def = protoLoader.loadSync([path.join(PROTO_DIR, 'order.proto'), path.join(PROTO_DIR, 'common.proto')], {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });
  const pkg = grpc.loadPackageDefinition(def);

  const server = new grpc.Server();
  server.addService(pkg.ecommerce.order.OrderService.service, handlers);
  server.addService(pkg.ecommerce.common.Health.service, {
    Check: async (call, callback) => {
      try {
        await pool.query('SELECT 1');
        callback(null, { status: 1 });
      } catch {
        callback(null, { status: 2 });
      }
    },
  });

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[orderservice] bind failed', err);
      process.exit(1);
    }
    server.start();
    console.log(`[orderservice] listening on 0.0.0.0:${port}`);
  });

  const shutdown = () => {
    console.log('[orderservice] shutting down');
    server.tryShutdown(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  console.error('[orderservice] fatal:', e);
  process.exit(1);
});
