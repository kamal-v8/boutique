# DevOps Roadmap — Boutique microservices demo

Your working plan for devopsifying this project. Goal: **learn DevOps AND get a real
deployment**. Everything below is actionable solo; each phase ends with a
**gate** (definition of done) so you always know if it actually worked.

Project state at the time of writing: all 10 services run, frontend is complete
(catalog, cart, checkout, orders, account, admin), `scripts/dev.sh` for local runs,
Docker Compose verified end-to-end. The remaining work is purely DevOps.

---

## The stack you're operating on

| Service        | Lang | Port  | Persistence | Notes |
|----------------|------|-------|-------------|-------|
| frontend       | Node | 8080  | —           | Next.js BFF; all browser→gRPC fan-in via `/api/*` routes |
| authservice    | Node | 50051 | Postgres `users_db` | JWT access + rotating refresh tokens |
| productcatalog | Go   | 50052 | Postgres `products_db` | reads protos from bundled `proto/` |
| cartservice    | Node | 50053 | Redis        | |
| checkoutservice| Go   | 50054 | —            | orchestrates cart→promo→order→payment→shipping→email→stock |
| orderservice   | Node | 50055 | Postgres `orders_db` | |
| paymentservice | Node | 50056 | —            | mock adapter |
| shippingservice| Go   | 50057 | —            | mock carrier; standard/express/overnight |
| emailservice   | Node | 50058 | —            | logs unless SMTP_HOST set |
| promotionservice | Go | 50059 | Postgres `products_db` | coupons |

Critical gotchas (they WILL break a naive pipeline):

1. **Node services load `.proto` at runtime.** Every Node image must ship `proto/`
   and set `PROTO_DIR` (see existing Dockerfiles: `ENV PROTO_DIR=/usr/src/app/proto`).
2. **Go services build offline from vendored deps**: `GOWORK=off go build -mod=vendor`.
   Do NOT run `go mod download` in CI/images; your runners may have no network for deps.
3. **Proto changes require regen + rebuild.** `proto/order.proto` → regenerate
   checkoutservice's vendored stubs: `cd services/checkoutservice && protoc -I ../../proto --go_out=vendor ../../proto/order.proto` (protoc-gen-go v1.36.11 must match). Node services pick up proto changes at restart (no regen).
4. **Go DB URLs need `?sslmode=disable`** (lib/pq). Node accepts plain URLs.
5. **Host Docker DNS is broken** on this machine: `/etc/docker/daemon.json` sets
   `"dns": ["172.17.0.1"]` and `docker0` is down → builds get `EAI_AGAIN`. That's why
   compose uses `network: host` on npm builds. **Fix with sudo** (remove the dns override,
   `sudo ip link set docker0 up`, restart docker) and delete the `network: host` workarounds.
   Your CI runners won't have this — the hack is local-only and must go before registry builds.
6. **`next build` works without services running** (pages use `.catch()` fallbacks), so
   CI doesn't need the stack to compile the frontend.
7. **Seeds**: admin/demo users and coupons are created by services at startup (idempotent).
   Products ship in `postgres-init.sql`/productcatalog store. Don't hand-migrate data.

---

## Phase 0 — Git baseline (half a day)

**Goal:** clean, reproducible repo. Everything else depends on this.

- [x] `git add -A` + first commit ("working baseline: full app + compose + dev.sh"). Add a `.gitattributes` (`*.sh text eol=lf`).
- [ ] Audit `.gitignore`: `node_modules/`, `.build/`, `.next/`, Go binaries (`services/checkoutservice/checkoutservice`, `services/shippingservice/shippingservice`), `.env`, `*.log`.
- [ ] `docs/architecture.md`: service map, ports, DBs, data flow (browser → BFF → gRPC), env vars per service. Pull from `docker-compose.yml` — it's the source of truth.
- [ ] Confirm: fresh clone → `docker compose up --build` → storefront at :8080, admin login works.
- **Gate:** a clean clone reproduces the stack with one command.

## Phase 1 — CI foundation (2–3 days)

**Goal:** every push builds + tests everything.

- [ ] `.github/workflows/ci.yml`:
  - frontend: `npm ci` → `npm run build` (catches TS/Next errors) → `npm test` (add a smoke test later).
  - node services (auth/cart/order/payment/email): matrix, `npm ci` + their lint/test.
  - go services (product/checkout/shipping/promotion): matrix, `GOWORK=off go build -mod=vendor ./...` + `go vet`.
  - proto guard: grep that `keepCase: true` survives (prevents the cart-killer bug).
