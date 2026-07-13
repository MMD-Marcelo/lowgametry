# lowgametry — web

Site (UI) do lowgametry. Fala só com o motor local em `127.0.0.1`.

## Dev
- `npm install`
- `npm run mock` — sobe o motor mock (127.0.0.1:8757)
- `npm run dev` — site em http://localhost:5173
- `npm test` — testes (Vitest)
- `npm run build` — build de produção (deploy no GitHub Pages)

O contrato da ponte com o motor está em `src/lib/motor.js` e na spec em
`docs/superpowers/specs/`.
