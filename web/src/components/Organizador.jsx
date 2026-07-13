import { useRef, useState } from 'react'
import Moldura from './ui/Moldura.jsx'
import { alternar, mover, avisos } from '../lib/fotos.js'

// Organizador: reordenar, incluir/excluir e ver nitidez antes de gerar. Recebe
// as fotos ja importadas (com EXIF/nitidez lidos) e devolve, em onContinuar, a
// lista pronta pra envio (paraEnvio: so incluidas, na ordem, com prefixo NNN_).
export default function Organizador({ fotos: fotosIniciais, importar, onContinuar, onVoltar }) {
  const [fotos, setFotos] = useState(fotosIniciais)
  const [erro, setErro] = useState(null)
  const addRef = useRef(null)
  const trocarRef = useRef(null)
  const alertas = avisos(fotos)
  const nSel = fotos.filter((f) => f.incluida).length

  const adicionar = async (lista) => {
    setErro(null)
    try {
      const novas = await importar(lista)
      setFotos((fs) => [...fs, ...novas])
    } catch {
      setErro('Não consegui ler essas imagens.')
    }
  }

  // troca: substitui as fotos atuais pelas recém-escolhidas, aqui mesmo no
  // organizador (antes o botão voltava pro início e descartava tudo).
  const trocar = async (lista) => {
    setErro(null)
    try {
      const novas = await importar(lista)
      if (!novas.length) { setErro('Não consegui ler essas imagens.'); return }
      setFotos(novas)
    } catch {
      setErro('Não consegui ler essas imagens.')
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-[fade_.3s]">
      <div className="text-center">
        <div className="uppercase tracking-widest">
          <span className="text-fosforo glow">{nSel}</span> de <span className="text-fosforo glow">{fotos.length}</span> fotos selecionadas
        </div>
        <div className="mt-1 text-xs text-muted">clique pra incluir/excluir • use as setas pra reordenar (a ordem importa)</div>
      </div>

      {erro && <div className="text-sm text-erro">{erro}</div>}
      {alertas.map((a) => (
        <div key={a} className="border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-200">{a}</div>
      ))}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fotos.map((f, i) => (
          <Moldura key={f.id} className={f.incluida ? '' : 'opacity-40'}>
            <div className="flex items-center justify-between px-1 py-0.5 text-xs">
              <span className="bg-primaria/20 px-1 text-fosforo">[{String(i + 1).padStart(2, '0')}]</span>
              <button type="button" aria-label={`incluir/excluir ${f.nome}`}
                onClick={() => setFotos((fs) => alternar(fs, f.id))}
                className={f.incluida ? 'text-fosforo' : 'text-muted'}>[{f.incluida ? 'x' : ' '}]</button>
            </div>
            <img src={f.url} alt={f.nome} className="aspect-video w-full object-cover" />
            <div className="flex justify-between px-1 py-0.5">
              <button type="button" aria-label={`mover ${f.nome} para tras`} disabled={i === 0}
                onClick={() => setFotos((fs) => mover(fs, i, i - 1))}
                className="border border-linha px-2 text-primaria disabled:opacity-30">←</button>
              <button type="button" aria-label={`mover ${f.nome} para frente`} disabled={i === fotos.length - 1}
                onClick={() => setFotos((fs) => mover(fs, i, i + 1))}
                className="border border-linha px-2 text-primaria disabled:opacity-30">→</button>
            </div>
          </Moldura>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button onClick={() => trocarRef.current?.click()} className="flex min-h-[4.75rem] flex-col justify-center border border-linha px-3 py-2 text-left hover:border-primaria">
          <div className="text-primaria">⇄ trocar fotos</div>
          <div className="text-xs text-muted">substituir por outras fotos</div>
        </button>
        <button onClick={() => addRef.current?.click()} className="flex min-h-[4.75rem] flex-col justify-center border border-linha px-3 py-2 text-left hover:border-primaria">
          <div className="text-primaria">⊕ adicionar mais</div>
          <div className="text-xs text-muted">incluir mais fotos à seleção</div>
        </button>
        <div className="flex min-h-[4.75rem] flex-col justify-center border border-linha px-3 py-2 text-center">
          <div><span className="text-fosforo">{fotos.length}</span> fotos</div>
          <div className="text-xs text-muted"><span className="text-fosforo">{nSel}</span> visíveis</div>
        </div>
        <button onClick={() => onContinuar(fotos)} disabled={nSel === 0}
          className="flex min-h-[4.75rem] flex-col items-center justify-center gap-0.5 bg-primaria px-3 py-2 font-bold uppercase tracking-widest text-fundo hover:bg-fosforo disabled:cursor-not-allowed disabled:opacity-40">
          <span>configurar</span>
          <span>modelo →</span>
        </button>
      </div>

      <input ref={addRef} data-testid="input-adicionar" type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => e.target.files?.length && adicionar(e.target.files)} />
      <input ref={trocarRef} data-testid="input-trocar" type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => e.target.files?.length && trocar(e.target.files)} />
    </div>
  )
}
