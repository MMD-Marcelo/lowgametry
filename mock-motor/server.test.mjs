import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { iniciar } from './server.mjs'

let motor
beforeAll(async () => {
  // encurta a evolução do job (padrão de 4s é só pra UX do dev). Setado aqui, antes
  // de iniciar(), pra não depender da ordem de avaliação de módulo (imports são içados).
  process.env.LOWGAMETRY_MOCK_DUR_MS = '150'
  motor = await iniciar(8799)
}, 20000)
afterAll(async () => { await motor.fechar() }, 20000)

const base = 'http://127.0.0.1:8799'

it('/health responde com capacidades', async () => {
  const r = await fetch(`${base}/health`)
  const j = await r.json()
  expect(r.status).toBe(200)
  expect(j).toHaveProperty('versao')
  expect(j).toHaveProperty('nucleos')
})

it('POST /jobs cria job e GET /jobs/:id evolui até pronto', async () => {
  const fd = new FormData()
  fd.append('foto', new Blob(['x']), 'a.jpg')
  fd.append('config', JSON.stringify({ faces: 5000 }))
  const r = await fetch(`${base}/jobs`, { method: 'POST', body: fd })
  expect(r.status).toBe(202)
  const { jobId } = await r.json()
  expect(jobId).toBeTruthy()

  // espera evoluir
  let estado
  for (let i = 0; i < 60; i++) {
    const s = await (await fetch(`${base}/jobs/${jobId}`)).json()
    estado = s.estado
    if (estado === 'pronto') break
    await new Promise((res) => setTimeout(res, 200))
  }
  expect(estado).toBe('pronto')

  const glb = await fetch(`${base}/jobs/${jobId}/result.glb`)
  expect(glb.status).toBe(200)
  expect(Number(glb.headers.get('content-length'))).toBeGreaterThan(0)

  const zip = await fetch(`${base}/jobs/${jobId}/result.zip`)
  expect(zip.status).toBe(200)
  expect(zip.headers.get('content-type')).toBe('application/zip')
  const bytes = new Uint8Array(await zip.arrayBuffer())
  expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK') // assinatura de zip
  // timeout generoso: normalmente termina em ~250ms (dur=150), mas depende do relógio;
  // margem pra não estourar sob carga no CI mesmo se a env não for aplicada.
}, 20000)

it('POST /jobs concorrente devolve 409', async () => {
  const mk = () => { const fd = new FormData(); fd.append('config', '{}'); return fetch(`${base}/jobs`, { method: 'POST', body: fd }) }
  const a = await mk()
  const b = await mk()
  expect(a.status).toBe(202)
  expect(b.status).toBe(409)
})
