package main

import (
	"log"
	"os"
)

// Porta fixa combinada com o site (BASE_MOTOR).
const Porta = "127.0.0.1:8757"

// pipelineRealDisponivel indica se os binários reais foram encontrados (para o /health).
var pipelineRealDisponivel bool

func main() {
	// apaga workspaces deixados por jobs que nao fecharam (erro, aborto, crash)
	if err := LimparOrfaos(); err != nil {
		log.Printf("aviso: nao consegui limpar workspaces antigos: %v", err)
	}
	bin := DescobrirBinarios()
	// escreve o bake.py num diretório estável ao lado do exe (ou temp) pro Blender usar
	scriptDir, _ := os.MkdirTemp("", "lowgametry-scripts-*")
	if _, err := EscreverBakePy(scriptDir); err != nil {
		log.Printf("aviso: não consegui escrever bake.py: %v", err)
	}
	pipeline, real := EscolherPipeline(bin, ComandoReal{}, scriptDir)
	if real {
		log.Println("pipeline real (COLMAP/OpenMVS/Blender) disponível")
	} else {
		log.Println("binários não encontrados em ferramentas/ — usando pipeline demo (fake)")
	}
	pipelineRealDisponivel = real

	ger := NovoGerenciador(pipeline)
	ctrl := NovoControlador(Porta, NovoServidor(ger))

	// A janela é o controle do motor: um botão liga/desliga o servidor, e fechar
	// a janela encerra tudo. RodarJanela bloqueia na thread principal.
	RodarJanela(ctrl, detectarCapacidades())

	// janela fechada → desliga o servidor antes de sair
	if err := ctrl.Desligar(); err != nil {
		log.Printf("aviso ao desligar: %v", err)
	}
}
