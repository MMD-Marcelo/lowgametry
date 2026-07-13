// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BotaoTerminal from './BotaoTerminal.jsx'

describe('BotaoTerminal', () => {
  it('envolve o rótulo em colchetes e dispara onClick', () => {
    const onClick = vi.fn()
    render(<BotaoTerminal onClick={onClick}>GERAR MODELO</BotaoTerminal>)
    const btn = screen.getByRole('button', { name: /gerar modelo/i })
    expect(btn.textContent.replace(/\s+/g, ' ')).toContain('[ GERAR MODELO ]')
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalled()
  })

  it('não dispara quando disabled', () => {
    const onClick = vi.fn()
    render(<BotaoTerminal onClick={onClick} disabled>X</BotaoTerminal>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
