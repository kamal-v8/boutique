# DISASTER RECOVERY

## Restore from Backup

1. List available backups:
   ```bash
   aws s3 ls s3://boutique-backups-<ACCOUNT_ID>/
   ```

2. Download the backup (replace `${DATE}` with the timestamp from the listing, e.g. `users_db-20260827-030000.sql.gz`):
   ```bash
   aws s3 cp s3://boutique-backups-<ACCOUNT_ID>/users_db-${DATE}.sql.gz /tmp/
   ```

3. Stop the affected service:
   ```bash
   docker compose stop authservice
   ```

4. Restore the database:
   ```bash
   gunzip -c /tmp/users_db-${DATE}.sql.gz | docker exec -i postgres psql -U boutique user_db
   ```

5. Restart:
   ```bash
   docker compose up -d authservice
   ```

## Restore Redis

```bash
docker stop redis
docker cp /tmp/redis-${DATE}.rdb redis:/data/dump.rdb
docker start redis
```
