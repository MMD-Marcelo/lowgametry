package main

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"
)

// PassoCmd e um comando externo do pipeline; Args monta os argumentos do ws/cfg.
type PassoCmd struct {
	Nome string
	Args func(ws *Workspace, cfg Config) []string
}

// EtapaCmd roda uma sequencia de comandos externos como uma Etapa do pipeline.
type EtapaCmd struct {
	rotulo    string
	cmd       Comando
	timeout   time.Duration
	passos    []PassoCmd
	progresso func(linha string) (int, bool) // mapeia linha de saida -> (pct, emitir?)
}

func (e EtapaCmd) Nome() string { return e.rotulo }

func (e EtapaCmd) Rodar(ctx context.Context, ws *Workspace, cfg Config, prog func(int, string)) error {
	ctx, cancel := context.WithTimeout(ctx, e.timeout)
	defer cancel()
	n := len(e.passos)
	if n == 0 {
		return nil
	}
	for i, p := range e.passos {
		args := p.Args(ws, cfg)
		inicioPasso := i * 100 / n
		fimPasso := (i + 1) * 100 / n
		ultimoPct := inicioPasso
		prog(ultimoPct, "iniciando "+filepath.Base(p.Nome))
		var recentes []string
		err := e.cmd.Rodar(ctx, ws.Dir, p.Nome, args, func(linha string) {
			recentes = append(recentes, linha)
			if len(recentes) > 15 {
				recentes = recentes[len(recentes)-15:]
			}
			if e.progresso != nil {
				if pctFerramenta, emitir := e.progresso(linha); emitir {
					if pctFerramenta < 0 {
						pctFerramenta = 0
					}
					if pctFerramenta > 100 {
						pctFerramenta = 100
					}
					ultimoPct = inicioPasso + (fimPasso-inicioPasso)*pctFerramenta/100
					prog(ultimoPct, linha)
					return
				}
			}
			prog(ultimoPct, linha)
		})
		if err != nil {
			ferramenta := filepath.Base(p.Nome)
			if len(recentes) > 0 {
				return fmt.Errorf("%s falhou (%w): %s", ferramenta, err, strings.Join(recentes, " | "))
			}
			return fmt.Errorf("%s falhou (%w)", ferramenta, err)
		}
		prog(fimPasso, "concluido "+filepath.Base(p.Nome))
	}
	return nil
}
