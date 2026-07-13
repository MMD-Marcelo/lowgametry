# Dicas de captura

A qualidade do modelo depende muito mais das fotos do que dos ajustes. O
COLMAP precisa reconhecer o mesmo ponto do objeto em várias fotos para
descobrir onde a câmera estava; quando ele não consegue, o job falha na etapa
`SfM`, e nenhum preset conserta isso depois.

## O básico

- **20 a 60 fotos.** Menos de 15 raramente fecha a reconstrução. Muito mais que
  60 só deixa lento sem ganhar detalhe.
- **Sobreposição de ~70%.** Ande em volta do objeto em passos pequenos: cada
  foto deve repetir a maior parte do que a anterior mostrou.
- **Dê uma volta completa**, e depois outra numa altura diferente. Uma volta só,
  na altura dos olhos, deixa o topo e a base sem geometria.
- **Mova você, não o objeto.** Girar o objeto sobre uma mesa faz o fundo se
  mover junto com ele e confunde a reconstrução.

## O que estraga

- **Superfícies lisas e sem textura** (plástico branco, parede pintada): não há
  ponto para casar entre fotos. Um pouco de textura salva: poeira, adesivo,
  padrão desenhado.
- **Brilho, metal polido e vidro**: o reflexo muda conforme você anda, então o
  mesmo ponto parece pontos diferentes. Objetos transparentes não funcionam.
- **Fundo liso demais** (mesa branca vazia). Um fundo com textura dá referências
  extras. Uma folha de jornal por baixo já ajuda.
- **Foto tremida ou desfocada.** Prefira mais luz a ISO alto; o borrão apaga
  exatamente os detalhes que o casamento de features usa.
- **Luz que muda entre as fotos.** Flash, sombra sua se movendo, sol entre
  nuvens. Luz difusa e constante é o ideal: dia nublado, ou ambiente interno
  bem iluminado sem foco direcional.

## Se falhar

Quando o job para em `SfM`, o motor não conseguiu posicionar as câmeras. Na
prática, em ordem de eficácia: tire mais fotos com mais sobreposição, ponha
textura no fundo, e tire o objeto do sol direto.

Se parar em `denso` ou `malha`, as câmeras fecharam mas o objeto tem pouca
superfície reconhecível, normalmente é o caso da superfície lisa ou brilhante.
