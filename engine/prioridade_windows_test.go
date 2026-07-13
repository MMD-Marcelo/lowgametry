//go:build windows

package main

import (
	"context"
	"strings"
	"testing"
)

// O pipeline satura a CPU por minutos. Em prioridade normal ele compete com o
// thread do driver de video: se o driver nao consegue CPU por 2 s, o watchdog
// do Windows dispara um TDR (bugcheck 0x116) e a maquina cai. Prioridade abaixo
// do normal garante que a interface e o driver passem na frente.
func TestProcessoFilhoRodaEmPrioridadeAbaixoDoNormal(t *testing.T) {
	var linhas []string
	err := ComandoReal{}.Rodar(context.Background(), "", "powershell", []string{
		"-NoProfile", "-Command",
		"[System.Diagnostics.Process]::GetCurrentProcess().PriorityClass",
	}, func(l string) { linhas = append(linhas, strings.TrimSpace(l)) })
	if err != nil {
		t.Fatal(err)
	}
	saida := strings.Join(linhas, " ")
	if !strings.Contains(saida, "BelowNormal") {
		t.Fatalf("processo filho deveria herdar prioridade BelowNormal, veio %q", saida)
	}
}
