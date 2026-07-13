import { describe, it, expect } from 'vitest'
import { BufferGeometry, BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three'
import { contarTriangulos, aplicarWireframe } from './malha.js'

// quadrado = 2 triangulos: 4 vertices, 6 indices
function quadrado() {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(4 * 3), 3))
  g.setIndex([0, 1, 2, 0, 2, 3])
  return g
}

// triangulo solto, sem indice: 3 vertices
function triangulo() {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(3 * 3), 3))
  return g
}

describe('contarTriangulos', () => {
  it('conta geometria indexada pelo indice, nao pelos vertices', () => {
    const raiz = new Group()
    raiz.add(new Mesh(quadrado(), new MeshStandardMaterial()))
    expect(contarTriangulos(raiz)).toBe(2)
  })

  it('conta geometria nao indexada pelos vertices', () => {
    const raiz = new Group()
    raiz.add(new Mesh(triangulo(), new MeshStandardMaterial()))
    expect(contarTriangulos(raiz)).toBe(1)
  })

  it('soma todas as malhas da arvore, inclusive aninhadas', () => {
    const raiz = new Group()
    const filho = new Group()
    filho.add(new Mesh(quadrado(), new MeshStandardMaterial()))
    raiz.add(new Mesh(triangulo(), new MeshStandardMaterial()), filho)
    expect(contarTriangulos(raiz)).toBe(3)
  })

  it('devolve 0 para arvore sem malha', () => {
    expect(contarTriangulos(new Group())).toBe(0)
  })
})

describe('aplicarWireframe', () => {
  it('liga e desliga o wireframe de todas as malhas', () => {
    const raiz = new Group()
    const a = new Mesh(quadrado(), new MeshStandardMaterial())
    const b = new Mesh(triangulo(), new MeshStandardMaterial())
    raiz.add(a, b)

    aplicarWireframe(raiz, true)
    expect(a.material.wireframe).toBe(true)
    expect(b.material.wireframe).toBe(true)

    aplicarWireframe(raiz, false)
    expect(a.material.wireframe).toBe(false)
  })

  it('aceita malha com varios materiais', () => {
    const raiz = new Group()
    const m = new Mesh(quadrado(), [new MeshStandardMaterial(), new MeshStandardMaterial()])
    raiz.add(m)
    aplicarWireframe(raiz, true)
    expect(m.material.every((mat) => mat.wireframe)).toBe(true)
  })
})
