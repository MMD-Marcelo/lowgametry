package main

import (
	"context"
	"runtime"
	"strconv"
	"strings"
	"testing"
)

func TestEtapaSfMConstroiComandos(t *testing.T) {
	fake := &comandoFake{}
	bin := DescobrirBinariosEm("/ferramentas")
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	e := EtapaSfM(bin, fake)
	if e.Nome() != "SfM" {
		t.Fatalf("rotulo = %q", e.Nome())
	}
	if err := e.Rodar(context.Background(), ws, ConfigPadrao(), func(int, string) {}); err != nil {
		t.Fatal(err)
	}
	if len(fake.chamadas) != 5 {
		t.Fatalf("esperava 5 chamadas, veio %d: %+v", len(fake.chamadas), fake.chamadas)
	}
	if !strings.Contains(fake.chamadas[0][0], "colmap") || fake.chamadas[0][1] != "feature_extractor" {
		t.Fatalf("primeira chamada errada: %+v", fake.chamadas[0])
	}
	if fake.chamadas[3][1] != "image_undistorter" {
		t.Fatalf("quarta chamada deveria ser image_undistorter: %+v", fake.chamadas[3])
	}
	if !strings.Contains(fake.chamadas[4][0], "InterfaceCOLMAP") {
		t.Fatalf("quinta chamada deveria ser InterfaceCOLMAP: %+v", fake.chamadas[4])
	}
}

func TestEtapaDensoEProgresso(t *testing.T) {
	fake := &comandoFake{saida: map[string][]string{
		DescobrirBinariosEm("/ferramentas").Densify: {"Estimated depth-maps 42%"},
	}}
	var pcts []int
	e := EtapaDenso(DescobrirBinariosEm("/ferramentas"), fake)
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	e.Rodar(context.Background(), ws, ConfigPadrao(), func(pct int, _ string) { pcts = append(pcts, pct) })
	achou42 := false
	for _, pct := range pcts {
		if pct == 42 {
			achou42 = true
		}
	}
	if !achou42 || pcts[len(pcts)-1] != 100 {
		t.Fatalf("progresso inesperado: %+v", pcts)
	}
}

func comFotos(t *testing.T, n int) *Workspace {
	t.Helper()
	ws, err := NovoWorkspace()
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < n; i++ {
		if err := ws.SalvarFoto(strconv.Itoa(i)+".jpg", []byte("x")); err != nil {
			t.Fatal(err)
		}
	}
	return ws
}

// O motor roda na bandeja enquanto a pessoa usa o PC. Ocupar todos os nucleos
// trava a maquina (e, em PCs no limite termico, chega a desliga-la).
func TestThreadsDeixaNucleosLivres(t *testing.T) {
	t.Setenv("LOWGAMETRY_THREADS", "")
	n := threadsPipeline()
	if n < 1 || n >= runtime.NumCPU() {
		t.Fatalf("threadsPipeline() = %d, com %d nucleos", n, runtime.NumCPU())
	}
}

func TestThreadsRespeitaVariavelDeAmbiente(t *testing.T) {
	t.Setenv("LOWGAMETRY_THREADS", "3")
	if n := threadsPipeline(); n != 3 {
		t.Fatalf("threadsPipeline() = %d, queria 3", n)
	}
	t.Setenv("LOWGAMETRY_THREADS", "0")
	if n := threadsPipeline(); n < 1 {
		t.Fatalf("valor invalido deveria cair no padrao, veio %d", n)
	}
}

// exhaustive_matcher compara todos os pares: O(n²). Com muitas fotos isso domina
// o SfM. sequential_matcher casa vizinhas na ordem de captura.
func TestSfMEscolheMatcherPelaQuantidadeDeFotos(t *testing.T) {
	casos := []struct {
		fotos   int
		matcher string
	}{
		{10, "exhaustive_matcher"},
		{25, "exhaustive_matcher"},
		{26, "sequential_matcher"},
		{80, "sequential_matcher"},
	}
	for _, c := range casos {
		fake := &comandoFake{}
		ws := comFotos(t, c.fotos)
		if err := EtapaSfM(DescobrirBinariosEm("/ferramentas"), fake).Rodar(context.Background(), ws, ConfigPadrao(), func(int, string) {}); err != nil {
			ws.Limpar()
			t.Fatal(err)
		}
		if got := fake.chamadas[1][1]; got != c.matcher {
			ws.Limpar()
			t.Fatalf("%d fotos -> matcher %q, queria %q", c.fotos, got, c.matcher)
		}
		ws.Limpar()
	}
}

func TestEtapasLimitamThreads(t *testing.T) {
	t.Setenv("LOWGAMETRY_THREADS", "5")
	bin := DescobrirBinariosEm("/ferramentas")
	cfg := ConfigPadrao()

	fake := &comandoFake{}
	ws := comFotos(t, 5)
	defer ws.Limpar()
	if err := EtapaSfM(bin, fake).Rodar(context.Background(), ws, cfg, func(int, string) {}); err != nil {
		t.Fatal(err)
	}
	for _, i := range []int{0, 1, 2} { // extrator, matcher, mapper
		if !strings.Contains(strings.Join(fake.chamadas[i], " "), "num_threads 5") {
			t.Fatalf("chamada %d do COLMAP sem num_threads: %v", i, fake.chamadas[i])
		}
	}

	for nome, montar := range map[string]func(Binarios, Comando) Etapa{
		"denso":   EtapaDenso,
		"malha":   EtapaMalha,
		"textura": EtapaTextura,
	} {
		f := &comandoFake{}
		if err := montar(bin, f).Rodar(context.Background(), ws, cfg, func(int, string) {}); err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(strings.Join(f.chamadas[0], " "), "--max-threads 5") {
			t.Fatalf("etapa %s sem --max-threads: %v", nome, f.chamadas[0])
		}
	}
}

