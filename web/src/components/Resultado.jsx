import Viewer3D from './Viewer3D.jsx'
import Moldura from './ui/Moldura.jsx'
import { urlResultado } from '../lib/motor.js'
import { DownloadSimple, ArrowCounterClockwise } from '@phosphor-icons/react'

export default function Resultado({ jobId, onRecomecar }) {
  const glb = urlResultado(jobId, 'glb')
  const zip = urlResultado(jobId, 'zip')
  return (
    <div className="flex flex-col gap-4 animate-[fade_.3s]">
      <div className="text-center text-xs uppercase tracking-widest text-primaria glow">modelo pronto</div>
      <Moldura>
        <Viewer3D url={glb} />
      </Moldura>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a href={glb} download className="flex items-center gap-2 bg-primaria text-fundo font-bold px-5 py-2.5 uppercase tracking-widest glow-box hover:bg-fosforo transition">
          <DownloadSimple size={18} weight="fill" />
          <span aria-hidden="true">[ </span>baixar .glb<span aria-hidden="true"> ]</span>
        </a>
        <a href={zip} download className="flex items-center gap-2 border border-primaria/60 text-primaria px-5 py-2.5 uppercase tracking-widest hover:border-fosforo hover:text-fosforo hover:glow transition">
          <DownloadSimple size={18} />
          <span aria-hidden="true">[ </span>baixar .obj + textura (zip)<span aria-hidden="true"> ]</span>
        </a>
        <button onClick={onRecomecar} className="flex items-center gap-2 text-muted hover:text-tinta uppercase tracking-widest">
          <ArrowCounterClockwise size={16} /> novo modelo
        </button>
      </div>
    </div>
  )
}
