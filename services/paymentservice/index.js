'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const crypto = require('crypto');

const PORT = process.env.PORT || '50056';
const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', 'proto');

function main() {
  const def = protoLoader.loadSync(path.join(PROTO_DIR, 'payment.proto'), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });
  const pkg = grpc.loadPackageDefinition(def).ecommerce.payment;

  const handlers = {
    Charge(call, callback) {
      const { order_id: orderId, amount, payment_method: method } = call.request;
      console.log(
        `[paymentservice] charge order=${orderId} method=${method || 'card'} amount=${
          amount ? `${amount.units}.${String(amount.nanos || 0).padStart(9, '0').slice(0, 2)}` : '?'
        } ${amount ? amount.currency_code : ''}`
      );
      // Mock provider: approve every charge.
      callback(null, { transaction_id: 'txn_' + crypto.randomBytes(12).toString('hex'), approved: true, message: 'approved (mock)' });
    },
  };

  const server = new grpc.Server();
  server.addService(pkg.PaymentService.service, handlers);

  // Standard grpc.health.v1 health service (for grpc_health_probe).
  const healthProto = protoLoader.loadSync(path.join(PROTO_DIR, 'health.proto'), {
    keepCase: true,
    longs: String,
    defaults: true,
  });
  const health = grpc.loadPackageDefinition(healthProto).grpc.health.v1;
  server.addService(health.Health.service, {
    Check: (call, callback) => callback(null, { status: 'SERVING' }),
  });

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[paymentservice] bind failed', err);
      process.exit(1);
    }
    server.start();
    console.log(`[paymentservice] listening on 0.0.0.0:${port}`);
  });

  const shutdown = () => {
    console.log('[paymentservice] shutting down');
    server.tryShutdown(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
