import { describe, it, expect } from 'vitest'
import { MODOS, PRESETS, configPadrao, aplicarModo, aplicarPreset, validarConfig } from './config.js'

it('tem os modos low poly e fotogrametria normal', () => {
  expect(MODOS.map((m) => m.id)).toEqual(['lowpoly', 'fotogrametria'])
})

it('tem presets low poly bem baixos', () => {
  expect(PRESETS.lowpoly.map((p) => p.faces)).toEqual([300, 800, 1500, 3000])
  expect(PRESETS.lowpoly.map((p) => p.resTextura)).toEqual([128, 256, 512, 512])
})

it('config padrão usa low poly equilibrado e é válida', () => {
  const c = configPadrao()
  expect(c.modo).toBe('lowpoly')
  expect(c.presetQualidade).toBe('equilibrado')
  expect(c.faces).toBe(800)
  expect(c.resTextura).toBe(256)
  expect(c.flatShading).toBe(true)
  expect(c.gerarNormal).toBe(false)
  expect(c.filtroTextura).toBe('nearest')
  expect(validarConfig(c)).toEqual([])
})

it('aplicarPreset troca faces e resTextura dentro do modo atual', () => {
  const c = aplicarPreset(configPadrao(), 'alto')
  expect(c.presetQualidade).toBe('alto')
  expect(c.faces).toBe(1500)
  expect(c.resTextura).toBe(512)
})

it('aplicarModo troca para fotogrametria normal com normal map e textura maior', () => {
  const c = aplicarModo(configPadrao(), 'fotogrametria')
  expect(c.modo).toBe('fotogrametria')
  expect(c.faces).toBe(20000)
  expect(c.resTextura).toBe(2048)
  expect(c.gerarNormal).toBe(true)
  expect(c.flatShading).toBe(false)
})

it('validarConfig acusa faces fora do intervalo low poly', () => {
  const c = { ...configPadrao(), faces: 50 }
  expect(validarConfig(c)).toContain('faces deve estar entre 100 e 3000')
})
