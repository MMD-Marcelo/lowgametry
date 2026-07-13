import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pingMotor, criarJob, statusJob, urlResultado, apagarJob, BASE_MOTOR } from './motor.js'

beforeEach(() => { global.fetch = vi.fn() })

describe('pingMotor', () => {
  it('devolve o corpo quando o motor responde', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ versao: '1', temCUDA: false, nucleos: 8, ocupado: false }) })
    expect(await pingMotor()).toEqual({ versao: '1', temCUDA: false, nucleos: 8, ocupado: false })
    expect(fetch).toHaveBeenCalledWith(`${BASE_MOTOR}/health`, expect.any(Object))
  })
  it('devolve null quando fetch falha (motor offline)', async () => {
    fetch.mockRejectedValue(new Error('conn refused'))
    expect(await pingMotor()).toBeNull()
  })
})

describe('criarJob', () => {
  it('faz POST multipart com fotos + config e devolve jobId', async () => {
    fetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({ jobId: 'abc' }) })
    const fotos = [{ nome: '001_a.jpg', blob: new Blob(['x']) }]
    const r = await criarJob(fotos, { faces: 5000 })
    expect(r).toEqual({ jobId: 'abc' })
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE_MOTOR}/jobs`)
    expect(opts.method).toBe('POST')
    expect(opts.body).toBeInstanceOf(FormData)
  })

  it('anexa cada foto com o nome prefixado (a ordem chega ao COLMAP)', async () => {
    fetch.mockResolvedValue({ ok: true, status: 202, json: async () => ({ jobId: 'abc' }) })
    const fotos = [
      { nome: '001_zebra.jpg', blob: new Blob(['z']) },
      { nome: '002_alpha.jpg', blob: new Blob(['a']) },
    ]
    await criarJob(fotos, {})
    const fd = fetch.mock.calls[0][1].body
    const nomes = fd.getAll('foto').map((f) => f.name)
    expect(nomes).toEqual(['001_zebra.jpg', '002_alpha.jpg'])
  })
  it('lança Error com status quando 409 (job em andamento)', async () => {
    fetch.mockResolvedValue({ ok: false, status: 409, json: async () => ({ erro: 'ocupado' }) })
    await expect(criarJob([], {})).rejects.toMatchObject({ status: 409 })
  })
})

describe('statusJob', () => {
  it('busca o status do job', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ estado: 'rodando', etapa: 'SfM', pct: 40, log: [] }) })
    expect(await statusJob('abc')).toMatchObject({ estado: 'rodando', pct: 40 })
    expect(fetch).toHaveBeenCalledWith(`${BASE_MOTOR}/jobs/abc`, expect.any(Object))
  })
})

describe('urlResultado', () => {
  it('monta a URL do resultado', () => {
    expect(urlResultado('abc', 'glb')).toBe(`${BASE_MOTOR}/jobs/abc/result.glb`)
    expect(urlResultado('abc', 'zip')).toBe(`${BASE_MOTOR}/jobs/abc/result.zip`)
  })
})

describe('apagarJob', () => {
  it('faz DELETE', async () => {
    fetch.mockResolvedValue({ ok: true, status: 204 })
    await apagarJob('abc')
    expect(fetch).toHaveBeenCalledWith(`${BASE_MOTOR}/jobs/abc`, expect.objectContaining({ method: 'DELETE' }))
  })
})
