package main

import (
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

var rePct = regexp.MustCompile(`(\d{1,3})\s*%`)

// progressoPorcentagem extrai "NN%" de uma linha de saida dos binarios.
func progressoPorcentagem(linha string) (int, bool) {
	m := rePct.FindStringSubmatch(linha)
	if m == nil {
		return 0, false
	}
	n, err := strconv.Atoi(m[1])
	if err != nil || n > 100 {
		return 0, false
	}
	return n, true
}

func progressoDenso() func(string) (int, bool) {
	depthMaps := 0
	return func(linha string) (int, bool) {
		if p, ok := progressoPorcentagem(linha); ok {
			return p, true
		}
		if strings.Contains(linha, "Depth-map for image") && strings.Contains(linha, "estimated") {
			depthMaps++
			pct := depthMaps
			if pct > 95 {
				pct = 95
			}
			return pct, true
		}
		if strings.Contains(linha, "Fuse depth-maps") || strings.Contains(linha, "fusing") {
			return 96, true
		}
		return 0, false
	}
}

// caminhos de trabalho dentro do workspace (nomes conferidos com os binarios reais)
func pDB(ws *Workspace) string       { return ws.Caminho("db.db") }
func pSparse(ws *Workspace) string   { return ws.Caminho("sparse") }
func pFotos(ws *Workspace) string    { return ws.Caminho("fotos") }
func pDense(ws *Workspace) string    { return ws.Caminho("dense") }
func pMVS(ws *Workspace) string      { return ws.Caminho("scene.mvs") }
func pDenso(ws *Workspace) string    { return ws.Caminho("scene_dense.mvs") }
func pMalhaPly(ws *Workspace) string { return ws.Caminho("scene_dense_mesh.ply") }
func pTextura(ws *Workspace) string  { return ws.Caminho("scene_textured.mvs") }

// LimiteFotosExaustivo: acima disso o matching de todos os pares (O(n²)) domina
// o SfM. 25 fotos sao 300 pares; 80 seriam 3160.
const LimiteFotosExaustivo = 25

// threadsPipeline deixa ~25% dos nucleos livres. O motor roda na bandeja
// enquanto a pessoa usa o PC, e ocupar 100% da CPU trava a maquina — em PCs no
// limite termico ou de fonte, chega a desliga-la. LOWGAMETRY_THREADS sobrepoe.
func threadsPipeline() int {
	if v := os.Getenv("LOWGAMETRY_THREADS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	n := runtime.NumCPU() * 3 / 4
	if n < 1 {
		return 1
	}
	return n
}

// matcherCOLMAP: sequential casa cada foto com as vizinhas na ordem de captura,
// que e como se fotografa dando a volta no objeto. quadratic_overlap (padrao)
// casa tambem com a 2a, 4a, 8a vizinha, fechando o circuito sem vocabulario.
func matcherCOLMAP(ws *Workspace) string {
	if len(ws.Fotos) > LimiteFotosExaustivo {
		return "sequential_matcher"
	}
	return "exhaustive_matcher"
}

// resolucaoEntrada limita o lado maior das imagens na densificacao. Um alvo
// low-poly descarta o detalhe extra adiante; a fotogrametria normal o usa.
//
// Nao vale limitar tambem a extracao de features do COLMAP: medido, nao muda o
// tempo (max_num_features ja limita em 8192 keypoints) e so piora o descritor.
func resolucaoEntrada(cfg Config) int {
	if cfg.Modo == "fotogrametria" {
		return 3200
	}
	return 1600
}

// nivelDenso: resolution-level divide a resolucao por 2^n no DensifyPointCloud.
func nivelDenso(cfg Config) int {
	if cfg.Modo == "fotogrametria" {
		return 1
	}
	return 2
}

// EtapaSfM: COLMAP (feature_extractor -> exhaustive_matcher -> mapper -> image_undistorter) + InterfaceCOLMAP.
func EtapaSfM(bin Binarios, cmd Comando) Etapa {
	return EtapaCmd{
		rotulo: "SfM", cmd: cmd, timeout: 30 * time.Minute,
		progresso: progressoPorcentagem,
		passos: []PassoCmd{
			{Nome: bin.COLMAP, Args: func(ws *Workspace, _ Config) []string {
				return []string{"feature_extractor", "--database_path", pDB(ws), "--image_path", pFotos(ws),
					"--FeatureExtraction.num_threads", strconv.Itoa(threadsPipeline())}
			}},
			{Nome: bin.COLMAP, Args: func(ws *Workspace, _ Config) []string {
				return []string{matcherCOLMAP(ws), "--database_path", pDB(ws),
					"--FeatureMatching.num_threads", strconv.Itoa(threadsPipeline())}
			}},
			{Nome: bin.COLMAP, Args: func(ws *Workspace, _ Config) []string {
				return []string{"mapper", "--database_path", pDB(ws), "--image_path", pFotos(ws), "--output_path", pSparse(ws),
					"--Mapper.num_threads", strconv.Itoa(threadsPipeline())}
			}},
			{Nome: bin.COLMAP, Args: func(ws *Workspace, _ Config) []string {
				return []string{"image_undistorter", "--image_path", pFotos(ws), "--input_path", filepath.Join(pSparse(ws), "0"), "--output_path", pDense(ws)}
			}},
			{Nome: bin.InterfaceCOLMAP, Args: func(ws *Workspace, _ Config) []string {
				return []string{"-i", pDense(ws), "-o", pMVS(ws)}
			}},
		},
	}
}

// EtapaDenso: OpenMVS DensifyPointCloud (scene.mvs -> scene_dense.mvs).
func EtapaDenso(bin Binarios, cmd Comando) Etapa {
	return EtapaCmd{
		rotulo: "denso", cmd: cmd, timeout: 60 * time.Minute,
		progresso: progressoDenso(),
		passos: []PassoCmd{
			{Nome: bin.Densify, Args: func(ws *Workspace, cfg Config) []string {
				return []string{pMVS(ws), "-o", pDenso(ws),
					"--resolution-level", strconv.Itoa(nivelDenso(cfg)),
					"--max-resolution", strconv.Itoa(resolucaoEntrada(cfg)),
					"--max-threads", strconv.Itoa(threadsPipeline())}
			}},
		},
	}
}

// facesIntermediarias e o tamanho da malha entregue ao TextureMesh e ao Blender.
// A malha densa crua (milhoes de faces) faz o TextureMesh levar minutos e gerar
// um atlas de ilhas microscopicas. Vinte vezes o alvo final preserva a forma pro
// retopo, dentro de limites que mantem as duas etapas na casa dos segundos.
func facesIntermediarias(cfg Config) int {
	const piso, teto = 30000, 300000
	n := cfg.Faces * 20
	if n < piso {
		return piso
	}
	if n > teto {
		return teto
	}
	return n
}

// EtapaMalha: OpenMVS ReconstructMesh (scene_dense.mvs -> scene_dense_mesh.ply),
// ja decimada pro alvo intermediario.
func EtapaMalha(bin Binarios, cmd Comando) Etapa {
	return EtapaCmd{
		rotulo: "malha", cmd: cmd, timeout: 60 * time.Minute,
		progresso: progressoPorcentagem,
		passos: []PassoCmd{
			{Nome: bin.ReconstructMesh, Args: func(ws *Workspace, cfg Config) []string {
				return []string{pDenso(ws), "--target-face-num", strconv.Itoa(facesIntermediarias(cfg)),
					"--max-threads", strconv.Itoa(threadsPipeline())}
			}},
		},
	}
}

// EtapaTextura: OpenMVS TextureMesh - textura de albedo na malha decimada.
//
// O seam leveling (ligado por padrao) resolve um Poisson pra equalizar as
// costuras entre recortes. Nesta malha ele diverge e pinta o miolo dos recortes
// de preto, o que chegava ate o .glb final. Desligado, a textura sai correta; a
// costura visivel nao pesa numa textura de 128-512px.
func EtapaTextura(bin Binarios, cmd Comando) Etapa {
	return EtapaCmd{
		rotulo: "textura", cmd: cmd, timeout: 30 * time.Minute,
		progresso: progressoPorcentagem,
		passos: []PassoCmd{
			{Nome: bin.TextureMesh, Args: func(ws *Workspace, _ Config) []string {
				return []string{
					pDenso(ws), "--mesh-file", pMalhaPly(ws), "-o", pTextura(ws), "--export-type", "obj",
					"--global-seam-leveling", "0", "--local-seam-leveling", "0",
					"--max-threads", strconv.Itoa(threadsPipeline()),
				}
			}},
		},
	}
}
