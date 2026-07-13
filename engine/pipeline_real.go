package main

import (
	"context"
	"fmt"
	"os"
)

// EtapaPreparo valida a entrada (há fotos?) antes da reconstrução.
type etapaPreparo struct{}

func EtapaPreparo() Etapa { return etapaPreparo{} }

func (etapaPreparo) Nome() string { return "preparo" }
func (etapaPreparo) Rodar(ctx context.Context, ws *Workspace, cfg Config, prog func(int, string)) error {
	if len(ws.Fotos) == 0 {
		return fmt.Errorf("nenhuma foto enviada")
	}
	if err := os.MkdirAll(ws.Caminho("sparse"), 0o755); err != nil {
		return err
	}
	prog(100, fmt.Sprintf("%d fotos", len(ws.Fotos)))
	return nil
}

// PipelineReal monta as etapas reais de reconstrução.
func PipelineReal(bin Binarios, cmd Comando, scriptDir string) Pipeline {
	return Pipeline{Etapas: []Etapa{
		EtapaPreparo(),
		EtapaSfM(bin, cmd),
		EtapaDenso(bin, cmd),
		EtapaMalha(bin, cmd),
		EtapaTextura(bin, cmd),
		EtapaLowPolyExport(bin, cmd, scriptDir),
	}}
}

// EscolherPipeline usa o real se os binários existirem, senão o fake (demo).
func EscolherPipeline(bin Binarios, cmd Comando, scriptDir string) (Pipeline, bool) {
	if bin.Disponivel() {
		return PipelineReal(bin, cmd, scriptDir), true
	}
	return PipelineFake(), false
}
