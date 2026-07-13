import { useEffect, useRef, useState } from 'react'

// Seletor no estilo do site (substitui o <select> nativo, que abre um dropdown
// azul do SO). options: [{ value, label }].
export default function Seletor({ value, onChange, options, 'aria-label': ariaLabel }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  const atual = options.find((o) => o.value === value)

  useEffect(() => {
    const fora = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  return (
    <div ref={ref} className="relative w-32">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between border border-linha bg-cartao px-3 py-1.5 text-tinta hover:border-primaria focus:border-primaria focus:outline-none"
      >
        <span>{atual?.label ?? value}</span>
        <span className="text-muted">▾</span>
      </button>
      {aberto && (
        <ul role="listbox" className="absolute right-0 z-20 mt-1 w-full border border-primaria/60 bg-cartao">
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => { onChange(o.value); setAberto(false) }}
              className={`cursor-pointer px-3 py-1.5 text-right hover:bg-primaria hover:text-fundo ${o.value === value ? 'text-fosforo' : 'text-tinta'}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
