// 临时截图脚本：跳过引导后截取指定视图
import puppeteer from 'puppeteer-core'

const view = process.argv[2] || 'home'
const out = process.argv[3] || `/tmp/shot-${view}.png`
const baseUrl = process.env.SHOT_URL || 'http://localhost:5273/?reset'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-first-run'],
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
if (view === 'chatfull' || view === 'obreading') {
  // 拦截 LLM 请求，走本地兜底回复，方便截推荐卡
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    if (req.url().includes('/api/')) req.abort()
    else req.continue()
  })
}
await page.goto(baseUrl, { waitUntil: 'networkidle2' })
await page.waitForSelector('.skip-onboard', { timeout: 8000 })
if (view === 'obreading') {
  // 走完信息收集，等解读页的精灵出场
  const clickPill = async (text) => {
    await page.waitForFunction((t) => (
      [...document.querySelectorAll('.suggestions .suggestion')].some((b) => b.textContent.includes(t))
    ), { timeout: 20000 }, text)
    await page.evaluate((t) => {
      const btns = [...document.querySelectorAll('.suggestions .suggestion')]
      btns.find((b) => b.textContent.includes(t))?.click()
    }, text)
  }
  await page.waitForSelector('.wheel-confirm', { timeout: 20000 })
  await page.click('.wheel-confirm')
  await page.waitForSelector('.hour-skip', { timeout: 10000 })
  await page.click('.hour-skip')
  await clickPill('男')
  await page.waitForSelector('.inputbar input', { timeout: 10000 })
  await page.type('.inputbar input', '深圳')
  await page.keyboard.press('Enter')
  await page.waitForSelector('.ob-agent', { timeout: 30000 })
  await new Promise((r) => setTimeout(r, 2500))
  if (process.env.SHOT_OB_SCROLL) {
    await page.$eval('.scene-reading .transcript', (node, top) => {
      node.scrollTop = Number(top)
    }, process.env.SHOT_OB_SCROLL)
    await new Promise((r) => setTimeout(r, 350))
  }
  await page.screenshot({ path: out })
  await browser.close()
  console.log('saved', out)
  process.exit(0)
}
if (view === 'onboard' || view === 'onboarddate') {
  await page.waitForSelector('.date-entry', { timeout: 20000 })
  await new Promise((r) => setTimeout(r, view === 'onboarddate' ? 400 : 800))
  await page.screenshot({ path: out })
  await browser.close()
  console.log('saved', out)
  process.exit(0)
}
await page.click('.skip-onboard')
await page.waitForSelector('.home-actions', { timeout: 8000 })
await new Promise((r) => setTimeout(r, 1200))

if (view === 'groupmem') {
  await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem('vouch.profile'))
    const source = profile?.fragments?.find((fragment) => fragment.with?.includes('alex'))
    if (source) profile.fragments = [{ ...source, id: 'visual-mino', with: ['mino'] }, ...profile.fragments]
    localStorage.setItem('vouch.profile', JSON.stringify(profile))
  })
  await page.goto(baseUrl.replace(/\?.*$/, ''), { waitUntil: 'networkidle2' })
  await page.waitForSelector('.home-actions', { timeout: 8000 })
}

const nav = {
  home: null,
  namecard: '.home-rail-btn[aria-label="我的名片"]',
  memory: '.home-rail-btn[aria-label="记忆碎片"]',
  chat: null,
  relations: null,
}
const groupViews = {
  grouptaro: 'Taro',
  groupsora: 'Sora',
  groupmino: 'Mino',
  groupmomo: 'Momo',
  groupmem: 'Mino',
}
if (['chat','relations','chatfull','bigcard','slide', ...Object.keys(groupViews)].includes(view)) {
  const label = view === 'relations' || groupViews[view] ? '串门' : '聊'
  await page.evaluate((t) => {
    const btns = [...document.querySelectorAll('.home-actions button')]
    btns.find((b) => b.textContent.includes(t))?.click()
  }, label)
  await new Promise((r) => setTimeout(r, 2200))
  if (groupViews[view]) {
    await page.click(`.galaxy-node[aria-label="${groupViews[view]}"]`)
    await page.waitForSelector('.room-screen--group', { timeout: 8000 })
    await new Promise((r) => setTimeout(r, Number(process.env.SHOT_ROOM_WAIT || 800)))
    if (view === 'groupmem') {
      await page.click('.dm-info')
      await page.waitForSelector('.dm-mem-card', { timeout: 8000 })
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  if (view === 'chatfull') {
    await page.type('.chat-inputbar input', '最近想找人一起去爬山')
    await page.keyboard.press('Enter')
    await new Promise((r) => setTimeout(r, 4500))
  }
  if (view === 'bigcard') {
    await page.click('.person-card--chat')
    await new Promise((r) => setTimeout(r, 800))
  }
  if (view === 'slide') {
    await page.click('.person-card--chat')
    await new Promise((r) => setTimeout(r, 800))
    const knob = await page.$('.bigcard-cta-ic')
    const box = await knob.boundingBox()
    const startX = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(startX, y)
    await page.mouse.down()
    for (let x = startX; x < startX + 240; x += 24) {
      await page.mouse.move(x, y)
      await new Promise((r) => setTimeout(r, 16))
    }
    await page.mouse.up()
    await new Promise((r) => setTimeout(r, 1500))
  }
} else if (view === 'ncpreview') {
  await page.click(nav.namecard)
  await new Promise((r) => setTimeout(r, 1200))
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.namecard-footer button')]
    btns.find((b) => b.textContent.includes('预览'))?.click()
  })
  await new Promise((r) => setTimeout(r, 800))
} else if (view === 'homepull') {
  // 等到拉台灯的时间点（时间线约 38%）
  await new Promise((r) => setTimeout(r, 5000))
} else if (nav[view]) {
  await page.click(nav[view])
  await new Promise((r) => setTimeout(r, 1200))
}

await page.screenshot({ path: out })
await browser.close()
console.log('saved', out)
