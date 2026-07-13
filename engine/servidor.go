package main

import (
	"encoding/json"
	"io"
	"net/http"
)

// NovoServidor monta o mux do contrato da ponte, com CORS.
func NovoServidor(ger *Gerenciador) http.Handler {
	s := &servidor{ger: ger}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.health)
	mux.HandleFunc("POST /jobs", s.criarJob)
	mux.HandleFunc("GET /jobs/{id}", s.statusJob)
	mux.HandleFunc("GET /jobs/{id}/result.glb", s.resultado)
	mux.HandleFunc("GET /jobs/{id}/result.zip", s.resultadoZip) // obj + mtl + texturas
	mux.HandleFunc("DELETE /jobs/{id}", s.apagarJob)
	return cors(mux)
}

type servidor struct{ ger *Gerenciador }

func cors(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h.ServeHTTP(w, r)
	})
}

func escreverJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (s *servidor) health(w http.ResponseWriter, r *http.Request) {
	c := detectarCapacidades()
	c.Ocupado = s.ger.Ocupado()
	c.PipelineReal = pipelineRealDisponivel
	if id, estado, etapa, pct, ok := s.ger.ResumoAtual(); ok {
		c.JobID = id
		c.JobEstado = estado
		c.JobEtapa = etapa
		c.JobPct = pct
	}
	escreverJSON(w, http.StatusOK, c)
}

func (s *servidor) criarJob(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(256 << 20); err != nil {
		escreverJSON(w, http.StatusBadRequest, map[string]string{"erro": "multipart invÃ¡lido"})
		return
	}
	cfg, err := ParseConfig([]byte(r.FormValue("config")))
	if err != nil {
		escreverJSON(w, http.StatusBadRequest, map[string]string{"erro": "config invÃ¡lida"})
		return
	}
	var fotos []FotoEntrada
	if r.MultipartForm != nil {
		// a ordem de File["foto"] segue a ordem do multipart (ordem de envio)
		for _, fhs := range r.MultipartForm.File["foto"] {
			f, err := fhs.Open()
			if err != nil {
				continue
			}
			dados, _ := io.ReadAll(f)
			f.Close()
			fotos = append(fotos, FotoEntrada{Nome: fhs.Filename, Dados: dados})
		}
	}
	id, err := s.ger.Criar(cfg, fotos)
	if err != nil {
		escreverJSON(w, http.StatusConflict, map[string]string{"erro": "jÃ¡ hÃ¡ um job em andamento"})
		return
	}
	escreverJSON(w, http.StatusAccepted, map[string]string{"jobId": id})
}

func (s *servidor) statusJob(w http.ResponseWriter, r *http.Request) {
	j, ok := s.ger.Status(r.PathValue("id"))
	if !ok {
		escreverJSON(w, http.StatusNotFound, map[string]string{"erro": "job nÃ£o encontrado"})
		return
	}
	escreverJSON(w, http.StatusOK, j)
}

func (s *servidor) resultado(w http.ResponseWriter, r *http.Request) {
	b, ok := s.ger.ResultadoGLB(r.PathValue("id"))
	if !ok {
		escreverJSON(w, http.StatusConflict, map[string]string{"erro": "resultado ainda nÃ£o pronto"})
		return
	}
	w.Header().Set("Content-Type", "model/gltf-binary")
	w.Write(b)
}

func (s *servidor) resultadoZip(w http.ResponseWriter, r *http.Request) {
	b, ok := s.ger.ResultadoZip(r.PathValue("id"))
	if !ok {
		escreverJSON(w, http.StatusConflict, map[string]string{"erro": "resultado ainda nao pronto"})
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="lowgametry.zip"`)
	w.Write(b)
}

func (s *servidor) apagarJob(w http.ResponseWriter, r *http.Request) {
	s.ger.Apagar(r.PathValue("id"))
	w.WriteHeader(http.StatusNoContent)
}
