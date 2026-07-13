import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import { dirname, join } from 'node:path'
import { cpus } from 'node:os'
import { crc32 } from 'node:zlib'

// Nota: evitar o padrão literal `new URL('./x', import.meta.url)` — sob Vite/Vitest
// esse padrão é reescrito estaticamente para uma URL do dev server (http://.../@fs/...)
// em vez de permanecer um file:// real, o que quebra fileURLToPath. path.join com
// dirname resolve o mesmo caminho sem cair nessa transformação.
const DEMO = join(dirname(fileURLToPath(import.meta.url)), 'demo.glb')
const ETAPAS = ['preparo', 'SfM', 'denso', 'malha', 'low-poly', 'textura', 'export']

// estado em memória: um job por vez
let atual = null // { id, estado, etapa, pct, log, iniciado }

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function json(res, status, obj) {
  cors(res)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj))
}

// zipStored monta um .zip sem compressão (método 0) a partir de {nome: Buffer}.
// Evita dependência externa; o mock só precisa de um zip válido pra UI baixar.
function zipStored(arquivos) {
  const locais = []
  const centrais = []
  let offset = 0
  for (const [nome, dados] of Object.entries(arquivos)) {
    const bn = Buffer.from(nome, 'utf8')
    const crc = crc32(dados)

    const local = Buffer.alloc(30 + bn.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // versão mínima
    local.writeUInt16LE(0, 8) // método: stored
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(dados.length, 18)
    local.writeUInt32LE(dados.length, 22)
    local.writeUInt16LE(bn.length, 26)
    bn.copy(local, 30)
    locais.push(local, dados)

    const central = Buffer.alloc(46 + bn.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(dados.length, 20)
    central.writeUInt32LE(dados.length, 24)
    central.writeUInt16LE(bn.length, 28)
    central.writeUInt32LE(offset, 42)
    bn.copy(central, 46)
    centrais.push(central)

    offset += local.length + dados.length
  }
  const corpo = Buffer.concat(locais)
  const dir = Buffer.concat(centrais)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(centrais.length, 8)
  fim.writeUInt16LE(centrais.length, 10)
  fim.writeUInt32LE(dir.length, 12)
  fim.writeUInt32LE(corpo.length, 16)
  return Buffer.concat([corpo, dir, fim])
}

// mesmo trio de artefatos que o motor real entrega no .zip
const OBJ_DEMO = Buffer.from('mtllib resultado.mtl\nusemtl lg_baked\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n')
const MTL_DEMO = Buffer.from('newmtl lg_baked\nmap_Kd resultado_albedo.png\n')
const PNG_DEMO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

function progresso() {
  if (!atual || atual.estado === 'pronto') return
  // 4s por padrão (progresso realista pro `npm run mock`); o teste encurta via env
  const dur = Number(process.env.LOWGAMETRY_MOCK_DUR_MS) || 4000
  const t = Math.min(1, (Date.now() - atual.iniciado) / dur)
  atual.pct = Math.round(t * 100)
  atual.etapa = ETAPAS[Math.min(ETAPAS.length - 1, Math.floor(t * ETAPAS.length))]
  atual.estado = t >= 1 ? 'pronto' : 'rodando'
}

export function iniciar(porta = 8757) {
  const servidor = createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${porta}`)
    if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end() }

    if (req.method === 'GET' && url.pathname === '/health')
      return json(res, 200, { versao: 'mock-1', temCUDA: false, nucleos: cpus().length, ocupado: !!atual && atual.estado !== 'pronto' })

    if (req.method === 'POST' && url.pathname === '/jobs') {
      if (atual && atual.estado !== 'pronto') return json(res, 409, { erro: 'já há um job em andamento' })
      // não precisamos ler o corpo no mock; drenamos
      req.resume()
      req.on('end', () => {
        atual = { id: 'mock-' + Date.now(), estado: 'rodando', etapa: 'preparo', pct: 0, log: ['job iniciado'], iniciado: Date.now() }
        json(res, 202, { jobId: atual.id })
      })
      return
    }

    const m = url.pathname.match(/^\/jobs\/([^/]+)(\/result\.(glb|zip))?$/)
    if (m) {
      const id = m[1]
      if (!atual || atual.id !== id) return json(res, 404, { erro: 'job não encontrado' })
      if (req.method === 'DELETE') { atual = null; cors(res); res.writeHead(204); return res.end() }
      if (m[3]) {
        progresso()
        if (atual.estado !== 'pronto') return json(res, 409, { erro: 'ainda não pronto' })
        const zip = m[3] === 'zip'
        const buf = zip
          ? zipStored({ 'resultado.obj': OBJ_DEMO, 'resultado.mtl': MTL_DEMO, 'resultado_albedo.png': PNG_DEMO })
          : await readFile(DEMO)
        cors(res)
        res.writeHead(200, {
          'Content-Type': zip ? 'application/zip' : 'model/gltf-binary',
          'Content-Length': buf.length,
        })
        return res.end(buf)
      }
      if (req.method === 'GET') { progresso(); return json(res, 200, { estado: atual.estado, etapa: atual.etapa, pct: atual.pct, log: atual.log }) }
    }

    json(res, 404, { erro: 'rota desconhecida' })
  })

  return new Promise((resolve) => {
    servidor.listen(porta, '127.0.0.1', () => {
      resolve({ servidor, fechar: () => new Promise((r) => servidor.close(r)) })
    })
  })
}

// execução direta: `node mock-motor/server.mjs` (ou via `npm run mock`, com caminho relativo)
// process.argv[1] não é uma file:// URL normalizada — comparar strings direto quebra
// sempre que o script é invocado com caminho relativo. pathToFileURL normaliza os dois lados.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  iniciar().then(() => console.log('motor mock em http://127.0.0.1:8757'))
}
