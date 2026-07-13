import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Resultado from './Resultado'
import { BASE_MOTOR } from '../lib/motor.js'

// R3F não renderiza em jsdom — stub do viewer
vi.mock('./Viewer3D.jsx', () => ({ default: ({ url }) => <div data-testid="viewer" data-url={url} /> }))

it('mostra o viewer com a url do glb e links de download', () => {
  render(<Resultado jobId="job1" onRecomecar={() => {}} />)
  expect(screen.getByTestId('viewer')).toHaveAttribute('data-url', `${BASE_MOTOR}/jobs/job1/result.glb`)
  const glb = screen.getByRole('link', { name: /\.glb/i })
  expect(glb).toHaveAttribute('href', `${BASE_MOTOR}/jobs/job1/result.glb`)
  // .obj sozinho perderia a textura: o motor entrega obj + mtl + png num zip
  expect(screen.getByRole('link', { name: /\.obj/i })).toHaveAttribute('href', `${BASE_MOTOR}/jobs/job1/result.zip`)
})
