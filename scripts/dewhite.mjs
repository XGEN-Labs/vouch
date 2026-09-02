// 把 SVG/PNG 里从边缘连通的近白色背景抠成透明，导出 PNG
// 用法: node scripts/dewhite.mjs <输入文件> <输出.png> [容差 0-255]
import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync } from 'node:fs'

const [inFile, outFile, tolArg] = process.argv.slice(2)
const tol = Number(tolArg || 18)
const buf = readFileSync(inFile)
const mime = inFile.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
const dataUrl = `data:${mime};base64,${buf.toString('base64')}`

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const page = await browser.newPage()
const out = await page.evaluate(async (src, tol) => {
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src })
  const w = img.naturalWidth, h = img.naturalHeight
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, w, h)
  const px = d.data
  const isWhite = (i) => px[i + 3] > 0 && px[i] >= 255 - tol && px[i + 1] >= 255 - tol && px[i + 2] >= 255 - tol
  // 从四边做 BFS，只清除与边缘连通的白色区域，保留角色身上的白
  const seen = new Uint8Array(w * h)
  const queue = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const p = y * w + x
    if (seen[p]) return
    seen[p] = 1
    if (isWhite(p * 4)) queue.push(p)
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (queue.length) {
    const p = queue.pop()
    px[p * 4 + 3] = 0
    const x = p % w, y = (p / w) | 0
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
  ctx.putImageData(d, 0, 0)
  return cv.toDataURL('image/png')
}, dataUrl, tol)
writeFileSync(outFile, Buffer.from(out.split(',')[1], 'base64'))
await browser.close()
console.log('saved', outFile)
