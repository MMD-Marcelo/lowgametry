package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// esperarPronto faz polling do status ate o job terminar.
func esperarPronto(t *testing.T, base, id string) {
	t.Helper()
	for i := 0; i < 200; i++ {
		rs, _ := http.Get(base + "/jobs/" + id)
		var j Job
		json.NewDecoder(rs.Body).Decode(&j)
		rs.Body.Close()
		if j.Estado == "pronto" {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("job %s nao ficou pronto", id)
}

func postJob(t *testing.T, url string) *http.Response {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, _ := w.CreateFormFile("foto", "a.jpg")
	fw.Write([]byte("x"))
	w.WriteField("config", `{"faces":5000}`)
	w.Close()
	req, _ := http.NewRequest("POST", url+"/jobs", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	r, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func TestHealth(t *testing.T) {
	srv := httptest.NewServer(NovoServidor(NovoGerenciador(PipelineFake())))
	defer srv.Close()
	r, _ := http.Get(srv.URL + "/health")
	if r.StatusCode != 200 {
		t.Fatalf("status %d", r.StatusCode)
	}
	var c Capacidades
	json.NewDecoder(r.Body).Decode(&c)
	if c.Nucleos <= 0 || c.Versao == "" {
		t.Fatalf("capacidades invÃ¡lidas: %+v", c)
	}
}

func TestHealthMostraJobEmAndamento(t *testing.T) {
	lento := Pipeline{Etapas: []Etapa{etapaFake{nome: "SfM", passos: 10, espera: 30 * time.Millisecond}, etapaExportFake{}}}
	srv := httptest.NewServer(NovoServidor(NovoGerenciador(lento)))
	defer srv.Close()

	r := postJob(t, srv.URL)
	if r.StatusCode != http.StatusAccepted {
		t.Fatalf("POST /jobs status %d", r.StatusCode)
	}
	var criado struct{ JobId string }
	json.NewDecoder(r.Body).Decode(&criado)
	r.Body.Close()

	rh, _ := http.Get(srv.URL + "/health")
	var c Capacidades
	json.NewDecoder(rh.Body).Decode(&c)
	rh.Body.Close()
	if !c.Ocupado || c.JobID != criado.JobId || c.JobEstado == "" || c.JobEtapa == "" {
		t.Fatalf("health deveria expor job atual: %+v job=%s", c, criado.JobId)
	}
}
func TestCriarJobStatusEResultado(t *testing.T) {
	g := NovoGerenciador(Pipeline{Etapas: []Etapa{etapaExportFake{}}}) // instantÃ¢neo
	srv := httptest.NewServer(NovoServidor(g))
	defer srv.Close()

	r := postJob(t, srv.URL)
	if r.StatusCode != http.StatusAccepted {
		t.Fatalf("POST /jobs status %d", r.StatusCode)
	}
	var criado struct{ JobId string }
	json.NewDecoder(r.Body).Decode(&criado)
	if criado.JobId == "" {
		t.Fatal("jobId vazio")
	}

	// polling atÃ© pronto
	var estado string
	for i := 0; i < 200; i++ {
		rs, _ := http.Get(srv.URL + "/jobs/" + criado.JobId)
		var j Job
		json.NewDecoder(rs.Body).Decode(&j)
		rs.Body.Close()
		estado = j.Estado
		if estado == "pronto" {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if estado != "pronto" {
		t.Fatalf("estado final %q", estado)
	}

	rg, _ := http.Get(srv.URL + "/jobs/" + criado.JobId + "/result.glb")
	if rg.StatusCode != 200 {
		t.Fatalf("result.glb status %d", rg.StatusCode)
	}
	b, _ := io.ReadAll(rg.Body)
	if len(b) == 0 {
		t.Fatal("glb vazio")
	}
}

func TestResultadoZipTrazObjMtlETextura(t *testing.T) {
	g := NovoGerenciador(Pipeline{Etapas: []Etapa{etapaExportFake{}}})
	srv := httptest.NewServer(NovoServidor(g))
	defer srv.Close()

	r := postJob(t, srv.URL)
	var criado struct{ JobId string }
	json.NewDecoder(r.Body).Decode(&criado)
	r.Body.Close()
	esperarPronto(t, srv.URL, criado.JobId)

	rz, _ := http.Get(srv.URL + "/jobs/" + criado.JobId + "/result.zip")
	if rz.StatusCode != 200 {
		t.Fatalf("result.zip status %d", rz.StatusCode)
	}
	if ct := rz.Header.Get("Content-Type"); ct != "application/zip" {
		t.Fatalf("Content-Type %q, esperado application/zip", ct)
	}
	b, _ := io.ReadAll(rz.Body)
	zr, err := zip.NewReader(bytes.NewReader(b), int64(len(b)))
	if err != nil {
		t.Fatalf("nao e um zip valido: %v", err)
	}
	nomes := map[string]bool{}
	for _, f := range zr.File {
		nomes[f.Name] = true
	}
	for _, quero := range []string{"resultado.obj", "resultado.mtl", "resultado_albedo.png"} {
		if !nomes[quero] {
			t.Fatalf("zip sem %s; tem %v", quero, nomes)
		}
	}
}

func TestResultadoZipAntesDePronto409(t *testing.T) {
	lento := Pipeline{Etapas: []Etapa{etapaFake{nome: "SfM", passos: 10, espera: 30 * time.Millisecond}, etapaExportFake{}}}
	srv := httptest.NewServer(NovoServidor(NovoGerenciador(lento)))
	defer srv.Close()
	r := postJob(t, srv.URL)
	var criado struct{ JobId string }
	json.NewDecoder(r.Body).Decode(&criado)
	r.Body.Close()

	rz, _ := http.Get(srv.URL + "/jobs/" + criado.JobId + "/result.zip")
	if rz.StatusCode != http.StatusConflict {
		t.Fatalf("result.zip com job rodando: status %d, esperado 409", rz.StatusCode)
	}
}

func TestJobConcorrente409(t *testing.T) {
	lento := Pipeline{Etapas: []Etapa{etapaFake{nome: "SfM", passos: 10, espera: 30 * time.Millisecond}, etapaExportFake{}}}
	srv := httptest.NewServer(NovoServidor(NovoGerenciador(lento)))
	defer srv.Close()
	a := postJob(t, srv.URL)
	b := postJob(t, srv.URL)
	if a.StatusCode != http.StatusAccepted {
		t.Fatalf("primeiro POST %d", a.StatusCode)
	}
	if b.StatusCode != http.StatusConflict {
		t.Fatalf("segundo POST %d, esperado 409", b.StatusCode)
	}
}

func TestDeleteJob(t *testing.T) {
	srv := httptest.NewServer(NovoServidor(NovoGerenciador(PipelineFake())))
	defer srv.Close()
	r := postJob(t, srv.URL)
	var criado struct{ JobId string }
	json.NewDecoder(r.Body).Decode(&criado)
	req, _ := http.NewRequest("DELETE", srv.URL+"/jobs/"+criado.JobId, nil)
	rd, _ := http.DefaultClient.Do(req)
	if rd.StatusCode != http.StatusNoContent {
		t.Fatalf("DELETE status %d", rd.StatusCode)
	}
}

func TestPreflightCORS(t *testing.T) {
	srv := httptest.NewServer(NovoServidor(NovoGerenciador(PipelineFake())))
	defer srv.Close()
	req, _ := http.NewRequest("OPTIONS", srv.URL+"/jobs", nil)
	r, _ := http.DefaultClient.Do(req)
	if r.StatusCode != http.StatusNoContent {
		t.Fatalf("OPTIONS status %d", r.StatusCode)
	}
	if r.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("faltou header CORS")
	}
}
