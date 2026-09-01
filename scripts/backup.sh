#!/bin/bash

set -euo pipefail

# Load env (POSTGRES_USER, etc.) written by EC2 user_data from SSM
ENV_FILE="${ENV_FILE:-/home/ubuntu/app/.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
fi

: "${POSTGRES_USER:?POSTGRES_USER must be set in $ENV_FILE}"

# Resolve account id at runtime so the bucket name always matches Terraform
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="boutique-backups-${ACCOUNT_ID}"

DATE="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/tmp/backups"
mkdir -p "$BACKUP_DIR"

# Dump all 3 databases
for db in users_db products_db orders_db; do
  docker exec postgres pg_dump -U "$POSTGRES_USER" "$db" | gzip >"$BACKUP_DIR/${db}-${DATE}.sql.gz"
done

# Redis save + copy
docker exec redis redis-cli BGSAVE
sleep 2
docker cp redis:/data/dump.rdb "$BACKUP_DIR/redis-${DATE}.rdb"

# Upload to S3
aws s3 sync "$BACKUP_DIR" "s3://${BUCKET}/"

# Cleanup local
rm -rf "$BACKUP_DIR"
echo "Backup complete: $DATE"
