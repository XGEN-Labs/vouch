import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function searchPlugin() {
  return {
    name: 'vouch-search',
    configureServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        try {
          const u = new URL(req.url, 'http://localhost')
          const q = (u.searchParams.get('q') || '').trim()
          if (!q) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ results: [], error: 'missing q' }))
            return
          }

          // DuckDuckGo Instant Answer（免 key；结果偏摘要/百科）
          const ddg = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
            { headers: { 'User-Agent': 'VouchApp/0.1' } }
          )
          const data = await ddg.json()
          const results = []

          if (data.AbstractText) {
            results.push({
              title: data.Heading || q,
              snippet: data.AbstractText,
              url: data.AbstractURL || '',
            })
          }
          for (const t of data.RelatedTopics || []) {
            if (t.Text) {
              results.push({
                title: (t.Text || '').split(' - ')[0] || '相关',
                snippet: t.Text,
                url: t.FirstURL || '',
              })
            } else if (Array.isArray(t.Topics)) {
              for (const x of t.Topics.slice(0, 3)) {
                if (x.Text) {
                  results.push({
                    title: (x.Text || '').split(' - ')[0] || '相关',
                    snippet: x.Text,
                    url: x.FirstURL || '',
                  })
                }
              }
            }
            if (results.length >= 6) break
          }

          // 兜底：再抓一页 HTML 摘要（DDG lite）
          if (results.length < 2) {
            try {
              const htmlRes = await fetch(
                `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
                { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VouchBot/0.1)' } }
              )
              const html = await htmlRes.text()
              const re = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
              let m
              while ((m = re.exec(html)) && results.length < 5) {
                const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
                results.push({
                  title: strip(m[2]),
                  snippet: strip(m[3]),
                  url: m[1],
                })
              }
            } catch { /* ignore html fallback */ }
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ query: q, results }))
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ results: [], error: String(e?.message || e) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VOUCH_API_BASE || 'http://120.79.247.245:3000'
  const apiKey = env.VOUCH_API_KEY || ''

  return {
    plugins: [react(), searchPlugin()],
    server: {
      host: true,
      port: 5273,
      proxy: {
        '/api/llm': {
          target: apiBase,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/llm/, '/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (apiKey) proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
            })
          },
        },
      },
    },
    define: {
      __VOUCH_MODEL__: JSON.stringify(env.VOUCH_MODEL || 'claude-sonnet-4-6'),
    },
  }
})
