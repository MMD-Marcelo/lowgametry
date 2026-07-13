package main

import (
	_ "embed"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

//go:embed scripts/bake.py
var bakePy []byte

// EscreverBakePy grava o script bake.py num diretorio e devolve o caminho.
func EscreverBakePy(dir string) (string, error) {
	caminho := filepath.Join(dir, "bake.py")
	if err := os.WriteFile(caminho, bakePy, 0o644); err != nil {
		return "", err
	}
	return caminho, nil
}

// EtapaLowPolyExport: Blender headless faz retopo, bake e export glb.
func EtapaLowPolyExport(bin Binarios, cmd Comando, scriptDir string) Etapa {
	return EtapaCmd{
		rotulo: "export", cmd: cmd, timeout: 30 * time.Minute,
		progresso: progressoPorcentagem,
		passos: []PassoCmd{
			{Nome: bin.Blender, Args: func(ws *Workspace, cfg Config) []string {
				script := filepath.Join(scriptDir, "bake.py")
				args := []string{
					"--background", "--python", script, "--",
					"--entrada", ws.Caminho("scene_textured.obj"),
					"--saida", ws.Caminho("resultado.glb"),
					"--saida-obj", ws.Caminho("resultado.obj"),
					"--modo", cfg.Modo,
					"--faces", strconv.Itoa(cfg.Faces),
					"--res", strconv.Itoa(cfg.ResTextura),
					"--filtro", cfg.FiltroTextura,
					"--paleta", strconv.Itoa(cfg.PaletaCores),
				}
				if cfg.GerarNormal {
					args = append(args, "--normal")
				}
				if cfg.FlatShading {
					args = append(args, "--flat")
				}
				if cfg.Dithering {
					args = append(args, "--dither")
				}
				if cfg.UVCrunchy {
					args = append(args, "--crunchy-uv")
				}
				if cfg.MaterialSimples {
					args = append(args, "--simple-material")
				}
				return args
			}},
		},
	}
}
