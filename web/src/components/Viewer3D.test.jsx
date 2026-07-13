import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Component } from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

const diretorioAtual = dirname(fileURLToPath(import.meta.url))
const codigoFonte = readFileSync(join(diretorioAtual, 'Viewer3D.jsx'), 'utf-8')

test('não referencia HDRI/ambiente externo (offline-first)', () => {
  expect(codigoFonte).not.toMatch(/environment=["']city["']/)
  expect(codigoFonte).not.toMatch(/raw\.githack\.com/)
  expect(codigoFonte).not.toMatch(/https?:\/\//)
})

test('usa iluminação local em vez de Environment/HDRI', () => {
  expect(codigoFonte).toMatch(/ambientLight/)
  expect(codigoFonte).toMatch(/directionalLight/)
})

test('possui Error Boundary para não deixar a tela em branco', () => {
  expect(codigoFonte).toMatch(/getDerivedStateFromError|componentDidCatch/)
  expect(codigoFonte).toMatch(/[Nn]ão foi possível carregar o modelo/)
})

// O boundary real de Viewer3D não é exportado (evita expor API interna), e montar o
// Canvas do react-three-fiber em jsdom não é confiável. Este teste replica o mesmo
// padrão de classe (getDerivedStateFromError + fallback pt-BR) para confirmar que o
// comportamento de "não ficar em branco quando um filho lança" funciona em jsdom.
class BoundaryDeTeste extends Component {
  constructor(props) {
    super(props)
    this.state = { comErro: false }
  }
  static getDerivedStateFromError() {
    return { comErro: true }
  }
  render() {
    if (this.state.comErro) {
      return <div>Não foi possível carregar o modelo. Tente novamente.</div>
    }
    return this.props.children
  }
}

function Quebra() {
  throw new Error('falha simulada')
}

test('padrão de Error Boundary renderiza fallback em pt-BR quando um filho lança', () => {
  // React e o jsdom logam o erro capturado no console/stderr mesmo quando o
  // boundary o trata corretamente; silenciamos aqui para manter a saída limpa.
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const onWindowError = (e) => e.preventDefault()
  window.addEventListener('error', onWindowError)

  try {
    render(
      <BoundaryDeTeste>
        <Quebra />
      </BoundaryDeTeste>
    )
    expect(screen.getByText(/não foi possível carregar o modelo/i)).toBeInTheDocument()
  } finally {
    window.removeEventListener('error', onWindowError)
    consoleErrorSpy.mockRestore()
  }
})
