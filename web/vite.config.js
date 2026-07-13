import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5181,
    strictPort: false,
    fs: {
      allow: ['.', '../mock-motor'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    include: [
      '**/*.{test,spec}.?(c|m)[jt]s?(x)',
      '../mock-motor/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
  },
})
