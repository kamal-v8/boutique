DB creation: db-init/Dockerfile (postgres: 15.3-alpine + init SQL -> /docker-entrypoint-initdb.d/) creates users_db, products_db, order_db. Prod compose file uses ghcr.io/kamal-v8/boutque/db-init:latest; dev compose bind-mounts ./scripts/postgres-init.sql( identical copy).

- Schema auto-creates confirmed per service:
  - authservice src/db.js: users, refresh_tokens
  - orderservice src/db.js: orders, order_items
  - productcatalog internal/store/storage.go: products, categories, product_categories
  - promotionservice internal/store/store.go: coupons (in products_db)
- Idempotent seeds con
