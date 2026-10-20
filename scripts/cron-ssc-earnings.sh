#!/bin/bash
# ==============================================================================
# ValueX - SSC BCTC Earnings Crawler Cronjob
# Tự động kích hoạt cào BCTC mới công bố trên UBCKNN (SSC) lúc 8h và 17h
# ==============================================================================

LOG_DIR="/home/ubuntu/valuex/logs"
LOG_FILE="$LOG_DIR/ssc-cron.log"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$TIMESTAMP] === Starting Scheduled SSC Earnings Crawl ===" >> "$LOG_FILE"

# Gọi nội bộ vào Next.js server đang chạy trên VPS (cổng 3000)
RESPONSE=$(curl -s -X POST http://localhost:3000/api/cron/crawl-ssc-earnings \
  -H "Content-Type: application/json" \
  -H "User-Agent: ValueX-CronWorker/1.0" \
  --max-time 180)

echo "[$TIMESTAMP] Result: $RESPONSE" >> "$LOG_FILE"
echo "[$TIMESTAMP] === Completed SSC Earnings Crawl ===" >> "$LOG_FILE"
