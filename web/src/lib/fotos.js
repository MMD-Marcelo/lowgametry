// Modelo da coleção de fotos do organizador. Puro: não toca no DOM.
// Uma foto é a unidade que o organizador reordena, inclui/exclui e envia.

const MIN_FOTOS = 15

let seq = 0

// criarFoto normaliza uma entrada em foto. `blob` é obrigatório; o resto tem
// padrão. `url` é opcional (miniatura); a lógica aqui não depende dela.
export function criarFoto({ nome, blob, url = null, data = null, nitidez = null, incluida = true, origem = 'foto' }) {
  return { id: `f${seq++}`, nome, blob, url, data, nitidez, incluida, origem }
}

// ordenarInicial: por data de captura (EXIF) asc; sem data, cai pro nome.
// Fotos com data vêm antes das sem data. Estável dentro de cada grupo.
export function ordenarInicial(fotos) {
  return [...fotos].sort((a, b) => {
    if (a.data && b.data) return a.data - b.data
    if (a.data) return -1
    if (b.data) return 1
    return a.nome.localeCompare(b.nome)
  })
}

export function mover(fotos, de, para) {
  const r = [...fotos]
  const [item] = r.splice(de, 1)
  r.splice(para, 0, item)
  return r
}

export function alternar(fotos, id) {
  return fotos.map((f) => (f.id === id ? { ...f, incluida: !f.incluida } : f))
}

// marcarBorradas desmarca fotos com nitidez abaixo do limiar; não remove.
// Fotos sem nota (nitidez null) ficam como estão.
export function marcarBorradas(fotos, limiar) {
  return fotos.map((f) => (f.nitidez != null && f.nitidez < limiar ? { ...f, incluida: false } : f))
}

// saneia troca caracteres problemáticos e descarta qualquer caminho.
function saneia(nome) {
  const base = nome.split(/[\\/]/).pop()
  return base.replace(/\s+/g, '_')
}

// paraEnvio devolve só as fotos incluídas, na ordem atual, cada uma com nome
// NNN_<saneado>. O prefixo garante a ordem no COLMAP (que ordena por nome) e
// torna os nomes únicos, então nada se sobrescreve no motor.
export function paraEnvio(fotos) {
  return fotos
    .filter((f) => f.incluida)
    .map((f, i) => ({ nome: `${String(i + 1).padStart(3, '0')}_${saneia(f.nome)}`, blob: f.blob }))
}

export function avisos(fotos) {
  const lista = []
  const incluidas = fotos.filter((f) => f.incluida)
  if (incluidas.length === 0) {
    lista.push('Nenhuma foto selecionada.')
  } else if (incluidas.length < MIN_FOTOS) {
    lista.push(`Poucas fotos (${incluidas.length}). Use pelo menos ${MIN_FOTOS} para uma boa reconstrução.`)
  }
  if (fotos.some((f) => f.data == null)) {
    lista.push('Alguma foto sem EXIF: a câmera pode não ser bem estimada.')
  }
  return lista
}
