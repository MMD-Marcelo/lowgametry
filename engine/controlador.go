package main

import (
	"context"
	"net"
	"net/http"
	"sync"
	"time"
)

// Controlador liga e desliga o servidor HTTP sob demanda, pra que a janela do
// motor tenha um botão Ligar/Desligar. Separado da UI (que é só Windows) pra
// ser testável em qualquer plataforma.
type Controlador struct {
	addr    string
	handler http.Handler

	mu  sync.Mutex
	srv *http.Server
}

func NovoControlador(addr string, handler http.Handler) *Controlador {
	return &Controlador{addr: addr, handler: handler}
}

func (c *Controlador) Ligado() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.srv != nil
}

// Ligar sobe o servidor. Já ligado: no-op. Porta ocupada: devolve erro, e o
// servidor continua desligado.
func (c *Controlador) Ligar() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.srv != nil {
		return nil
	}
	// escuta antes de considerar ligado, pra detectar porta ocupada na hora
	ln, err := net.Listen("tcp", c.addr)
	if err != nil {
		return err
	}
	srv := &http.Server{Handler: c.handler}
	c.srv = srv
	go srv.Serve(ln)
	return nil
}

// Desligar encerra o servidor com um prazo curto. Já desligado: no-op.
func (c *Controlador) Desligar() error {
	c.mu.Lock()
	srv := c.srv
	c.srv = nil
	c.mu.Unlock()
	if srv == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return srv.Shutdown(ctx)
}
