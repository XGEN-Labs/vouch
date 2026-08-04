# Vouch._.

数字人陪伴 app 复刻 —— 用生日排八字，长出一只属于你的"小火苗"。

## 跑起来

```bash
npm install && npm run dev
```

打开 http://localhost:5273 。想重新经历一次"诞生"，访问 `/?reset`（profile 存在 localStorage）。

## 六个界面 / 交互流程

| 界面 | 说明 |
|---|---|
| 1 开场 | 一团模糊的光问你生日、出生地 |
| 2 排盘现身 | 变成没有脸的火苗，报出日主意象（如「丁火｜灯烛之火」）+ 性格解读 |
| 3 睁眼 | 闭眼弧线 + 土星环淡入，问你叫什么名字 |
| 4 命名 | 你给它取名，它睁眼，给出当前阶段的建议 |
| 5 主页 | 完整小火苗 + 记忆碎片 / 配对入口 |
| 6 配对 | 轨道图 + 两人日主五行生克解读，可继续加人 |

## 八字这块

排盘引擎 `src/bazi.js` 移植自玄境 `server/bazi.js`（lunar-javascript 本地计算，改 ES 模块、跑在浏览器里），
返回结构保持一致 —— 之后想换商用 API，只改 `computeBazi` 的实现即可。

人格化在 `src/data/persona.js`：

- `GAN_PROFILE` —— 十天干各自的意象名、本质、三句自述（丁火＝灯烛之火，甲木＝参天之木…）
- `toReading()` —— 排盘 → 角色卡（界面 2 用），含按月令生成的一句季节点评
- `phaseReading()` —— 按身强弱给"最近适合做什么"（界面 4 用）
- `pairReading()`（在 `views/Pairing.jsx`）—— 两人日主五行的生 / 克 / 比和

对话已接 Claude（`claude-sonnet-4-6`）：`Chat` 与配对群聊走 LLM，失败时模板兜底。

每次 LLM 请求会注入**当前时间上下文**（公历/时区/农历干支）。对话默认 `search: 'auto'`：提到今天/新闻/实时等会走 `/api/search`（DuckDuckGo）补充；也支持模型 `web_search` 工具调用。

开场解读接入 [bazi-skill](https://github.com/jinchenma94/bazi-skill)（`.claude/skills/bazi` + `src/data/bazi-skill`）：按四柱、调候、旺衰、五行偏枯生成，仍保持小火苗口吻。

复制 `.env.example` 为 `.env` 填入 Key，然后 `npm run dev`。请求经 Vite 代理 `/api/llm`，Key 不会打进前端包。

```bash
# 更新 bazi-skill
git -C .claude/skills/bazi pull
cp .claude/skills/bazi/references/*.md src/data/bazi-skill/
cp .claude/skills/bazi/SKILL.md src/data/bazi-skill/
```

## 结构

```
src/
  bazi.js               排盘引擎（移植自玄境）
  data/persona.js       日主人格化 + 解读话术
  components/
    Starfield.jsx       全屏星空 canvas
    Flame.jsx           小火苗角色（orb→flame→waking→awake 四态）
  views/
    Onboarding.jsx      界面 1–4 的对话状态机
    Home.jsx            界面 5
    Pairing.jsx         界面 6
    Memory.jsx          记忆碎片
```

## 还没做的

- BGM / 蜡烛燃烧音效（原设计稿标注了，需要音频素材）
- 主页三个圆点对应的另外两屏
- 出生时辰（现在只问了年月日，时柱按 0 点算，大运会不准）
- 配对里"木木"这个角色目前是写死的旁白
