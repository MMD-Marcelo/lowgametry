import { it, expect } from 'vitest'
import { ETAPAS_ROTULO, atividadesDoMotor, etapasComEstado, interpretarLinhaMotor, pctPorEstado } from './fluxo.js'

it('rotula etapas em pt-BR', () => {
  expect(ETAPAS_ROTULO.SfM).toMatch(/câmeras|reconstru/i)
})

it('pctPorEstado usa pct do status, 100 quando pronto', () => {
  expect(pctPorEstado({ estado: 'rodando', pct: 42 })).toBe(42)
  expect(pctPorEstado({ estado: 'pronto', pct: 0 })).toBe(100)
})

it('etapasComEstado marca feitas, atual e aguardando', () => {
  const etapas = etapasComEstado({ estado: 'rodando', etapa: 'denso', pct: 34 })
  expect(etapas.find((e) => e.id === 'SfM').estado).toBe('feito')
  expect(etapas.find((e) => e.id === 'denso').estado).toBe('atual')
  expect(etapas.find((e) => e.id === 'malha').estado).toBe('aguardando')
})

it('interpreta logs do OpenMVS em eventos legíveis', () => {
  const atividade = interpretarLinhaMotor('20:22:47 [ScnDense] Depth-map for image 39 estimated using 5 images: 1511x2040 (11s633ms)')
  expect(atividade.titulo).toBe('Mapa de profundidade da imagem 39')
  expect(atividade.detalhe).toContain('5 imagens')
})

it('atividadesDoMotor mostra eventos mais recentes primeiro', () => {
  const atividades = atividadesDoMotor(['iniciando colmap.exe', '14 fotos', 'concluido colmap.exe'], 2)
  expect(atividades[0].titulo).toMatch(/concluído/i)
  expect(atividades).toHaveLength(2)
})
