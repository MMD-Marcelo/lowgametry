package main

import (
	"net/http"
	"testing"
	"time"
)

func TestControladorLigaEDesliga(t *testing.T) {
	c := NovoControlador("127.0.0.1:8791", NovoServidor(NovoGerenciador(PipelineFake())))

	if c.Ligado() {
		t.Fatal("deveria comecar desligado")
	}

	if err := c.Ligar(); err != nil {
		t.Fatalf("Ligar: %v", err)
	}
	if !c.Ligado() {
		t.Fatal("deveria estar ligado apos Ligar")
	}

	// serve de verdade?
	if !responde(t, "http://127.0.0.1:8791/health") {
		t.Fatal("nao respondeu /health estando ligado")
	}

	if err := c.Desligar(); err != nil {
		t.Fatalf("Desligar: %v", err)
	}
	if c.Ligado() {
		t.Fatal("deveria estar desligado apos Desligar")
	}

	// para de servir?
	if responde(t, "http://127.0.0.1:8791/health") {
		t.Fatal("ainda respondeu /health apos Desligar")
	}
}

func TestControladorLigarDuasVezesNaoQuebra(t *testing.T) {
	c := NovoControlador("127.0.0.1:8792", NovoServidor(NovoGerenciador(PipelineFake())))
	if err := c.Ligar(); err != nil {
		t.Fatal(err)
	}
	defer c.Desligar()
	if err := c.Ligar(); err != nil {
		t.Fatalf("Ligar de novo deveria ser no-op, veio: %v", err)
	}
}

func TestControladorPortaOcupadaVoltaErro(t *testing.T) {
	a := NovoControlador("127.0.0.1:8793", NovoServidor(NovoGerenciador(PipelineFake())))
	if err := a.Ligar(); err != nil {
		t.Fatal(err)
	}
	defer a.Desligar()

	b := NovoControlador("127.0.0.1:8793", NovoServidor(NovoGerenciador(PipelineFake())))
	if err := b.Ligar(); err == nil {
		b.Desligar()
		t.Fatal("deveria falhar com a porta ocupada")
	}
}

func responde(t *testing.T, url string) bool {
	t.Helper()
	cli := &http.Client{Timeout: 300 * time.Millisecond}
	for i := 0; i < 20; i++ {
		if r, err := cli.Get(url); err == nil {
			r.Body.Close()
			return true
		}
		time.Sleep(20 * time.Millisecond)
	}
	return false
}
