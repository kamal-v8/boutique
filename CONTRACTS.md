# E-Commerce Platform — Service Contract

This is the single source of truth for how services and the frontend connect.
Protobuf contracts live in `/proto` and are the authority for all RPC shapes.

## Service registry (gRPC, insecure, all `0.0.0.0`)

| Service            | Path                        | Port | Language | Persistence        |
|--------------------|-----------------------------|------|----------|--------------------|
| authservice        | `services/authservice`      | 50051| Node/Nest | PostgreSQL (users) |
| productcatalog     | `services/productcatalog`   | 50052| Go       | PostgreSQL (products) |
| cartservice        | `services/cartservice`      | 50053| Node     | Redis              |
| checkoutservice    | `services/checkoutservice`  | 50054| Go       | stateless orch     |
| orderservice       | `services/orderservice`     | 50055| Node     | PostgreSQL (orders)|
| paymentservice     | `services/paymentservice`   | 50056| Node     | stateless (mock)   |
| shippingservice    | `services/shippingservice`  | 50057| Go       | stateless (mock)   |
| emailservice       | `services/emailservice`     | 50058| Node     | stateless (mailhog mock) |
| promotionservice   | `services/promotionservice` | 50059| Go       | PostgreSQL (coupons, colocated w/ product db) |
| **frontend (HTTP)**| `frontend`                  | 8080 | Next.js  | n/a (BFF)          |

In Docker Compose each gRPC service's hostname equals its service name (e.g. `authservice:50051`).
Locally the frontend uses `AUTH_SERVICE_ADDR=authservice:50051` style env vars.

## Money convention
`Money { currency_code: string, units: int64, nanos: int32 }`, e.g. `1.25` USD = units 1, nanos 250000000.
All money is USD by default. **Coupon min_subtotal/discount are in minor units (cents) as int64.**
Checkout converts Money subtotal → cents before invoking promotionservice, and discount cents → Money.

## RPC packages (from `/proto`)
- `ecommerce.user.UserService` — Register, Login, Refresh, Logout, GetUser, GetUserByEmail, ValidateToken
- `ecommerce.product.ProductService` — ListProducts, GetProduct, ListCategories, CreateProduct, UpdateProduct, DeleteProduct, CheckStock, UpdateStock
- `ecommerce.cart.CartService` — GetCart, AddItem, UpdateItem, RemoveItem, EmptyCart, MergeCarts
- `ecommerce.promotion.PromotionService` — GetCoupon, ValidateCoupon, ListCoupons, CreateCoupon, UpdateCoupon, DeleteCoupon
- `ecommerce.checkout.CheckoutService` — PlaceOrder
- `ecommerce.order.OrderService` — CreateOrder, GetOrder, ListOrders, UpdateOrderStatus, GetAllOrders
- `ecommerce.payment.PaymentService` — Charge
- `ecommerce.shipping.ShippingService` — GetQuote, ShipOrder
- `ecommerce.email.EmailService` — SendOrderConfirmation

Node services load protos at runtime with `@grpc/grpc-js` + `@grpc/proto-loader`.
Go services import generated stubs from the `ecommerce` module (`/shared`).

## Auth / JWT
- authservice issues `access_token` (short, e.g. 15m) and `refresh_token` (7d).
- Tokens are JWT signed with `JWT_SECRET` (HS256). Claims: `sub` (user id), `email`, `role`, `type` (`access`|`refresh`).
- Frontend stores the **access token + user id** in an httpOnly cookie and the refresh token in a separate httpOnly cookie.
- Frontend forwards `authorization: Bearer <access_token>` metadata on gRPC calls when a user is logged in; services trust `ValidateToken` for admin checks.

## Env vars (all services read from environment; `.env.example` documents them)
- `PORT` / gRPC addr vars, `DATABASE_URL` (postgres), `REDIS_ADDR`, `JWT_SECRET`, and `<OTHER>_SERVICE_ADDR` for outbound calls.
- `ADMIN_EMAIL`/`ADMIN_PASSWORD` seeds an admin account on authservice boot.

## Seeded accounts (dev)
- `admin@boutique.dev` / `Admin123!` (role admin)
- `demo@boutique.dev`  / `Demo123!`  (role customer)
