// 临时：从设计稿取像素颜色
import puppeteer from 'puppeteer-core'

const img = process.argv[2]
const points = JSON.parse(process.argv[3]) // [[x,y,label],...]

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--allow-file-access-from-files'],
})
await (await browser.pages())[0]?.close?.().catch(() => {})
const page = await browser.newPage()
await page.goto(`file://${img}`)
const res = await page.evaluate(async (src, pts) => {
  const im = new Image()
  im.src = src
  await im.decode()
  const c = document.createElement('canvas')
  c.width = im.width; c.height = im.height
  const ctx = c.getContext('2d')
  ctx.drawImage(im, 0, 0)
  return {
    size: [im.width, im.height],
    colors: pts.map(([x, y, label]) => {
      const d = ctx.getImageData(x, y, 1, 1).data
      const hex = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')
      return `${label} (${x},${y}): ${hex}`
    }),
  }
}, `file://${img}`, points)
console.log(res.size.join('x'))
res.colors.forEach((l) => console.log(l))
await browser.close()
