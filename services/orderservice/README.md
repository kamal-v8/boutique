# orderservice

Order persistence gRPC microservice (Node.js + PostgreSQL).

Implements `ecommerce.order.OrderService` (CreateOrder, GetOrder, ListOrders,
UpdateOrderStatus, GetAllOrders). Tables are created automatically on boot.

## Run (needs Postgres)
```bash
npm install
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/orders_db
npm start   # listens on 0.0.0.0:50055
```
