'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PORT = process.env.PORT || '50058';
const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', 'proto');

function orderClient() {
  const addr = process.env.ORDER_SERVICE_ADDR;
  if (!addr) return null;
  try {
    const dd = protoLoader.loadSync([path.join(PROTO_DIR, 'order.proto'), path.join(PROTO_DIR, 'common.proto')], {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      includeDirs: [PROTO_DIR],
    });
    const pkg = grpc.loadPackageDefinition(dd).ecommerce.order;
    return new pkg.OrderService(addr, grpc.credentials.createInsecure());
  } catch {
    return null;
  }
}

function authClient() {
  const addr = process.env.AUTH_SERVICE_ADDR;
  if (!addr) return null;
  try {
    const dd = protoLoader.loadSync([path.join(PROTO_DIR, 'user.proto'), path.join(PROTO_DIR, 'common.proto')], {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      includeDirs: [PROTO_DIR],
    });
    const pkg = grpc.loadPackageDefinition(dd).ecommerce.user;
    return new pkg.UserService(addr, grpc.credentials.createInsecure());
  } catch {
    return null;
  }
}

function moneyStr(m) {
  if (!m) return '...';
  const cents = String((m.nanos || 0) / 1e7);
  return `$${m.units}.${cents.padStart(2, '0')} ${m.currency_code || ''}`.trim();
}

async function trySendMail(to, subject, text) {
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) return false;
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false,
      ignoreTLS: true,
    });
    await transporter.sendMail({ from: 'orders@boutique.dev', to, subject, text });
    return true;
  } catch (e) {
    console.warn('[emailservice] smtp failed:', e.message);
    return false;
  }
}

function main() {
  const def = protoLoader.loadSync(path.join(PROTO_DIR, 'email.proto'), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });
  const pkg = grpc.loadPackageDefinition(def).ecommerce.email;
  const client = orderClient();
  const auth = authClient();

  const handlers = {
    async SendOrderConfirmation(call, callback) {
      const { user_id: userId, order_id: orderId } = call.request;
      let email = process.env.DEFAULT_FROM_EMAIL || 'customer@boutique.dev';
      let totalText = '';
      let itemCount = '';
      if (client) {
        try {
          const order = await new Promise((resolve, reject) =>
            client.GetOrder({ id: orderId }, (e, o) => (e ? reject(e) : resolve(o)))
          );
          if (order) {
            email = order.user_email || email;
            totalText = `Your order total is ${moneyStr(order.total)}.`;
            itemCount = `You ordered ${order.items.length} item(s).`;
          }
        } catch (e) {
          console.warn('[emailservice] could not enrich order:', e.message);
        }
      }
      if (email === (process.env.DEFAULT_FROM_EMAIL || 'customer@boutique.dev') && auth && userId) {
        try {
          const user = await new Promise((resolve, reject) =>
            auth.GetUser({ id: userId }, (e, u) => (e ? reject(e) : resolve(u)))
          );
          if (user && user.email) email = user.email;
        } catch (e) {
          console.warn('[emailservice] could not enrich user:', e.message);
        }
      }
      const subject = `Order Confirmation ${orderId}`;
      const text = `Hi,\n\nThanks for your order (${orderId}).\n${itemCount}\n${totalText}\n\nTrack it online.\n\n— Boutique`;
      const sentViaSmtp = await trySendMail(email, subject, text);
      console.log(`[emailservice] confirmation → ${email} (order ${orderId})${sentViaSmtp ? ' via SMTP' : ' [log only]'}`);
      callback(null, { sent: true, message: 'sent' });
    },
  };

  const server = new grpc.Server();
  server.addService(pkg.EmailService.service, handlers);

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
      console.error('[emailservice] bind failed', err);
      process.exit(1);
    }
    server.start();
    console.log(`[emailservice] listening on 0.0.0.0:${port}`);
  });

  const shutdown = () => {
    console.log('[emailservice] shutting down');
    server.tryShutdown(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
