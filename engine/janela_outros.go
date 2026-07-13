//go:build !windows

package main

import (
	"log"
	"os"
	"os/signal"
)

// Fora do Windows não há janela nativa: o motor liga direto e bloqueia até
// Ctrl+C. Serve só pra dev/CI compilar noutro sistema.
func RodarJanela(ctrl *Controlador, _ Capacidades) {
	if err := ctrl.Ligar(); err != nil {
		log.Fatalf("nao consegui ligar o motor: %v", err)
	}
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt)
	<-sig
}
