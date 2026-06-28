#!/bin/bash
# MaxTA ERP - Database Backup Script
# Phase 10: Production Deployment
# Usage: ./scripts/backup.sh [daily|weekly|manual]
# Cron: 0 2 * * * /home/ubuntu/maxta-erp/scripts/backup.sh daily

BACKUP_TYPE="${1:-manual}"
BACKUP_DIR="/home/ubuntu/maxta-erp/backups"
DB_USER="maxta_erp"
DB_PASS="MaxTA_ERP_2026!"
DB_NAME="maxta_erp"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_TYPE}_${DATE}.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting ${BACKUP_TYPE} backup..."

# Dump database with gzip compression
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --add-drop-table \
  2>/dev/null | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup complete: $BACKUP_FILE ($SIZE)"
  
  # Clean up old backups (keep last N days)
  find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
  DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} | wc -l)
  if [ "$DELETED" -gt 0 ]; then
    echo "[$(date)] Cleaned up $DELETED old backups (>${RETENTION_DAYS} days)"
  fi
  
  # Log success
  echo "${DATE},${BACKUP_TYPE},${SIZE},success" >> "${BACKUP_DIR}/backup.log"
else
  echo "[$(date)] ERROR: Backup failed!"
  echo "${DATE},${BACKUP_TYPE},0,failed" >> "${BACKUP_DIR}/backup.log"
  exit 1
fi

echo "[$(date)] Backup retention: keeping last ${RETENTION_DAYS} days"
echo "[$(date)] Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -5
