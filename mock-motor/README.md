# motor mock (lowgametry)

Servidor Node sem dependências que implementa o contrato da ponte do motor real,
devolvendo um `.glb` demo. Serve pra desenvolver e testar o site sem o motor.

- `node mock-motor/server.mjs` → sobe em http://127.0.0.1:8757
- ou `cd web && npm run mock`

Gerar/atualizar o modelo demo: `cd web && node ../mock-motor/gerar-demo.mjs`.
