import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleGateway } from './functions/gateway.mjs'

function bufferBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function parseJson(buf) {
  if (!buf?.length) return {}
  try { return JSON.parse(buf.toString('utf8')) } catch { return {} }
}

function gatewayPlugin() {
  return {
    name: 'vouch-gateway',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/api/')) return next()
        try {
          const buf = req.method === 'POST' || req.method === 'PUT' ? await bufferBody(req) : Buffer.alloc(0)
          await handleGateway(req, res, { body: buf.toString('utf8'), json: parseJson(buf) })
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(e?.message || e) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const k of ['VOUCH_API_KEY', 'VOUCH_API_BASE', 'VOUCH_MODEL', 'VOUCH_INVITE_CODE', 'VOUCH_INVITE_CODES']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k]
  }

  return {
    plugins: [react(), gatewayPlugin()],
    server: {
      host: true,
      port: 5273,
    },
    define: {
      __VOUCH_MODEL__: JSON.stringify(env.VOUCH_MODEL || 'gemini-2.5-flash'),
    },
  }
})
