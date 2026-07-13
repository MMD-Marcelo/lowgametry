// Operações sobre a árvore de objetos do three.js carregada de um .glb.
// Ficam aqui (fora do Viewer3D) porque o Canvas do react-three-fiber não monta
// em jsdom — assim a lógica continua testável.

function materiais(malha) {
  return Array.isArray(malha.material) ? malha.material : [malha.material]
}

// contarTriangulos soma os triângulos de todas as malhas da árvore. Geometria
// indexada conta pelo índice; sem índice, cada 3 vértices formam um triângulo.
export function contarTriangulos(raiz) {
  let total = 0
  raiz.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return
    const g = obj.geometry
    const vertices = g.index ? g.index.count : (g.attributes.position?.count ?? 0)
    total += Math.floor(vertices / 3)
  })
  return total
}

export function aplicarWireframe(raiz, ligado) {
  raiz.traverse((obj) => {
    if (!obj.isMesh) return
    for (const mat of materiais(obj)) {
      if (mat) mat.wireframe = ligado
    }
  })
}
