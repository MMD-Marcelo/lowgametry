import { useState } from 'react'
import Moldura from './ui/Moldura.jsx'
import { atividadesDoMotor, ETAPAS_ROTULO, etapasComEstado, pctPorEstado } from '../lib/fluxo.js'

const MARCA = {
  feito: '✓',
  atual: '»',
  aguardando: ' ',
  erro: '!',
}

const TIPO_CLASSE = {
  ferramenta: 'border-primaria/50 bg-primaria-clara/50 text-primaria',
  entrada: 'border-linha bg-cartao/50 text-tinta',
  imagem: 'border-linha bg-cartao/50 text-tinta',
  pontos: 'border-linha bg-cartao/50 text-tinta',
  malha: 'border-linha bg-cartao/50 text-tinta',
  aviso: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-200',
  erro: 'border-erro/60 bg-erro/10 text-erro',
  log: 'border-linha bg-black/20 text-muted',
}

const BARRA_LARGURA = 24

function barraAscii(pct) {
  const preenchidos = Math.round((pct / 100) * BARRA_LARGURA)
  return '█'.repeat(preenchidos) + '░'.repeat(BARRA_LARGURA - preenchidos)
}

export default function Progresso({ status, onRecomecar, onAbortar }) {
  const pct = pctPorEstado(status)
  const rotulo = status?.etapa ? (ETAPAS_ROTULO[status.etapa] ?? status.etapa) : 'Iniciando'
  const emErro = status?.estado === 'erro'
  const rodando = !emErro && status?.estado !== 'pronto'
  const [confirmando, setConfirmando] = useState(false)
  const [abortando, setAbortando] = useState(false)

  const abortar = async () => {
    setAbortando(true)
    try {
      await onAbortar?.()
    } finally {
      // o App troca de tela ao abortar; se falhar, volta ao normal
      setAbortando(false)
      setConfirmando(false)
    }
  }
  const etapas = etapasComEstado(status)
  const logs = status?.log?.slice(-120) ?? []
  const atividades = atividadesDoMotor(logs, 8)

  return (
    <div className="flex flex-col gap-5 animate-[fade_.3s]">
      <div className="text-center">
        <div className="uppercase tracking-widest text-primaria glow">{rotulo}...</div>
        <div className="mt-1 text-xs text-muted">&gt; pipeline: fotos → câmeras → nuvem densa → malha → textura → export</div>
      </div>

      <div className="text-center">
        <div className="text-fosforo glow tracking-tighter text-sm sm:text-base break-all">[{barraAscii(pct)}]</div>
        <div className="mt-1 text-sm text-muted tabular-nums">{pct}% estimado</div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {etapas.map((etapa) => (
          <div key={etapa.id} className={`flex items-center gap-2 border px-3 py-2 text-sm ${etapa.estado === 'atual' ? 'border-primaria bg-primaria-clara text-primaria' : etapa.estado === 'feito' ? 'border-linha bg-cartao/50 text-tinta' : etapa.estado === 'erro' ? 'border-erro/60 bg-erro/10 text-erro' : 'border-linha text-muted'}`}>
            <span className="w-6 text-center font-bold">[{MARCA[etapa.estado]}]</span>
            <span>{etapa.rotulo}</span>
          </div>
        ))}
      </div>

      <Moldura>
        <div className="border-b border-linha px-3 py-2 text-xs uppercase tracking-widest text-muted">o que o motor está fazendo agora</div>
        {atividades.length ? (
          <div className="grid gap-2 p-3">
            {atividades.map((atividade, i) => (
              <div key={`${atividade.titulo}-${i}`} className={`border px-3 py-2 text-sm ${TIPO_CLASSE[atividade.tipo] ?? TIPO_CLASSE.log}`}>
                <div className="font-semibold">{atividade.titulo}</div>
                {atividade.detalhe ? <div className="mt-1 text-xs opacity-80">{atividade.detalhe}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-sm text-muted">Aguardando a primeira linha de atividade do motor...</div>
        )}
      </Moldura>

      {logs.length ? (
        <details className="border border-linha bg-black/40 overflow-hidden">
          <summary className="cursor-pointer border-b border-linha px-3 py-2 text-xs uppercase tracking-widest text-muted">log técnico do motor</summary>
          <pre className="max-h-56 overflow-auto p-3 text-xs text-muted whitespace-pre-wrap">{logs.join('\n')}</pre>
        </details>
      ) : null}
      {rodando && (
        abortando ? (
          <div className="mt-2 self-center text-sm text-muted">[ abortando… ]</div>
        ) : confirmando ? (
          <div className="mt-2 self-center flex flex-col items-center gap-2">
            <div className="text-sm text-muted">Abortar vai perder o progresso desta reconstrução.</div>
            <div className="flex gap-3">
              <button onClick={abortar} className="border border-erro text-erro px-4 py-2 uppercase tracking-widest hover:bg-erro/10 transition">
                <span aria-hidden="true">[ </span>sim, abortar<span aria-hidden="true"> ]</span>
              </button>
              <button onClick={() => setConfirmando(false)} className="text-muted hover:text-tinta px-2">continuar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmando(true)} className="mt-2 self-center border border-erro/60 text-erro px-4 py-2 uppercase tracking-widest hover:bg-erro/10 hover:border-erro transition">
            <span aria-hidden="true">[ </span>abortar<span aria-hidden="true"> ]</span>
          </button>
        )
      )}
      {emErro && (
        <button
          onClick={onRecomecar}
          className="mt-2 self-center bg-primaria text-fundo font-bold px-4 py-2 uppercase tracking-widest glow-box hover:bg-fosforo transition"
        >
          <span aria-hidden="true">[ </span>novo modelo<span aria-hidden="true"> ]</span>
        </button>
      )}
    </div>
  )
}
