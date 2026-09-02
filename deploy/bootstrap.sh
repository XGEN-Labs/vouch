#!/usr/bin/env bash
#
# 在阿里云 ECS 上一次性安装运行环境。可重复执行（幂等）。
#
#   sudo bash bootstrap.sh vouch.example.com
#
# 做完这些事：装 Node / Nginx / 编译工具 → 建 vouch 用户和目录 →
# 生成 /opt/vouch/.env → 装 systemd 服务 → 写 Nginx 站点配置。
# 装完还没有代码，回本地跑 deploy/deploy.sh 发布。

set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "用法: sudo bash bootstrap.sh <已备案域名>" >&2
  exit 1
fi
if [[ $EUID -ne 0 ]]; then
  echo "需要 root：sudo bash bootstrap.sh $DOMAIN" >&2
  exit 1
fi

NODE_VERSION=20.18.1
APP_USER=vouch
APP_ROOT=/opt/vouch
DATA_DIR=/var/lib/vouch
# 放在 releases 外面，发版不会覆盖它
ENV_FILE="$APP_ROOT/.env"

say() { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m[!] %s\033[0m\n' "$*"; }

# ── 1. 包管理器 ──────────────────────────────────────────
say "检测系统"
if command -v apt-get >/dev/null 2>&1; then
  PKG=apt
elif command -v dnf >/dev/null 2>&1; then
  PKG=dnf
elif command -v yum >/dev/null 2>&1; then
  PKG=yum
else
  echo "不认识的发行版，只支持 apt / yum / dnf" >&2
  exit 1
fi
echo "包管理器: $PKG"

say "安装基础依赖（nginx、编译工具等）"
case $PKG in
  apt)
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    # sqlite3 是命令行工具，备份数据库要用；python3/make/g++ 是 better-sqlite3 万一要现场编译时用
    apt-get install -y -qq nginx curl tar xz-utils ca-certificates \
      python3 make g++ openssl sqlite3
    ;;
  *)
    $PKG install -y nginx curl tar xz ca-certificates \
      python3 make gcc-c++ openssl sqlite >/dev/null
    ;;
esac

# ── 2. Node.js ───────────────────────────────────────────
need_node=1
if command -v node >/dev/null 2>&1; then
  cur=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
  if [[ "$cur" -ge 20 ]]; then
    need_node=0
    echo "已有 Node $(node -v)，跳过安装"
  fi
fi

if [[ $need_node -eq 1 ]]; then
  say "安装 Node ${NODE_VERSION}"
  case "$(uname -m)" in
    x86_64)  NARCH=x64 ;;
    aarch64) NARCH=arm64 ;;
    *) echo "不支持的架构 $(uname -m)" >&2; exit 1 ;;
  esac
  # 走 npmmirror，国内 ECS 拉 nodejs.org 会很慢
  TARBALL="node-v${NODE_VERSION}-linux-${NARCH}.tar.xz"
  curl -fsSL --retry 3 -o "/tmp/${TARBALL}" \
    "https://cdn.npmmirror.com/binaries/node/v${NODE_VERSION}/${TARBALL}"
  mkdir -p /usr/local/lib/nodejs
  tar -xJf "/tmp/${TARBALL}" -C /usr/local/lib/nodejs
  rm -f "/tmp/${TARBALL}"
  NODE_HOME="/usr/local/lib/nodejs/node-v${NODE_VERSION}-linux-${NARCH}"
  ln -sf "${NODE_HOME}/bin/node" /usr/local/bin/node
  ln -sf "${NODE_HOME}/bin/npm"  /usr/local/bin/npm
  ln -sf "${NODE_HOME}/bin/npx"  /usr/local/bin/npx

  # Ubuntu 仓库的 nodejs 是 18，若系统预装过，上面的版本检测已经执行过 `node`，
  # bash 会把 /usr/bin/node 记进 hash 表，这里必须清掉再用绝对路径，
  # 否则 systemd 会被写上旧版 Node 的路径。
  hash -r 2>/dev/null || true
  NODE_BIN="${NODE_HOME}/bin/node"
  NPM_BIN="${NODE_HOME}/bin/npm"
else
  NODE_BIN="$(command -v node)"
  NPM_BIN="$(command -v npm)"
fi

echo "node: $NODE_BIN ($("$NODE_BIN" -v))"

say "npm 源指向 npmmirror"
"$NPM_BIN" config set registry https://registry.npmmirror.com --location=global

# better-sqlite3 的预编译二进制也走国内镜像，省掉现场编译。
# 这不是 npm 的官方配置项，npm 10 的 `config set` 会直接报错拒绝，
# 所以绕开它写进 .npmrc（prebuild-install 会读 npm_config_* 环境变量，npm 会把这行转成环境变量传下去）。
NPMRC="${HOME:-/root}/.npmrc"
MIRROR_LINE="better_sqlite3_binary_host_mirror=https://cdn.npmmirror.com/binaries/better-sqlite3"
if ! grep -qF "better_sqlite3_binary_host_mirror" "$NPMRC" 2>/dev/null; then
  echo "$MIRROR_LINE" >> "$NPMRC"
fi

# ── 3. 用户与目录 ────────────────────────────────────────
say "创建用户和目录"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_ROOT" --shell /usr/sbin/nologin "$APP_USER" 2>/dev/null \
    || useradd --system --home-dir "$APP_ROOT" --shell /sbin/nologin "$APP_USER"
fi
mkdir -p "$APP_ROOT/releases" "$DATA_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_ROOT" "$DATA_DIR"
# nginx 要能读到 dist，所以 others 需要 r-x
chmod 755 "$APP_ROOT"
chmod 750 "$DATA_DIR"

