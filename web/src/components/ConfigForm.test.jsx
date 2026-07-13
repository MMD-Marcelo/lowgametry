import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import ConfigForm from './ConfigForm'
import { configPadrao } from '../lib/config.js'

function Wrap() {
  const [config, setConfig] = useState(configPadrao())
  return <ConfigForm config={config} setConfig={setConfig} nFotos={12} onGerar={() => {}} onVoltar={() => {}} />
}

it('mostra modo low poly e troca preset atualizando faces', () => {
  render(<Wrap />)
  expect(screen.getByText(/modo/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /low poly/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /alto/i }))
  expect(screen.getByLabelText(/faces/i)).toHaveValue(1500)
})

it('troca para fotogrametria normal com presets maiores', () => {
  render(<Wrap />)
  fireEvent.click(screen.getByRole('button', { name: /fotogrametria normal/i }))
  expect(screen.getByLabelText(/faces/i)).toHaveValue(20000)
  expect(screen.getByLabelText(/resolução da textura/i)).toHaveTextContent('2048px')
})
