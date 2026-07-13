// Leitor mínimo de EXIF: só a data de captura. Não é um parser completo —
// acha o segmento APP1 (Exif) do JPEG e lê DateTimeOriginal (0x9003) do TIFF.

const SOI = 0xffd8
const APP1 = 0xffe1
const TAG_EXIF_IFD = 0x8769
const TAG_DATETIME_ORIGINAL = 0x9003

// parseData converte "AAAA:MM:DD HH:MM:SS" (formato EXIF) em Date local.
function parseData(txt) {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(txt)
  if (!m) return null
  const [, a, mes, d, h, min, s] = m.map(Number)
  const data = new Date(a, mes - 1, d, h, min, s)
  return Number.isNaN(data.getTime()) ? null : data
}

// lerDataDaCaptura devolve o DateTimeOriginal como Date, ou null se ausente.
export function lerDataDaCaptura(arrayBuffer) {
  const dv = new DataView(arrayBuffer)
  if (dv.byteLength < 4 || dv.getUint16(0) !== SOI) return null

  // percorre os segmentos do JPEG até achar o APP1 com assinatura "Exif\0\0"
  let off = 2
  while (off + 4 <= dv.byteLength) {
    const marcador = dv.getUint16(off)
    if ((marcador & 0xff00) !== 0xff00) break
    const tam = dv.getUint16(off + 2)
    if (marcador === APP1 && off + 4 + 6 <= dv.byteLength &&
        dv.getUint32(off + 4) === 0x45786966 /* "Exif" */) {
      return lerTIFF(dv, off + 10) // pula "Exif\0\0"
    }
    if (tam < 2) break
    off += 2 + tam
  }
  return null
}

function lerTIFF(dv, base) {
  if (base + 8 > dv.byteLength) return null
  const ordem = dv.getUint16(base)
  const le = ordem === 0x4949 // "II" = little-endian; "MM" = big-endian
  if (!le && ordem !== 0x4d4d) return null
  const u16 = (o) => dv.getUint16(o, le)
  const u32 = (o) => dv.getUint32(o, le)

  const ifd0 = base + u32(base + 4)
  const exifIFD = acharTag(dv, ifd0, TAG_EXIF_IFD, u16, u32)
  if (exifIFD == null) return null

  const dataOff = acharTag(dv, base + exifIFD, TAG_DATETIME_ORIGINAL, u16, u32)
  if (dataOff == null) return null

  let txt = ''
  for (let i = 0; i < 19 && base + dataOff + i < dv.byteLength; i++) {
    const c = dv.getUint8(base + dataOff + i)
    if (c === 0) break
    txt += String.fromCharCode(c)
  }
  return parseData(txt)
}

// acharTag varre uma IFD e devolve o campo de valor/offset (bytes 8..11) da tag,
// ou null se ela não estiver lá.
function acharTag(dv, ifd, tag, u16, u32) {
  if (ifd + 2 > dv.byteLength) return null
  const n = u16(ifd)
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12
    if (e + 12 > dv.byteLength) return null
    if (u16(e) === tag) return u32(e + 8)
  }
  return null
}
