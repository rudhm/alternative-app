#!/bin/bash
set -e
cd /home/ubuntu/cloud-messenger

echo "==> Migrating uploads..."
sudo rsync -av --delete ./backend/uploads/ /mnt/chat_data/uploads/
sudo chown -R ubuntu:ubuntu /mnt/chat_data/uploads

echo "==> Migrating PostgreSQL data..."
sudo rsync -av --delete /var/lib/docker/volumes/cloud-messenger_pgdata/_data/ /mnt/chat_data/pgdata/
sudo chown -R 999:999 /mnt/chat_data/pgdata

echo "==> Starting Docker containers..."
sudo docker compose up -d

echo "==> Migration complete!"
