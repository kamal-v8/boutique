# checkoutservice

Order orchestration gRPC microservice (Go, saga-style).

Implements `ecommerce.checkout.CheckoutService.PlaceOrder` by coordinating:
cart → product (price/stock) → promotion (coupon) → shipping (quote) →
order (persist) → payment → ship → email → decrement stock → empty cart.
If payment fails the order is cancelled (compensation).

## Run (needs all other services reachable)
```bash
export ORDER_SERVICE_ADDR=localhost:50055   # etc.
go run .   # listens on 0.0.0.0:50054
```
