#!/usr/bin/env bash
#
# 在本机执行：构建前端 → 打包 → 传到 ECS → 装依赖 → 切版本 → 重启 → 自检。
#
#   bash deploy/deploy.sh
#
# 每次发布是一个独立的 releases/<时间戳> 目录，current 软链指向它，
# 出问题用 deploy/rollback.sh 一条命令切回上一版。

set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=deploy/deploy.env

if [[ ! -f $ENV_FILE ]]; then
  echo "缺少 $ENV_FILE，先 cp deploy/deploy.env.example deploy/deploy.env 并填写" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

: "${SSH_HOST:?deploy.env 里要写 SSH_HOST}"
: "${DOMAIN:?deploy.env 里要写 DOMAIN}"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/vouch}"

SSH=(ssh -p "$SSH_PORT" "$SSH_HOST")
STAMP=$(date +%Y%m%d-%H%M%S)
RELEASE="$REMOTE_ROOT/releases/$STAMP"

say() { printf '\n\033[36m==> %s\033[0m\n' "$*"; }

# ── 1. 本地构建 ──────────────────────────────────────────
say "本地构建"
if [[ ! -d node_modules ]]; then
  npm ci
fi
npm run build
[[ -f dist/index.html ]] || { echo "构建产物不见了，中止" >&2; exit 1; }

# ── 2. 打包 ──────────────────────────────────────────────
say "打包"
TMPDIR_LOCAL=$(mktemp -d)
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT
TARBALL="$TMPDIR_LOCAL/release.tar.gz"
# COPYFILE_DISABLE：不然 macOS 会塞进 ._* 资源分叉文件，解包时刷一屏警告
COPYFILE_DISABLE=1 tar -czf "$TARBALL" dist server package.json package-lock.json
echo "包大小 $(du -h "$TARBALL" | cut -f1)"

# ── 3. 上传并安装 ────────────────────────────────────────
say "上传到 $SSH_HOST:$RELEASE"
"${SSH[@]}" "mkdir -p '$RELEASE'"
"${SSH[@]}" "tar -xzf - -C '$RELEASE'" < "$TARBALL"

say "安装生产依赖（服务器上）"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
export PATH=/usr/local/bin:\$PATH
cd '$RELEASE'
npm ci --omit=dev --no-audit --no-fund
chown -R vouch:vouch '$RELEASE'
REMOTE

# ── 4. 切版本并重启 ──────────────────────────────────────
say "切到新版本并重启"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail

# .env 在 releases 外面，不随发版走。没有它服务起不来，先拦一下。
if [[ ! -f '$REMOTE_ROOT/.env' ]]; then
  echo "服务器上缺 $REMOTE_ROOT/.env，先把配置文件传上去再发布：" >&2
  echo "  scp .env $SSH_HOST:$REMOTE_ROOT/.env" >&2
  exit 1
fi
chown root:vouch '$REMOTE_ROOT/.env' 2>/dev/null || true
chmod 640 '$REMOTE_ROOT/.env'

ln -sfn '$RELEASE' '$REMOTE_ROOT/current'
systemctl restart vouch-api
REMOTE

# ── 5. 自检 ──────────────────────────────────────────────
say "自检"
sleep 2
if ! "${SSH[@]}" "curl -fsS --max-time 10 http://127.0.0.1:8787/api/health"; then
  echo ""
  echo "健康检查没过。看日志：" >&2
  echo "  ssh -p $SSH_PORT $SSH_HOST journalctl -u vouch-api -n 50 --no-pager" >&2
  exit 1
fi
echo ""

# 只留最近 5 个版本，其余删掉（node_modules 很占地方）
"${SSH[@]}" "cd '$REMOTE_ROOT/releases' && ls -1t | tail -n +6 | xargs -r rm -rf"

say "发布完成 → https://$DOMAIN"
cat <<EOF

还没有邀请码的话，在服务器上生成：
  ssh -p $SSH_PORT $SSH_HOST "cd $REMOTE_ROOT/current && node server/cli.js invite new -n 20"
EOF
