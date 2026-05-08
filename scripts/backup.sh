#!/usr/bin/env bash
# Manual PostgreSQL backup script for Home Finance
# Usage: ./scripts/backup.sh
set -euo pipefail

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="home_finance_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Creating backup: $BACKUP_DIR/$FILENAME"
docker exec home-finance-db pg_dump -U postgres home_finance | gzip > "$BACKUP_DIR/$FILENAME"
echo "Backup complete: $BACKUP_DIR/$FILENAME ($(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1))"
