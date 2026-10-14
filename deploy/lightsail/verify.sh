#!/usr/bin/env bash
set -euo pipefail
attempts=${1:-180}
for ((attempt = 1; attempt <= attempts; attempt++)); do
  if curl -fsS --max-time 3 http://127.0.0.1:8000/api/v1/health 2>/dev/null |
    node -e 'let text=""; process.stdin.on("data", c=>text+=c); process.stdin.on("end",()=>{try{const result=JSON.parse(text); process.exit(result.status==="ok" && result.db==="connected" ? 0 : 1)}catch{process.exit(1)}})'; then
    echo 'Vetify is responding and MongoDB is connected.'
    exit 0
  fi
  sleep 1
done
echo 'Backend readiness failed. Inspect: sudo journalctl -u vetify -n 100 --no-pager'
exit 1
