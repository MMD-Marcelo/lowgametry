package main

import "context"

// Etapa e um passo do pipeline. Reporta progresso 0..100 desta etapa e linhas de log.
type Etapa interface {
	Nome() string
	Rodar(ctx context.Context, ws *Workspace, cfg Config, prog func(pct int, linha string)) error
}

type Pipeline struct {
	Etapas []Etapa
}

func pesoEtapa(nome string) int {
	switch nome {
	case "preparo":
		return 2
	case "SfM":
		return 28
	case "denso":
		return 40
	case "malha":
		return 15
	case "textura":
		return 8
	case "export":
		return 7
	default:
		return 10
	}
}

func somaPesos(etapas []Etapa) int {
	total := 0
	for _, e := range etapas {
		total += pesoEtapa(e.Nome())
	}
	if total == 0 {
		return 1
	}
	return total
}

// Rodar executa as etapas em ordem. pctGlobal usa pesos aproximados por custo real.
// Devolve o caminho do .glb final (ws.Caminho("resultado.glb")) ou erro.
func (p Pipeline) Rodar(ctx context.Context, ws *Workspace, cfg Config, onProg func(etapa string, pctGlobal int, linha string)) (string, error) {
	total := somaPesos(p.Etapas)
	base := 0
	for _, e := range p.Etapas {
		nome := e.Nome()
		peso := pesoEtapa(nome)
		onProg(nome, base*100/total, "")
		err := e.Rodar(ctx, ws, cfg, func(pct int, linha string) {
			if pct < 0 {
				pct = 0
			}
			if pct > 100 {
				pct = 100
			}
			global := (base*100 + peso*pct) / total
			onProg(nome, global, linha)
		})
		if err != nil {
			return "", err
		}
		base += peso
		onProg(nome, base*100/total, "")
	}
	return ws.Caminho("resultado.glb"), nil
}

// etapaFunc e uma Etapa minima a partir de uma funcao, usada em testes e como base.
type etapaFunc struct {
	nome string
	fn   func() error
}

func (e etapaFunc) Nome() string { return e.nome }
func (e etapaFunc) Rodar(ctx context.Context, ws *Workspace, cfg Config, prog func(int, string)) error {
	prog(100, "")
	return e.fn()
}
