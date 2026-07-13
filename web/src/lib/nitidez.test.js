import { describe, it, expect } from 'vitest'
import { nitidez, limiarBorrado } from './nitidez.js'

// monta um ImageData (RGBA) a partir de uma matriz de cinza 0..255
function cinza(matriz) {
  const h = matriz.length
  const w = matriz[0].length
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const v = matriz[y][x]
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { data, width: w, height: h }
}

function preencher(w, h, v) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => v))
}

// metade preta, metade branca: uma borda vertical no meio
function bordaVertical(w, h) {
  return Array.from({ length: h }, () => Array.from({ length: w }, (_, x) => (x < w / 2 ? 0 : 255)))
}

describe('nitidez', () => {
  it('é ~0 numa imagem chapada (sem bordas)', () => {
    expect(nitidez(cinza(preencher(8, 8, 128)))).toBeLessThan(1)
  })

  it('é maior numa imagem com borda forte do que numa chapada', () => {
    const chapada = nitidez(cinza(preencher(8, 8, 128)))
    const comBorda = nitidez(cinza(bordaVertical(8, 8)))
    expect(comBorda).toBeGreaterThan(chapada)
  })

  it('ordena imagens da mais borrada para a mais nítida', () => {
    const suave = cinza([[100, 110, 120, 130], [100, 110, 120, 130], [100, 110, 120, 130], [100, 110, 120, 130]])
    const nitida = cinza(bordaVertical(4, 4))
    expect(nitidez(nitida)).toBeGreaterThan(nitidez(suave))
  })
})

describe('limiarBorrado', () => {
  it('fica abaixo da mediana das notas', () => {
    const notas = [10, 20, 30, 40, 50]
    const limiar = limiarBorrado(notas)
    expect(limiar).toBeGreaterThan(0)
    expect(limiar).toBeLessThan(30) // 30 = mediana
  })

  it('devolve 0 para lista vazia', () => {
    expect(limiarBorrado([])).toBe(0)
  })
})
