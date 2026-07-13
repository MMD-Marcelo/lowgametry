// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Alternar from './Alternar.jsx'

describe('Alternar', () => {
  it('mostra [X] quando ligado e [ ] quando desligado', () => {
    const { rerender } = render(<Alternar rotulo="FLAT SHADING" checked onChange={() => {}} />)
    expect(screen.getByText('[X]')).toBeInTheDocument()
    rerender(<Alternar rotulo="FLAT SHADING" checked={false} onChange={() => {}} />)
    expect(screen.getByText('[ ]')).toBeInTheDocument()
  })

  it('chama onChange ao clicar', () => {
    const onChange = vi.fn()
    render(<Alternar rotulo="DITHERING" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /dithering/i }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
