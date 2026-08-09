# authservice

Authentication & user-account gRPC microservice (Node.js).

Implements `ecommerce.user.UserService` (Register, Login, Refresh, Logout, GetUser,
GetUserByEmail, ValidateToken) plus a shared `Health.Check`.

## Run
```bash
npm install
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/users_db
npm start   # listens on 0.0.0.0:50051
```

Postgres tables are created automatically on boot.

## Env
See `.env.example`. `JWT_SECRET` must match the frontend for token validation.
Seeds `admin@boutique.dev` / `Admin123!` (admin) and `demo@boutique.dev` / `Demo123!` (customer).
