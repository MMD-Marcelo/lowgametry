package main

import (
	"context"
	"strings"
	"testing"
)

func TestEtapaBlenderInvocaScript(t *testing.T) {
	fake := &comandoFake{}
	bin := DescobrirBinariosEm("/ferramentas")
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	e := EtapaLowPolyExport(bin, fake, ws.Dir)
	if e.Nome() != "export" {
		t.Fatalf("rotulo = %q", e.Nome())
	}
	cfg := ConfigPadrao()
	cfg.Faces = 1500
	if err := e.Rodar(context.Background(), ws, cfg, func(int, string) {}); err != nil {
		t.Fatal(err)
	}
	if len(fake.chamadas) != 1 {
		t.Fatalf("esperava 1 chamada ao blender: %+v", fake.chamadas)
	}
	ch := fake.chamadas[0]
	if !strings.Contains(ch[0], "blender") {
		t.Fatalf("binario errado: %v", ch[0])
	}
	joined := strings.Join(ch, " ")
	for _, esperado := range []string{"--background", "--python", "bake.py", "--modo lowpoly", "--faces 1500", "--res 256", "--filtro nearest", "--paleta 32", "--flat", "--dither", "--crunchy-uv", "--simple-material", "resultado.glb"} {
		if !strings.Contains(joined, esperado) {
			t.Fatalf("faltou %q em: %s", esperado, joined)
		}
	}
	if strings.Contains(joined, "--normal") {
		t.Fatalf("low poly padrao nao deveria ligar normal map: %s", joined)
	}
}

func TestEtapaBlenderFotogrametriaNormal(t *testing.T) {
	fake := &comandoFake{}
	bin := DescobrirBinariosEm("/ferramentas")
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	cfg := ConfigPadrao()
	cfg.Modo = "fotogrametria"
	cfg.Faces = 20000
	cfg.ResTextura = 2048
	cfg.GerarNormal = true
	cfg.FlatShading = false
	cfg.FiltroTextura = "linear"
	cfg.PaletaCores = 0
	cfg.Dithering = false
	cfg.UVCrunchy = false
	cfg.MaterialSimples = false
	if err := EtapaLowPolyExport(bin, fake, ws.Dir).Rodar(context.Background(), ws, cfg, func(int, string) {}); err != nil {
		t.Fatal(err)
	}
	joined := strings.Join(fake.chamadas[0], " ")
	for _, esperado := range []string{"--modo fotogrametria", "--faces 20000", "--res 2048", "--filtro linear", "--normal"} {
		if !strings.Contains(joined, esperado) {
			t.Fatalf("faltou %q em: %s", esperado, joined)
		}
	}
	for _, proibido := range []string{"--flat", "--dither", "--crunchy-uv", "--simple-material"} {
		if strings.Contains(joined, proibido) {
			t.Fatalf("nao esperava %q em: %s", proibido, joined)
		}
	}
}

func TestEtapaBlenderPedeExportObj(t *testing.T) {
	fake := &comandoFake{}
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	e := EtapaLowPolyExport(DescobrirBinariosEm("/ferramentas"), fake, ws.Dir)
	if err := e.Rodar(context.Background(), ws, ConfigPadrao(), func(int, string) {}); err != nil {
		t.Fatal(err)
	}
	joined := strings.Join(fake.chamadas[0], " ")
	if !strings.Contains(joined, "--saida-obj") || !strings.Contains(joined, "resultado.obj") {
		t.Fatalf("blender deveria receber --saida-obj resultado.obj: %s", joined)
	}
}

func TestEscreverBakePy(t *testing.T) {
	dir := t.TempDir()
	caminho, err := EscreverBakePy(dir)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(caminho, "bake.py") {
		t.Fatalf("caminho = %s", caminho)
	}
}
