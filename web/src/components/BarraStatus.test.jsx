// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BarraStatus from './BarraStatus.jsx'

describe('BarraStatus', () => {
  it('offline: mostra desconectado e link de download', () => {
    render(<BarraStatus online={false} info={null} />)
    expect(screen.getByText(/motor desconectado/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /baixar o motor/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('/releases'))
  })

  it('online: mostra conectado, aceleração e núcleos', () => {
    render(<BarraStatus online info={{ temCUDA: true, nucleos: 16 }} />)
    expect(screen.getByText(/motor conectado/i)).toBeInTheDocument()
    expect(screen.getByText(/CUDA/)).toBeInTheDocument()
    expect(screen.getByText(/16 núcleos/)).toBeInTheDocument()
  })
})
