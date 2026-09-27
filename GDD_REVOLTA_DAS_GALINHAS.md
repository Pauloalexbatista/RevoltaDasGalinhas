# GAME DESIGN DOCUMENT (GDD)
# Projeto: A Revolta das Galinhas (Tributo Espiritual ao Chuckie Egg 1984)

## 1. Visão Geral
* **Título:** A Revolta das Galinhas (Chicken's Revenge)
* **Género:** Arcade Platformer 2D Retro (Single-screen)
* **Inspiração Direta:** *Chuckie Egg* (1984, A&F Software / Timex Sinclair 48K / ZX Spectrum)
* **Plataformas-Alvo:** Web Browser Desktop (Teclado) + Mobile / Smartphones (Controlos Táteis Landscape)
* **Tecnologia:** HTML5 Canvas, Vanilla JavaScript (sem dependências pesadas, ultra-rápido e 60 FPS estáveis)

---

## 2. A Premissa & História Cómica
Durante décadas, o infame fazendeiro **Henhouse Harry** roubou milhões de ovos indefesos para fazer fortunas nos computadores dos anos 80.
**Agora, a paciência das galinhas acabou!**
O jogador controla **Piu**, uma galinha destemida que se infiltra nos armazéns e celeiros verticais do Harry para **resgatar todos os ovos roubados** e libertar os pintainhos, enquanto se esquiva do fazendeiro e dos seus ajudantes desajeitados!

* **O Clímax de Tempo (A Ameaça Final):** 
  No topo do ecrã, em vez de uma gaiola de pássaro, está a **casota do Cão de Guarda da Quinta** (ou a porta trancada do celeiro). Se o temporizador (TIME) chegar a zero, a porta da casota arromba-se e o **Cão Feroz** é solto! Ele salta pelas plataformas a grande velocidade e persegue a Piu sem tréguas para a apanhar com a boca até o jogador perder a vida ou terminar o nível a correr!

---

## 3. Mecânicas Principais (DNA Chuckie Egg)
1. **Ecrã Único (Single-Screen Mastery):**
   * Cada nível cabe a 100% no ecrã (sem scroll).
   * O jogador tem visão completa do mapa, ovos, inimigos e escadas desde o segundo 1.
2. **Plataformas Vazadas (Girders):**
   * Vigas metálicas e de madeira finas e elegantes.
   * O jogador pode saltar de baixo para cima atravessando plataformas.
3. **Resgate de Ovos:**
   * 12 ovos espalhados por nível. O nível só termina quando o último ovo for resgatado.
4. **Montes de Milho (Sementes):**
   * Bónus de pontos. Bónus de pontos (+50 pts) e **Congelamento do Cronómetro** (pausa o TEMPO durante 12s, adiando a fuga do cão de guarda da casota, tal como acontecia com o pássaro no Chuckie Egg original).
5. **Elevadores Verticais (Níveis Avançados):**
   * Plataformas móveis automáticas em poços verticais que sobem e descem continuamente.
6. **Inimigos Patrulheiros:**
   * O Fazendeiro Harry e os seus ajudantes, que percorrem plataformas e sobem/descem escadas para encurralar a galinha.

---

## 4. Controlos: Teclado vs Mobile (A Solução Perfeita)

### A. No PC (Teclado - Autêntico Timex 48K):
* **O / P** ou **Setas Esquerda / Direita**: Mover
* **Q / A** ou **Setas Cima / Baixo**: Subir / Descer Escadas
* **ESPAÇO**: Saltar

### B. No Telemóvel (Mobile First - Landscape):
Como as mãos seguram o telemóvel por trás e os dois polegares ficam pousados nos cantos inferiores:
* **Polegar Esquerdo (Navegação):**
  * D-Pad ou botões táteis direcionais ergonómicos:
    * Botões largos para `←` e `→`
    * Botões para `↑` e `↓` (ativos e destacados ao aproximar de uma escada).
* **Polegar Direito (Ação):**
  * Botão grande circular táctil de **SALTAR** (Jump).
  * Ergonomia perfeita: nunca obriga o jogador a mover a mão para o centro do ecrã!

---

## 5. Estrutura do Projeto
```
PRJT RevoltaDasGalinhas/
│
├── index.html                  # Container responsivo Fullscreen / Landscape
├── style.css                   # Estilo CRT arcade, canvas adaptável a qualquer ecrã
├── game.js                     # Motor 2D: física rápida, ovos, elevadores, IA
├── GDD_REVOLTA_DAS_GALINHAS.md # Este documento de design e planeamento
└── assets/                     # Sprites pixel-art (Galinha, Ovos, Milho, Fazendeiro, Cão)
```


---

## 6. Fim de Jogo & Registo de Recordes (High Scores)
* **Regresso ao Menu Principal:** Quando o jogo termina, o utilizador regressa sempre ao Menu Principal arcade.
* **Ecrã de Novo Recorde:** Se a pontuação final entrar no Top 7, surge o ecrã clássico arcade para introdução do nome do jogador (até 8 letras), gravando a pontuação e exibindo-a na tabela permanente (guardada no navegador).


---

## 7. Melhorias Implementadas & Ajustes de Jogabilidade (v1.2)
1. **Joystick em "X" (4 Setores Angulares a 45°):**
   - Implementada a divisão matemática do círculo em 4 setores ("X"), garantindo que movimentos laterais (esquerda/direita) têm prioridade e nunca são bloqueados por desvios na diagonal.
   - Adicionada indicação visual com miras cruzadas em "X" sutis na base do joystick.
2. **Sistema de Pausa Tátil Arcade (Estilo Leitor de Vídeo):**
   - Tocar em qualquer ponto do ecrã/canvas (fora dos botões de ação e joystick) coloca o jogo em pausa ou retoma imediatamente.
   - Overlay de pausa retro nostálgico com moldura de alta definição, texto pulsante e instruções.
3. **Auto-Pausa Preventiva em Telemóveis:**
   - Deteção de eventos de rotação de ecrã (`orientationchange`), mensagens de sistema, perda de foco (`blur`) ou troca de aba (`visibilitychange`), pausando o jogo de forma preventiva para que a galinha nunca morra enquanto mensagens de sistema cobrem o jogo.
4. **Nível 3: Morte no Poço do Elevador e Esmagamento no Teto:**
   - Se a galinha cair no poço vazio do elevador na base do celeiro, perde uma vida.
   - Se for transportada pelo elevador até ao teto do nível e não saltar a tempo, é esmagada contra as vigas do telhado, perdendo uma vida (fidelidade clássica Chuckie Egg).
5. **Correção do Hub Arcade (Rolagem Bi-direcional e Botão Topo):**
   - No portal Arcade Hub (`testeweb.site`), a rolagem móvel agora funciona nos dois sentidos (para cima e para baixo com toque) sem bloqueios de inércia.
   - Adicionado botão flutuante retro "▲ TOPO" para regresso instantâneo ao jogo de Pinball no topo.