- [ ] Root `Makefile` mirroring the same commands (local == CI).
- [ ] Cache node_modules + Go build cache per service (`actions/cache`).
- **Gate:** a push that breaks any build turns CI red.

## Phase 2 — Containerization & registry (2–3 days)

**Goal:** prod-shaped images pushed to a registry.

- [ ] Multi-stage images for all 10:
  - Node: `node:22-alpine` → `npm ci --omit=dev` → copy `proto/` → `ENV PROTO_DIR=/usr/src/app/proto`.
  - Go: `golang:1.26-alpine` builder (`CGO_ENABLED=0 GOWORK=off go build -mod=vendor`) → `gcr.io/distroless/static` runtime.
  - Frontend: standalone Next output (`output: 'standalone'`) → tiny runtime.
- [ ] `HEALTHCHECK` per image: gRPC services via `grpc_health_probe` (add the probe binary in the image or a sidecar); frontend via HTTP `/`.
- [ ] Fix host DNS (gotcha #5) and strip `network: host` from compose builds.
- [ ] Registry: GHCR (simplest). CI pushes `sha-<commit>` + `latest`. `docker/build-push-action` with cache.
- [ ] Tag service images independently (`boutique/authservice:sha-…`).
- **Gate:** `docker pull` on a machine without the repo → service runs.

## Phase 3 — IaC & secrets & config (3–5 days)

**Goal:** env-driven config, secrets never in git.

- [ ] Centralize config: per-service `.env.example` (most exist) + root `.env.example`. All `*_SERVICE_ADDR`, `DATABASE_URL`, `JWT_SECRET`, SMTP vars.
- [ ] Secrets: pick one — SOPS+age (gitops-friendly) or cloud-native (AWS Secrets Manager later). At minimum: `JWT_SECRET`, DB passwords, SMTP creds out of compose/committed files.
- [ ] DB strategy: schemas are auto-created at startup; document that migration responsibility is per-service. Write `docs/database.md` (which DB each service owns).
- [ ] Keep `scripts/dev.sh` as the local story; compose = "prod-ish"; IaC = prod.
- **Gate:** rotating `JWT_SECRET` requires zero code change.

## Phase 4 — Track A: VPS + Docker Compose + Traefik (2–3 days)

**Goal:** cheapest real deployment; your first live URL.

- [ ] VPS + Docker; `ufw` (22, 80, 443). `docker compose -f docker-compose.prod.yml up -d` on the box.
- [ ] `docker-compose.prod.yml`: pinned image tags, `restart: always`, **no** host port publishing for internal services; `env_file` for secrets.
- [ ] Traefik: TLS via Let's Encrypt; `example.com` → frontend. Frontend is the only public surface.
- [ ] Postgres/Redis: on-VM containers with a `data` volume + nightly `pg_dump`/`redis-cli save` to object storage; write `docs/disaster-recovery.md` with the restore commands and DO a restore drill.
- [ ] Deploys: webhook → `docker compose pull && up -d` (or watchtower).
- [ ] Email: real SMTP for `emailservice`, or MailHog behind basic auth.
- **Gate:** `curl https://your-domain` serves the storefront; reboot self-heals; backup restore works in a drill.

## Phase 5 — Track B: Kubernetes (4–6 weeks greenfield, ~1 week porting from Track A)

**Goal:** the real learning payoff.

- [ ] Local: **k3d/kind**. Then a real cluster: k3s (bare-metal/VPS) or **EKS/GKE** (managed).
- [ ] Helm chart `helm/charts/boutique/`: one chart, values per env (image tags, replicas, requests/limits, env). One template per service. Frontend behind ingress; inter-service gRPC stays cluster-internal (HTTP/2).
- [ ] Ingress-nginx + cert-manager (Let's Encrypt).
- [ ] State on K8s: use managed Postgres/Redis (RDS/ElastiCache) or operators (CloudNativePG). Do NOT hand-roll stateful sets for a first project.
- [ ] GitOps: **ArgoCD or Flux**. The Helm release lives in git; PR → cluster sync. This is the biggest single learning step.
- [ ] Ops: HPA on frontend + Go services, PodDisruptionBudgets, liveness/readiness (gRPC health), `kubectl drain` drill.
- **Gate:** `kubectl rollout restart <svc>` → zero downtime; kill a pod → self-heals; bad image tag → GitOps revert.

## Phase 6 — Track C: AWS ECS/Fargate (3–5 days, do after Track A/B)

**Goal:** managed-cloud practice.

- [ ] Terraform (or CDK): ECS cluster, one task def per service (mirror HEALTHCHECK), **ALB** `/` → frontend with TLS cert.
- [ ] ECR images from Phase 2; **Service Connect/Cloud Map** for discovery.
- [ ] Secrets Manager (JWT/DB creds); RDS Postgres + ElastiCache Redis; CloudWatch structured logs; optional X-Ray.
- [ ] Deploy via CDK pipeline / CodePipeline.
- **Gate:** `terraform apply` from scratch → env up; `terraform destroy` → nothing left (prove twice).

## Phase 7 — Data & state hardening (after any track)

- [ ] Backups: Postgres dump/WAL or native snapshot, Redis `appendonly yes`, retention + restore drill (exact commands in `docs/disaster-recovery.md`).
- [ ] Idempotent seeds: verify re-running seeds doesn't duplicate products/coupons/users (upsert paths).
- **Gate:** restore from backup on a fresh instance → data intact.

## Phase 8 — E2E & release gates (frontend is done — this is unblocked)

**Goal:** deploys gated on real user journeys, not just builds.

- [ ] Playwright suite in repo (`e2e/`): register → login; guest cart → login merge; add → checkout with WELCOME10/SAVE20 → order + tracking; admin CRUD; coupon validation. Run against a preview/staging env seeded with demo accounts.
- [ ] Preview environments per PR (VPS: compose+subdomain; K8s: namespace-per-PR; ECS: per-PR service) with ephemeral Postgres/Redis.
- [ ] Deploy strategies: blue-green (compose/ECS) or canary (K8s rollout) + smoke check before cutover.
- **Gate:** a PR that breaks checkout cannot merge.

## Phase 9 — Security hardening (3–5 focused days)

- [ ] Trivy image scanning in CI + registry native scan; fail on critical.
- [ ] Pin base images by digest; optional cosign signing + verify at deploy.
- [ ] Secret rotation drill; RBAC least-privilege; network policies (K8s) / security groups (AWS) limited to real service flows.
- [ ] Upgrade `next@14.2.5` (known security advisory) before hardening — do this in Lane A as a small follow-up.
- [ ] TLS everywhere; document that internal gRPC is plaintext inside a trusted network.
- **Gate:** critical image vuln blocks a release.

## Phase 10 — Observability & SLOs (3–5 days)

- [ ] Prometheus exporters (Go services + Node `prom-client`/OTel), node-exporter, cAdvisor; Grafana dashboards incl. a cross-service "checkout latency" view (this app's saga is perfect for it).
- [ ] Structured JSON logs with `trace_id`; centralize in Loki (or CloudWatch).
- [ ] OTel + Jaeger/Tempo tracing through the checkout saga: cart→promo→order→payment→shipping→email.
- [ ] 3 SLOs: checkout p95 < 2s, order correctness 99.9%, availability 99.5%.
- **Gate:** the "checkout latency" board shows the full span breakdown.

## Phase 11 — Docs & handoff (1–2 days)

- [ ] `docs/` index: architecture, deploy runbooks (per track you ran), DR drill, on-call cheat-sheet, security model.
- [ ] README: CI/coverage/e2e badges, deploy matrix (which track is live where).
- **Gate:** a stranger follows the README from an empty machine to a running storefront in under 30 min.

---

## Recommended order for your goals (learn + deploy)

1. **Phase 0** (today).
2. **Phase 1 + 2** (CI + images/registry) — platform-agnostic, unblocks everything.
3. **Phase 4 (VPS+compose)** for a fast real deployment and a live URL.
4. **Phase 5 (K8s)** — the big learning payoff; you can host it on the same VPS via k3s.
5. **Phase 3, 7–11** interleaved as you go.
6. **Phase 6 (ECS)** optional, for managed-cloud practice.

Follow-ups you may want from Lane A (small): bump `next`, add `npm test` smoke tests so Phase 1 has something to run.
