# emailservice

Email notification gRPC microservice (Node.js).

Implements `ecommerce.email.EmailService.SendOrderConfirmation`. Delivery is a
provider-adapter: if `SMTP_HOST` is set it sends via SMTP (e.g. Mailhog); otherwise
it logs the confirmation. Optionally enriches with order details via `ORDER_SERVICE_ADDR`.

## Run
```bash
npm install && npm start   # listens on 0.0.0.0:50058
```
