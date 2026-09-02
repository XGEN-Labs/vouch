import { handleGateway } from './gateway.mjs'

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}') } catch { return {} }
  }
  if (Buffer.isBuffer(req.body) && req.body.length) {
    try { return JSON.parse(req.body.toString('utf8') || '{}') } catch { return {} }
  }
  if (typeof req.on === 'function' && req.readable !== false && !req.complete) {
    const buf = await new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })
    if (!buf.length) return {}
    try { return JSON.parse(buf.toString('utf8')) } catch { return {} }
  }
  return {}
}

export async function api(req, res) {
  await handleGateway(req, res, { json: await readJson(req) })
}
