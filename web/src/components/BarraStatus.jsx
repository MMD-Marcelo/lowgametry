import { ETAPAS_ROTULO } from '../lib/fluxo.js'

const RELEASES = 'https://github.com/MMD-Marcelo/lowgametry/releases'

function textoConectado(info) {
  const partes = ['motor conectado']
  if (info?.pipelineReal === false) partes.push('modo demo')
  partes.push(info?.temCUDA ? 'CUDA' : 'CPU')
  if (info?.nucleos) partes.push(`${info.nucleos} núcleos`)
  if (info?.ocupado) {
    const etapa = info.jobEtapa ? (ETAPAS_ROTULO[info.jobEtapa] ?? info.jobEtapa) : 'processando'
    partes.push(`ocupado: ${etapa}${typeof info.jobPct === 'number' ? ` ${info.jobPct}%` : ''}`)
  }
  return partes.join(' • ')
}

export default function BarraStatus({ online, info }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-linha px-4 py-2 text-xs tracking-wide">
      {online ? (
        <span className="text-primaria glow">▚ {textoConectado(info)}</span>
      ) : (
        <span className="text-muted">
          <span className="text-erro">▚ motor desconectado</span> • baixe o motor para gerar modelos localmente
        </span>
      )}
      {!online && (
        <a href={RELEASES} target="_blank" rel="noreferrer"
           className="border border-primaria/60 px-3 py-1 text-primaria hover:border-fosforo hover:text-fosforo hover:glow">
          [ baixar o motor ]
        </a>
      )}
    </div>
  )
}
