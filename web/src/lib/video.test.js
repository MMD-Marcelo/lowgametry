import { describe, it, expect, vi } from 'vitest'
import { instantesDeAmostra, extrairFrames } from './video.js'

describe('instantesDeAmostra', () => {
  it('devolve `alvo` instantes espaçados dentro da duração', () => {
    const ts = instantesDeAmostra(10, 5)
    expect(ts).toHaveLength(5)
    expect(ts[0]).toBeGreaterThan(0)
    expect(ts[ts.length - 1]).toBeLessThan(10)
    // crescentes e espaçados
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1])
  })

  it('não pede mais frames do que segundos úteis', () => {
    // vídeo de 3s não deve gerar 80 frames quase idênticos
    expect(instantesDeAmostra(3, 80).length).toBeLessThanOrEqual(30)
  })

  it('devolve vazio para duração inválida', () => {
    expect(instantesDeAmostra(0, 10)).toEqual([])
    expect(instantesDeAmostra(NaN, 10)).toEqual([])
  })
})

describe('extrairFrames', () => {
  // fake do par video/canvas: cada seek "sucede" e devolve um blob nomeado
  function depsFake({ duracao = 8, falharEm = [] } = {}) {
    const seeks = []
    return {
      seeks,
      deps: {
        abrir: async () => ({ duracao }),
        capturar: async (_ctx, t) => {
          seeks.push(t)
          if (falharEm.includes(Math.round(t))) throw new Error('seeked timeout')
          return new Blob([`frame@${t}`], { type: 'image/jpeg' })
        },
        fechar: () => {},
      },
    }
  }

  it('extrai frames como File[] nomeados em ordem', async () => {
    const { deps } = depsFake({ duracao: 10 })
    const frames = await extrairFrames({}, { alvo: 4, ...deps })
    expect(frames).toHaveLength(4)
    expect(frames.every((f) => f instanceof File)).toBe(true)
    const nomes = frames.map((f) => f.name)
    expect(nomes).toEqual([...nomes].sort()) // já ordenados pelo nome
    expect(nomes[0]).toMatch(/^frame_0001/)
  })

  it('reporta progresso', async () => {
    const { deps } = depsFake()
    const aoProgresso = vi.fn()
    await extrairFrames({}, { alvo: 3, aoProgresso, ...deps })
    expect(aoProgresso).toHaveBeenCalled()
    expect(aoProgresso.mock.calls.at(-1)[0]).toBe(1) // termina em 100%
  })

  it('pula frames cuja captura falha (seeked que não dispara) e segue', async () => {
    // duracao 10, alvo 6 -> instantes ~[1.4,2.9,4.3,5.7,7.1,8.6]; falha em 2 deles
    const { deps } = depsFake({ duracao: 10, falharEm: [4, 6] })
    const frames = await extrairFrames({}, { alvo: 6, ...deps })
    expect(frames.length).toBeGreaterThan(0)
    expect(frames.length).toBeLessThan(6)
  })
})
