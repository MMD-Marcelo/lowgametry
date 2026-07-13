import { describe, it, expect } from 'vitest'
import { importarFotos } from './importar.js'

// primitivas de navegador fakeadas: cada "File" carrega o que os fakes devolvem
function fakeFile(nome, { data = null, nota = 50 }) {
  return { name: nome, _data: data, _nota: nota }
}

const deps = {
  lerBuffer: async (f) => f, // passa o proprio fake adiante
  lerData: (f) => f._data,
  medirNitidez: async (f) => f._nota,
  fazerURL: (f) => `blob:${f.name}`,
}

describe('importarFotos', () => {
  it('monta fotos com data, nitidez e url, ordenadas por EXIF', async () => {
    const files = [
      fakeFile('b.jpg', { data: new Date(2021, 0, 2), nota: 80 }),
      fakeFile('a.jpg', { data: new Date(2021, 0, 1), nota: 10 }),
    ]
    const fotos = await importarFotos(files, deps)
    expect(fotos.map((f) => f.nome)).toEqual(['a.jpg', 'b.jpg'])
    expect(fotos[0].data).toEqual(new Date(2021, 0, 1))
    expect(fotos[0].nitidez).toBe(10)
    expect(fotos[0].url).toBe('blob:a.jpg')
  })

  it('desmarca as fotos borradas pela nitidez relativa ao conjunto', async () => {
    const files = [
      fakeFile('nitida1.jpg', { nota: 100 }),
      fakeFile('nitida2.jpg', { nota: 90 }),
      fakeFile('borrada.jpg', { nota: 2 }),
    ]
    const fotos = await importarFotos(files, deps)
    const borrada = fotos.find((f) => f.nome === 'borrada.jpg')
    expect(borrada.incluida).toBe(false)
    expect(fotos.find((f) => f.nome === 'nitida1.jpg').incluida).toBe(true)
  })
})
