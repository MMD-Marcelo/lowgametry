import { render, screen, fireEvent } from '@testing-library/react'
import Inicio from './Inicio'

it('chama onFotos ao escolher arquivos', () => {
  const onFotos = vi.fn()
  render(<Inicio onFotos={onFotos} onVideo={() => {}} />)
  fireEvent.change(screen.getByTestId('input-fotos'), { target: { files: [new File(['x'], 'a.jpg')] } })
  expect(onFotos).toHaveBeenCalled()
})

it('chama onVideo ao escolher um vídeo', () => {
  const onVideo = vi.fn()
  render(<Inicio onFotos={() => {}} onVideo={onVideo} />)
  fireEvent.change(screen.getByTestId('input-video'), { target: { files: [new File(['x'], 'v.mp4', { type: 'video/mp4' })] } })
  expect(onVideo).toHaveBeenCalled()
})
