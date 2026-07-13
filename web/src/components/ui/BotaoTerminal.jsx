// Botão em estilo terminal: [ TEXTO ]. primario = preenchido; secundario = outline.
export default function BotaoTerminal({ children, onClick, disabled = false, variante = 'secundario', className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 tracking-widest uppercase transition disabled:opacity-40 disabled:cursor-not-allowed'
  const estilo = variante === 'primario'
    ? 'bg-primaria text-fundo font-bold glow-box hover:bg-fosforo'
    : 'border border-primaria/60 text-primaria hover:border-fosforo hover:text-fosforo hover:glow'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${estilo} ${className}`}>
      <span aria-hidden="true">[ </span>
      <span>{children}</span>
      <span aria-hidden="true"> ]</span>
    </button>
  )
}
