package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWorkspaceFicaNaRaizDeTrabalho(t *testing.T) {
	raiz := t.TempDir()
	t.Setenv("LOWGAMETRY_TRABALHO", raiz)
	ws, err := NovoWorkspace()
	if err != nil {
		t.Fatal(err)
	}
	defer ws.Limpar()
	// o workspace deve estar dentro da raiz configurada, nao no temp do sistema
	if filepath.Dir(ws.Dir) != raiz {
		t.Fatalf("workspace em %s, esperado dentro de %s", ws.Dir, raiz)
	}
}

func TestLimparOrfaosRemoveJobsAntigos(t *testing.T) {
	raiz := t.TempDir()
	t.Setenv("LOWGAMETRY_TRABALHO", raiz)
	// simula dois workspaces deixados pra tras
	for _, n := range []string{"job-111", "job-222"} {
		if err := os.MkdirAll(filepath.Join(raiz, n, "fotos"), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	// e um arquivo que nao e workspace (nao pode ser tocado)
	os.WriteFile(filepath.Join(raiz, "config.txt"), []byte("x"), 0o644)

	if err := LimparOrfaos(); err != nil {
		t.Fatal(err)
	}
	restantes, _ := filepath.Glob(filepath.Join(raiz, "job-*"))
	if len(restantes) != 0 {
		t.Fatalf("orfaos nao removidos: %v", restantes)
	}
	if _, err := os.Stat(filepath.Join(raiz, "config.txt")); err != nil {
		t.Fatal("LimparOrfaos apagou algo que nao era workspace")
	}
}

func TestWorkspaceSalvaFotoELimpa(t *testing.T) {
	ws, err := NovoWorkspace()
	if err != nil {
		t.Fatal(err)
	}
	if err := ws.SalvarFoto("a.jpg", []byte("conteudo")); err != nil {
		t.Fatal(err)
	}
	if len(ws.Fotos) != 1 {
		t.Fatalf("esperava 1 foto, veio %d", len(ws.Fotos))
	}
	if _, err := os.Stat(ws.Fotos[0]); err != nil {
		t.Fatalf("foto não gravada: %v", err)
	}
	if filepath.Base(ws.Caminho("resultado.glb")) != "resultado.glb" {
		t.Fatal("Caminho incorreto")
	}
	if err := ws.Limpar(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(ws.Dir); !os.IsNotExist(err) {
		t.Fatal("workspace não foi removido")
	}
}
