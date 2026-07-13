package main

import (
	"bufio"
	"context"
	"io"
	"os/exec"
	"sync"
)

// Comando abstrai a execução de um binário externo (linha a linha), pra que o
// pipeline seja testável com um fake e o 3b pluge os binários reais.
// dir é o diretório de trabalho do processo (cwd); vazio = herda o do motor.
type Comando interface {
	Rodar(ctx context.Context, dir, nome string, args []string, onLinha func(string)) error
}

// ComandoReal executa via exec, transmitindo stdout+stderr combinados, linha a linha.
type ComandoReal struct{}

func (ComandoReal) Rodar(ctx context.Context, dir, nome string, args []string, onLinha func(string)) error {
	cmd := exec.CommandContext(ctx, nome, args...)
	prioridadeBaixa(cmd)
	if dir != "" {
		cmd.Dir = dir // resolve caminhos relativos (ex.: imagens referidas no scene.mvs) contra o workspace
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return err
	}

	linhas := make(chan string, 64)
	var wg sync.WaitGroup
	var errMu sync.Mutex
	var errLeitura error

	ler := func(r io.Reader) {
		defer wg.Done()
		s := bufio.NewScanner(r)
		s.Buffer(make([]byte, 1024*1024), 1024*1024)
		for s.Scan() {
			linhas <- s.Text()
		}
		if e := s.Err(); e != nil {
			errMu.Lock()
			if errLeitura == nil {
				errLeitura = e
			}
			errMu.Unlock()
		}
	}

	wg.Add(2)
	go ler(stdout)
	go ler(stderr)
	go func() { wg.Wait(); close(linhas) }()

	// consumidor único: onLinha é chamado de forma serializada
	for l := range linhas {
		if onLinha != nil {
			onLinha(l)
		}
	}

	if err := cmd.Wait(); err != nil {
		return err
	}
	return errLeitura
}
