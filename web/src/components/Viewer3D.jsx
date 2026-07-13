import { Component, Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'
import { contarTriangulos, aplicarWireframe } from '../lib/malha.js'

function Modelo({ url, wireframe, onContar }) {
  const { scene } = useGLTF(url)

  useEffect(() => {
    onContar(contarTriangulos(scene))
  }, [scene, onContar])

  useEffect(() => {
    aplicarWireframe(scene, wireframe)
  }, [scene, wireframe])

  return <primitive object={scene} />
}

class Viewer3DErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { comErro: false }
  }

  static getDerivedStateFromError() {
    return { comErro: true }
  }

  componentDidCatch(erro) {
    console.error('Falha ao carregar o visualizador 3D:', erro)
  }

  render() {
    if (this.state.comErro) {
      return (
        <div className="h-[420px] rounded-2xl overflow-hidden border border-linha bg-black/30 flex items-center justify-center text-center text-sm text-muted px-6">
          Não foi possível carregar o modelo. Tente novamente.
        </div>
      )
    }
    return this.props.children
  }
}

export default function Viewer3D({ url }) {
  const [wireframe, setWireframe] = useState(false)
  const [triangulos, setTriangulos] = useState(null)

  return (
    <Viewer3DErrorBoundary>
      <div className="relative h-[420px] rounded-2xl overflow-hidden border border-linha bg-black/30">
        <Canvas camera={{ position: [2, 1.5, 2], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} />
          <directionalLight position={[-5, -3, -5]} intensity={0.4} />
          <Suspense fallback={null}>
            <Stage environment={null} intensity={0.5}>
              <Modelo url={url} wireframe={wireframe} onContar={setTriangulos} />
            </Stage>
          </Suspense>
          <OrbitControls makeDefault />
        </Canvas>

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <button
            type="button"
            aria-pressed={wireframe}
            onClick={() => setWireframe((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold backdrop-blur border ${
              wireframe ? 'bg-primaria text-black border-primaria' : 'bg-black/40 text-tinta border-linha hover:border-muted'
            }`}
          >
            wireframe
          </button>
        </div>

        {triangulos !== null && (
          <div className="absolute right-3 top-3 rounded-lg border border-linha bg-black/40 px-3 py-1.5 text-xs text-muted backdrop-blur">
            {triangulos.toLocaleString('pt-BR')} triângulos
          </div>
        )}
      </div>
    </Viewer3DErrorBoundary>
  )
}
