#!/usr/bin/env bash
# dev.sh — run the whole boutique stack locally WITHOUT Docker.
#
# Usage:
#   ./scripts/dev.sh               start everything (install deps + build Go as needed)
#   ./scripts/dev.sh stop          stop everything
#   ./scripts/dev.sh status        show which services are up
#   ./scripts/dev.sh logs [name]   tail logs (all, or one service)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/.build"
LOGS="$BUILD/logs"
RUNS="$BUILD/run"
BIN="$BUILD/bin"
mkdir -p "$LOGS" "$RUNS" "$BIN"

# ---------------------------------------------------------------- config
declare -A PORT=(
  [authservice]=50051 [productcatalog]=50052 [cartservice]=50053
  [checkoutservice]=50054 [orderservice]=50055 [paymentservice]=50056
  [shippingservice]=50057 [emailservice]=50058 [promotionservice]=50059
  [frontend]=8080
)
DB_USERS="postgres://postgres:postgres@localhost:5432/users_db"
DB_PRODUCTS="postgres://postgres:postgres@localhost:5432/products_db?sslmode=disable"
DB_ORDERS="postgres://postgres:postgres@localhost:5432/orders_db"
JWT_SECRET="${JWT_SECRET:-dev-secret-change-me}"

GOSVC=(productcatalog promotionservice shippingservice checkoutservice)
NODESVC=(authservice cartservice orderservice paymentservice emailservice)
ORDER=(authservice productcatalog orderservice promotionservice cartservice shippingservice paymentservice emailservice checkoutservice frontend)

# ---------------------------------------------------------------- utils
log()  { printf '\033[1;34m[dev]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[dev]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; exit 1; }

port_open() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3>&- 3<&-; return 0; } || return 1
}

wait_port() { # port name tries(0.5s each)
  local port=$1 name=$2 tries=$3
  while (( tries-- > 0 )); do
    port_open "$port" && return 0
    sleep 0.5
  done
  return 1
}

in_list() { [[ " $1 " == *" $2 "* ]]; }

# ------------------------------------------------------------ lifecycle
check_prereqs() {
  command -v psql >/dev/null 2>&1 || die "psql not found. Install PostgreSQL first."
  command -v go >/dev/null 2>&1 || die "go not found."
  command -v node >/dev/null 2>&1 || die "node not found."
  port_open 6379 || die "Redis not reachable on localhost:6379. Start it: sudo pacman -S redis && sudo systemctl enable --now redis"
  psql "$DB_USERS" -tc 'SELECT 1' >/dev/null 2>&1 || die "cannot connect to users_db ($DB_USERS). Is Postgres running and are the 3 databases created? See README → Local development."
  psql "$DB_ORDERS" -tc 'SELECT 1' >/dev/null 2>&1 || die "cannot connect to orders_db ($DB_ORDERS). See README → Local development."
  psql "$DB_PRODUCTS" -tc 'SELECT 1' >/dev/null 2>&1 || die "cannot connect to products_db ($DB_PRODUCTS). See README → Local development."
}

ensure_deps() {
  local dir
  for dir in "$ROOT/frontend" "${NODESVC[@]/#/$ROOT/services/}"; do
    if [ ! -d "$dir/node_modules" ]; then
      log "npm install in $(basename "$dir")"
      ( cd "$dir" && npm install --no-audit --no-fund ) || die "npm install failed in $dir"
    fi
  done
}

build_go() {
  local s
  for s in "${GOSVC[@]}"; do
    if [ ! -x "$BIN/$s" ]; then
      log "building $s (offline, vendored)"
      ( cd "$ROOT/services/$s" && GOWORK=off go build -mod=vendor -o "$BIN/$s" . ) || die "go build failed for $s"
    fi
  done
}

