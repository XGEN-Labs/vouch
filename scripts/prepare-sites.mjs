import { cp, mkdir, readdir, rename } from 'node:fs/promises'

const distEntries = await readdir('dist')
await mkdir('dist/client', { recursive: true })
for (const entry of distEntries) {
  if (entry === 'client') continue
  await rename(`dist/${entry}`, `dist/client/${entry}`)
}
// Give the desktop data board real static entry points. This prevents the
// hosting layer from treating /admin as an unknown SPA route and rewriting it
// to the consumer app homepage.
await mkdir('dist/client/admin', { recursive: true })
await cp('dist/client/index.html', 'dist/client/admin.html')
await cp('dist/client/index.html', 'dist/client/admin/index.html')
await mkdir('dist/server', { recursive: true })
await mkdir('dist/.openai/drizzle', { recursive: true })
await cp('sites-worker/index.js', 'dist/server/index.js')
await cp('server/memory.js', 'dist/server/memory.js')
await cp('server/matching.js', 'dist/server/matching.js')
await cp('.openai/drizzle', 'dist/.openai/drizzle', { recursive: true })
