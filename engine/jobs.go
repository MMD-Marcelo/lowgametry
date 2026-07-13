package main

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Job e o estado de uma reconstrucao.
type Job struct {
	ID     string   `json:"-"`
	Estado string   `json:"estado"`
	Etapa  string   `json:"etapa"`
	Pct    int      `json:"pct"`
	Log    []string `json:"log"`
	ws     *Workspace
	glb    string
}

// Gerenciador roda um pipeline por vez, de forma assincrona.
type Gerenciador struct {
	mu       sync.Mutex
	atual    *Job
	pipeline Pipeline
	cancelar context.CancelFunc
	feito    chan struct{}
}

func NovoGerenciador(p Pipeline) *Gerenciador {
	return &Gerenciador{pipeline: p}
}

// FotoEntrada e uma foto recebida, na ordem de envio. O site ja manda nomes
// NNN_ unicos e ordenados; o motor preserva a ordem (o COLMAP le por nome).
type FotoEntrada struct {
	Nome  string
	Dados []byte
}

// Criar cria o workspace, salva as fotos e dispara o pipeline em goroutine.
func (g *Gerenciador) Criar(cfg Config, fotos []FotoEntrada) (string, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.atual != nil && g.atual.Estado != "pronto" && g.atual.Estado != "erro" {
		return "", fmt.Errorf("ja ha um job em andamento")
	}
	if g.atual != nil && g.atual.ws != nil {
		if e := g.atual.ws.Limpar(); e != nil {
			log.Printf("falha ao limpar workspace anterior: %v", e)
		}
	}
	ws, err := NovoWorkspace()
	if err != nil {
		return "", err
	}
	for _, foto := range fotos {
		if err := ws.SalvarFoto(foto.Nome, foto.Dados); err != nil {
			if e := ws.Limpar(); e != nil {
				log.Printf("falha ao limpar workspace: %v", e)
			}
			return "", err
		}
	}
	id := fmt.Sprintf("job-%d", time.Now().UnixNano())
	job := &Job{ID: id, Estado: "rodando", Etapa: NomesEtapas[0], Pct: 0, Log: []string{"job iniciado"}, ws: ws}
	ctx, cancel := context.WithCancel(context.Background())
	feito := make(chan struct{})
	g.atual = job
	g.cancelar = cancel
	g.feito = feito
	go g.rodar(ctx, job, cfg, feito)
	return id, nil
}

// rodar executa o pipeline e atualiza o estado do job pelo callback (sob lock).
func (g *Gerenciador) rodar(ctx context.Context, job *Job, cfg Config, feito chan struct{}) {
	defer close(feito)
	glb, err := g.pipeline.Rodar(ctx, job.ws, cfg, func(etapa string, pct int, linha string) {
		g.mu.Lock()
		job.Etapa = etapa
		job.Pct = pct
		if linha != "" {
			job.Log = append(job.Log, linha)
			if len(job.Log) > 200 {
				job.Log = job.Log[len(job.Log)-200:]
			}
		}
		g.mu.Unlock()
	})
	g.mu.Lock()
	defer g.mu.Unlock()
	if err != nil {
		job.Estado = "erro"
		job.Log = append(job.Log, "erro: "+err.Error())
		return
	}
	job.Estado = "pronto"
	job.Pct = 100
	job.glb = glb
}

func (g *Gerenciador) Status(id string) (*Job, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.atual == nil || g.atual.ID != id {
		return nil, false
	}
	cp := *g.atual
	cp.Log = append([]string(nil), g.atual.Log...)
	return &cp, true
}

func (g *Gerenciador) ResultadoGLB(id string) ([]byte, bool) {
	g.mu.Lock()
	caminho := ""
	if g.atual != nil && g.atual.ID == id && g.atual.Estado == "pronto" {
		caminho = g.atual.glb
	}
	g.mu.Unlock()
	if caminho == "" {
		return nil, false
	}
	b, err := os.ReadFile(caminho)
	if err != nil {
		return nil, false
	}
	return b, true
}

// arquivosOBJ sao os artefatos do export .obj, montados num zip sob demanda.
func arquivosOBJ(dir string) ([]string, error) {
	obj := filepath.Join(dir, "resultado.obj")
	if _, err := os.Stat(obj); err != nil {
		return nil, err
	}
	extras, err := filepath.Glob(filepath.Join(dir, "resultado*.mtl"))
	if err != nil {
		return nil, err
	}
	pngs, err := filepath.Glob(filepath.Join(dir, "resultado*.png"))
	if err != nil {
		return nil, err
	}
	return append(append([]string{obj}, extras...), pngs...), nil
}

// ResultadoZip devolve obj + mtl + texturas num zip. Falso se o job nao terminou.
func (g *Gerenciador) ResultadoZip(id string) ([]byte, bool) {
	g.mu.Lock()
	dir := ""
	if g.atual != nil && g.atual.ID == id && g.atual.Estado == "pronto" && g.atual.ws != nil {
		dir = g.atual.ws.Dir
	}
	g.mu.Unlock()
	if dir == "" {
		return nil, false
	}
	caminhos, err := arquivosOBJ(dir)
	if err != nil {
		return nil, false
	}
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for _, c := range caminhos {
		dados, err := os.ReadFile(c)
		if err != nil {
			return nil, false
		}
		w, err := zw.Create(filepath.Base(c))
		if err != nil {
			return nil, false
		}
		if _, err := w.Write(dados); err != nil {
			return nil, false
		}
	}
	if err := zw.Close(); err != nil {
		return nil, false
	}
	return buf.Bytes(), true
}

func (g *Gerenciador) Apagar(id string) bool {
	g.mu.Lock()
	if g.atual == nil || g.atual.ID != id {
		g.mu.Unlock()
		return false
	}
	cancel := g.cancelar
	feito := g.feito
	g.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	if feito != nil {
		<-feito
	}

	g.mu.Lock()
	defer g.mu.Unlock()
	if g.atual != nil && g.atual.ID == id {
		if g.atual.ws != nil {
			if e := g.atual.ws.Limpar(); e != nil {
				log.Printf("falha ao limpar workspace: %v", e)
			}
		}
		g.atual = nil
		g.cancelar = nil
		g.feito = nil
	}
	return true
}

func (g *Gerenciador) ResumoAtual() (id, estado, etapa string, pct int, ok bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.atual == nil {
		return "", "", "", 0, false
	}
	return g.atual.ID, g.atual.Estado, g.atual.Etapa, g.atual.Pct, true
}
func (g *Gerenciador) Ocupado() bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.atual != nil && g.atual.Estado != "pronto" && g.atual.Estado != "erro"
}
