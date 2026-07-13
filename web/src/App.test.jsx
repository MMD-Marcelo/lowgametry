import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import App from './App'
import * as motor from './lib/motor.js'

// R3F nao renderiza em jsdom - stub do viewer
vi.mock('./components/Viewer3D.jsx', () => ({ default: () => null }))

// importar.js usa createImageBitmap (ausente em jsdom) - devolve fotos prontas
import { criarFoto } from './lib/fotos.js'
vi.mock('./lib/importar.js', () => ({
  importarFotos: async (files) =>
    Array.from(files).map((f, i) => criarFoto({ nome: f.name, blob: f, url: 'blob:x', data: new Date(2021, 0, i + 1), nitidez: 100 })),
}))

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.spyOn(motor, 'pingMotor').mockResolvedValue({ versao: '1', temCUDA: false, nucleos: 8, ocupado: false })
  vi.spyOn(motor, 'criarJob').mockResolvedValue({ jobId: 'job1' })
  vi.spyOn(motor, 'statusJob').mockResolvedValue({ estado: 'pronto', etapa: 'export', pct: 100, log: [] })
  vi.spyOn(motor, 'apagarJob').mockResolvedValue()
})

test('início mostra o app e detecta o motor online', async () => {
  render(<App />)
  expect(screen.getByRole('img', { name: /lowgametry/i })).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText(/motor conectado/i)).toBeInTheDocument())
})

test('"novo modelo" volta ao início e não é ressuscitado pelo /health cacheado', async () => {
  // motor reporta um job pronto (e continua reportando, como faz por um ciclo)
  motor.pingMotor.mockResolvedValue({ versao: '1', temCUDA: false, nucleos: 8, ocupado: false, jobId: 'jobX', jobEstado: 'pronto' })
  render(<App />)
  // recupera na tela de resultado
  await waitFor(() => expect(screen.getByRole('link', { name: /\.glb/i })).toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: /novo modelo/i }))
  // volta ao início e FICA lá, mesmo com o /health ainda anunciando jobX
  expect(await screen.findByTestId('input-fotos')).toBeInTheDocument()
  await new Promise((r) => setTimeout(r, 50))
  expect(screen.getByTestId('input-fotos')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /\.glb/i })).not.toBeInTheDocument()
})

test('voltar da config para o organizador preserva a seleção das fotos', async () => {
  render(<App />)
  fireEvent.change(screen.getByTestId('input-fotos'), {
    target: { files: [new File(['x'], 'a.jpg'), new File(['y'], 'b.jpg')] },
  })
  // organizador: 2 fotos selecionadas (texto composto por spans com destaque
  // pros números, daí o matcher por função comparando o textContent combinado)
  expect(await screen.findByText((_, el) => el?.textContent === '2 de 2 fotos selecionadas')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /configurar modelo/i }))
  // config -> voltar
  expect(await screen.findByText(/qualidade/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /trocar fotos/i }))
  // de volta ao organizador com a seleção intacta, não "0 de 2"
  expect(await screen.findByText((_, el) => el?.textContent === '2 de 2 fotos selecionadas')).toBeInTheDocument()
})

test('escolher fotos passa pelo organizador, config e inicia o job', async () => {
  render(<App />)
  const input = screen.getByTestId('input-fotos')
  const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
  fireEvent.change(input, { target: { files: [file] } })
  // tela do organizador
  fireEvent.click(await screen.findByRole('button', { name: /configurar modelo/i }))
  // tela de config
  expect(await screen.findByText(/qualidade/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /gerar modelo/i }))
  await waitFor(() => expect(motor.criarJob).toHaveBeenCalled())
  // criarJob recebe a lista de paraEnvio (nome prefixado), nao o File cru
  expect(motor.criarJob.mock.calls[0][0][0].nome).toBe('001_a.jpg')
  expect(localStorage.getItem('lowgametry.jobId')).toBe('job1')
})

test('recupera job em andamento depois de recarregar o site', async () => {
  motor.pingMotor.mockResolvedValue({ versao: '1', temCUDA: true, nucleos: 8, ocupado: true, jobId: 'job42', jobEstado: 'rodando', jobEtapa: 'denso', jobPct: 44 })
  motor.statusJob.mockResolvedValue({ estado: 'rodando', etapa: 'denso', pct: 44, log: ['Depth-map for image 1 estimated'] })
  render(<App />)
  expect(await screen.findByText(/Nuvem densa/i)).toBeInTheDocument()
  expect(localStorage.getItem('lowgametry.jobId')).toBe('job42')
})

test('jobId velho no localStorage não prende o site na tela de progresso', async () => {
  // motor online e ocioso: o job guardado nao existe mais
  localStorage.setItem('lowgametry.jobId', 'job-de-ontem')
  render(<App />)
  expect(await screen.findByTestId('input-fotos')).toBeInTheDocument()
  await waitFor(() => expect(localStorage.getItem('lowgametry.jobId')).toBeNull())
})

test('job que sumiu do motor durante o polling volta para o início', async () => {
  motor.pingMotor.mockResolvedValue({ versao: '1', temCUDA: false, nucleos: 8, ocupado: true, jobId: 'job1', jobEstado: 'rodando', jobEtapa: 'denso', jobPct: 10 })
  const naoExiste = Object.assign(new Error('status 404'), { status: 404 })
  motor.statusJob.mockRejectedValue(naoExiste)
  render(<App />)
  // entra no progresso pelo /health; o 404 do polling devolve pro início e limpa o job.
  // input-fotos ja existe desde o primeiro render (tela inicial), entao espera o polling
  // rodar (statusJob chamado) e o estado assentar em null — senao ha uma janela onde o
  // /health setou o jobId mas o 404 ainda nao o limpou (flaky sob carga no CI).
  await waitFor(() => expect(motor.statusJob).toHaveBeenCalled())
  await waitFor(() => expect(localStorage.getItem('lowgametry.jobId')).toBeNull())
  expect(screen.getByTestId('input-fotos')).toBeInTheDocument()
})

// dropzone -> organizador -> config, deixando na tela de config
async function irParaConfig() {
  const input = screen.getByTestId('input-fotos')
  fireEvent.change(input, { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } })
  fireEvent.click(await screen.findByRole('button', { name: /configurar modelo/i }))
  expect(await screen.findByText(/qualidade/i)).toBeInTheDocument()
}

test('config inválida não chama criarJob e mostra erro', async () => {
  render(<App />)
  await irParaConfig()

  const faces = screen.getByLabelText(/faces/i)
  fireEvent.change(faces, { target: { value: '0' } })

  fireEvent.click(screen.getByRole('button', { name: /gerar modelo/i }))

  await waitFor(() => expect(screen.getByText(/faces deve estar entre/i)).toBeInTheDocument())
  expect(motor.criarJob).not.toHaveBeenCalled()
})

test('estado de erro no progresso oferece saída para recomeçar', async () => {
  motor.statusJob.mockResolvedValue({ estado: 'erro', etapa: 'reconstrucao', pct: 40, log: [] })
  render(<App />)
  await irParaConfig()
  fireEvent.click(screen.getByRole('button', { name: /gerar modelo/i }))

  const botaoRecomecar = await screen.findByRole('button', { name: /novo modelo/i })
  fireEvent.click(botaoRecomecar)

  await waitFor(() => expect(screen.getByTestId('input-fotos')).toBeInTheDocument())
})
