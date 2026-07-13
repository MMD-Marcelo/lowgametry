package main

import "encoding/json"

// Config do pipeline - chaves identicas as enviadas pelo site.
type Config struct {
	Modo            string `json:"modo"`
	PresetQualidade string `json:"presetQualidade"`
	Faces           int    `json:"faces"`
	AutoRetopo      bool   `json:"autoRetopo"`
	Textura         bool   `json:"textura"`
	ResTextura      int    `json:"resTextura"`
	GerarNormal     bool   `json:"gerarNormal"`
	FlatShading     bool   `json:"flatShading"`
	FiltroTextura   string `json:"filtroTextura"`
	PaletaCores     int    `json:"paletaCores"`
	Dithering       bool   `json:"dithering"`
	UVCrunchy       bool   `json:"uvCrunchy"`
	MaterialSimples bool   `json:"materialSimples"`
}

func ConfigPadrao() Config {
	return Config{
		Modo:            "lowpoly",
		PresetQualidade: "equilibrado",
		Faces:           800,
		AutoRetopo:      true,
		Textura:         true,
		ResTextura:      256,
		GerarNormal:     false,
		FlatShading:     true,
		FiltroTextura:   "nearest",
		PaletaCores:     32,
		Dithering:       true,
		UVCrunchy:       true,
		MaterialSimples: true,
	}
}

// ParseConfig le o JSON de config e completa campos ausentes com os defaults.
func ParseConfig(b []byte) (Config, error) {
	padrao := ConfigPadrao()
	if len(b) == 0 {
		return padrao, nil
	}
	c := padrao
	if err := json.Unmarshal(b, &c); err != nil {
		return Config{}, err
	}
	if c.Modo == "" {
		c.Modo = padrao.Modo
	}
	if c.PresetQualidade == "" {
		c.PresetQualidade = padrao.PresetQualidade
	}
	if c.Faces == 0 {
		c.Faces = padrao.Faces
	}
	if c.ResTextura == 0 {
		c.ResTextura = padrao.ResTextura
	}
	if c.FiltroTextura == "" {
		c.FiltroTextura = padrao.FiltroTextura
	}
	return c, nil
}
