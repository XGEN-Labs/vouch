# 部署手册

单台阿里云 ECS 全包：Nginx 托静态 + Node 后端 + SQLite。不需要买 RDS、OSS、CDN、SLB。

```
手机浏览器 ──HTTPS──> Nginx ──┬─ /       → /opt/vouch/current/dist  静态文件
                              └─ /api/*  → 127.0.0.1:8787 (systemd: vouch-api)
                                            └─ SQLite  /var/lib/vouch/vouch.db
                                            └─ LLM 转发到你的中转（Key 只在服务端）
```

## 首次上线

前置：域名已备案并解析到 ECS 公网 IP；安全组放行 80 / 443。

**1. 装环境（在 ECS 上，一次性）**

```bash
scp deploy/bootstrap.sh root@你的IP:/tmp/
ssh root@你的IP "bash /tmp/bootstrap.sh vouch.example.com"
```

装 Node 20 + Nginx + 编译工具，建 `vouch` 用户和目录，生成随机 JWT 密钥，
写好 systemd 服务和 Nginx 站点配置。可以重复执行，不会覆盖已有的 `/opt/vouch/.env`。

**2. 传配置文件**

配置放在 `/opt/vouch/.env`，**在 releases 外面，发新版不会覆盖它**。
bootstrap 会生成一份带随机 JWT 密钥的模板，你也可以直接用自己的覆盖：

```bash
scp .env root@你的IP:/opt/vouch/.env
ssh root@你的IP "chown root:vouch /opt/vouch/.env && chmod 640 /opt/vouch/.env"
```

传自己的 `.env` 时注意这几项和本地不一样：

```ini
VOUCH_JWT_SECRET=<换成随机值，openssl rand -hex 32>
VOUCH_DB_PATH=/var/lib/vouch/vouch.db
VOUCH_API_KEY=<你的中转 Key>
# 本地那句 VOUCH_SECURE_COOKIE=0 千万别带上线，会让 cookie 明文传输
```

**3. 发布（在本机）**

```bash
cp deploy/deploy.env.example deploy/deploy.env
vi deploy/deploy.env         # 填 SSH_HOST 和 DOMAIN
bash deploy/deploy.sh
```

发布前会检查 `/opt/vouch/.env` 是否存在，缺了会直接拦下来并提示，不会把服务重启成失败状态。

构建 → 打包 → 上传到 `releases/<时间戳>` → 装生产依赖 → 切 `current` 软链 → 重启 → 健康检查。

**4. 开 HTTPS（在 ECS 上）**

```bash
apt install -y certbot python3-certbot-nginx   # 或 yum install
certbot --nginx -d vouch.example.com
```

certbot 会自己改 Nginx 配置加 443 并配好自动续期。
用阿里云免费证书也行：下载 nginx 格式，传到 `/etc/nginx/ssl/`，手动加 `listen 443 ssl;` 段。

> HTTPS 是必须的，不是可选项：登录 cookie 带 `Secure` 属性，纯 HTTP 下浏览器不会回传，
> 表现就是「登录成功但立刻又被踢回登录页」。

**5. 导入邀请码**

第一批 100 个码已经生成在本机 `invites/batch-01.txt`（每行一个，一码一用）。
传上去导入生产库：

```bash
scp invites/batch-01.txt root@你的IP:/tmp/batch-01.txt
ssh root@你的IP "cd /opt/vouch/current && node server/cli.js invite import /tmp/batch-01.txt --note '内测第一批'"
```

导入是幂等的，重复执行只会跳过已存在的码，不会报错。
也可以直接在服务器上现生成新的一批：

```bash
ssh root@你的IP "cd /opt/vouch/current && node server/cli.js invite new -n 50 --note '第二批'"
```

码发给内测用户，他们在登录页点「第一次来？我有邀请码」注册。

## 日常操作

