# promotionservice

Coupon / promotions gRPC microservice (Go + PostgreSQL).

Implements `ecommerce.promotion.PromotionService` (GetCoupon, ValidateCoupon,
ListCoupons, CreateCoupon, UpdateCoupon, DeleteCoupon). Seeds `WELCOME10`, `SAVE20`,
`FIVEBUCK` on first boot. Discount values and subtotals use minor units (cents).

## Run (needs Postgres)
```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/products_db
DATABASE_URL=$DATABASE_URL go run .   # listens on 0.0.0.0:50059
```
