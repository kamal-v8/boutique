# productcatalog

Product catalog gRPC microservice (Go + PostgreSQL).

Implements `ecommerce.product.ProductService` (ListProducts, GetProduct, ListCategories,
CreateProduct, UpdateProduct, DeleteProduct, CheckStock, UpdateStock). Seeds ~12
products on first boot.

## Run (needs Postgres)
```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/products_db
DATABASE_URL=$DATABASE_URL go run .   # listens on 0.0.0.0:50052
```