| 要做什么 | 命令 |
|---|---|
| 发新版本 | `bash deploy/deploy.sh` |
| 回滚上一版 | `bash deploy/rollback.sh` |
| 看日志 | `journalctl -u vouch-api -f` |
| 重启后端 | `systemctl restart vouch-api` |
| 改配置 | 改 `/opt/vouch/.env` 后 `systemctl restart vouch-api` |
| 生成邀请码 | `cd /opt/vouch/current && node server/cli.js invite new -n 10` |
| 查邀请码 | `node server/cli.js invite list` |
| 停用某个码 | `node server/cli.js invite disable ABCD1234` |
| 看有多少人 | `node server/cli.js stats` |
| 备份数据 | `sqlite3 /var/lib/vouch/vouch.db ".backup /root/vouch-$(date +%F).db"` |

数据库在 `/var/lib/vouch/`，不随版本发布走，回滚不会丢用户数据。
每次发布保留最近 5 个版本，更早的自动清理。

**建议加个定时备份**（内测阶段数据量很小）：

```bash
echo '0 4 * * * sqlite3 /var/lib/vouch/vouch.db ".backup /var/lib/vouch/backup-$(date +\%F).db" && find /var/lib/vouch -name "backup-*.db" -mtime +14 -delete' | crontab -
```

## 配置项

全在 `/opt/vouch/.env`，改完重启生效。

| 变量 | 说明 |
|---|---|
| `VOUCH_JWT_SECRET` | 登录令牌签名密钥。bootstrap 随机生成。**改了所有人会被登出。** |
| `VOUCH_API_KEY` / `VOUCH_API_BASE` / `VOUCH_MODEL` | LLM 中转的 Key、地址、模型 |
| `VOUCH_SEARCH_PROVIDER` | `off`（默认）/ `duckduckgo` / `bocha` |
| `VOUCH_OPEN_REGISTER` | `1` = 不用邀请码也能注册。内测保持 `0` |
| `VOUCH_LLM_PER_MIN` / `VOUCH_LLM_PER_DAY` | 每个用户的调用上限，默认 12/分、300/天 |
| `VOUCH_TOKEN_DAYS` | 登录保持天数，默认 30 |

## 排查

**打开是 502** — 后端没起来。`journalctl -u vouch-api -n 50`。
常见原因：`/opt/vouch/.env` 没传，或里面 `VOUCH_JWT_SECRET` 是空的（后端会主动拒绝启动）。
若是 CentOS / Alibaba Cloud Linux，也可能是 SELinux 挡了反向代理：
`setsebool -P httpd_can_network_connect 1`。

**域名完全打不开、curl 一直卡住** — 网络层被挡了，不是应用的问题。按顺序查：
阿里云控制台安全组有没有放行 80/443 → Ubuntu 上 `ufw status`，
active 的话执行 `ufw allow 'Nginx Full'`（bootstrap 会自动处理，手动开过 ufw 的要补）
→ `dig +short 你的域名` 是不是这台机器的公网 IP。

**登录成功又被弹回登录页** — 站点还是 HTTP。要么配好 HTTPS，
要么临时在 `/opt/vouch/.env` 里加 `VOUCH_SECURE_COOKIE=0`（仅调试用，生产别这么干）。

**火苗只会说套话** — LLM 请求失败了，前端在走模板兜底。
`journalctl -u vouch-api | grep '\[llm\]'` 看上游返回什么，多半是 Key 没填或中转不通。

**问「今天」相关的问题答不准** — 检索默认关着（`VOUCH_SEARCH_PROVIDER=off`）。
阿里云国内节点连不上 DuckDuckGo，要联网能力就改用 `bocha` 并填 `VOUCH_BOCHA_KEY`。

**发版后用户还是旧页面** — `index.html` 已配 `no-cache`，正常刷新即可。
若用户在微信里打开，可能是微信自己的 WebView 缓存，让对方下拉刷新或重开。

## 将来转正要动的地方

内测这套的边界很清楚，转正时按需替换，前端都不用改：

- **SQLite → RDS MySQL**：只改 `server/db.js` 里的函数体，接口不变。
- **单机 → 多实例**：`server/rateLimit.js` 的内存计数换成 Redis；SQLite 必须先换掉。
- **加手机号登录**：`users` 表加 `phone` 字段，`server/auth.js` 加一条短信验证码路径，
  邀请码注册照旧保留。
- **静态资源提速**：`dist/assets` 传 OSS + CDN，Nginx 只留 `/api`。
  现在 5MB 的图和音频走 ECS 带宽，用户多了会慢。
