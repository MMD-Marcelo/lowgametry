package main

import (
	"context"
	"strings"
	"testing"
)

func TestComandoRealCapturaLinha(t *testing.T) {
	var linhas []string
	// cmd /c echo teste  → imprime "teste"
	err := ComandoReal{}.Rodar(context.Background(), "", "cmd", []string{"/c", "echo", "teste"}, func(l string) {
		linhas = append(linhas, l)
	})
	if err != nil {
		t.Fatal(err)
	}
	juntas := strings.Join(linhas, "\n")
	if !strings.Contains(juntas, "teste") {
		t.Fatalf("esperava 'teste' na saída, veio %q", juntas)
	}
}

func TestComandoRealErroSaidaNaoZero(t *testing.T) {
	err := ComandoReal{}.Rodar(context.Background(), "", "cmd", []string{"/c", "exit", "1"}, func(string) {})
	if err == nil {
		t.Fatal("esperava erro para exit 1")
	}
}

func TestComandoRealStdoutEStderr(t *testing.T) {
	var linhas []string
	err := ComandoReal{}.Rodar(context.Background(), "", "cmd", []string{"/c", "echo out & echo err 1>&2"}, func(l string) {
		linhas = append(linhas, strings.TrimSpace(l))
	})
	if err != nil {
		t.Fatal(err)
	}
	j := strings.Join(linhas, ",")
	if !strings.Contains(j, "out") || !strings.Contains(j, "err") {
		t.Fatalf("esperava capturar out e err, veio %q", j)
	}
}
