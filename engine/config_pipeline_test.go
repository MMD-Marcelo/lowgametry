package main

import "testing"

func TestConfigPadrao(t *testing.T) {
	c := ConfigPadrao()
	if c.Modo != "lowpoly" || c.PresetQualidade != "equilibrado" || c.Faces != 800 || c.ResTextura != 256 {
		t.Fatalf("padrao inesperado: %+v", c)
	}
	if !c.FlatShading || c.FiltroTextura != "nearest" || c.PaletaCores != 32 || !c.Dithering || c.GerarNormal {
		t.Fatalf("estilo low poly inesperado: %+v", c)
	}
}

func TestParseConfigAplicaDefaults(t *testing.T) {
	c, err := ParseConfig([]byte(`{"faces":1500,"autoRetopo":false}`))
	if err != nil {
		t.Fatal(err)
	}
	if c.Faces != 1500 {
		t.Fatalf("faces = %d", c.Faces)
	}
	if c.ResTextura != 256 { // ausente -> default low poly
		t.Fatalf("resTextura = %d, esperado default 256", c.ResTextura)
	}
	if c.Modo != "lowpoly" || c.PresetQualidade != "equilibrado" {
		t.Fatalf("defaults inesperados: %+v", c)
	}
}

func TestParseConfigFotogrametriaNormal(t *testing.T) {
	c, err := ParseConfig([]byte(`{"modo":"fotogrametria","faces":20000,"resTextura":2048,"gerarNormal":true,"flatShading":false,"filtroTextura":"linear"}`))
	if err != nil {
		t.Fatal(err)
	}
	if c.Modo != "fotogrametria" || c.Faces != 20000 || c.ResTextura != 2048 || !c.GerarNormal || c.FlatShading || c.FiltroTextura != "linear" {
		t.Fatalf("fotogrametria normal inesperada: %+v", c)
	}
}

func TestParseConfigVazio(t *testing.T) {
	c, err := ParseConfig(nil)
	if err != nil || c.Faces != 800 || c.Modo != "lowpoly" {
		t.Fatalf("vazio deveria virar padrao low poly: %+v err=%v", c, err)
	}
}
