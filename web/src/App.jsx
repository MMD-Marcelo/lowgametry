import { useEffect, useRef, useState } from 'react'
import { useMotor } from './hooks/useMotor.js'
import { criarJob, statusJob, apagarJob } from './lib/motor.js'
import { configPadrao, validarConfig } from './lib/config.js'
import logo from './assets/logo.png'
import { paraEnvio } from './lib/fotos.js'
import { importarFotos } from './lib/importar.js'
import { extrairFrames } from './lib/video.js'
import BarraStatus from './components/BarraStatus.jsx'
import FacetasFundo from './components/FacetasFundo.jsx'
import Inicio from './components/Inicio.jsx'
import Organizador from './components/Organizador.jsx'
import ConfigForm from './components/ConfigForm.jsx'
import Progresso from './components/Progresso.jsx'
import Resultado from './components/Resultado.jsx'

const JOB_STORAGE = 'lowgametry.jobId'

export default function App() {
  const { online, info } = useMotor()
  const [tela, setTela] = useState('inicio')
  const [fotos, setFotos] = useState([])
  const [config, setConfig] = useState(configPadrao())
  const [jobId, setJobId] = useState(() => localStorage.getItem(JOB_STORAGE))
  const [status, setStatus] = useState(null)
  const [erro, setErro] = useState(null)
  const [extraindo, setExtraindo] = useState(null) // pct 0..1 durante o vídeo
  const timer = useRef(null)
  // ids ja descartados: o /health pode continuar anunciando um job por um ciclo,
  // e sem isso a restauracao o traria de volta logo apos o descarte.
  const descartados = useRef(new Set())

  // esquece o job atual sem falar com o motor (ele ja nao tem esse job)
  const esquecerJob = (id) => {
    if (id) descartados.current.add(id)
    localStorage.removeItem(JOB_STORAGE)
    setJobId(null)
    setStatus(null)
    setTela('inicio')
  }

  // dropzone/vídeo → importa (EXIF + nitidez) → organizador
  const escolherFotos = async (lista) => {
    setErro(null)
    try {
      const importadas = await importarFotos(lista)
      setFotos(importadas)
      setTela('organizar')
    } catch {
      setErro('Não consegui ler essas imagens. Tente outras.')
    }
  }

  // vídeo → extrai frames (com progresso) → organizador, pelo mesmo caminho das fotos
  const escolherVideo = async (file) => {
    setErro(null)
    setExtraindo(0)
    try {
      const frames = await extrairFrames(file, { aoProgresso: setExtraindo })
      if (!frames.length) throw new Error('sem frames')
      await escolherFotos(frames)
    } catch {
      setErro('Não consegui extrair frames desse vídeo. Tente outro formato.')
    } finally {
      setExtraindo(null)
    }
  }

  // organizador → config. Guarda as fotos completas (ordem + seleção), pra que
  // voltar do config preserve tudo. paraEnvio só é computado ao iniciar.
  const confirmarOrganizacao = (organizadas) => {
    setFotos(organizadas)
    setTela('config')
  }

  const iniciar = async () => {
    setErro(null)
    const erros = validarConfig(config)
    if (erros.length) {
      setErro(erros.join(' · '))
      return
    }
    try {
      // computa os nomes prefixados só aqui, a partir das fotos organizadas
      const { jobId } = await criarJob(paraEnvio(fotos), config)
      localStorage.setItem(JOB_STORAGE, jobId)
      setJobId(jobId)
      setStatus(null)
      setTela('progresso')
    } catch (e) {
      setErro(e.status === 409 ? 'Já há um modelo sendo gerado. Recarregue ou aguarde o motor terminar.' : 'Falha ao iniciar. O motor está rodando?')
    }
  }

  useEffect(() => {
    if (!online || !info) return
    if (info.jobId && !descartados.current.has(info.jobId)) {
      localStorage.setItem(JOB_STORAGE, info.jobId)
      setJobId((atual) => atual || info.jobId)
      setStatus((atual) => atual ?? {
        estado: info.jobEstado ?? (info.ocupado ? 'rodando' : 'pronto'),
        etapa: info.jobEtapa,
        pct: info.jobPct ?? 0,
        log: ['job recuperado do motor local'],
      })
      if (info.jobEstado === 'pronto') setTela('resultado')
      else if (info.ocupado || info.jobEstado) setTela('progresso')
      return
    }
    // Motor online e sem job: o guardado nao existe mais. Descartar, senao um
    // jobId velho prende o site na tela de progresso pra sempre. Só enquanto
    // estamos no início: logo após criarJob o /health ainda não viu o job novo.
    if (jobId && tela === 'inicio') esquecerJob()
  }, [online, info, jobId, tela])

  // polling do status enquanto em progresso
  useEffect(() => {
    if (tela !== 'progresso' || !jobId) return
    let vivo = true
    const bater = async () => {
      try {
        const s = await statusJob(jobId)
        if (!vivo) return
        setStatus(s)
        if (s.estado === 'pronto') { setTela('resultado'); return }
        if (s.estado === 'erro') { setErro('A reconstrução falhou. Tente mais fotos com mais sobreposição.'); return }
      } catch (e) {
        // 404: o motor nao conhece esse job (reiniciou, ou o job foi apagado).
        // Insistir deixaria o site preso no progresso. Outros erros sao
        // transitorios (motor fechando, porta ocupada) e valem uma nova tentativa.
        if (e.status === 404) { if (vivo) esquecerJob(jobId); return }
      }
      timer.current = setTimeout(bater, 1000)
    }
    bater()
    return () => { vivo = false; clearTimeout(timer.current) }
  }, [tela, jobId])

  const recomeçar = async () => {
    if (jobId) { try { await apagarJob(jobId) } catch {} }
    // marca como descartado, senão o /health ainda em cache ressuscita a tela.
    esquecerJob(jobId)
    setFotos([]); setErro(null)
  }

  return (
    <div className="relative min-h-screen font-mono">
      <FacetasFundo />
      <div className="relative z-10">
      <BarraStatus online={online} info={info} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className={tela === 'inicio' ? 'mb-8 mt-6' : 'mb-6'}>
          <button type="button" onClick={() => setTela('inicio')} aria-label="voltar ao início" className="block w-full">
            {/* no início o logo cresce via scale (não empurra os outros elementos:
                a caixa mantém a altura de antes, só o visual dobra) */}
            <img
              src={logo}
              alt="lowgametry"
              className={`mx-auto w-auto select-none origin-center transition-transform ${tela === 'inicio' ? 'h-28 sm:h-36 scale-[1.9]' : 'h-12'}`}
            />
          </button>
        </h1>
        {erro && <div className="mb-4 rounded-lg border border-erro/50 bg-erro/10 text-erro px-4 py-2 text-sm">{erro}</div>}
        {tela === 'inicio' && extraindo == null && <Inicio onFotos={escolherFotos} onVideo={escolherVideo} />}
        {tela === 'inicio' && extraindo != null && (
          <div className="flex flex-col items-center gap-3 py-10 text-center animate-[fade_.3s]">
            <div className="font-semibold">Extraindo frames do vídeo…</div>
            <div className="h-2 w-64 rounded-full bg-cartao overflow-hidden border border-linha">
              <div className="h-full bg-primaria transition-all" style={{ width: `${Math.round(extraindo * 100)}%` }} />
            </div>
            <div className="text-xs text-muted tabular-nums">{Math.round(extraindo * 100)}%</div>
          </div>
        )}
        {tela === 'organizar' && <Organizador fotos={fotos} importar={importarFotos} onContinuar={confirmarOrganizacao} onVoltar={() => setTela('inicio')} onTrocar={() => setTela('inicio')} />}
        {tela === 'config' && <ConfigForm config={config} setConfig={setConfig} nFotos={fotos.filter((f) => f.incluida).length} onGerar={iniciar} onVoltar={() => setTela('organizar')} />}
        {tela === 'progresso' && <Progresso status={status} onRecomecar={recomeçar} onAbortar={recomeçar} />}
        {tela === 'resultado' && <Resultado jobId={jobId} onRecomecar={recomeçar} />}
      </main>
      </div>
    </div>
  )
}
