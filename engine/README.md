# lowgametry — motor (engine)

Motor local em Go que implementa a ponte com o site (127.0.0.1:8757). No
esqueleto (fase 2) a reconstrução é **simulada**: devolve um `.glb` demo pra
validar a ponte ponta-a-ponta com o site. A reconstrução real (COLMAP/OpenMVS)
entra na fase 3, e a bandeja/tray + release na fase 4.

## Dev
- `go build -o lowgametry-engine.exe .` — compila o binário (com console, pra ver o log)
- `./lowgametry-engine.exe` — abre a **janela do motor**. O motor nasce parado;
  o botão "Ligar motor" começa a servir em http://127.0.0.1:8757. Fechar a janela
  encerra o motor.
- `go test ./...` — testes
- `go vet ./...` — análise estática

A janela é nativa do Windows (lxn/walk). O `rsrc_windows.syso` embute o manifesto
de Common Controls v6 (sem ele o walk falha com `TTM_ADDTOOL failed`) e o ícone.
No release o binário usa `-ldflags "-H=windowsgui"` pra não abrir console: quem
usa vê só a janela. Fora do Windows não há janela — o motor liga direto e
encerra por Ctrl+C (só pra dev/CI compilar).

## Contrato da ponte
`GET /health` · `POST /jobs` (multipart foto[]+config) · `GET /jobs/:id` ·
`GET /jobs/:id/result.glb` · `GET /jobs/:id/result.zip` · `DELETE /jobs/:id`.
O `.zip` traz `resultado.obj` + `.mtl` + texturas `.png` (o `.obj` sozinho não
carrega textura).

## Testar com o site
1. `./lowgametry-engine.exe` (motor real, porta 8757)
2. noutro terminal: `cd ../web && npm run dev` (site em http://localhost:5181)
3. o site deve mostrar "motor conectado" e o fluxo funciona contra o motor real.
   (Não deixe o motor mock rodando junto — os dois disputam a porta 8757.)

## Pipeline real (fase 3b)
O motor usa o pipeline real (COLMAP → OpenMVS → Blender) quando encontra os
binários em `ferramentas/` ao lado do executável (ou em `LOWGAMETRY_FERRAMENTAS`):
- `ferramentas/colmap/bin/colmap.exe`
- `ferramentas/openmvs/DensifyPointCloud.exe` (e ReconstructMesh, RefineMesh, TextureMesh, InterfaceCOLMAP)
- `ferramentas/blender/blender.exe`

A pasta não pode se chamar `vendor/`: o Go reserva esse nome pras dependências
do módulo e recusa compilar quando ela existe sem um `modules.txt`.
Sem esses binários, cai no pipeline demo (fake) e `/health` reporta `pipelineReal:false`.

## Armazenamento de trabalho
Os workspaces de cada job (fotos + nuvem densa + malha) ficam em `trabalhos/`,
ao lado do exe — no mesmo disco do motor, não no temp do sistema. Uma nuvem densa
passa de 1 GB por job. `LOWGAMETRY_TRABALHO` aponta noutro lugar. No boot, o motor
apaga workspaces deixados por jobs que não fecharam (erro, aborto, encerramento).

## Uso de CPU
O motor roda enquanto você usa o PC, então o pipeline usa ~75% dos núcleos e
deixa o resto livre. `LOWGAMETRY_THREADS=4` fixa o número de threads.
As flags dos binários são validadas ao rodar com os binários reais.
