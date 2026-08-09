# paymentservice

Mock payment gRPC microservice (Node.js).

Implements `ecommerce.payment.PaymentService.Charge` and approves every charge,
returning a fake transaction id. This is the provider-adapter seam for a real
Stripe integration later.

## Run
```bash
npm install && npm start   # listens on 0.0.0.0:50056
```
