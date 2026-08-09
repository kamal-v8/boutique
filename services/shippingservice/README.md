# shippingservice

Shipping quote/label gRPC microservice (Go, mock provider).

Implements `ecommerce.shipping.ShippingService` (GetQuote, ShipOrder). Returns
Standard/Express/Overnight quotes and a fake tracking id. Swap in a real carrier
adapter later.

## Run
```bash
go run .   # listens on 0.0.0.0:50057
```
