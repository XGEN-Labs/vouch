import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// LLM 转发与联网检索都已经搬进 server/（生产由 Nginx 转给它）。
// 开发时这里只做一件事：把 /api 代理到本地跑着的同一个后端，
// 保证 dev 和线上走的是同一套代码路径。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VOUCH_DEV_API || 'http://127.0.0.1:8787'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5273,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: false, // 保持 Host，cookie 才能正确落在 localhost 上
        },
      },
    },
    build: {
      // 5MB 的 png/mp3 全部走文件，不要内联成 base64
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 900,
    },
    define: {
      __VOUCH_MODEL__: JSON.stringify(env.VOUCH_MODEL || 'claude-sonnet-5'),
    },
  }
})
