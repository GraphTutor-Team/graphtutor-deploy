import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    hmr: {
      clientPort: 5173,
      protocol: 'ws',
      overlay: false, // 禁用错误覆盖层，避免干扰
    },
    watch: {
      usePolling: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({
                error: '后端未连接',
                message: '请先在项目根目录运行: npm run server',
              }));
            }
          });
        },
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          // 将React相关库单独打包
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将图表库单独打包
          'chart-vendor': ['recharts'],
          // 将工具库单独打包
          'utils-vendor': ['axios'],
        },
      },
    },
    // 压缩优化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除console
        drop_debugger: true,
      },
    },
    // 块大小警告阈值
    chunkSizeWarningLimit: 1000,
    // 启用源码映射（生产环境可关闭）
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
    force: false,
  },
  cacheDir: 'node_modules/.vite',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
})
