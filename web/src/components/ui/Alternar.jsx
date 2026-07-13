// Toggle em estilo terminal: rótulo + [X]/[ ]. A linha inteira é clicável.
export default function Alternar({ rotulo, checked, onChange }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      aria-pressed={checked}
      onClick={() => onChange()}
      className="flex w-full items-center justify-between border-b border-linha/60 px-1 py-2 text-left hover:bg-primaria-clara/40"
    >
      <span className="tracking-wide">{rotulo}</span>
      <span className={checked ? 'text-fosforo glow' : 'text-muted'}>{checked ? '[X]' : '[ ]'}</span>
    </button>
  )
}
