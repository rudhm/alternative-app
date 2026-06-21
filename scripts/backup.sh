#!/bin/bash
# backup.sh
# This script dumps the database and zips it along with the uploads directory.

BACKUP_DIR="/backup/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$BACKUP_DIR"

# Dump DB
docker exec cloud_messenger_db pg_dump -U postgres cloud_messenger > "$BACKUP_DIR/db.sql"

# Copy uploads
cp -r ./backend/uploads "$BACKUP_DIR/uploads"

# Compress
tar -czf "$BACKUP_DIR.tar.gz" -C "$BACKUP_DIR" .

# Cleanup uncompressed
rm -rf "$BACKUP_DIR"

# Note: You can add an OCI CLI command here to upload to Object Storage
# oci os object put -ns <namespace> -bn <bucket_name> --name "$(basename $BACKUP_DIR.tar.gz)" --file "$BACKUP_DIR.tar.gz"
