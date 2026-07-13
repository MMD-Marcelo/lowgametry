// Transforma File[] (fotos escolhidas) em foto[] pronta pro Organizador: lê a
// data do EXIF e a nitidez de cada imagem, ordena pela captura e já desmarca as
// borradas. As primitivas de navegador são injetáveis pra manter testável.

import { lerDataDaCaptura } from './exif.js'
import { nitidez } from './nitidez.js'
import { criarFoto, ordenarInicial, marcarBorradas } from './fotos.js'
import { limiarBorrado } from './nitidez.js'

// medirNitidez padrão: decodifica o arquivo, reduz pra 256px e mede a nitidez
// sobre o ImageData. Reduzir uniformiza a escala entre fotos de tamanhos vários.
async function medirNitidezBrowser(file) {
  const bitmap = await createImageBitmap(file)
  const lado = 256
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(3, Math.round(bitmap.width * escala))
  const h = Math.max(3, Math.round(bitmap.height * escala))
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return nitidez(ctx.getImageData(0, 0, w, h))
}

const padrao = {
  lerBuffer: (f) => f.arrayBuffer(),
  lerData: lerDataDaCaptura,
  medirNitidez: medirNitidezBrowser,
  fazerURL: (f) => URL.createObjectURL(f),
}

export async function importarFotos(files, deps = padrao) {
  const { lerBuffer, lerData, medirNitidez, fazerURL } = { ...padrao, ...deps }

  const fotos = await Promise.all(
    Array.from(files).map(async (file) => {
      const [buffer, nota] = await Promise.all([lerBuffer(file), medirNitidez(file)])
      return criarFoto({
        nome: file.name,
        blob: file,
        url: fazerURL(file),
        data: lerData(buffer),
        nitidez: nota,
      })
    }),
  )

  const limiar = limiarBorrado(fotos.map((f) => f.nitidez).filter((n) => n != null))
  return marcarBorradas(ordenarInicial(fotos), limiar)
}
