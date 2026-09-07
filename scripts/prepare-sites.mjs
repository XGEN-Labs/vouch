import { cp, mkdir, readdir, rename } from 'node:fs/promises'

const distEntries = await readdir('dist')
await mkdir('dist/client', { recursive: true })
for (const entry of distEntries) {
  if (entry === 'client') continue
  await rename(`dist/${entry}`, `dist/client/${entry}`)
}
await mkdir('dist/server', { recursive: true })
await mkdir('dist/.openai/drizzle', { recursive: true })
await cp('sites-worker/index.js', 'dist/server/index.js')
await cp('server/memory.js', 'dist/server/memory.js')
await cp('server/matching.js', 'dist/server/matching.js')
await cp('.openai/drizzle', 'dist/.openai/drizzle', { recursive: true })
