package main

import (
	"context"
	"strings"
	"testing"
	"time"
)

// comandoFake registra as chamadas e emite linhas pré-programadas.
type comandoFake struct {
	chamadas [][]string // cada chamada = [nome, arg0, arg1, ...]
	saida    map[string][]string
	erroEm   string // nome que deve falhar
}

func (c *comandoFake) Rodar(ctx context.Context, dir, nome string, args []string, onLinha func(string)) error {
	c.chamadas = append(c.chamadas, append([]string{nome}, args...))
	for _, l := range c.saida[nome] {
		onLinha(l)
	}
	if c.erroEm == nome {
		return context.DeadlineExceeded
	}
	return nil
}

func TestEtapaCmdRodaPassosEProgresso(t *testing.T) {
	fake := &comandoFake{saida: map[string][]string{
		"ferramentaA": {"Processing 50%", "Processing 100%"},
	}}
	var pcts []int
	e := EtapaCmd{
		rotulo:  "denso",
		cmd:     fake,
		timeout: time.Minute,
		passos: []PassoCmd{
			{Nome: "ferramentaA", Args: func(ws *Workspace, cfg Config) []string { return []string{"-i", ws.Caminho("x.mvs")} }},
		},
		progresso: func(l string) (int, bool) {
			if strings.Contains(l, "100%") {
				return 100, true
			}
			if strings.Contains(l, "50%") {
				return 50, true
			}
			return 0, false
		},
	}
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	err := e.Rodar(context.Background(), ws, ConfigPadrao(), func(pct int, _ string) { pcts = append(pcts, pct) })
	if err != nil {
		t.Fatal(err)
	}
	if len(fake.chamadas) != 1 || fake.chamadas[0][0] != "ferramentaA" {
		t.Fatalf("chamada inesperada: %+v", fake.chamadas)
	}
	if !strings.HasSuffix(fake.chamadas[0][2], "x.mvs") {
		t.Fatalf("args errados: %+v", fake.chamadas[0])
	}
	if len(pcts) == 0 || pcts[len(pcts)-1] != 100 {
		t.Fatalf("progresso não chegou a 100: %+v", pcts)
	}
}

func TestEtapaCmdAbortaNoErro(t *testing.T) {
	fake := &comandoFake{erroEm: "ferramentaA"}
	e := EtapaCmd{
		rotulo: "denso", cmd: fake, timeout: time.Minute,
		passos: []PassoCmd{
			{Nome: "ferramentaA", Args: func(*Workspace, Config) []string { return nil }},
			{Nome: "ferramentaB", Args: func(*Workspace, Config) []string { return nil }},
		},
		progresso: func(string) (int, bool) { return 0, false },
	}
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	err := e.Rodar(context.Background(), ws, ConfigPadrao(), func(int, string) {})
	if err == nil {
		t.Fatal("esperava erro")
	}
	if len(fake.chamadas) != 1 {
		t.Fatalf("deveria parar após ferramentaA: %+v", fake.chamadas)
	}
}
