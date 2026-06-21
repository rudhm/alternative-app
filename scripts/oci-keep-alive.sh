#!/bin/bash
# =============================================================================
# Oracle Cloud Anti-Idle Script — CPU Burn (SHA-256 Hash Computation)
# =============================================================================
# Oracle reclaims Always Free instances that show near-zero CPU/Memory
# utilization over a 7-day rolling average. This script spikes the CPU
# by computing SHA-256 hashes for ~3-5 minutes every 24 hours.
#
# INSTALLATION (run once on the Oracle VM):
#   chmod +x /path/to/oci-keep-alive.sh
#   (crontab -l 2>/dev/null; echo "0 4 * * * /path/to/oci-keep-alive.sh") | crontab -
#
# This schedules the burn at 4:00 AM daily. Adjust the hour as needed.
# =============================================================================

LOG_FILE="/var/log/keep-alive.log"
DURATION_SECONDS=180  # 3 minutes of sustained CPU burn

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Anti-idle burn started (${DURATION_SECONDS}s)" >> "$LOG_FILE"

# Spawn a CPU-intensive process for the configured duration.
# `dd` pipes random bytes into `sha256sum` in a tight loop.
# `timeout` guarantees it will not run longer than intended.
timeout "${DURATION_SECONDS}" bash -c '
  while true; do
    dd if=/dev/urandom bs=1M count=10 2>/dev/null | sha256sum > /dev/null
  done
'

# Brief memory spike (~200MB for 5 seconds) to register on memory metrics.
python3 -c "
a = [0] * 50_000_000  # ~200MB
import time
time.sleep(5)
del a
" 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Anti-idle burn completed" >> "$LOG_FILE"
