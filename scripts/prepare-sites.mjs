import { cp, mkdir } from 'node:fs/promises'

await mkdir('dist/server', { recursive: true })
await mkdir('dist/.openai/drizzle', { recursive: true })
await cp('sites-worker/index.js', 'dist/server/index.js')
await cp('server/memory.js', 'dist/server/memory.js')
await cp('server/matching.js', 'dist/server/matching.js')
await cp('.openai/drizzle', 'dist/.openai/drizzle', { recursive: true })
