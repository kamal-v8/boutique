import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_DIR = process.env.PROTO_DIR || path.join(process.cwd(), '..', 'proto');

const PROTO_FILES = [
  'common.proto',
  'user.proto',
  'product.proto',
  'cart.proto',
  'promotion.proto',
  'checkout.proto',
  'order.proto',
  'payment.proto',
  'shipping.proto',
  'email.proto',
];

type Pkg = ReturnType<typeof grpc.loadPackageDefinition>;

let cached: Pkg | null = null;

function load() {
  if (cached) return cached;
  const definition = protoLoader.loadSync(
    PROTO_FILES.map((f) => path.join(/*turbopackIgnore: true*/ PROTO_DIR, f)),
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [PROTO_DIR],
    }
  );
  cached = grpc.loadPackageDefinition(definition);
  return cached;
}

function addr(key: string, dflt: string) {
  return process.env[key] || dflt;
}

export interface ServiceClient {
  user: any;
  product: any;
  cart: any;
  promotion: any;
  checkout: any;
  order: any;
}

export function clients(): ServiceClient {
  const pkg = load() as any;
  return {
    user: new pkg.ecommerce.user.UserService(addr('AUTH_SERVICE_ADDR', 'localhost:50051'), grpc.credentials.createInsecure()),
    product: new pkg.ecommerce.product.ProductService(addr('PRODUCT_SERVICE_ADDR', 'localhost:50052'), grpc.credentials.createInsecure()),
    cart: new pkg.ecommerce.cart.CartService(addr('CART_SERVICE_ADDR', 'localhost:50053'), grpc.credentials.createInsecure()),
    promotion: new pkg.ecommerce.promotion.PromotionService(addr('PROMOTION_SERVICE_ADDR', 'localhost:50059'), grpc.credentials.createInsecure()),
    checkout: new pkg.ecommerce.checkout.CheckoutService(addr('CHECKOUT_SERVICE_ADDR', 'localhost:50054'), grpc.credentials.createInsecure()),
    order: new pkg.ecommerce.order.OrderService(addr('ORDER_SERVICE_ADDR', 'localhost:50055'), grpc.credentials.createInsecure()),
  };
}

/** Promisify a unary gRPC call on a client stubbed method. */
export function call<TReq, TRes>(client: any, method: string, req: TReq): Promise<TRes> {
  return new Promise((resolve, reject) => {
    client[method](req, (err: any, res: any) => {
      if (err) reject(err);
      else resolve(res as TRes);
    });
  });
}
