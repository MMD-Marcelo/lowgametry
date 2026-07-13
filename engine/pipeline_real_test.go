package main

import (
	"context"
	"os"
	"testing"
)

func TestEscolherPipelineCaiNoFakeSemBinarios(t *testing.T) {
	bin := DescobrirBinariosEm(t.TempDir()) // sem binários
	p, real := EscolherPipeline(bin, &comandoFake{}, t.TempDir())
	if real {
		t.Fatal("deveria escolher o fake sem binários")
	}
	if len(p.Etapas) == 0 {
		t.Fatal("pipeline fake vazio")
	}
}

func TestPipelineRealTemAsEtapas(t *testing.T) {
	p := PipelineReal(DescobrirBinariosEm("/ferramentas"), &comandoFake{}, "/tmp")
	nomes := []string{}
	for _, e := range p.Etapas {
		nomes = append(nomes, e.Nome())
	}
	esperado := []string{"preparo", "SfM", "denso", "malha", "textura", "export"}
	if len(nomes) != len(esperado) {
		t.Fatalf("etapas = %v", nomes)
	}
	for i := range esperado {
		if nomes[i] != esperado[i] {
			t.Fatalf("etapa[%d] = %q, esperado %q", i, nomes[i], esperado[i])
		}
	}
}

func TestEtapaPreparoExigeFotos(t *testing.T) {
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	err := EtapaPreparo().Rodar(context.Background(), ws, ConfigPadrao(), func(int, string) {})
	if err == nil {
		t.Fatal("preparo deveria falhar sem fotos")
	}
	ws.SalvarFoto("a.jpg", []byte("x"))
	if err := EtapaPreparo().Rodar(context.Background(), ws, ConfigPadrao(), func(int, string) {}); err != nil {
		t.Fatalf("preparo com foto deveria passar: %v", err)
	}
	if _, err := os.Stat(ws.Caminho("sparse")); err != nil {
		t.Fatalf("preparo deveria criar sparse/: %v", err)
	}
}
