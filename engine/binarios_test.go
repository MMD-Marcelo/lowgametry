package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func criarFalso(t *testing.T, caminho string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(caminho), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(caminho, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
}

// A pasta nao pode se chamar "vendor": o Go trata vendor/ como diretorio de
// dependencias do modulo e recusa compilar ("inconsistent vendoring").
func TestRaizPadraoNaoEVendor(t *testing.T) {
	t.Setenv("LOWGAMETRY_FERRAMENTAS", "")
	b := DescobrirBinarios()
	if filepath.Base(filepath.Dir(filepath.Dir(b.Blender))) == "vendor" {
		t.Fatalf("raiz padrao nao pode ser vendor/: %s", b.Blender)
	}
	if filepath.Base(filepath.Dir(filepath.Dir(b.Blender))) != "ferramentas" {
		t.Fatalf("raiz padrao deveria ser ferramentas/: %s", b.Blender)
	}
}

func TestRaizVemDaVariavelDeAmbiente(t *testing.T) {
	t.Setenv("LOWGAMETRY_FERRAMENTAS", filepath.Join("/tmp", "lg"))
	b := DescobrirBinarios()
	if !strings.HasPrefix(b.Blender, filepath.Join("/tmp", "lg")) {
		t.Fatalf("deveria honrar LOWGAMETRY_FERRAMENTAS: %s", b.Blender)
	}
}

// O release traz as duas builds do COLMAP. A CUDA so e usada quando ha GPU
// NVIDIA: ela carrega DLLs de CUDA que faltam num PC sem placa.
func TestCOLMAPUsaBuildCUDASoQuandoHaGPUEBuild(t *testing.T) {
	raiz := t.TempDir()
	cpu := filepath.Join(raiz, "colmap", "bin", "colmap.exe")
	cuda := filepath.Join(raiz, "colmap-cuda", "bin", "colmap.exe")
	criarFalso(t, cpu)

	if got := escolherCOLMAP(raiz, true); got != cpu {
		t.Fatalf("sem a build cuda instalada deveria cair na cpu: %s", got)
	}

	criarFalso(t, cuda)
	if got := escolherCOLMAP(raiz, true); got != cuda {
		t.Fatalf("com GPU e build cuda deveria usar cuda: %s", got)
	}
	if got := escolherCOLMAP(raiz, false); got != cpu {
		t.Fatalf("sem GPU deveria usar cpu mesmo com build cuda instalada: %s", got)
	}
}

func TestDisponivelSoComTodos(t *testing.T) {
	raiz := t.TempDir()
	b := DescobrirBinariosEm(raiz)
	if b.Disponivel() {
		t.Fatal("não deveria estar disponível sem binários")
	}
	// cria os essenciais
	criarFalso(t, b.COLMAP)
	criarFalso(t, b.Densify)
	criarFalso(t, b.ReconstructMesh)
	criarFalso(t, b.TextureMesh)
	criarFalso(t, b.Blender)
	b2 := DescobrirBinariosEm(raiz)
	if !b2.Disponivel() {
		t.Fatalf("deveria estar disponível: %+v", b2)
	}
}
