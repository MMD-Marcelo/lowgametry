package main

import (
	"context"
	_ "embed"
	"encoding/base64"
	"os"
	"time"
)

//go:embed assets/demo.glb
var demoGLB []byte

var NomesEtapas = []string{"preparo", "SfM", "denso", "malha", "low-poly", "textura", "export"}

// etapaFake simula trabalho: alguns passos de progresso com uma pequena espera.
type etapaFake struct {
	nome   string
	passos int
	espera time.Duration
}

func (e etapaFake) Nome() string { return e.nome }
func (e etapaFake) Rodar(ctx context.Context, ws *Workspace, cfg Config, prog func(int, string)) error {
	for i := 1; i <= e.passos; i++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(e.espera):
		}
		prog(i*100/e.passos, e.nome+"…")
	}
	return nil
}

// etapaExportFake grava o .glb demo como resultado do job.
type etapaExportFake struct{}

// pngDemo é um PNG 1x1 usado como textura de mentira no pipeline demo.
var pngDemo, _ = base64.StdEncoding.DecodeString(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")

const objDemo = "mtllib resultado.mtl\nusemtl lg_baked\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n"
const mtlDemo = "newmtl lg_baked\nmap_Kd resultado_albedo.png\n"

func (etapaExportFake) Nome() string { return "export" }
func (etapaExportFake) Rodar(ctx context.Context, ws *Workspace, cfg Config, prog func(int, string)) error {
	prog(50, "exportando…")
	artefatos := map[string][]byte{
		"resultado.glb":        demoGLB,
		"resultado.obj":        []byte(objDemo),
		"resultado.mtl":        []byte(mtlDemo),
		"resultado_albedo.png": pngDemo,
	}
	for nome, dados := range artefatos {
		if err := os.WriteFile(ws.Caminho(nome), dados, 0o644); err != nil {
			return err
		}
	}
	prog(100, "modelo pronto")
	return nil
}

// PipelineFake monta as 7 etapas (as 6 primeiras fake, a última grava o glb demo).
func PipelineFake() Pipeline {
	etapas := []Etapa{}
	for _, nome := range NomesEtapas[:len(NomesEtapas)-1] { // todas menos "export"
		etapas = append(etapas, etapaFake{nome: nome, passos: 3, espera: 40 * time.Millisecond})
	}
	etapas = append(etapas, etapaExportFake{})
	return Pipeline{Etapas: etapas}
}