launch() {
  local name=$1 port=${PORT[$name]}
  if port_open "$port"; then
    warn "$name already up on :$port (skipping)"
    return 0
  fi
  local dir="$ROOT/services/$name"
  [[ "$name" == "frontend" ]] && dir="$ROOT/frontend"

  log "starting $name on :$port"
  (
    cd "$dir"
    export PORT="$port"
    case "$name" in
      authservice)
        export DATABASE_URL="$DB_USERS" JWT_SECRET="$JWT_SECRET" \
          ADMIN_EMAIL=admin@boutique.dev ADMIN_PASSWORD=Admin123! \
          DEMO_EMAIL=demo@boutique.dev DEMO_PASSWORD=Demo123!
        ;;
      productcatalog|promotionservice) export DATABASE_URL="$DB_PRODUCTS" ;;
      orderservice)                     export DATABASE_URL="$DB_ORDERS" ;;
      cartservice)                      export REDIS_ADDR=localhost:6379 ;;
      emailservice)
        export SMTP_HOST=localhost SMTP_PORT=1025 \
          ORDER_SERVICE_ADDR="localhost:${PORT[orderservice]}" \
          AUTH_SERVICE_ADDR="localhost:${PORT[authservice]}"
        ;;
      checkoutservice)
        export CART_SERVICE_ADDR="localhost:${PORT[cartservice]}" \
          PRODUCT_SERVICE_ADDR="localhost:${PORT[productcatalog]}" \
          PROMOTION_SERVICE_ADDR="localhost:${PORT[promotionservice]}" \
          SHIPPING_SERVICE_ADDR="localhost:${PORT[shippingservice]}" \
          ORDER_SERVICE_ADDR="localhost:${PORT[orderservice]}" \
          PAYMENT_SERVICE_ADDR="localhost:${PORT[paymentservice]}" \
          EMAIL_SERVICE_ADDR="localhost:${PORT[emailservice]}"
        ;;
    esac

    if [[ "$name" == "frontend" ]]; then
      exec node node_modules/next/dist/bin/next dev -p "$port"
    elif in_list "${GOSVC[*]}" "$name"; then
      exec "$BIN/$name"
    else
      exec node index.js
    fi
  ) >"$LOGS/$name.log" 2>&1 &
  echo $! >"$RUNS/$name.pid"
}

start() {
  check_prereqs
  ensure_deps
  build_go
  local name
  for name in "${ORDER[@]}"; do launch "$name"; done

  log "waiting for services…"
  local failed=0
  for name in "${ORDER[@]}"; do
    if wait_port "${PORT[$name]}" "$name" 60; then
      log "up: $name (:${PORT[$name]})"
    else
      warn "$name did not come up within 30s — see $LOGS/$name.log"
      failed=1
    fi
  done
  (( failed )) && die "one or more services failed to start."
  log "all services up 🎉  storefront: http://localhost:${PORT[frontend]}"
  log "logs: $LOGS/<service>.log   ·   stop with: $0 stop"
}

stop() {
  local pid f remaining=()
  for f in "$RUNS"/*.pid; do
    [ -e "$f" ] || continue
    pid=$(cat "$f")
    if kill -0 "$pid" 2>/dev/null; then
      log "stopping $(basename "$f" .pid) (pid $pid)"
      kill "$pid" 2>/dev/null || true
      remaining+=("$pid")
    fi
    rm -f "$f"
  done
  sleep 2
  for pid in "${remaining[@]:-}"; do
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  done
  log "stopped"
}

status() {
  local name
  for name in "${ORDER[@]}"; do
    if port_open "${PORT[$name]}"; then
      printf '%-16s up      :%s\n' "$name" "${PORT[$name]}"
    else
      printf '%-16s DOWN\n' "$name"
    fi
  done
}

logs() {
  local name=${1:-}
  if [ -n "$name" ]; then
    [ -f "$LOGS/$name.log" ] || die "no log for '$name' (logs live in $LOGS)"
    tail -f "$LOGS/$name.log"
  else
    tail -f "$LOGS"/*.log
  fi
}

# ------------------------------------------------------------- dispatch
cmd="${1:-start}"
case "$cmd" in
  start|up)     start ;;
  stop|down)    stop ;;
  status|ps)    status ;;
  logs)         shift; logs "${1:-}" ;;
  *)            echo "usage: $0 [start|stop|status|logs [service]]" >&2; exit 1 ;;
esac
