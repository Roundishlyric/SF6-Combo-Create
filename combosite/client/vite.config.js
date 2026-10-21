import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:3100',
      '/uploads': process.env.API_PROXY_TARGET || 'http://localhost:3100',
    },
  },
})
