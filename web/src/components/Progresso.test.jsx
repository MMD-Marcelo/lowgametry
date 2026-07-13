// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Progresso from './Progresso.jsx'

const rodando = { estado: 'rodando', etapa: 'denso', pct: 40, log: [] }

describe('Progresso — abortar', () => {
  it('mostra o botão abortar enquanto está rodando', () => {
    render(<Progresso status={rodando} onAbortar={() => {}} onRecomecar={() => {}} />)
    expect(screen.getByRole('button', { name: /abortar/i })).toBeInTheDocument()
  })

  it('não mostra abortar quando o job já terminou com erro', () => {
    render(<Progresso status={{ ...rodando, estado: 'erro' }} onAbortar={() => {}} onRecomecar={() => {}} />)
    expect(screen.queryByRole('button', { name: /abortar/i })).not.toBeInTheDocument()
  })

  it('pede confirmação antes de abortar de fato', () => {
    const onAbortar = vi.fn()
    render(<Progresso status={rodando} onAbortar={onAbortar} onRecomecar={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /abortar/i }))
    // primeiro clique só pede confirmação
    expect(onAbortar).not.toHaveBeenCalled()
    expect(screen.getByText(/perder o progresso/i)).toBeInTheDocument()
  })

  it('aborta ao confirmar e mostra "abortando"', async () => {
    let resolver
    const onAbortar = vi.fn(() => new Promise((r) => { resolver = r }))
    render(<Progresso status={rodando} onAbortar={onAbortar} onRecomecar={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /abortar/i }))
    fireEvent.click(screen.getByRole('button', { name: /sim, abortar/i }))
    expect(onAbortar).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText(/abortando/i)).toBeInTheDocument())
    resolver()
  })
})
