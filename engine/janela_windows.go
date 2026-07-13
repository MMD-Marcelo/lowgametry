//go:build windows

package main

import (
	"log"
	"sync"

	"github.com/lxn/walk"
	dec "github.com/lxn/walk/declarative"
)

// RodarJanela abre a janela de controle do motor e bloqueia até ela ser
// fechada. Fechar a janela encerra o motor (o servidor é desligado no defer do
// main). Um botão liga/desliga o servidor HTTP; o site detecta pelo /health.
func RodarJanela(ctrl *Controlador, cap Capacidades) {
	var janela *walk.MainWindow
	var statusLbl *walk.Label
	var botao *walk.PushButton
	var mu sync.Mutex

	atualizar := func() {
		mu.Lock()
		defer mu.Unlock()
		if ctrl.Ligado() {
			statusLbl.SetText("● Ligado — ouvindo em http://" + Porta)
			botao.SetText("Desligar motor")
		} else {
			statusLbl.SetText("○ Parado — o site não vai detectar o motor")
			botao.SetText("Ligar motor")
		}
	}

	aoClicar := func() {
		var err error
		if ctrl.Ligado() {
			err = ctrl.Desligar()
		} else {
			err = ctrl.Ligar()
		}
		if err != nil {
			walk.MsgBox(janela, "lowgametry", "Não consegui alternar o motor:\n"+err.Error(), walk.MsgBoxIconError)
		}
		atualizar()
	}

	linhaCUDA := "CPU"
	if cap.TemCUDA {
		linhaCUDA = "CUDA (NVIDIA)"
	}

	err := dec.MainWindow{
		AssignTo: &janela,
		Title:    "lowgametry — motor",
		MinSize:  dec.Size{Width: 380, Height: 200},
		Size:     dec.Size{Width: 420, Height: 220},
		Layout:   dec.VBox{Margins: dec.Margins{Left: 16, Top: 16, Right: 16, Bottom: 16}, Spacing: 10},
		Children: []dec.Widget{
			dec.Label{Text: "lowgametry " + Versao, Font: dec.Font{PointSize: 12, Bold: true}},
			dec.Label{AssignTo: &statusLbl, Text: ""},
			dec.Label{Text: linhaCUDA + " · " + itoa(cap.Nucleos) + " núcleos", TextColor: walk.RGB(0x7f, 0x96, 0x89)},
			dec.PushButton{AssignTo: &botao, Text: "", OnClicked: aoClicar},
			dec.LinkLabel{
				Text: `<a href="` + SiteURL + `">Abrir o site</a>`,
				OnLinkActivated: func(link *walk.LinkLabelLink) {
					if e := abrirNoNavegador(link.URL()); e != nil {
						log.Printf("nao consegui abrir o navegador: %v", e)
					}
				},
			},
			dec.Label{Text: "Fechar esta janela encerra o motor.", TextColor: walk.RGB(0x7f, 0x96, 0x89)},
		},
	}.Create()
	if err != nil {
		log.Fatalf("nao consegui criar a janela: %v", err)
	}
	// o ícone da janela/barra de tarefas vem do rsrc_windows.syso (embutido no exe)

	atualizar()
	janela.Run()
}

// itoa evita importar strconv só pra um int pequeno.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}
