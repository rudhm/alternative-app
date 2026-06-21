#!/bin/bash
set -e

echo "==> Formatting /dev/sdb as ext4..."
sudo mkfs.ext4 -F /dev/sdb

echo "==> Creating mount point /mnt/chat_data..."
sudo mkdir -p /mnt/chat_data

echo "==> Mounting /dev/sdb..."
sudo mount /dev/sdb /mnt/chat_data

echo "==> Configuring /etc/fstab..."
UUID=$(sudo blkid -s UUID -o value /dev/sdb)
if ! grep -q "$UUID" /etc/fstab; then
  echo "UUID=$UUID /mnt/chat_data ext4 defaults,noatime,_netdev 0 2" | sudo tee -a /etc/fstab
fi

echo "==> Creating directories..."
sudo mkdir -p /mnt/chat_data/pgdata
sudo mkdir -p /mnt/chat_data/uploads

echo "==> Stopping Docker containers..."
cd /home/ubuntu/cloud-messenger
sudo docker compose down

echo "==> Pulling latest git changes (with new docker-compose.yml)..."
git pull origin master

echo "==> Migrating uploads..."
sudo rsync -av --delete ./backend/uploads/ /mnt/chat_data/uploads/
sudo chown -R ubuntu:ubuntu /mnt/chat_data/uploads

echo "==> Migrating PostgreSQL data..."
sudo rsync -av --delete /var/lib/docker/volumes/cloud-messenger_pgdata/_data/ /mnt/chat_data/pgdata/
# Postgres runs as postgres user inside container (uid 999 usually), but let's just preserve owner
sudo chown -R 999:999 /mnt/chat_data/pgdata

echo "==> Starting Docker containers..."
sudo docker compose up -d

echo "==> Migration complete!"
