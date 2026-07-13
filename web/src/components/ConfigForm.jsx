import { MODOS, PRESETS, aplicarModo, aplicarPreset } from '../lib/config.js'
import { ArrowLeft, Cube } from '@phosphor-icons/react'
import Moldura from './ui/Moldura.jsx'
import TituloSecao from './ui/TituloSecao.jsx'
import Alternar from './ui/Alternar.jsx'
import BotaoTerminal from './ui/BotaoTerminal.jsx'
import Seletor from './ui/Seletor.jsx'

export default function ConfigForm({ config, setConfig, nFotos, onGerar, onVoltar }) {
  const modo = config.modo ?? 'lowpoly'
  const presets = PRESETS[modo] ?? PRESETS.lowpoly
  const set = (patch) => setConfig({ ...config, ...patch })

  return (
    <div className="flex flex-col gap-1 animate-[fade_.3s]">
      <div className="flex items-center justify-between gap-4">
        <button onClick={onVoltar} className="flex items-center gap-1 text-sm text-muted hover:text-primaria">
          <ArrowLeft size={15} /> trocar fotos
        </button>
        <div className="text-sm text-muted">{nFotos} foto(s) selecionada(s)</div>
      </div>

      <TituloSecao>Modo</TituloSecao>
      <div className="grid grid-cols-2 gap-3">
        {MODOS.map((m) => (
          <button key={m.id} onClick={() => setConfig(aplicarModo(config, m.id))} className="text-left">
            <Moldura className={`px-3 py-3 text-sm font-semibold ${modo === m.id ? 'text-primaria glow' : 'text-muted hover:text-tinta'}`}>
              {m.nome}
            </Moldura>
          </button>
        ))}
      </div>

      <TituloSecao>Qualidade</TituloSecao>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {presets.map((p) => (
          <button key={p.id} onClick={() => setConfig(aplicarPreset(config, p.id))} className="text-left">
            <Moldura className={`px-3 py-3 text-sm font-semibold ${config.presetQualidade === p.id ? 'text-primaria glow' : 'text-muted hover:text-tinta'}`}>
              <span className="block">{p.nome}</span>
              <span className="block text-xs font-normal text-muted">{p.faces} faces · {p.resTextura}px</span>
            </Moldura>
          </button>
        ))}
      </div>

      <label className="mt-4 flex items-center justify-between gap-4 border-b border-linha/60 px-1 py-2">
        <span className="text-sm">Faces (alvo)</span>
        <input aria-label="faces" type="number" min={modo === 'lowpoly' ? 100 : 500} max={modo === 'lowpoly' ? 3000 : 200000} step={modo === 'lowpoly' ? 100 : 500} value={config.faces}
          onChange={(e) => set({ faces: Number(e.target.value) })}
          className="w-32 border border-linha bg-cartao px-3 py-1.5 text-right text-tinta focus:border-primaria focus:outline-none" />
      </label>

      <div className="flex items-center justify-between gap-4 border-b border-linha/60 px-1 py-2">
        <span className="text-sm">Textura</span>
        <Seletor
          aria-label="resolução da textura"
          value={config.resTextura}
          onChange={(v) => set({ resTextura: v })}
          options={(modo === 'lowpoly' ? [128, 256, 512] : [1024, 2048, 4096]).map((r) => ({ value: r, label: `${r}px` }))}
        />
      </div>

      <TituloSecao>Opções</TituloSecao>
      {modo === 'lowpoly' ? (
        <div className="flex flex-col">
          <Alternar rotulo="Flat shading" checked={config.flatShading} onChange={() => set({ flatShading: !config.flatShading })} />
          <Alternar rotulo="Filtro nearest" checked={config.filtroTextura === 'nearest'} onChange={() => set({ filtroTextura: config.filtroTextura === 'nearest' ? 'linear' : 'nearest' })} />
          <Alternar rotulo="Dithering + paleta reduzida" checked={config.dithering} onChange={() => set({ dithering: !config.dithering, paletaCores: !config.dithering ? 32 : 0 })} />
          <Alternar rotulo="Normal map" checked={config.gerarNormal} onChange={() => set({ gerarNormal: !config.gerarNormal })} />
        </div>
      ) : (
        <div className="flex flex-col">
          <Alternar rotulo="Textura + normal map" checked={config.textura} onChange={() => set({ textura: !config.textura, gerarNormal: !config.textura })} />
        </div>
      )}

      <BotaoTerminal variante="primario" onClick={onGerar} className="mt-4 w-full">
        <span className="inline-flex items-center gap-2"><Cube size={18} weight="fill" /> gerar modelo</span>
      </BotaoTerminal>
    </div>
  )
}
