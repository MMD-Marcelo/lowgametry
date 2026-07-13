export const MODOS = [
  { id: 'lowpoly', nome: 'Low poly' },
  { id: 'fotogrametria', nome: 'Fotogrametria normal' },
]

export const PRESETS = {
  lowpoly: [
    { id: 'rapido', nome: 'Rápido', faces: 300, resTextura: 128 },
    { id: 'equilibrado', nome: 'Equilibrado', faces: 800, resTextura: 256 },
    { id: 'alto', nome: 'Alto', faces: 1500, resTextura: 512 },
    { id: 'maximo', nome: 'Máximo', faces: 3000, resTextura: 512 },
  ],
  fotogrametria: [
    { id: 'rapido', nome: 'Rápido', faces: 8000, resTextura: 1024 },
    { id: 'equilibrado', nome: 'Equilibrado', faces: 20000, resTextura: 2048 },
    { id: 'alto', nome: 'Alto', faces: 60000, resTextura: 4096 },
  ],
}

const CONFIG_MODO = {
  lowpoly: {
    autoRetopo: true,
    textura: true,
    gerarNormal: false,
    flatShading: true,
    filtroTextura: 'nearest',
    paletaCores: 32,
    dithering: true,
    uvCrunchy: true,
    materialSimples: true,
  },
  fotogrametria: {
    autoRetopo: true,
    textura: true,
    gerarNormal: true,
    flatShading: false,
    filtroTextura: 'linear',
    paletaCores: 0,
    dithering: false,
    uvCrunchy: false,
    materialSimples: false,
  },
}

export function configPadrao() {
  const base = PRESETS.lowpoly.find((p) => p.id === 'equilibrado')
  return {
    modo: 'lowpoly',
    presetQualidade: 'equilibrado',
    faces: base.faces,
    resTextura: base.resTextura,
    ...CONFIG_MODO.lowpoly,
  }
}

export function aplicarPreset(config, presetId) {
  const modo = config.modo ?? 'lowpoly'
  const p = PRESETS[modo]?.find((x) => x.id === presetId)
  if (!p) return config
  return { ...config, presetQualidade: p.id, faces: p.faces, resTextura: p.resTextura }
}

export function aplicarModo(config, modo) {
  const presets = PRESETS[modo]
  if (!presets) return config
  const presetId = modo === config.modo ? config.presetQualidade : 'equilibrado'
  const preset = presets.find((p) => p.id === presetId) ?? presets.find((p) => p.id === 'equilibrado') ?? presets[0]
  return {
    ...config,
    modo,
    presetQualidade: preset.id,
    faces: preset.faces,
    resTextura: preset.resTextura,
    ...CONFIG_MODO[modo],
  }
}

export function validarConfig(config) {
  const erros = []
  const modo = config.modo ?? 'lowpoly'
  const limiteFaces = modo === 'lowpoly' ? [100, 3000] : [500, 200000]
  const resValidas = modo === 'lowpoly' ? [128, 256, 512] : [1024, 2048, 4096]

  if (!PRESETS[modo]) erros.push('modo inválido')
  if (typeof config.faces !== 'number' || config.faces < limiteFaces[0] || config.faces > limiteFaces[1])
    erros.push(`faces deve estar entre ${limiteFaces[0]} e ${limiteFaces[1]}`)
  if (!resValidas.includes(config.resTextura))
    erros.push(`resTextura deve ser ${resValidas.join(', ')}`)
  return erros
}
