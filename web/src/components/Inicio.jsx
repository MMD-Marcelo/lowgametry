import { useRef } from 'react'
import Moldura from './ui/Moldura.jsx'
import BotaoTerminal from './ui/BotaoTerminal.jsx'

export default function Inicio({ onFotos, onVideo }) {
  const pasta = useRef(null)
  const video = useRef(null)
  return (
    <div className="flex flex-col items-center gap-6 text-center animate-[fade_.3s]">
      <div>
        <div className="text-lg uppercase tracking-widest glow">Transforme fotos em modelos 3D</div>
        <div className="text-lg uppercase tracking-widest text-primaria glow">com fotogrametria local</div>
      </div>
      <div className="text-sm text-muted">
        <div>&gt; Solte de 20 a 100+ fotos do objeto por todos os ângulos.</div>
        <div>&gt; Fundo texturizado ajuda; evite reflexo, vidro e fundo liso.</div>
      </div>

      <Moldura className="w-full">
        <label className="grid cursor-pointer place-items-center gap-3 py-16">
          <div className="text-2xl text-primaria glow">[ ⬚ ]</div>
          <span className="uppercase tracking-widest text-primaria">clique ou arraste as fotos aqui</span>
          <span className="text-xs text-muted">jpg / png / webp</span>
          <input data-testid="input-fotos" type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => e.target.files?.length && onFotos(e.target.files)} />
        </label>
      </Moldura>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <BotaoTerminal onClick={() => pasta.current?.click()}>escolher uma pasta</BotaoTerminal>
        <BotaoTerminal onClick={() => video.current?.click()}>importar vídeo</BotaoTerminal>
      </div>

      <input ref={pasta} data-testid="input-pasta" type="file" webkitdirectory="" directory="" multiple className="hidden"
        onChange={(e) => e.target.files?.length && onFotos(e.target.files)} />
      <input ref={video} data-testid="input-video" type="file" accept="video/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && onVideo(e.target.files[0])} />

      <div className="text-xs tracking-widest text-muted">──────── [ tudo fica só no seu pc ] ────────</div>
    </div>
  )
}
