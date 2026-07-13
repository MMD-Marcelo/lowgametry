package main

import (
	"os"
	"path/filepath"
)

// Binarios guarda os caminhos dos executáveis externos empacotados em
// ferramentas/, ao lado do exe. A pasta não pode se chamar vendor/: o Go
// reserva esse nome para as dependências do módulo.
type Binarios struct {
	COLMAP          string
	InterfaceCOLMAP string
	Densify         string
	ReconstructMesh string
	RefineMesh      string
	TextureMesh     string
	Blender         string
}

func DescobrirBinarios() Binarios {
	raiz := os.Getenv("LOWGAMETRY_FERRAMENTAS")
	if raiz == "" {
		if exe, err := os.Executable(); err == nil {
			raiz = filepath.Join(filepath.Dir(exe), "ferramentas")
		} else {
			raiz = "ferramentas"
		}
	}
	b := DescobrirBinariosEm(raiz)
	b.COLMAP = escolherCOLMAP(raiz, detectarCUDA())
	return b
}

// escolherCOLMAP prefere a build CUDA quando ha GPU NVIDIA e ela foi
// empacotada; a build de CPU roda em qualquer PC e e o padrao.
func escolherCOLMAP(raiz string, temCUDA bool) string {
	cpu := filepath.Join(raiz, "colmap", "bin", "colmap.exe")
	if !temCUDA {
		return cpu
	}
	cuda := filepath.Join(raiz, "colmap-cuda", "bin", "colmap.exe")
	if existe(cuda) {
		return cuda
	}
	return cpu
}

func DescobrirBinariosEm(raiz string) Binarios {
	mvs := filepath.Join(raiz, "openmvs")
	return Binarios{
		COLMAP:          filepath.Join(raiz, "colmap", "bin", "colmap.exe"),
		InterfaceCOLMAP: filepath.Join(mvs, "InterfaceCOLMAP.exe"),
		Densify:         filepath.Join(mvs, "DensifyPointCloud.exe"),
		ReconstructMesh: filepath.Join(mvs, "ReconstructMesh.exe"),
		RefineMesh:      filepath.Join(mvs, "RefineMesh.exe"),
		TextureMesh:     filepath.Join(mvs, "TextureMesh.exe"),
		Blender:         filepath.Join(raiz, "blender", "blender.exe"),
	}
}

func existe(caminho string) bool {
	_, err := os.Stat(caminho)
	return err == nil
}

// Disponivel exige os executáveis essenciais do pipeline real.
func (b Binarios) Disponivel() bool {
	for _, c := range []string{b.COLMAP, b.Densify, b.ReconstructMesh, b.TextureMesh, b.Blender} {
		if !existe(c) {
			return false
		}
	}
	return true
}
