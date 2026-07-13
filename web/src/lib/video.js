// Extrai frames de um vídeo no navegador para virarem fotos do organizador.
// A parte pura (quais instantes amostrar) fica separada das primitivas de mídia
// (<video>/<canvas>), que são injetáveis pra testar sem navegador.

// Nunca mais de ~1 frame por 0,4s de vídeo: frames quase idênticos não ajudam a
// reconstrução e só pesam.
const MAX_POR_SEGUNDO = 2.5

// instantesDeAmostra devolve os tempos (s) a capturar, espaçados e dentro do
// vídeo (sem tocar as bordas, onde costuma haver fade/tremor).
export function instantesDeAmostra(duracao, alvo) {
  if (!(duracao > 0) || !(alvo > 0)) return []
  const n = Math.min(alvo, Math.floor(duracao * MAX_POR_SEGUNDO))
  if (n < 1) return []
  const passo = duracao / (n + 1)
  return Array.from({ length: n }, (_, i) => passo * (i + 1))
}

// nomeFrame: frame_0001.jpg... ordena por nome = ordem temporal.
function nomeFrame(i) {
  return `frame_${String(i + 1).padStart(4, '0')}.jpg`
}

const CAP_TIMEOUT = 4000

// primitivas de navegador padrão
async function abrirBrowser(file) {
  const video = document.createElement('video')
  video.muted = true
  video.src = URL.createObjectURL(file)
  await new Promise((ok, err) => {
    video.onloadedmetadata = ok
    video.onerror = () => err(new Error('vídeo inválido'))
  })
  const canvas = document.createElement('canvas')
  const escala = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight))
  canvas.width = Math.round(video.videoWidth * escala)
  canvas.height = Math.round(video.videoHeight * escala)
  const ctx = canvas.getContext('2d')
  return { video, canvas, ctx, duracao: video.duration }
}

// capturaBrowser busca o instante t e devolve um Blob JPEG do frame.
function capturaBrowser(estado, t) {
  const { video, canvas, ctx } = estado
  return new Promise((resolve, reject) => {
    const tempo = setTimeout(() => reject(new Error('seeked não disparou')), CAP_TIMEOUT)
    video.onseeked = () => {
      clearTimeout(tempo)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob vazio'))), 'image/jpeg', 0.9)
    }
    video.currentTime = t
  })
}

// extrairFrames devolve os frames como File[] nomeados em ordem temporal.
// Frames cuja captura falha (seeked que não dispara) são pulados.
export async function extrairFrames(file, { alvo = 80, aoProgresso, abrir = abrirBrowser, capturar = capturaBrowser, fechar = () => {} } = {}) {
  const estado = await abrir(file)
  const instantes = instantesDeAmostra(estado.duracao, alvo)
  const frames = []
  try {
    for (let i = 0; i < instantes.length; i++) {
      try {
        const blob = await capturar(estado, instantes[i])
        frames.push(new File([blob], nomeFrame(i), { type: 'image/jpeg' }))
      } catch {
        // seeked não disparou nesse instante: pula e segue
      }
      aoProgresso?.((i + 1) / instantes.length)
    }
  } finally {
    fechar(estado)
  }
  return frames
}
