// Caixa com borda verde e cantos em L (os colchetes de canto dos mockups),
// desenhados com pseudo-elementos via ::before/::after nos 4 cantos.
export default function Moldura({ children, className = '' }) {
  return (
    <div className={`relative border border-primaria/40 glow-box ${className}`}>
      <span className="pointer-events-none absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-fosforo" />
      <span className="pointer-events-none absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-fosforo" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-fosforo" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-fosforo" />
      {children}
    </div>
  )
}
