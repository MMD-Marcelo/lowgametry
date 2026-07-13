// Fundo de facetas (alusão ao logo). SVG inline, arte estática nas bordas.
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

function coluna(baseX, espelho) {
  const rects = []
  SUBCOLUNAS.forEach(({ off, op }) => {
    const x = baseX + (espelho ? -off : off)
    let y = -LADO * 0.6
    let i = 0
    while (y < H + LADO) {
      const rotBase = i % 2 === 0 ? 16 : -14
      const rot = espelho ? -rotBase : rotBase
      const cy = y + LADO / 2
      rects.push({ x: x - LADO / 2, y, rot, cx: x, cy, op })
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
      {RECTS.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={LADO}
          height={LADO}
          fill={VERDE}
          opacity={r.op}
          transform={`rotate(${r.rot} ${r.cx} ${r.cy})`}
        />
      ))}
    </svg>
  )
}
