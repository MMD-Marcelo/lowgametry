import { describe, it, expect } from 'vitest'
import { criarFoto, ordenarInicial, mover, alternar, marcarBorradas, paraEnvio, avisos } from './fotos.js'

const foto = (over = {}) => criarFoto({ nome: 'x.jpg', blob: new Blob(['x']), ...over })

describe('ordenarInicial', () => {
  it('ordena por data de EXIF (mais antiga primeiro)', () => {
    const a = foto({ nome: 'b.jpg', data: new Date(2021, 0, 1, 12, 0, 2) })
    const b = foto({ nome: 'a.jpg', data: new Date(2021, 0, 1, 12, 0, 1) })
    const r = ordenarInicial([a, b])
    expect(r.map((f) => f.nome)).toEqual(['a.jpg', 'b.jpg'])
  })

  it('cai pro nome quando não há data', () => {
    const a = foto({ nome: 'foto2.jpg', data: null })
    const b = foto({ nome: 'foto1.jpg', data: null })
    expect(ordenarInicial([a, b]).map((f) => f.nome)).toEqual(['foto1.jpg', 'foto2.jpg'])
  })

  it('põe fotos com data antes das sem data', () => {
    const semData = foto({ nome: 'a.jpg', data: null })
    const comData = foto({ nome: 'z.jpg', data: new Date(2020, 0, 1) })
    expect(ordenarInicial([semData, comData]).map((f) => f.nome)).toEqual(['z.jpg', 'a.jpg'])
  })
})

describe('mover', () => {
  it('reordena um item de uma posição para outra', () => {
    const fs = [foto({ nome: '1' }), foto({ nome: '2' }), foto({ nome: '3' })]
    expect(mover(fs, 0, 2).map((f) => f.nome)).toEqual(['2', '3', '1'])
  })
})

describe('alternar', () => {
  it('inclui/exclui a foto do id dado sem mexer nas outras', () => {
    const a = foto({ nome: 'a' })
    const b = foto({ nome: 'b' })
    const r = alternar([a, b], a.id)
    expect(r.find((f) => f.id === a.id).incluida).toBe(false)
    expect(r.find((f) => f.id === b.id).incluida).toBe(true)
  })
})

describe('marcarBorradas', () => {
  it('desmarca as fotos abaixo do limiar, sem removê-las', () => {
    const nitida = foto({ nome: 'n', nitidez: 100 })
    const borrada = foto({ nome: 'b', nitidez: 5 })
    const r = marcarBorradas([nitida, borrada], 10)
    expect(r).toHaveLength(2)
    expect(r.find((f) => f.nome === 'n').incluida).toBe(true)
    expect(r.find((f) => f.nome === 'b').incluida).toBe(false)
  })

  it('ignora fotos sem nota de nitidez', () => {
    const semNota = foto({ nome: 's', nitidez: null })
    expect(marcarBorradas([semNota], 10)[0].incluida).toBe(true)
  })
})

describe('paraEnvio', () => {
  it('numera com prefixo NNN_ na ordem atual', () => {
    const fs = [foto({ nome: 'zebra.jpg' }), foto({ nome: 'alpha.jpg' })]
    expect(paraEnvio(fs).map((e) => e.nome)).toEqual(['001_zebra.jpg', '002_alpha.jpg'])
  })

  it('inclui só as marcadas, renumerando sem buracos', () => {
    const fs = [foto({ nome: 'a.jpg' }), foto({ nome: 'b.jpg', incluida: false }), foto({ nome: 'c.jpg' })]
    expect(paraEnvio(fs).map((e) => e.nome)).toEqual(['001_a.jpg', '002_c.jpg'])
  })

  it('sana o nome do arquivo (só base, sem caminho)', () => {
    const fs = [foto({ nome: 'pasta/sub/foto 1.jpg' })]
    expect(paraEnvio(fs)[0].nome).toBe('001_foto_1.jpg')
  })

  it('leva o blob de cada foto', () => {
    const b = new Blob(['dados'])
    expect(paraEnvio([foto({ nome: 'a.jpg', blob: b })])[0].blob).toBe(b)
  })
})

describe('avisos', () => {
  it('avisa quando há menos de 15 fotos incluídas', () => {
    const fs = Array.from({ length: 10 }, (_, i) => foto({ nome: `${i}.jpg` }))
    expect(avisos(fs).some((a) => /15/.test(a))).toBe(true)
  })

  it('avisa quando alguma foto não tem EXIF', () => {
    const fs = [foto({ nome: 'a.jpg', data: new Date() }), foto({ nome: 'b.jpg', data: null })]
    expect(avisos(fs).some((a) => /EXIF/i.test(a))).toBe(true)
  })

  it('avisa quando nenhuma foto está incluída', () => {
    const fs = [foto({ nome: 'a.jpg', incluida: false })]
    expect(avisos(fs).some((a) => /nenhuma/i.test(a))).toBe(true)
  })

  it('não inventa avisos quando está tudo bem', () => {
    const fs = Array.from({ length: 20 }, (_, i) => foto({ nome: `${i}.jpg`, data: new Date() }))
    expect(avisos(fs)).toEqual([])
  })
})
