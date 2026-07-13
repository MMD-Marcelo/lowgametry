// Nota de nitidez de uma imagem: variância do Laplaciano sobre a luminância.
// Foto tremida/desfocada tem poucas bordas → variância baixa. É uma medida
// relativa, comparável dentro de um mesmo conjunto, não uma escala absoluta.

// núcleo Laplaciano 3x3: destaca variação local (bordas)
const KERNEL = [0, 1, 0, 1, -4, 1, 0, 1, 0]

// nitidez recebe um ImageData (RGBA) e devolve a variância do Laplaciano.
export function nitidez(imageData) {
  const { data, width: w, height: h } = imageData
  if (w < 3 || h < 3) return 0

  // luminância por pixel (Rec. 601)
  const lum = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) {
    lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }

  // aplica o Laplaciano no interior e acumula média/variância
  let soma = 0
  let somaQ = 0
  let n = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let acc = 0
      let k = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          acc += lum[(y + dy) * w + (x + dx)] * KERNEL[k++]
        }
      }
      soma += acc
      somaQ += acc * acc
      n++
    }
  }
  if (n === 0) return 0
  const media = soma / n
  return somaQ / n - media * media
}

// limiarBorrado: abaixo desse valor a foto é considerada tremida. Metade da
// mediana — corta a cauda ruim sem exigir uma escala absoluta de nitidez.
export function limiarBorrado(notas) {
  if (!notas.length) return 0
  const ord = [...notas].sort((a, b) => a - b)
  const meio = Math.floor(ord.length / 2)
  const mediana = ord.length % 2 ? ord[meio] : (ord[meio - 1] + ord[meio]) / 2
  return mediana / 2
}
