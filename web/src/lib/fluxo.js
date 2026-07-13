export const ETAPAS_ORDEM = ['preparo', 'SfM', 'denso', 'malha', 'textura', 'export']

export const ETAPAS_ROTULO = {
  preparo: 'Preparando fotos',
  SfM: 'Reconstruindo câmeras',
  denso: 'Nuvem densa',
  malha: 'Gerando malha',
  textura: 'Assando textura',
  export: 'Exportando low-poly',
}

const FERRAMENTAS = {
  'colmap.exe': 'COLMAP',
  'InterfaceCOLMAP.exe': 'Interface COLMAP → OpenMVS',
  'DensifyPointCloud.exe': 'OpenMVS · nuvem densa',
  'ReconstructMesh.exe': 'OpenMVS · malha',
  'TextureMesh.exe': 'OpenMVS · textura',
  'blender.exe': 'Blender · low-poly/export',
}

export function pctPorEstado(status) {
  if (!status) return 0
  if (status.estado === 'pronto') return 100
  return status.pct ?? 0
}

export function etapasComEstado(status) {
  const atual = status?.etapa
  const atualIdx = ETAPAS_ORDEM.indexOf(atual)
  return ETAPAS_ORDEM.map((id, idx) => {
    let estado = 'aguardando'
    if (status?.estado === 'pronto' || (atualIdx >= 0 && idx < atualIdx)) estado = 'feito'
    if (id === atual && status?.estado !== 'pronto') estado = status?.estado === 'erro' ? 'erro' : 'atual'
    return { id, rotulo: ETAPAS_ROTULO[id] ?? id, estado }
  })
}

function nomeFerramenta(nome) {
  return FERRAMENTAS[nome] ?? nome
}

export function interpretarLinhaMotor(linha) {
  if (!linha) return null

  let m = linha.match(/^iniciando\s+(.+)$/i)
  if (m) return { tipo: 'ferramenta', titulo: `Iniciando ${nomeFerramenta(m[1])}`, detalhe: 'A ferramenta externa começou a rodar.' }

  m = linha.match(/^concluido\s+(.+)$/i)
  if (m) return { tipo: 'ferramenta', titulo: `${nomeFerramenta(m[1])} concluído`, detalhe: 'A ferramenta externa terminou sem erro.' }

  m = linha.match(/(\d+)\s+fotos?$/i)
  if (m) return { tipo: 'entrada', titulo: `${m[1]} fotos carregadas`, detalhe: 'As imagens foram copiadas para o workspace local.' }

  m = linha.match(/Reference image\s+(\d+)\s+paired with\s+(\d+)\s+views/i)
  if (m) return { tipo: 'imagem', titulo: `Imagem ${m[1]} pareada`, detalhe: `${m[2]} vistas usadas como referência.` }

  m = linha.match(/Depth-map for image\s+(\d+)\s+estimated using\s+(\d+)\s+images:\s+([^\s]+)\s+\(([^)]+)\)/i)
  if (m) return { tipo: 'imagem', titulo: `Mapa de profundidade da imagem ${m[1]}`, detalhe: `${m[2]} imagens · ${m[3]} · ${m[4]}` }

  m = linha.match(/Depth-map for image\s+(\d+)\s+estimated/i)
  if (m) return { tipo: 'imagem', titulo: `Mapa de profundidade da imagem ${m[1]}`, detalhe: 'OpenMVS terminou esta imagem.' }

  m = linha.match(/points?:?\s+([\d,.]+)/i)
  if (m) return { tipo: 'pontos', titulo: `${m[1]} pontos reconstruídos`, detalhe: linha }

  m = linha.match(/vertices?:?\s+([\d,.]+)|faces?:?\s+([\d,.]+)/i)
  if (m) return { tipo: 'malha', titulo: 'Malha atualizada', detalhe: linha }

  if (/error|failed|falhou/i.test(linha)) return { tipo: 'erro', titulo: 'Erro reportado pela ferramenta', detalhe: linha }
  if (/warning|warn/i.test(linha)) return { tipo: 'aviso', titulo: 'Aviso da ferramenta', detalhe: linha }

  return { tipo: 'log', titulo: linha, detalhe: '' }
}

export function atividadesDoMotor(logs, limite = 8) {
  return (logs ?? [])
    .map(interpretarLinhaMotor)
    .filter(Boolean)
    .slice(-limite)
    .reverse()
}
