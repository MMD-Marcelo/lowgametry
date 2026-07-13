import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { lerDataDaCaptura } from './exif.js'

const fix = (n) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', n))
const buf = (n) => { const b = fix(n); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }

describe('lerDataDaCaptura', () => {
  it('lê DateTimeOriginal de um JPEG com EXIF', () => {
    const d = lerDataDaCaptura(buf('com_exif.jpg'))
    expect(d).toBeInstanceOf(Date)
    // 2021:08:10 15:10:14 (hora local)
    expect(d.getFullYear()).toBe(2021)
    expect(d.getMonth()).toBe(7) // agosto = 7
    expect(d.getDate()).toBe(10)
    expect(d.getHours()).toBe(15)
    expect(d.getMinutes()).toBe(10)
  })

  it('devolve null para JPEG sem EXIF', () => {
    expect(lerDataDaCaptura(buf('sem_exif.jpg'))).toBeNull()
  })

  it('devolve null para PNG', () => {
    expect(lerDataDaCaptura(buf('imagem.png'))).toBeNull()
  })

  it('devolve null para buffer vazio', () => {
    expect(lerDataDaCaptura(new ArrayBuffer(0))).toBeNull()
  })
})
