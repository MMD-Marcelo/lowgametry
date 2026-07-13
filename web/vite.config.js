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
    // só os testes do app aqui — é o que roda no CI do Pages. O mock-motor é
    // ferramenta de dev e roda à parte (`npm run test:mock`); o server dele usa
    // o http do Node e pendura sob o fetch/undici do CI (socket keep-alive).
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
