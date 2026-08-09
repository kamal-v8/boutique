'use strict';

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { createClient } = require('redis');

const PORT = process.env.PORT || '50053';
const REDIS_ADDR = process.env.REDIS_ADDR || 'localhost:6379';
const PROTO_DIR = process.env.PROTO_DIR || path.join(__dirname, '..', '..', 'proto');

const [host, port] = REDIS_ADDR.split(':');
const client = createClient({ socket: { host, port: port || 6379 } });

client.on('error', (e) => console.error('[cartservice] redis error:', e.message));

function key(cartId) {
  return `cart:${cartId}`;
}

async function readCart(cartId) {
  const raw = await client.get(key(cartId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCart(cart) {
  await client.set(key(cart.id), JSON.stringify(cart));
}

function emptyCart(cartId, userId) {
  return { id: cartId || userId || 'anonymous', user_id: userId || '', items: [] };
}

function normalizeItem(item) {
  return {
    product_id: item.product_id,
    quantity: item.quantity || 0,
    // unit_price intentionally left unset — authoritative pricing comes from
    // productcatalog at read time / checkout time.
  };
}

// Build proto Cart message (include items array; total is enrichment duty of the caller).
function toProto(cart) {
  return {
    id: cart.id,
    user_id: cart.user_id || '',
    items: (cart.items || []).map((i) => normalizeItem(i)),
  };
}

async function ensureCart(cartId, userId) {
  const existing = await readCart(cartId);
  if (existing) return existing;
  const cart = emptyCart(cartId, userId);
  await writeCart(cart);
  return cart;
}

const handlers = {
  async GetCart(call, callback) {
    const { cart_id: cartId, user_id: userId } = call.request;
    const cart = await readCart(cartId || userId);
    callback(null, toProto(cart || emptyCart(cartId || userId, userId)));
  },

  async AddItem(call, callback) {
    const { cart_id: cartId, user_id: userId, product_id: productId, quantity } = call.request;
    if (!productId || quantity <= 0) {
      return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'product_id and positive quantity required.' });
    }
    const cart = await ensureCart(cartId || userId, userId);
    const line = cart.items.find((i) => i.product_id === productId);
    if (line) line.quantity += quantity;
    else cart.items.push({ product_id: productId, quantity });
    await writeCart(cart);
    callback(null, toProto(cart));
  },

  async UpdateItem(call, callback) {
    const { cart_id: cartId, user_id: userId, product_id: productId, quantity } = call.request;
    const cart = await ensureCart(cartId || userId, userId);
    cart.items = cart.items.filter((i) => i.product_id !== productId);
    if (quantity > 0) cart.items.push({ product_id: productId, quantity });
    await writeCart(cart);
    callback(null, toProto(cart));
  },

  async RemoveItem(call, callback) {
    const { cart_id: cartId, user_id: userId, product_id: productId } = call.request;
    const cart = await ensureCart(cartId || userId, userId);
    cart.items = cart.items.filter((i) => i.product_id !== productId);
    await writeCart(cart);
    callback(null, toProto(cart));
  },

  async EmptyCart(call, callback) {
    const { cart_id: cartId, user_id: userId } = call.request;
    await client.del(key(cartId || userId));
    callback(null, {});
  },

  async MergeCarts(call, callback) {
    const { guest_cart_id: guestCartId, user_id: userId } = call.request;
    const guest = await readCart(guestCartId);
    const cart = await ensureCart(userId, userId);
    if (guest && guest.items) {
      for (const gi of guest.items) {
        const line = cart.items.find((i) => i.product_id === gi.product_id);
        if (line) line.quantity += gi.quantity;
        else cart.items.push({ product_id: gi.product_id, quantity: gi.quantity });
      }
      await writeCart(cart);
      await client.del(key(guestCartId));
    }
    callback(null, toProto(cart));
  },
};

async function main() {
  await client.connect();
  const definition = protoLoader.loadSync(path.join(PROTO_DIR, 'cart.proto'), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });
  const pkg = grpc.loadPackageDefinition(definition).ecommerce.cart;

  const server = new grpc.Server();
  server.addService(pkg.CartService.service, handlers);

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[cartservice] bind failed', err);
      process.exit(1);
    }
    server.start();
    console.log(`[cartservice] listening on 0.0.0.0:${port}`);
  });

  const shutdown = () => {
    console.log('[cartservice] shutting down');
    server.tryShutdown(async () => {
      await client.quit();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  console.error('[cartservice] fatal:', e);
  process.exit(1);
});