# ── 4. 环境变量文件 ──────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  say "$ENV_FILE 已存在，原样保留"
else
  say "生成 $ENV_FILE 模板（你可以直接用自己的 .env 覆盖它）"
  SECRET=$(openssl rand -hex 32)
  cat > "$ENV_FILE" <<EOF
# Vouch 生产配置。改完执行 systemctl restart vouch-api
# 这个文件在 releases 外面，发新版不会动它。
NODE_ENV=production
PORT=8787
HOST=127.0.0.1

VOUCH_JWT_SECRET=${SECRET}
VOUCH_DB_PATH=${DATA_DIR}/vouch.db

# ↓↓↓ 必填：你的 LLM 中转 Key ↓↓↓
VOUCH_API_KEY=
VOUCH_API_BASE=https://yibuapi.com
VOUCH_MODEL=claude-sonnet-5

# off | duckduckgo | bocha —— 国内节点连不上 DuckDuckGo，保持 off 或换 bocha
VOUCH_SEARCH_PROVIDER=off
VOUCH_BOCHA_KEY=

# 内测：必须有邀请码才能注册
VOUCH_OPEN_REGISTER=0

VOUCH_LLM_PER_MIN=12
VOUCH_LLM_PER_DAY=300
EOF
fi
# 无论新建还是沿用，都收紧权限：里面有 Key
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

# ── 5. systemd ───────────────────────────────────────────
say "安装 systemd 服务 vouch-api"
cat > /etc/systemd/system/vouch-api.service <<EOF
[Unit]
Description=Vouch API (八字陪伴 H5 后端)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_ROOT}/current
# 直接点名 .env 的位置。current 是软链，Node 解析后会落到 releases/<版本>，
# 靠相对路径往上找会摸错地方，所以这里写死。
Environment=VOUCH_ENV_FILE=${ENV_FILE}
ExecStart=${NODE_BIN} server/index.js
Restart=always
RestartSec=3

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${DATA_DIR}

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable vouch-api >/dev/null 2>&1 || true

# ── 6. Nginx ─────────────────────────────────────────────
say "写 Nginx 站点配置（$DOMAIN）"
if [[ -d /etc/nginx/sites-available ]]; then
  SITE=/etc/nginx/sites-available/vouch.conf
  LINK=/etc/nginx/sites-enabled/vouch.conf
else
  SITE=/etc/nginx/conf.d/vouch.conf
  LINK=""
fi

cat > "$SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${APP_ROOT}/current/dist;
    index index.html;

    client_max_body_size 2m;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_proxied any;
    # woff2 本身已经压缩过了，不放进来，省得白烧 CPU
    gzip_types text/plain text/css application/javascript application/json
               image/svg+xml;

    # 构建产物带内容 hash，可以放心长缓存。
    # 只用 add_header，不要再叠 expires —— 两者会各发一个 Cache-Control，
    # 重复头在某些代理上的取舍行为不确定。
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files \$uri =404;
    }
    location /fonts/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files \$uri =404;
    }

    # 外壳必须每次校验，否则发版后用户还拿着旧的资源引用
    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate";
        try_files \$uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        # LLM 一次回答可能要几十秒
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        proxy_buffering off;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# 写成 if，不要用 `[[ ... ]] && cmd`：LINK 为空时整行返回非零，set -e 会直接把脚本干掉
if [[ -n "$LINK" ]]; then
  ln -sf "$SITE" "$LINK"
fi
# Debian 默认站点会抢占 80 端口的 default_server
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# SELinux（Alibaba Cloud Linux / CentOS 常见）默认禁止 nginx 反向代理
if command -v setsebool >/dev/null 2>&1 && [[ "$(getenforce 2>/dev/null || echo Disabled)" == "Enforcing" ]]; then
  say "放开 SELinux 的 httpd 网络访问"
  setsebool -P httpd_can_network_connect 1 || warn "setsebool 失败，若 502 请手动处理"
fi

# ufw（Ubuntu 上的本机防火墙）。开着的话要放行 Nginx，否则安全组放行了也进不来。
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  say "ufw 是开着的，放行 Nginx"
  ufw allow 'Nginx Full' >/dev/null || warn "ufw allow 失败，若外网打不开请手动放行 80/443"
  ufw status | grep -i nginx || true
fi

nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx 2>/dev/null || systemctl restart nginx

# ── 7. 收尾提示 ──────────────────────────────────────────
cat <<EOF

$(printf '\033[32m环境装好了。\033[0m')

接下来按顺序做三件事：

  1) 配置（二选一）
     vi ${ENV_FILE}                              # 在刚生成的模板里补 VOUCH_API_KEY=
     或从本机传自己的：scp .env root@本机IP:${ENV_FILE}
     注意 VOUCH_DB_PATH 要指到 ${DATA_DIR}/vouch.db，别带本地的 VOUCH_SECURE_COOKIE=0

  2) 回你自己的电脑，发布代码
     cp deploy/deploy.env.example deploy/deploy.env   # 填 SSH_HOST 和 DOMAIN
     bash deploy/deploy.sh

  3) 开 HTTPS（发布完再做，certbot 需要能访问到站点）
     ${PKG} install -y certbot python3-certbot-nginx
     certbot --nginx -d ${DOMAIN}

另外别忘了：阿里云控制台的\033[33m安全组\033[0m要放行 80 和 443 端口，
域名解析记录要指到这台机器的公网 IP。
EOF
