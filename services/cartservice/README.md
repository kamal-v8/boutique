# cartservice

Shopping-cart gRPC microservice (Node.js + Redis).

Implements `ecommerce.cart.CartService` (GetCart, AddItem, UpdateItem, RemoveItem,
EmptyCart, MergeCarts). Carts are stored as JSON docs under Redis key `cart:<id>`.
Carts store only `product_id` + `quantity`; authoritative pricing is joined from
`productcatalog` at read/checkout time.

## Run
```bash
npm install
export REDIS_ADDR=localhost:6379
npm start   # listens on 0.0.0.0:50053
```