// Um asset de 300 faces nao precisa de nuvem densa em 12 megapixels.
// Limitar a imagem na densificacao barateia a etapa mais cara do pipeline.
func TestResolucaoEntradaPorModo(t *testing.T) {
	cfg := ConfigPadrao() // lowpoly
	if got := resolucaoEntrada(cfg); got != 1600 {
		t.Fatalf("lowpoly = %d, queria 1600", got)
	}
	cfg.Modo = "fotogrametria"
	if got := resolucaoEntrada(cfg); got != 3200 {
		t.Fatalf("fotogrametria = %d, queria 3200", got)
	}
}

// resolution-level divide a resolucao por 2^n. O denso e a etapa mais cara do
// pipeline, e num alvo low-poly o detalhe extra e jogado fora depois.
func TestEtapaDensoReduzResolucao(t *testing.T) {
	fake := &comandoFake{}
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	if err := EtapaDenso(DescobrirBinariosEm("/ferramentas"), fake).Rodar(context.Background(), ws, ConfigPadrao(), func(int, string) {}); err != nil {
		t.Fatal(err)
	}
	joined := strings.Join(fake.chamadas[0], " ")
	for _, esperado := range []string{"--resolution-level 2", "--max-resolution 1600"} {
		if !strings.Contains(joined, esperado) {
			t.Fatalf("faltou %q em: %s", esperado, joined)
		}
	}
}

func TestEtapaDensoPreservaDetalheNaFotogrametria(t *testing.T) {
	fake := &comandoFake{}
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	cfg := ConfigPadrao()
	cfg.Modo = "fotogrametria"
	if err := EtapaDenso(DescobrirBinariosEm("/ferramentas"), fake).Rodar(context.Background(), ws, cfg, func(int, string) {}); err != nil {
		t.Fatal(err)
	}
	joined := strings.Join(fake.chamadas[0], " ")
	if !strings.Contains(joined, "--resolution-level 1") || !strings.Contains(joined, "--max-resolution 3200") {
		t.Fatalf("fotogrametria nao deveria reduzir tanto: %s", joined)
	}
}

// Texturizar a malha densa crua e caro (minutos) e a malha fica com milhoes de
// ilhas de UV minusculas. Decimar antes deixa o TextureMesh em segundos.
func TestEtapaMalhaDecimaAntesDaTextura(t *testing.T) {
	fake := &comandoFake{}
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	cfg := ConfigPadrao() // lowpoly, 800 faces
	if err := EtapaMalha(DescobrirBinariosEm("/ferramentas"), fake).Rodar(context.Background(), ws, cfg, func(int, string) {}); err != nil {
		t.Fatal(err)
	}
	joined := strings.Join(fake.chamadas[0], " ")
	if !strings.Contains(joined, "--target-face-num") {
		t.Fatalf("ReconstructMesh deveria decimar: %s", joined)
	}
}

func TestFacesIntermediarias(t *testing.T) {
	casos := []struct {
		faces, quer int
	}{
		{300, 30000},    // piso: nunca menos que 30k, senao o retopo perde forma
		{800, 30000},    // 20x800 = 16k < piso
		{20000, 300000}, // 20x20000 = 400k > teto
		{60000, 300000}, // teto
		{3000, 60000},   // 20x
	}
	for _, c := range casos {
		cfg := ConfigPadrao()
		cfg.Faces = c.faces
		if got := facesIntermediarias(cfg); got != c.quer {
			t.Fatalf("facesIntermediarias(%d) = %d, queria %d", c.faces, got, c.quer)
		}
	}
}

// O seam leveling do OpenMVS diverge nessa malha e pinta o miolo dos recortes
// de preto. Sem ele, a textura sai correta.
func TestEtapaTexturaDesligaSeamLeveling(t *testing.T) {
	fake := &comandoFake{}
	ws, _ := NovoWorkspace()
	defer ws.Limpar()
	if err := EtapaTextura(DescobrirBinariosEm("/ferramentas"), fake).Rodar(context.Background(), ws, ConfigPadrao(), func(int, string) {}); err != nil {
		t.Fatal(err)
	}
	joined := strings.Join(fake.chamadas[0], " ")
	for _, esperado := range []string{"--global-seam-leveling 0", "--local-seam-leveling 0"} {
		if !strings.Contains(joined, esperado) {
			t.Fatalf("faltou %q em: %s", esperado, joined)
		}
	}
}

func TestProgressoDensoPorDepthMap(t *testing.T) {
	p := progressoDenso()
	if pct, ok := p("20:22:47 [ScnDense] Depth-map for image 39 estimated using 5 images"); !ok || pct != 1 {
		t.Fatalf("primeira depth-map = (%d,%v)", pct, ok)
	}
	if pct, ok := p("20:23:20 [ScnDense] Depth-map for image 29 estimated using 5 images"); !ok || pct != 2 {
		t.Fatalf("segunda depth-map = (%d,%v)", pct, ok)
	}
}

func TestProgressoPorcentagem(t *testing.T) {
	if p, ok := progressoPorcentagem("Processing 73% done"); !ok || p != 73 {
		t.Fatalf("(%d,%v)", p, ok)
	}
	if _, ok := progressoPorcentagem("sem numero"); ok {
		t.Fatal("nao deveria achar %")
	}
}
