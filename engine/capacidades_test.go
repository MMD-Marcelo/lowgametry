package main

import (
	"runtime"
	"testing"
)

func TestDetectarCapacidades(t *testing.T) {
	c := detectarCapacidades()
	if c.Versao == "" {
		t.Fatal("versao vazia")
	}
	if c.Nucleos != runtime.NumCPU() {
		t.Fatalf("nucleos = %d, esperado %d", c.Nucleos, runtime.NumCPU())
	}
}
