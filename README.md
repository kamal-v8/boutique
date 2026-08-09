# Boutique — Modern E-Commerce Microservices Platform

A full-featured, microservices-based e-commerce platform with a sleek "Raw Form"
brutalist storefront and an admin panel. Built as independently deployable gRPC
services behind a single Next.js BFF (backend-for-frontend).

## Features
- **Storefront**: catalog with search/filter/sort/pagination, product detail, cart (qty/remove), coupons, checkout (shipping options), order confirmation with tracking.
- **Accounts**: register/login (JWT access + refresh rotation), role-based access (customer / admin), guest-cart merge on login.
- **Coupons/discounts**: percent & fixed-amount codes with min-subtotal, expiry, and usage limits, applied at cart & checkout.
- **Order lifecycle**: place order → payment → shipping → email confirmation → status tracking (`tracking_id` persisted).
- **Admin panel** (`/admin`, role-gated): product CRUD + stock, order management (status updates), coupon management.

## Architecture
```
                    frontend (Next.js BFF, HTTP :8080)
        ┌───────────────┬──────────────┬───────────────┬──────────────┐
   authservice   productcatalog    cartservice    checkoutservice
    (Node, :50051)  (Go, :50052)  (Node, :50053)  (Go orch, :50054)
        └───────────────┴──────┬─────┴───────────────┘       │
   promotionservice       orderservice        paymentservice shippingservice emailservice
    (Go, :50059)      (Node, :50055)          (Node, :50056) (Go, :50057)   (Node, :50058)
        │                   │
      Postgres            Postgres           Redis            (mock/ provider adapters)
```

- **gRPC + protobuf** for all service-to-service communication (contracts in `/proto`).
- **Go** for core data/orchestration services; **Node.js** for auth/payments/orders (mixed, per-domain best fit).
- **Persistence**: PostgreSQL (users, products, orders), Redis (carts).
- **Payments/shipping/email** are mock provider adapters behind clean interfaces — swap in Stripe/real carriers/SMTP later.

See [CONTRACTS.md](./CONTRACTS.md) for the full service registry, ports, and RPC shapes.

## Quick start (Docker Compose)
```bash
cp .env.example .env
docker compose up --build
# Storefront:        http://localhost:8080
# Mailhog UI:        http://localhost:8025   (email profile: docker compose --profile email up)
```

Seeded accounts:
- Admin: `admin@boutique.dev` / `Admin123!`
- Customer: `demo@boutique.dev` / `Demo123!`

Seeded coupons: `WELCOME10` (10% off), `SAVE20` (20% off over $50), `FIVEBUCK` ($5 off).

## Frontend routes
```
/                storefront home (featured + categories)
/products        catalog (category filter, search, sort, pagination)
/products/[id]   product detail + add to cart
/cart            cart with qty/remove
/checkout        address + shipping option + coupon + payment (requires login)
/orders/[id]     order confirmation + tracking
/account         login / register / profile
/account/orders  order history
/admin           admin panel (products, orders, coupons) — role-gated
```
All browser requests fan in through Next.js API routes (`frontend/app/api/…`); gRPC
stays server-side (grpc-js is Node-only).

## Local (non-Docker) development

Each service reads its own env (defaults point to `localhost`). Go services build
within the root `go.work` workspace; Node services load protos from `../../proto`.

### Prerequisites

- **PostgreSQL** (running on `localhost:5432`, role `postgres`/`postgres`)
- **Redis** (running on `localhost:6379`)
- **Go 1.26+** and **Node 20+**

Create the databases the services expect (once):
```bash
sudo systemctl start postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE users_db;"
sudo -u postgres psql -c "CREATE DATABASE products_db;"
sudo -u postgres psql -c "CREATE DATABASE orders_db;"
```
> Arch note: the default `pg_hba.conf` allows `peer` auth on the socket but denies
> password auth over TCP. If `psql postgres://postgres:postgres@localhost:5432/users_db`
> fails with auth errors, add a line for `host all all 127.0.0.1/32 scram-sha-256`
> before the last `host` rule in `pg_hba.conf`, then `sudo systemctl reload postgresql`.

Redis (Arch):
```bash
sudo pacman -S redis
sudo systemctl enable --now redis
```

### One-command run
```bash
./scripts/dev.sh           # installs deps, builds Go, starts all 9 services + frontend
./scripts/dev.sh stop      # stop everything
./scripts/dev.sh status    # show which services are up
./scripts/dev.sh logs      # tail all logs (or: ./scripts/dev.sh logs authservice)
```
Storefront: http://localhost:8080

### Manual run (per service)
First: `npm install` in `frontend/` and each of
`services/{authservice,cartservice,emailservice,orderservice,paymentservice}`.
Then start each service in its own terminal (see each `services/*/README.md`):

```bash
# Go services (build within the go.work workspace)
DATABASE_URL="postgres://postgres:postgres@localhost:5432/products_db?sslmode=disable" \
  (cd services/productcatalog    && go run .)   # :50052
DATABASE_URL="postgres://postgres:postgres@localhost:5432/products_db?sslmode=disable" \
  (cd services/promotionservice  && go run .)   # :50059
(cd services/shippingservice    && go run .)    # :50057
(cd services/checkoutservice    && go run .)    # :50054 (needs *_SERVICE_ADDR env → see .env.example)

# Node services
(cd services/authservice   && DATABASE_URL="postgres://postgres:postgres@localhost:5432/users_db" npm start)   # :50051
(cd services/orderservice  && DATABASE_URL="postgres://postgres:postgres@localhost:5432/orders_db" npm start)  # :50055
(cd services/cartservice   && npm start)   # :50053 (Redis)
(cd services/paymentservice && npm start)  # :50056
(cd services/emailservice  && npm start)   # :50058 (emails log-only unless SMTP_HOST set)

# Frontend
(cd frontend && npm run dev)   # http://localhost:8080
```
> The Go services use `lib/pq`, which requires `sslmode=disable` in `DATABASE_URL`
> against a local Postgres without SSL (the Node services accept the plain URL).

Emails are logged (not sent) unless you run an SMTP sink such as MailHog locally
on `localhost:1025` and set `SMTP_HOST` for `emailservice`.

## Repository layout
```
proto/      # protobuf contracts (single source of truth)
shared/     # Go module `ecommerce` with generated gRPC stubs
services/   # each microservice (own Dockerfile + .env.example + README)
frontend/   # Next.js storefront + admin (BFF)
```

## Todo / swap-in points
- Payments: replace mock `paymentservice` with a Stripe adapter.
- Shipping: add real carrier quotes.
- Email: point `emailservice` at a real SMTP provider.
- Deployment/DevOps (K8s, CI/CD, Terraform): see [docs/DEVOPS_ROADMAP.md](./docs/DEVOPS_ROADMAP.md) for the phased plan.
