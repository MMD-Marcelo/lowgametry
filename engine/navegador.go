package main

import (
	"os/exec"
	"runtime"
)

// SiteURL é o site público; a janela do motor abre ele no navegador padrão.
const SiteURL = "https://mmd-marcelo.github.io/lowgametry/"

// abrirNoNavegador usa o abridor padrão do SO. Só Windows é alvo do v1, mas o
// fallback mantém o motor utilizável quando rodado em dev noutro sistema.
func abrirNoNavegador(url string) error {
	switch runtime.GOOS {
	case "windows":
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		return exec.Command("open", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}
