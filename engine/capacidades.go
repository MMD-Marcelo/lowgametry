package main

import (
	"os/exec"
	"runtime"
)

const Versao = "0.1.0-esqueleto"

// Capacidades e o corpo do /health.
type Capacidades struct {
	Versao       string `json:"versao"`
	TemCUDA      bool   `json:"temCUDA"`
	Nucleos      int    `json:"nucleos"`
	Ocupado      bool   `json:"ocupado"`
	PipelineReal bool   `json:"pipelineReal"`
	JobID        string `json:"jobId,omitempty"`
	JobEstado    string `json:"jobEstado,omitempty"`
	JobEtapa     string `json:"jobEtapa,omitempty"`
	JobPct       int    `json:"jobPct,omitempty"`
}

// detectarCUDA roda `nvidia-smi -L`; true se o comando sair sem erro.
func detectarCUDA() bool {
	return exec.Command("nvidia-smi", "-L").Run() == nil
}

// detectarCapacidades preenche versao, nucleos e CUDA. Dados de job sao setados no handler.
func detectarCapacidades() Capacidades {
	return Capacidades{
		Versao:  Versao,
		TemCUDA: detectarCUDA(),
		Nucleos: runtime.NumCPU(),
	}
}
