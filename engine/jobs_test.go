package main

import (
	"context"
	"path/filepath"
	"testing"
	"time"
)

// pipeline instantâneo pra teste: só grava o glb.
func pipelineTeste() Pipeline {
	return Pipeline{Etapas: []Etapa{etapaExportFake{}}}
}

// etapaFuncWS chama fn com o workspace e segue. Usada pra inspecionar o ws.
type etapaFuncWS func(*Workspace)

func (etapaFuncWS) Nome() string { return "inspecao" }
func (e etapaFuncWS) Rodar(ctx context.Context, ws *Workspace, cfg Config, prog func(int, string)) error {
	e(ws)
	prog(100, "")
	return nil
}

func esperarEstado(t *testing.T, g *Gerenciador, id, estado string) {
	t.Helper()
	for i := 0; i < 200; i++ {
		if j, ok := g.Status(id); ok && j.Estado == estado {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("job não chegou a %q", estado)
}

func TestGerenciadorRodaPipelineAtePronto(t *testing.T) {
	g := NovoGerenciador(pipelineTeste())
	id, err := g.Criar(ConfigPadrao(), nil)
	if err != nil {
		t.Fatal(err)
	}
	esperarEstado(t, g, id, "pronto")
	b, ok := g.ResultadoGLB(id)
	if !ok || len(b) == 0 {
		t.Fatalf("glb não disponível (ok=%v len=%d)", ok, len(b))
	}
	g.Apagar(id)
}

func TestGerenciadorUmJobPorVez(t *testing.T) {
	// pipeline lento pra garantir sobreposição
	lento := Pipeline{Etapas: []Etapa{etapaFake{nome: "SfM", passos: 5, espera: 30 * time.Millisecond}, etapaExportFake{}}}
	g := NovoGerenciador(lento)
	if _, err := g.Criar(ConfigPadrao(), nil); err != nil {
		t.Fatal(err)
	}
	if _, err := g.Criar(ConfigPadrao(), nil); err == nil {
		t.Fatal("esperava recusa de job concorrente")
	}
}

func TestApagarCancelaELibera(t *testing.T) {
	lento := Pipeline{Etapas: []Etapa{etapaFake{nome: "SfM", passos: 50, espera: 20 * time.Millisecond}, etapaExportFake{}}}
	g := NovoGerenciador(lento)
	id, err := g.Criar(ConfigPadrao(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if !g.Apagar(id) { // cancela + espera a goroutine terminar
		t.Fatal("apagar deveria retornar true")
	}
	if g.Ocupado() {
		t.Fatal("não deveria estar ocupado após apagar")
	}
	if _, err := g.Criar(ConfigPadrao(), nil); err != nil {
		t.Fatalf("deveria aceitar novo job após apagar: %v", err)
	}
}

func TestCriarLimpaWorkspaceAnterior(t *testing.T) {
	raiz := t.TempDir()
	t.Setenv("LOWGAMETRY_TRABALHO", raiz)
	padrao := filepath.Join(raiz, "job-*")
	antes, _ := filepath.Glob(padrao)

	g := NovoGerenciador(pipelineTeste()) // instantâneo (só export)
	id1, err := g.Criar(ConfigPadrao(), nil)
	if err != nil {
		t.Fatal(err)
	}
	esperarEstado(t, g, id1, "pronto")

	// segundo job substitui o primeiro (que está pronto) → ws do 1º deve ser limpo
	id2, err := g.Criar(ConfigPadrao(), nil)
	if err != nil {
		t.Fatal(err)
	}
	esperarEstado(t, g, id2, "pronto")

	g.Apagar(id2) // limpa o 2º também
	depois, _ := filepath.Glob(padrao)
	if len(depois) > len(antes) {
		t.Fatalf("workspace vazou: antes=%d depois=%d", len(antes), len(depois))
	}
}

func TestSalvaFotos(t *testing.T) {
	g := NovoGerenciador(pipelineTeste())
	id, err := g.Criar(ConfigPadrao(), []FotoEntrada{{Nome: "a.jpg", Dados: []byte("x")}})
	if err != nil {
		t.Fatal(err)
	}
	esperarEstado(t, g, id, "pronto")
	g.Apagar(id)
}

// A ordem enviada tem que virar a ordem no disco (o COLMAP le por nome), e nomes
// iguais nao podem se sobrescrever silenciosamente.
func TestSalvaFotosNaOrdemESemColisao(t *testing.T) {
	// pipeline que so inspeciona o workspace e para
	var vistos []string
	espia := Pipeline{Etapas: []Etapa{etapaFuncWS(func(ws *Workspace) { vistos = append([]string(nil), ws.Fotos...) }), etapaExportFake{}}}
	g := NovoGerenciador(espia)
	fotos := []FotoEntrada{
		{Nome: "003_c.jpg", Dados: []byte("c")},
		{Nome: "001_a.jpg", Dados: []byte("a")},
		{Nome: "002_b.jpg", Dados: []byte("b")},
		{Nome: "001_a.jpg", Dados: []byte("dup")}, // nome repetido
	}
	id, err := g.Criar(ConfigPadrao(), fotos)
	if err != nil {
		t.Fatal(err)
	}
	esperarEstado(t, g, id, "pronto")
	defer g.Apagar(id)

	if len(vistos) != 4 {
		t.Fatalf("esperava 4 fotos salvas (sem colisao), veio %d: %v", len(vistos), vistos)
	}
	// a ordem de Fotos deve seguir a ordem de envio
	bases := []string{filepath.Base(vistos[0]), filepath.Base(vistos[1]), filepath.Base(vistos[2])}
	if bases[0] != "003_c.jpg" || bases[1] != "001_a.jpg" || bases[2] != "002_b.jpg" {
		t.Fatalf("ordem no disco nao seguiu o envio: %v", bases)
	}
}
