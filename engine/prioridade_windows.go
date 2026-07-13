//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// BELOW_NORMAL_PRIORITY_CLASS (winbase.h). Nao esta exposto em syscall.
const belowNormalPriorityClass = 0x00004000

// prioridadeBaixa faz o processo externo ceder CPU pra interface e, sobretudo,
// pro driver de video: sob 100% de CPU em prioridade normal, o thread do driver
// pode ficar 2 s sem rodar e disparar um TDR (bugcheck 0x116), derrubando o PC.
// O pipeline perde pouco: ninguem mais disputa CPU de forma sustentada.
func prioridadeBaixa(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.CreationFlags |= belowNormalPriorityClass
}
