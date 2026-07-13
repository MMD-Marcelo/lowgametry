// Nota: este script é executado a partir de `web/` (`cd web && node ../mock-motor/gerar-demo.mjs`)
// para poder achar o pacote `three` de web/node_modules. Como o próprio arquivo mora em
// mock-motor/ (fora de web/), especificadores "bare" (`import ... from 'three'`) não resolvem
// via node_modules a partir da localização do arquivo — por isso resolvemos os caminhos
// manualmente a partir do cwd (process.cwd()) e importamos por URL de arquivo.
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// GLTFExporter (modo binário) usa a FileReader do browser pra ler o Blob do buffer.
// Node não tem esse global; polyfill mínimo em cima de Blob.arrayBuffer() (disponível no Node).
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf
        if (this.onloadend) this.onloadend()
      })
    }
  }
}

const threeDir = resolve(process.cwd(), 'node_modules/three')
const { Scene, Mesh, BoxGeometry, MeshStandardMaterial } = await import(
  pathToFileURL(resolve(threeDir, 'build/three.module.js')).href
)
const { GLTFExporter } = await import(
  pathToFileURL(resolve(threeDir, 'examples/jsm/exporters/GLTFExporter.js')).href
)

const cena = new Scene()
cena.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0x4ade80 })))
new GLTFExporter().parse(
  cena,
  (glb) => { writeFileSync(new URL('./demo.glb', import.meta.url), Buffer.from(glb)); console.log('demo.glb gerado') },
  (e) => { throw e },
  { binary: true },
)
