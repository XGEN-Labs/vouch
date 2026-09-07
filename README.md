# Vouch._.

数字人陪伴 app —— 用生日排八字 / 星盘，长出一只属于你的守护灵，再去串门认识别人。

[![演示](demovideo/preview.gif)](https://github.com/XGEN-Labs/vouch/blob/main/demovideo/demo.mp4)

[完整演示视频（3 分 26 秒）](https://github.com/XGEN-Labs/vouch/blob/main/demovideo/demo.mp4)

## 跑起来

```bash
npm install
cp .env.example .env      # 填 VOUCH_API_KEY 和邀请码
npm run dev
```

打开 http://localhost:5273 。想重新经历一次「诞生」，访问 `/?reset`（只清 profile，邀请码还在）。

## 界面

| 界面 | 说明 |
|---|---|
| 邀请码 | 进屋里先对暗号 |
| 开场 | 问生日、时辰、出生地，排出八字 / 星盘 |
| 解读 | 日主系名 + 本质 + 天赋，小火苗口吻 |
| 命名 | 给守护灵取名 |
| 主页 | 治愈风精灵 + 名片 / 记忆碎片 / 聊天 / 串门 |
| 聊天 | 和自己的守护灵说话，也能被介绍认识别人 |
| 串门 | 空间感房间，和朋友以及两边的 agent 一起聊 |
| 名片 | 社交标签（含日主天赋）、简介、记忆 |

## 八字这块

排盘引擎 `src/bazi.js` 移植自玄境（lunar-javascript 本地计算）。人格化在 `src/data/persona.js`：

- `GAN_PROFILE` —— 十天干的系名、本质、天赋、三句自述
- `toReading()` —— 排盘 → 开场解读
- `phaseReading()` —— 当下阶段建议

对话走 Gemini（`gemini-2.5-flash`，可在 `.env` 改 `VOUCH_MODEL`）。请求经本地 `/api/llm` 代理，Key 不会打进前端包。

```bash
# 更新 bazi-skill
git -C .claude/skills/bazi pull
cp .claude/skills/bazi/references/*.md src/data/bazi-skill/
cp .claude/skills/bazi/SKILL.md src/data/bazi-skill/
```

## 账号后端（可选）

仓库里还有 `server/` + `deploy/`：邀请码注册、账号密码、SQLite 存档案，方便换设备找回火苗。开发时可 `npm run dev:full` 同时起前端和 8787。邀请码：

```bash
node server/cli.js invite new -n 1
```

部署步骤见 [`deploy/README.md`](deploy/README.md)。

登录后，用户资料会以 `vouch-integrated/v2` 结构保存在后端，顶层与模拟数据保持一致：
`00_Core_Profile` 至 `06_User_Summary`。记忆碎片进入
`01_Self_Memory.experience.记忆碎片`，并同时写入权限判定；明确私密、敏感推断、
第三方隐私、身份信息和敏感事件不会显示在用户端，也不会进入匹配。

团队数据看板位于 `/admin`。在服务端设置 `VOUCH_ADMIN_KEY` 后，用该访问码进入，
可以查看注册/活跃/建档数据、记忆可见性、用户结构化记录和匹配结果。管理访问码不要写进前端或提交到仓库。
