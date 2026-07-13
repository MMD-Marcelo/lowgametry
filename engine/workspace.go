package main

import (
	"os"
	"path/filepath"
)

// Workspace é a pasta de trabalho de um job (fotos de entrada + intermediários).
type Workspace struct {
	Dir   string
	Fotos []string
}

// raizTrabalho é onde ficam os workspaces. Ao lado do exe por padrão (mesmo
// disco do motor, não no temp do C:), ou LOWGAMETRY_TRABALHO. Uma nuvem densa
// passa de 1 GB por job; enchê-la no disco do sistema é ruim.
func raizTrabalho() (string, error) {
	raiz := os.Getenv("LOWGAMETRY_TRABALHO")
	if raiz == "" {
		if exe, err := os.Executable(); err == nil {
			raiz = filepath.Join(filepath.Dir(exe), "trabalhos")
		} else {
			raiz = "trabalhos"
		}
	}
	if err := os.MkdirAll(raiz, 0o755); err != nil {
		return "", err
	}
	return raiz, nil
}

// LimparOrfaos apaga workspaces (job-*) deixados por jobs que não fecharam
// (erro, aborto, motor encerrado). Chamado no boot pra não acumular gigabytes.
func LimparOrfaos() error {
	raiz, err := raizTrabalho()
	if err != nil {
		return err
	}
	orfaos, err := filepath.Glob(filepath.Join(raiz, "job-*"))
	if err != nil {
		return err
	}
	for _, d := range orfaos {
		os.RemoveAll(d)
	}
	return nil
}

func NovoWorkspace() (*Workspace, error) {
	raiz, err := raizTrabalho()
	if err != nil {
		return nil, err
	}
	dir, err := os.MkdirTemp(raiz, "job-*")
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(filepath.Join(dir, "fotos"), 0o755); err != nil {
		os.RemoveAll(dir)
		return nil, err
	}
	return &Workspace{Dir: dir}, nil
}

// SalvarFoto grava os bytes em Dir/fotos/<nome> e registra o caminho.
func (w *Workspace) SalvarFoto(nome string, dados []byte) error {
	caminho := filepath.Join(w.Dir, "fotos", filepath.Base(nome))
	if err := os.WriteFile(caminho, dados, 0o644); err != nil {
		return err
	}
	w.Fotos = append(w.Fotos, caminho)
	return nil
}

func (w *Workspace) Caminho(rel string) string {
	return filepath.Join(w.Dir, rel)
}

func (w *Workspace) Limpar() error {
	return os.RemoveAll(w.Dir)
}
