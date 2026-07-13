// Fundo de facetas animado (alusão ao logo). SVG inline pra animar quadrado a
// quadrado: onda de pulso descendo as colunas + deriva lenta do conjunto.
// Estático sob prefers-reduced-motion (regra global no index.css).

const W = 1920
const H = 1080
const VERDE = '#027b5b'
const LADO = 180
const PASSO = 150
const SUBCOLUNAS = [
  { off: -95, op: 0.9 }, // coluna extra colada na borda da tela (fecha o vão)
  { off: 0, op: 0.85 },
  { off: 95, op: 0.6 },
  { off: 185, op: 0.38 },
]

// Coreografia do scanner: 1 ciclo = CICLO s, dividido em 1 slot por linha
// (sub-coluna). As linhas varrem em sequência; a direção alterna (linha par
// desce, ímpar sobe). Esquerda e direita da mesma linha andam juntas.
const CICLO = 8 // s
const SLOT = CICLO / SUBCOLUNAS.length
const VARREDURA = SLOT * 0.78 // fração do slot que a banda leva pra atravessar

function coluna(baseX, espelho) {
  const rects = []
  SUBCOLUNAS.forEach(({ off, op }, li) => {
    const x = baseX + (espelho ? -off : off)
    const desce = li % 2 === 0
    let y = -LADO * 0.6
    let i = 0
    while (y < H + LADO) {
      const rotBase = i % 2 === 0 ? 16 : -14
      const rot = espelho ? -rotBase : rotBase
      const cy = y + LADO / 2
      // posição vertical 0..1 (topo→base); direção define o sentido da banda
      const pf = Math.min(1, Math.max(0, y / H))
      const posFrac = desce ? pf : 1 - pf
      const delay = li * SLOT + posFrac * VARREDURA
      rects.push({ x: x - LADO / 2, y, rot, cx: x, cy, op, delay })
      y += PASSO
      i += 1
    }
  })
  return rects
}

const RECTS = [...coluna(120, false), ...coluna(W - 120, true)]

export default function FacetasFundo() {
  return (
    <svg
      id="facetas"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g className="facetas-deriva">
        {RECTS.map((r, i) => (
          <rect
            key={i}
            x={r.x}
            y={r.y}
            width={LADO}
            height={LADO}
            fill={VERDE}
            transform={`rotate(${r.rot} ${r.cx} ${r.cy})`}
            className="facetas-pulso"
            style={{ '--op': r.op, animationDelay: `${r.delay}s` }}
          />
        ))}
      </g>
    </svg>
  )
}
