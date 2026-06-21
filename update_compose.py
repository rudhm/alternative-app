import re

with open('docker-compose.yml', 'r') as f:
    content = f.read()

# 1. Update backend volumes
content = content.replace(
    '- ./backend/uploads:/app/uploads',
    '- /mnt/chat_data/uploads:/app/uploads'
)

# 2. Update pgdata volume definition
pgdata_replacement = """  pgdata:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/chat_data/pgdata"""

content = re.sub(
    r'  pgdata:\s*$',
    pgdata_replacement,
    content,
    flags=re.MULTILINE
)

with open('docker-compose.yml', 'w') as f:
    f.write(content)

