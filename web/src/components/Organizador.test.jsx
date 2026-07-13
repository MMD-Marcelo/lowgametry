// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Organizador from './Organizador.jsx'
import { criarFoto } from '../lib/fotos.js'

const foto = (over) => criarFoto({ nome: over.nome, blob: new Blob(['x']), url: 'blob:x', ...over })

function montar(props = {}) {
  const fotos = props.fotos ?? [
    foto({ nome: 'a.jpg', data: new Date(2021, 0, 1) }),
    foto({ nome: 'b.jpg', data: new Date(2021, 0, 2) }),
  ]
  const onContinuar = vi.fn()
  const importar = vi.fn(async () => [])
  render(<Organizador fotos={fotos} importar={importar} onContinuar={onContinuar} onVoltar={() => {}} />)
  return { onContinuar, importar }
}

describe('Organizador', () => {
  it('mostra uma miniatura por foto', () => {
    montar()
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('exclui uma foto ao clicar nela e devolve a lista com a exclusão marcada', () => {
    const { onContinuar } = montar()
    fireEvent.click(screen.getByLabelText(/incluir\/excluir a\.jpg/i))
    fireEvent.click(screen.getByRole('button', { name: /configurar modelo/i }))
    // devolve as fotos completas (App computa paraEnvio ao iniciar)
    const devolvidas = onContinuar.mock.calls[0][0]
    expect(devolvidas).toHaveLength(2)
    expect(devolvidas.find((f) => f.nome === 'a.jpg').incluida).toBe(false)
    expect(devolvidas.find((f) => f.nome === 'b.jpg').incluida).toBe(true)
  })

  it('mostra aviso quando há poucas fotos', () => {
    montar()
    expect(screen.getByText(/poucas fotos/i)).toBeInTheDocument()
  })

  it('trocar fotos substitui a seleção pelas novas, sem voltar ao início', async () => {
    const novas = [criarFoto({ nome: 'nova.jpg', blob: new Blob(['n']), url: 'blob:n' })]
    const importar = vi.fn(async () => novas)
    render(<Organizador
      fotos={[foto({ nome: 'a.jpg' }), foto({ nome: 'b.jpg' })]}
      importar={importar}
      onContinuar={() => {}} onVoltar={() => {}} />)
    fireEvent.change(screen.getByTestId('input-trocar'), { target: { files: [new File(['n'], 'nova.jpg')] } })
    expect(await screen.findByText((_, el) => el?.textContent === '1 de 1 fotos selecionadas')).toBeInTheDocument()
  })

  it('desabilita "configurar modelo" quando nenhuma foto está selecionada', () => {
    montar({ fotos: [foto({ nome: 'a.jpg', incluida: false }), foto({ nome: 'b.jpg', incluida: false })] })
    expect(screen.getByRole('button', { name: /configurar modelo/i })).toBeDisabled()
  })

  it('adiciona mais fotos anexando à seleção atual', async () => {
    const novas = [criarFoto({ nome: 'nova.jpg', blob: new Blob(['n']), url: 'blob:n' })]
    const importar = vi.fn(async () => novas)
    render(<Organizador
      fotos={[foto({ nome: 'a.jpg' }), foto({ nome: 'b.jpg' })]}
      importar={importar}
      onContinuar={() => {}} onVoltar={() => {}} />)
    const input = screen.getByTestId('input-adicionar')
    fireEvent.change(input, { target: { files: [new File(['n'], 'nova.jpg')] } })
    // o texto "3 de 3 fotos selecionadas" é composto por spans separados pros
    // números com destaque; getByText não junta texto de elementos filhos, daí
    // o matcher por função conferindo o textContent combinado do nó.
    expect(await screen.findByText((_, el) => el?.textContent === '3 de 3 fotos selecionadas')).toBeInTheDocument()
  })
})
