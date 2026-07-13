//go:build !windows

package main

import "os/exec"

// Fora do Windows o motor so roda em dev. Sem equivalente portatil de
// CreationFlags aqui; nice(2) exigiria mexer no processo depois do Start.
func prioridadeBaixa(*exec.Cmd) {}
