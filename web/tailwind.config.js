/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Chakra Petch', 'ui-monospace', 'monospace'],
      },
      // identidade lowgametry: verde #027b5b sobre preto #121212
      colors: {
        fundo: '#121212',
        cartao: '#171a19',
        linha: '#24463b',
        tinta: '#d6e8e0',
        muted: '#6f8f83',
        primaria: { DEFAULT: '#027b5b', escura: '#015c44', clara: '#0a241c' },
        fosforo: '#05c78e',
        erro: '#f87171',
      },
    },
  },
  plugins: [],
}
