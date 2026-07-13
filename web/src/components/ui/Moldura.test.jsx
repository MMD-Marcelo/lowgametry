// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Moldura from './Moldura.jsx'
import TituloSecao from './TituloSecao.jsx'

describe('Moldura', () => {
  it('renderiza os filhos', () => {
    render(<Moldura><span>conteudo</span></Moldura>)
    expect(screen.getByText('conteudo')).toBeInTheDocument()
  })
})

describe('TituloSecao', () => {
  it('mostra o rótulo', () => {
    render(<TituloSecao>MODO</TituloSecao>)
    expect(screen.getByText('MODO')).toBeInTheDocument()
  })
})
