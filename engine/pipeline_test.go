package main

import (
	"context"
	"errors"
	"os"
	"testing"
)

func TestPipelineFakeProduzGLB(t *testing.T) {
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	var ultimaEtapa string
	var maxPct int
	glb, err := PipelineFake().Rodar(context.Background(), ws, ConfigPadrao(), func(etapa string, pct int, _ string) {
		ultimaEtapa = etapa
		if pct > maxPct {
			maxPct = pct
		}
	})
	if err != nil {
		t.Fatal(err)
	}
	if ultimaEtapa != "export" {
		t.Fatalf("última etapa = %q", ultimaEtapa)
	}
	if maxPct < 90 {
		t.Fatalf("progresso global não avançou: max %d", maxPct)
	}
	if b, err := os.ReadFile(glb); err != nil || len(b) == 0 {
		t.Fatalf("glb não produzido (err=%v len=%d)", err, len(b))
	}
}

func TestPipelineParaNoErro(t *testing.T) {
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	rodou := 0
	p := Pipeline{Etapas: []Etapa{
		etapaFunc{nome: "a", fn: func() error { rodou++; return nil }},
		etapaFunc{nome: "b", fn: func() error { rodou++; return errors.New("falhou") }},
		etapaFunc{nome: "c", fn: func() error { rodou++; return nil }},
	}}
	_, err := p.Rodar(context.Background(), ws, ConfigPadrao(), func(string, int, string) {})
	if err == nil {
		t.Fatal("esperava erro")
	}
	if rodou != 2 {
		t.Fatalf("deveria parar na etapa 'b': rodou %d etapas", rodou)
	}
}
