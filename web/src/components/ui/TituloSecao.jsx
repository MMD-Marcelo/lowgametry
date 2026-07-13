// Rótulo de seção com régua tracejada preenchendo o resto da linha (MODO ─────).
export default function TituloSecao({ children }) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-3 text-sm uppercase tracking-widest text-primaria">
      <span className="glow">{children}</span>
      <span className="h-px flex-1 border-t border-dashed border-linha" />
    </div>
  )
}
