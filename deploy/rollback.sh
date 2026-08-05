#!/usr/bin/env bash
#
# 回滚到上一个发布版本：bash deploy/rollback.sh
# 数据库在 /var/lib/vouch 不随版本走，回滚不会丢用户数据。

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f deploy/deploy.env ]]; then
  echo "缺少 deploy/deploy.env" >&2
  exit 1
fi
# shellcheck disable=SC1091
source deploy/deploy.env
: "${SSH_HOST:?deploy.env 里要写 SSH_HOST}"

SSH_PORT="${SSH_PORT:-22}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/vouch}"

ssh -p "$SSH_PORT" "$SSH_HOST" bash -s <<REMOTE
set -euo pipefail
cd '$REMOTE_ROOT/releases'

current=\$(basename "\$(readlink -f '$REMOTE_ROOT/current')")
# 只有一个版本时 grep 匹配不到会返回非零，pipefail 下会让脚本静默退出，
# 那样下面那句「没得回滚」就永远看不到了，所以这里兜住
prev=\$(ls -1t | grep -v "^\$current\$" | head -n1 || true)

if [[ -z "\$prev" ]]; then
  echo "只有一个版本，没得回滚" >&2
  exit 1
fi

echo "\$current  ->  \$prev"
ln -sfn "$REMOTE_ROOT/releases/\$prev" '$REMOTE_ROOT/current'
systemctl restart vouch-api
sleep 2
curl -fsS --max-time 10 http://127.0.0.1:8787/api/health && echo ""
REMOTE

echo "已回滚"
