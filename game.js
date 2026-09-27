/**
 * A REVOLTA DAS GALINHAS (Chicken's Revenge)
 * Tributo Espiritual aos clássicos de plataformas Arcade de 1984
 * Motor HTML5 Canvas Retro com física estilo 8-bit, 3 Níveis, Elevadores, Menus Retro e Áudio Procedural.
 */

// --- CONFIGURAÇÃO & CANVAS ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// --- SISTEMA DE RECORDES (HIGH SCORES) ---
const DEFAULT_SCORES = [
  { name: "PIU", score: 12000 },
  { name: "NOSTALGIA", score: 10000 },
  { name: "PINTAINHO", score: 8500 },
  { name: "AGRICULT", score: 6800 },
  { name: "BOBI_REX", score: 5200 },
  { name: "OVINHO", score: 3500 },
  { name: "GALINHEIRO", score: 2000 }
];

function loadHighScores() {
  try {
    const saved = localStorage.getItem("revolta_highscores");
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return [...DEFAULT_SCORES];
}

let playerNameInput = "";

function checkIfHighScore(finalScore) {
  if (finalScore <= 0) return false;
  const list = loadHighScores();
  if (list.length < 7) return true;
  return finalScore > list[list.length - 1].score;
}

function submitHighScore() {
  const finalName = (playerNameInput.trim() || "PINTAINHO").toUpperCase().slice(0, 8);
  try {
    const list = loadHighScores();
    list.push({ name: finalName, score });
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem("revolta_highscores", JSON.stringify(list.slice(0, 7)));
  } catch(e) {}
  playerNameInput = "";
  const mobInp = document.getElementById("mobile-name-input");
  if (mobInp) {
    mobInp.value = "";
    mobInp.blur();
  }
  gameState = "TITLE";
}

// --- SISTEMA DE ÁUDIO 8-BIT PROCEDURAL (Web Audio API) ---
class RetroAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, type = "square", duration = 0.08, vol = 0.15) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  jump() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(360, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {}
  }

  egg() {
    if (!this.enabled || !this.ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, "triangle", 0.09, 0.25), idx * 45);
    });
  }

  corn() {
    this.playTone(320, "triangle", 0.04, 0.2);
    setTimeout(() => this.playTone(480, "triangle", 0.05, 0.2), 60);
  }

  dogBark() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.22);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  die() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.6);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.6);
    } catch (e) {}
  }

  levelWin() {
    if (!this.enabled || !this.ctx) return;
    const notes = [440, 554, 659, 880, 1108];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, "square", 0.18, 0.25), i * 110);
    });
  }
}

const audio = new RetroAudio();

// --- CONTROLOS & INPUTS ---
const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false
};

function setupInput() {
  window.addEventListener("keydown", (e) => {
    audio.init();
    const k = e.key.toLowerCase();
    
    // Navegação no Menu e Ecrãs de Fim de Jogo
    if (gameState === "TITLE") {
      if (k === " " || k === "enter") {
        startGame();
        return;
      }
      if (k === "i") {
        gameState = "INSTRUCTIONS";
        return;
      }
    } else if (gameState === "INSTRUCTIONS") {
      if (k === " " || k === "enter" || k === "escape" || k === "i") {
        gameState = "TITLE";
        return;
      }
    } else if (gameState === "NEW_RECORD") {
      if (e.key === "Enter") {
        submitHighScore();
        return;
      }
      if (e.key === "Backspace") {
        playerNameInput = playerNameInput.slice(0, -1);
        const mobInp = document.getElementById("mobile-name-input");
        if (mobInp) mobInp.value = playerNameInput;
        e.preventDefault();
        return;
      }
      if (e.key.length === 1 && /[a-zA-Z0-9_\- ]/.test(e.key)) {
        if (playerNameInput.length < 8) {
          playerNameInput += e.key.toUpperCase();
          const mobInp = document.getElementById("mobile-name-input");
          if (mobInp) mobInp.value = playerNameInput;
        }
        e.preventDefault();
        return;
      }
      return;
    } else if (gameState === "GAME_OVER") {
      if (k === " " || k === "enter" || k === "escape") {
        gameState = "TITLE";
        return;
      }
    }

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "space"].includes(k)) { e.preventDefault(); }
    if (k === "o" || k === "arrowleft") keys.left = true;
    if (k === "p" || k === "arrowright" || k === "d") keys.right = true;
    if (k === "q" || k === "arrowup" || k === "w") keys.up = true;
    if (k === "a" || k === "arrowdown" || k === "s") keys.down = true;
    if (k === " " || k === "space") {
      keys.jump = true;
      e.preventDefault();
    }
    if (k === "m") {
      audio.enabled = !audio.enabled;
      document.getElementById("btn-sound-toggle").innerText = `🔊 SOM: ${audio.enabled ? "ON" : "OFF"}`;
    }
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "o" || k === "arrowleft") keys.left = false;
    if (k === "p" || k === "arrowright" || k === "d") keys.right = false;
    if (k === "q" || k === "arrowup" || k === "w") keys.up = false;
    if (k === "a" || k === "arrowdown" || k === "s") keys.down = false;
    if (k === " " || k === "space") keys.jump = false;
  });

  // --- 1. BOTÃO SALTAR COM FEEDBACK TÁTIL ---
  const jumpBtn = document.getElementById("btn-jump");
  if (jumpBtn) {
    const activateJump = (e) => {
      e.preventDefault();
      audio.init();
      tryEnterFullscreen();
      if (gameState === "TITLE") {
        startGame();
        return;
      }
      if (gameState === "INSTRUCTIONS") {
        gameState = "TITLE";
        return;
      }
      keys.jump = true;
      jumpBtn.classList.add("active");
    };
    const deactivateJump = (e) => {
      e.preventDefault();
      keys.jump = false;
      jumpBtn.classList.remove("active");
    };
    jumpBtn.addEventListener("touchstart", activateJump, { passive: false });
    jumpBtn.addEventListener("touchend", deactivateJump, { passive: false });
    jumpBtn.addEventListener("mousedown", activateJump);
    jumpBtn.addEventListener("mouseup", deactivateJump);
    jumpBtn.addEventListener("mouseleave", deactivateJump);
  }

  // --- 2. JOYSTICK ANALÓGICO ARCADE COM SUPORTE DIAGONAL INSTANTÂNEO ---
  const joystickZone = document.getElementById("joystick-zone");
  const joystickBase = document.getElementById("joystick-base");
  const joystickStick = document.getElementById("joystick-stick");
  const dirUp = document.querySelector(".j-dir.j-up");
  const dirDown = document.querySelector(".j-dir.j-down");
  const dirLeft = document.querySelector(".j-dir.j-left");
  const dirRight = document.querySelector(".j-dir.j-right");

  let joystickTouchId = null;
  let joyCenter = { x: 0, y: 0 };
  const JOY_MAX_DIST = 36;
  const JOY_DEADZONE = 8;

  function updateJoystick(clientX, clientY) {
    const dx = clientX - joyCenter.x;
    const dy = clientY - joyCenter.y;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, JOY_MAX_DIST);
    const normX = dist > 0 ? (dx / dist) : 0;
    const normY = dist > 0 ? (dy / dist) : 0;

    if (joystickStick) {
      joystickStick.style.transform = `translate(${normX * clampedDist}px, ${normY * clampedDist}px)`;
    }

    if (dist > JOY_DEADZONE) {
      // Divisão em 'X' (4 setores a 45° no círculo):
      // - Setor Direita:  |dx| >= |dy| e dx > 0
      // - Setor Esquerda: |dx| >= |dy| e dx < 0
      // - Setor Baixo:    |dy| > |dx| e dy > 0
      // - Setor Cima:     |dy| > |dx| e dy < 0
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const isRight = (absDx >= absDy) && (dx > 0);
      const isLeft  = (absDx >= absDy) && (dx < 0);
      const isDown  = (absDy > absDx) && (dy > 0);
      const isUp    = (absDy > absDx) && (dy < 0);

      keys.right = isRight;
      keys.left = isLeft;
      keys.down = isDown;
      keys.up = isUp;

      dirUp?.classList.toggle("active", isUp);
      dirDown?.classList.toggle("active", isDown);
      dirLeft?.classList.toggle("active", isLeft);
      dirRight?.classList.toggle("active", isRight);
    } else {
      keys.right = false;
      keys.left = false;
      keys.down = false;
      keys.up = false;
      dirUp?.classList.remove("active");
      dirDown?.classList.remove("active");
      dirLeft?.classList.remove("active");
      dirRight?.classList.remove("active");
    }
  }

  function resetJoystick() {
    joystickTouchId = null;
    if (joystickStick) {
      joystickStick.style.transform = "translate(0px, 0px)";
    }
    keys.right = false;
    keys.left = false;
    keys.down = false;
    keys.up = false;
    dirUp?.classList.remove("active");
    dirDown?.classList.remove("active");
    dirLeft?.classList.remove("active");
    dirRight?.classList.remove("active");
  }

  if (joystickZone && joystickBase) {
    joystickZone.addEventListener("touchstart", (e) => {
      e.preventDefault();
      audio.init();
      tryEnterFullscreen();
      if (gameState === "TITLE") {
        startGame();
        return;
      }
      if (gameState === "INSTRUCTIONS") {
        gameState = "TITLE";
        return;
      }
      if (joystickTouchId === null) {
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        const rect = joystickBase.getBoundingClientRect();
        joyCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        updateJoystick(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      if (joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          e.preventDefault();
          updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    }, { passive: false });

    const endTouch = (e) => {
      if (joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          resetJoystick();
          break;
        }
      }
    };
    window.addEventListener("touchend", endTouch, { passive: false });
    window.addEventListener("touchcancel", endTouch, { passive: false });

    // Rato para teste em PC
    let isJoyMouseDown = false;
    joystickZone.addEventListener("mousedown", (e) => {
      audio.init();
      isJoyMouseDown = true;
      const rect = joystickBase.getBoundingClientRect();
      joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      updateJoystick(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", (e) => {
      if (isJoyMouseDown) updateJoystick(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", () => {
      if (isJoyMouseDown) {
        isJoyMouseDown = false;
        resetJoystick();
      }
    });
  }

  // --- 3. DICA DE ROTAÇÃO & FULLSCREEN ---
  document.getElementById("btn-close-hint")?.addEventListener("click", () => {
    const hint = document.getElementById("rotate-hint");
    if (hint) hint.style.display = "none";
  });

  
function togglePause(forceState = null) {
  if (gameState !== "PLAYING" && !isGamePaused) return;
  const next = (forceState !== null) ? forceState : !isGamePaused;
  if (isGamePaused === next) return;
  isGamePaused = next;
  if (isGamePaused) {
    if (typeof audio !== "undefined" && audio.stopWalking) audio.stopWalking();
  } else {
    lastTime = performance.now();
  }
}

function tryEnterFullscreen() {
    try {
      if (!document.fullscreenElement && window.innerWidth <= 900) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    } catch (_) {}
  }

  // Botões de topo/rodapé
  const menuBtn = document.getElementById("btn-menu-toggle");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      audio.init();
      gameState = "TITLE";
    });
  }

  const instrBtn = document.getElementById("btn-instr-toggle");
  if (instrBtn) {
    instrBtn.addEventListener("click", () => {
      audio.init();
      gameState = (gameState === "INSTRUCTIONS") ? "TITLE" : "INSTRUCTIONS";
    });
  }

  const soundBtn = document.getElementById("btn-sound-toggle");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      audio.init();
      audio.enabled = !audio.enabled;
      soundBtn.innerText = `🔊 SOM: ${audio.enabled ? "ON" : "OFF"}`;
    });
  }

  const crtBtn = document.getElementById("btn-crt-toggle");
  if (crtBtn) {
    crtBtn.addEventListener("click", () => {
      const scr = document.getElementById("screen-wrapper");
      scr.classList.toggle("no-crt");
      crtBtn.innerText = `📺 CRT: ${scr.classList.contains("no-crt") ? "OFF" : "ON"}`;
    });
  }

  // Toque no Canvas nos ecrãs de Menu e Registo de Recorde
  canvas.addEventListener("click", (e) => {
    audio.init();
    if (gameState === "TITLE") {
      startGame();
    } else if (gameState === "INSTRUCTIONS") {
      gameState = "TITLE";
    } else if (gameState === "GAME_OVER") {
      gameState = "TITLE";
    } else if (gameState === "NEW_RECORD") {
      // Focar o input do telemóvel para abrir teclado virtual se necessário
      const mobInp = document.getElementById("mobile-name-input");
      if (mobInp) mobInp.focus();

      // Verificar se clicou na zona do botão "GUARDAR RECORDE"
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      // Botão Guardar: x: 270, y: 405 (90 + 315), w: 260, h: 45
      if (clickX >= 250 && clickX <= 550 && clickY >= 390 && clickY <= 460) {
        submitHighScore();
      }
    }
  });

  // Sincronizar input móvel
  const mobInp = document.getElementById("mobile-name-input");
  if (mobInp) {
    mobInp.addEventListener("input", (e) => {
      playerNameInput = e.target.value.toUpperCase().slice(0, 8);
    });
    mobInp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitHighScore();
    });
  }
}

// --- CONSTANTES & FÍSICA ---
const GRAVITY = 980;
const PIU_SPEED = 180;
const PIU_JUMP = -270;
const CLIMB_SPEED = 140;

let gameState = "TITLE";
let isGamePaused = false; // "TITLE", "INSTRUCTIONS", "PLAYING", "LOST_LIFE", "GAME_OVER", "LEVEL_CLEAR"
let score = 0;
let lives = 5;
let currentLevelIdx = 0;
let bonus = 3000;
let timeRemaining = 999;
let timerFrozenRemaining = 0;
let dogReleased = false;

// --- DADOS DOS 3 NÍVEIS ---
const levels = [
  // === NÍVEL 1: O CELEIRO INFERIOR ===
  {
    name: "NÍVEL 01: O CELEIRO INFERIOR",
    platforms: [
      { x: 30, y: 560, w: 740, h: 12 },
      { x: 50, y: 470, w: 220, h: 10 },
      { x: 320, y: 470, w: 260, h: 10 },
      { x: 620, y: 470, w: 150, h: 10 },
      { x: 100, y: 380, w: 280, h: 10 },
      { x: 440, y: 380, w: 280, h: 10 },
      { x: 50, y: 290, w: 200, h: 10 },
      { x: 300, y: 290, w: 200, h: 10 },
      { x: 550, y: 290, w: 220, h: 10 },
      { x: 40, y: 190, w: 160, h: 10 },
      { x: 250, y: 190, w: 240, h: 10 },
      { x: 540, y: 190, w: 200, h: 10 },
      { x: 200, y: 110, w: 380, h: 10 }
    ],
    ladders: [
      { x: 140, y: 470, w: 24, h: 90 },
      { x: 420, y: 470, w: 24, h: 90 },
      { x: 680, y: 470, w: 24, h: 90 },
      { x: 220, y: 380, w: 24, h: 90 },
      { x: 500, y: 380, w: 24, h: 90 },
      { x: 140, y: 290, w: 24, h: 90 },
      { x: 380, y: 290, w: 24, h: 90 },
      { x: 620, y: 290, w: 24, h: 90 },
      { x: 80,  y: 190, w: 24, h: 100 },
      { x: 320, y: 190, w: 24, h: 100 },
      { x: 600, y: 190, w: 24, h: 100 },
      { x: 280, y: 110, w: 24, h: 80 },
      { x: 480, y: 110, w: 24, h: 80 }
    ],
    kennel: { x: 40, y: 122, w: 68, h: 68 },
    elevators: [],
    harrys: [
      { x: 340, y: 470 - 32, dir: 1 },
      { x: 180, y: 380 - 32, dir: -1 },
      { x: 590, y: 290 - 32, dir: -1 }
    ],
    eggs: [
      { x: 60, y: 535, collected: false },
      { x: 730, y: 535, collected: false },
      { x: 70, y: 445, collected: false },
      { x: 350, y: 445, collected: false },
      { x: 720, y: 445, collected: false },
      { x: 120, y: 355, collected: false },
      { x: 680, y: 355, collected: false },
      { x: 60, y: 265, collected: false },
      { x: 400, y: 265, collected: false },
      { x: 720, y: 265, collected: false },
      { x: 380, y: 165, collected: false },
      { x: 380, y: 85, collected: false }
    ],
    corns: [
      { x: 480, y: 546, collected: false },
      { x: 160, y: 366, collected: false },
      { x: 500, y: 96, collected: false }
    ]
  },

  // === NÍVEL 2: AS GRANDES ESCADAS (Baseado na Imagem 5 / Arcade 1984 Nível 2) ===
  // Apresenta escadas longas que atravessam múltiplos pisos com desembarques intermédios!
  {
    name: "NÍVEL 02: AS GRANDES ESCADAS",
    platforms: [
      { x: 30, y: 560, w: 740, h: 12 },
      // Piso 1 (y: 480)
      { x: 80, y: 480, w: 200, h: 10 },
      { x: 520, y: 480, w: 200, h: 10 },
      // Piso 2 (y: 400)
      { x: 30, y: 400, w: 160, h: 10 },
      { x: 240, y: 400, w: 320, h: 10 }, // Cortado ao meio pela grande escada central
      { x: 610, y: 400, w: 160, h: 10 },
      // Piso 3 (y: 310)
      { x: 120, y: 310, w: 220, h: 10 },
      { x: 460, y: 310, w: 220, h: 10 },
      // Piso 4 (y: 220)
      { x: 40, y: 220, w: 160, h: 10 }, // Plataforma da Casota
      { x: 260, y: 220, w: 280, h: 10 }, // Cortado pela grande escada
      { x: 590, y: 220, w: 170, h: 10 },
      // Topo (y: 130)
      { x: 180, y: 130, w: 440, h: 10 }
    ],
    ladders: [
      // ESCADA GIGANTE CENTRAL: Liga o chão (560) ao Piso 4 (220) atravessando 4 níveis!
      { x: 400, y: 220, w: 24, h: 340, multiTier: true },
      // Escadas laterais de interligação
      { x: 140, y: 480, w: 24, h: 80 },
      { x: 660, y: 480, w: 24, h: 80 },
      { x: 80,  y: 400, w: 24, h: 80 },
      { x: 720, y: 400, w: 24, h: 80 },
      { x: 220, y: 310, w: 24, h: 90 },
      { x: 580, y: 310, w: 24, h: 90 },
      { x: 100, y: 220, w: 24, h: 90 },
      { x: 700, y: 220, w: 24, h: 90 },
      { x: 280, y: 130, w: 24, h: 90 },
      { x: 520, y: 130, w: 24, h: 90 }
    ],
    kennel: { x: 40, y: 152, w: 68, h: 68 },
    elevators: [],
    harrys: [
      { x: 100, y: 480 - 32, dir: 1 },
      { x: 620, y: 400 - 32, dir: -1 },
      { x: 300, y: 220 - 32, dir: 1 }
    ],
    eggs: [
      { x: 70, y: 535, collected: false },
      { x: 710, y: 535, collected: false },
      { x: 150, y: 455, collected: false },
      { x: 600, y: 455, collected: false },
      { x: 60, y: 375, collected: false },
      { x: 480, y: 375, collected: false },
      { x: 700, y: 375, collected: false },
      { x: 180, y: 285, collected: false },
      { x: 580, y: 285, collected: false },
      { x: 650, y: 195, collected: false },
      { x: 240, y: 105, collected: false },
      { x: 540, y: 105, collected: false }
    ],
    corns: [
      { x: 250, y: 546, collected: false },
      { x: 350, y: 386, collected: false },
      { x: 380, y: 116, collected: false }
    ]
  },

  // === NÍVEL 3: O POÇO DOS ELEVADORES (Baseado na 1ª Imagem / Arcade 1984 Nível 3) ===
  // Apresenta poço central com elevadores contínuos verticais (um a subir, outro a descer)!
  {
    name: "NÍVEL 03: O POÇO DOS ELEVADORES",
    // Poço do elevador entre x: 340 e x: 420 totalmente livre e sem vigas a cruzar!
    platforms: [
      // Chão Base (cortado no poço do elevador)
      { x: 30, y: 560, w: 310, h: 12 },
      { x: 426, y: 560, w: 344, h: 12 },

      // Piso 1 (y: 470)
      { x: 40, y: 470, w: 290, h: 10 },
      { x: 426, y: 470, w: 334, h: 10 },

      // Piso 2 (y: 380)
      { x: 60, y: 380, w: 270, h: 10 },
      { x: 426, y: 380, w: 344, h: 10 },

      // Piso 3 (y: 280)
      { x: 40, y: 280, w: 290, h: 10 },
      { x: 426, y: 280, w: 334, h: 10 },

      // Piso 4 (y: 190) - Casota do Cão
      { x: 40, y: 190, w: 240, h: 10 },
      { x: 426, y: 190, w: 344, h: 10 },

      // Topo (y: 100)
      { x: 180, y: 100, w: 150, h: 10 },
      { x: 426, y: 100, w: 220, h: 10 }
    ],
    ladders: [
      // Lado Esquerdo
      { x: 120, y: 470, w: 24, h: 90 },
      { x: 200, y: 380, w: 24, h: 90 },
      { x: 90,  y: 280, w: 24, h: 100 },
      { x: 60,  y: 190, w: 24, h: 90 },
      { x: 260, y: 100, w: 24, h: 90 },

      // Lado Direito
      { x: 660, y: 470, w: 24, h: 90 },
      { x: 540, y: 380, w: 24, h: 90 },
      { x: 680, y: 280, w: 24, h: 100 },
      { x: 600, y: 190, w: 24, h: 90 },
      { x: 500, y: 100, w: 24, h: 90 }
    ],
    // ELEVADORES SÓ SOBEM (2 plataformas no mesmo poço em ciclo contínuo)
    elevators: [
      {
        x: 352,
        y: 530,
        w: 58,
        h: 12,
        vy: -70,
        type: "up",
        minY: 60,
        maxY: 550
      },
      {
        x: 352,
        y: 290,
        w: 58,
        h: 12,
        vy: -70,
        type: "up",
        minY: 60,
        maxY: 550
      }
    ],
    kennel: { x: 40, y: 122, w: 68, h: 68 },
    harrys: [
      { x: 140, y: 470 - 32, dir: 1 },  // Patrulha no lado esquerdo
      { x: 580, y: 380 - 32, dir: -1 }, // Patrulha no lado direito
      { x: 500, y: 190 - 32, dir: 1 }   // Patrulha no lado direito superior
    ],
    eggs: [
      { x: 60, y: 535, collected: false },
      { x: 720, y: 535, collected: false },
      { x: 160, y: 445, collected: false },
      { x: 600, y: 445, collected: false },
      { x: 140, y: 355, collected: false },
      { x: 680, y: 355, collected: false },
      { x: 80,  y: 255, collected: false },
      { x: 560, y: 255, collected: false },
      { x: 710, y: 255, collected: false },
      { x: 200, y: 165, collected: false },
      { x: 600, y: 165, collected: false },
      { x: 500, y: 75,  collected: false }
    ],
    corns: [
      { x: 260, y: 546, collected: false },
      { x: 660, y: 366, collected: false },
      { x: 220, y: 86,  collected: false }
    ]
  },
  // === NÍVEL 4: A ESTRUTURA EM PIRÂMIDE ===
  {
    name: "NÍVEL 04: A ESTRUTURA EM PIRÂMIDE",
    platforms: [
      { x: 30, y: 560, w: 740, h: 12 },
      { x: 60, y: 470, w: 280, h: 10 },
      { x: 460, y: 470, w: 280, h: 10 },
      { x: 120, y: 380, w: 240, h: 10 },
      { x: 440, y: 380, w: 240, h: 10 },
      { x: 180, y: 290, w: 200, h: 10 },
      { x: 420, y: 290, w: 200, h: 10 },
      { x: 230, y: 200, w: 150, h: 10 },
      { x: 420, y: 200, w: 150, h: 10 },
      { x: 300, y: 110, w: 200, h: 10 },
      { x: 40, y: 180, w: 120, h: 10 }
    ],
    ladders: [
      { x: 100, y: 470, w: 24, h: 90 },
      { x: 670, y: 470, w: 24, h: 90 },
      { x: 160, y: 380, w: 24, h: 90 },
      { x: 610, y: 380, w: 24, h: 90 },
      { x: 220, y: 290, w: 24, h: 90 },
      { x: 550, y: 290, w: 24, h: 90 },
      { x: 280, y: 200, w: 24, h: 90 },
      { x: 490, y: 200, w: 24, h: 90 },
      { x: 340, y: 110, w: 24, h: 90 },
      { x: 440, y: 110, w: 24, h: 90 },
      { x: 60,  y: 180, w: 24, h: 290 }
    ],
    kennel: { x: 40, y: 112, w: 68, h: 68 },
    elevators: [],
    harrys: [
      { x: 200, y: 470 - 32, dir: 1 },
      { x: 550, y: 380 - 32, dir: -1 },
      { x: 300, y: 290 - 32, dir: 1 }
    ],
    eggs: [
      { x: 80,  y: 535, collected: false },
      { x: 710, y: 535, collected: false },
      { x: 140, y: 445, collected: false },
      { x: 640, y: 445, collected: false },
      { x: 200, y: 355, collected: false },
      { x: 580, y: 355, collected: false },
      { x: 260, y: 265, collected: false },
      { x: 520, y: 265, collected: false },
      { x: 320, y: 175, collected: false },
      { x: 460, y: 175, collected: false },
      { x: 350, y: 85,  collected: false },
      { x: 450, y: 85,  collected: false }
    ],
    corns: [
      { x: 400, y: 546, collected: false },
      { x: 140, y: 166, collected: false }
    ]
  },

  // === NÍVEL 5: OS SILOS DUPLOS ===
  {
    name: "NÍVEL 05: OS SILOS DUPLOS",
    platforms: [
      { x: 30, y: 560, w: 180, h: 12 },
      { x: 280, y: 560, w: 240, h: 12 },
      { x: 590, y: 560, w: 180, h: 12 },
      { x: 40, y: 470, w: 170, h: 10 },
      { x: 290, y: 470, w: 220, h: 10 },
      { x: 590, y: 470, w: 170, h: 10 },
      { x: 50, y: 380, w: 160, h: 10 },
      { x: 280, y: 380, w: 240, h: 10 },
      { x: 590, y: 380, w: 160, h: 10 },
      { x: 40, y: 280, w: 170, h: 10 },
      { x: 300, y: 280, w: 200, h: 10 },
      { x: 590, y: 280, w: 170, h: 10 },
      { x: 60, y: 190, w: 150, h: 10 },
      { x: 280, y: 190, w: 240, h: 10 },
      { x: 590, y: 190, w: 150, h: 10 },
      { x: 220, y: 100, w: 360, h: 10 }
    ],
    ladders: [
      { x: 90,  y: 470, w: 24, h: 90 },
      { x: 400, y: 470, w: 24, h: 90 },
      { x: 690, y: 470, w: 24, h: 90 },
      { x: 120, y: 380, w: 24, h: 90 },
      { x: 340, y: 380, w: 24, h: 90 },
      { x: 460, y: 380, w: 24, h: 90 },
      { x: 660, y: 380, w: 24, h: 90 },
      { x: 90,  y: 280, w: 24, h: 100 },
      { x: 400, y: 280, w: 24, h: 100 },
      { x: 690, y: 280, w: 24, h: 100 },
      { x: 300, y: 100, w: 24, h: 90 },
      { x: 480, y: 100, w: 24, h: 90 }
    ],
    elevators: [
      { x: 218, y: 490, w: 56, h: 12, vy: -75, type: "up", minY: 80, maxY: 540 },
      { x: 526, y: 250, w: 56, h: 12, vy: -75, type: "up", minY: 80, maxY: 540 }
    ],
    kennel: { x: 50, y: 122, w: 68, h: 68 },
    harrys: [
      { x: 100, y: 470 - 32, dir: 1 },
      { x: 360, y: 380 - 32, dir: -1 },
      { x: 650, y: 280 - 32, dir: 1 }
    ],
    eggs: [
      { x: 60,  y: 535, collected: false },
      { x: 400, y: 535, collected: false },
      { x: 720, y: 535, collected: false },
      { x: 140, y: 445, collected: false },
      { x: 660, y: 445, collected: false },
      { x: 350, y: 355, collected: false },
      { x: 450, y: 355, collected: false },
      { x: 80,  y: 255, collected: false },
      { x: 700, y: 255, collected: false },
      { x: 330, y: 165, collected: false },
      { x: 470, y: 165, collected: false },
      { x: 400, y: 75,  collected: false }
    ],
    corns: [
      { x: 300, y: 546, collected: false },
      { x: 500, y: 546, collected: false }
    ]
  },

  // === NÍVEL 6: A PONTE SUSPENSA ===
  {
    name: "NÍVEL 06: A PONTE SUSPENSA",
    platforms: [
      { x: 30, y: 560, w: 740, h: 12 },
      { x: 50,  y: 470, w: 160, h: 10 },
      { x: 260, y: 470, w: 130, h: 10 },
      { x: 440, y: 470, w: 130, h: 10 },
      { x: 620, y: 470, w: 150, h: 10 },
      { x: 100, y: 380, w: 180, h: 10 },
      { x: 330, y: 380, w: 160, h: 10 },
      { x: 540, y: 380, w: 180, h: 10 },
      { x: 40,  y: 290, w: 220, h: 10 },
      { x: 310, y: 290, w: 190, h: 10 },
      { x: 550, y: 290, w: 210, h: 10 },
      { x: 60,  y: 190, w: 200, h: 10 },
      { x: 320, y: 190, w: 180, h: 10 },
      { x: 550, y: 190, w: 190, h: 10 },
      { x: 200, y: 100, w: 400, h: 10 }
    ],
    ladders: [
      { x: 100, y: 470, w: 24, h: 90 },
      { x: 680, y: 470, w: 24, h: 90 },
      { x: 220, y: 380, w: 24, h: 90 },
      { x: 580, y: 380, w: 24, h: 90 },
      { x: 120, y: 290, w: 24, h: 90 },
      { x: 400, y: 290, w: 24, h: 90 },
      { x: 660, y: 290, w: 24, h: 90 },
      { x: 180, y: 190, w: 24, h: 100 },
      { x: 600, y: 190, w: 24, h: 100 },
      { x: 300, y: 100, w: 24, h: 90 },
      { x: 500, y: 100, w: 24, h: 90 }
    ],
    kennel: { x: 50, y: 122, w: 68, h: 68 },
    elevators: [],
    harrys: [
      { x: 300, y: 470 - 32, dir: 1 },
      { x: 200, y: 380 - 32, dir: -1 },
      { x: 400, y: 290 - 32, dir: 1 },
      { x: 600, y: 190 - 32, dir: -1 }
    ],
    eggs: [
      { x: 60,  y: 535, collected: false },
      { x: 720, y: 535, collected: false },
      { x: 300, y: 445, collected: false },
      { x: 480, y: 445, collected: false },
      { x: 140, y: 355, collected: false },
      { x: 400, y: 355, collected: false },
      { x: 640, y: 355, collected: false },
      { x: 80,  y: 265, collected: false },
      { x: 700, y: 265, collected: false },
      { x: 400, y: 165, collected: false },
      { x: 260, y: 75,  collected: false },
      { x: 540, y: 75,  collected: false }
    ],
    corns: [
      { x: 400, y: 446, collected: false },
      { x: 400, y: 76,  collected: false }
    ]
  },

  // === NÍVEL 7: O LABIRINTO DA MOENDA ===
  {
    name: "NÍVEL 07: O LABIRINTO DA MOENDA",
    platforms: [
      { x: 30, y: 560, w: 740, h: 12 },
      { x: 40,  y: 470, w: 320, h: 10 },
      { x: 440, y: 470, w: 320, h: 10 },
      { x: 40,  y: 390, w: 140, h: 10 },
      { x: 230, y: 390, w: 160, h: 10 },
      { x: 440, y: 390, w: 160, h: 10 },
      { x: 640, y: 390, w: 130, h: 10 },
      { x: 90,  y: 300, w: 260, h: 10 },
      { x: 430, y: 300, w: 270, h: 10 },
      { x: 40,  y: 200, w: 180, h: 10 },
      { x: 280, y: 200, w: 240, h: 10 },
      { x: 580, y: 200, w: 180, h: 10 },
      { x: 150, y: 110, w: 220, h: 10 },
      { x: 430, y: 110, w: 220, h: 10 }
    ],
    ladders: [
      { x: 120, y: 470, w: 24, h: 90 },
      { x: 300, y: 470, w: 24, h: 90 },
      { x: 500, y: 470, w: 24, h: 90 },
      { x: 680, y: 470, w: 24, h: 90 },
      { x: 80,  y: 390, w: 24, h: 80 },
      { x: 270, y: 390, w: 24, h: 80 },
      { x: 520, y: 390, w: 24, h: 80 },
      { x: 700, y: 390, w: 24, h: 80 },
      { x: 160, y: 300, w: 24, h: 90 },
      { x: 330, y: 300, w: 24, h: 90 },
      { x: 480, y: 300, w: 24, h: 90 },
      { x: 620, y: 300, w: 24, h: 90 },
      { x: 220, y: 110, w: 24, h: 90 },
      { x: 560, y: 110, w: 24, h: 90 }
    ],
    kennel: { x: 40, y: 132, w: 68, h: 68 },
    elevators: [],
    harrys: [
      { x: 180, y: 470 - 32, dir: 1 },
      { x: 550, y: 470 - 32, dir: -1 },
      { x: 320, y: 300 - 32, dir: 1 },
      { x: 380, y: 200 - 32, dir: -1 }
    ],
    eggs: [
      { x: 70,  y: 535, collected: false },
      { x: 720, y: 535, collected: false },
      { x: 220, y: 445, collected: false },
      { x: 580, y: 445, collected: false },
      { x: 110, y: 365, collected: false },
      { x: 360, y: 365, collected: false },
      { x: 460, y: 365, collected: false },
      { x: 690, y: 365, collected: false },
      { x: 200, y: 275, collected: false },
      { x: 580, y: 275, collected: false },
      { x: 220, y: 85,  collected: false },
      { x: 540, y: 85,  collected: false }
    ],
    corns: [
      { x: 400, y: 176, collected: false },
      { x: 400, y: 546, collected: false }
    ]
  },

  // === NÍVEL 8: AS PLATAFORMAS FLUTUANTES ===
  {
    name: "NÍVEL 08: AS PLATAFORMAS FLUTUANTES",
    platforms: [
      { x: 30,  y: 560, w: 300, h: 12 },
      { x: 470, y: 560, w: 300, h: 12 },
      { x: 60,  y: 470, w: 200, h: 10 },
      { x: 330, y: 470, w: 140, h: 10 },
      { x: 540, y: 470, w: 200, h: 10 },
      { x: 100, y: 380, w: 200, h: 10 },
      { x: 500, y: 380, w: 200, h: 10 },
      { x: 40,  y: 280, w: 190, h: 10 },
      { x: 310, y: 280, w: 180, h: 10 },
      { x: 570, y: 280, w: 190, h: 10 },
      { x: 120, y: 190, w: 220, h: 10 },
      { x: 460, y: 190, w: 220, h: 10 },
      { x: 280, y: 100, w: 240, h: 10 }
    ],
    ladders: [
      { x: 120, y: 470, w: 24, h: 90 },
      { x: 660, y: 470, w: 24, h: 90 },
      { x: 180, y: 380, w: 24, h: 90 },
      { x: 580, y: 380, w: 24, h: 90 },
      { x: 90,  y: 280, w: 24, h: 100 },
      { x: 680, y: 280, w: 24, h: 100 },
      { x: 220, y: 190, w: 24, h: 90 },
      { x: 540, y: 190, w: 24, h: 90 },
      { x: 340, y: 100, w: 24, h: 90 },
      { x: 440, y: 100, w: 24, h: 90 }
    ],
    elevators: [
      { x: 372, y: 510, w: 56, h: 12, vy: -80, type: "up", minY: 70, maxY: 550 }
    ],
    kennel: { x: 40, y: 212, w: 68, h: 68 },
    harrys: [
      { x: 180, y: 470 - 32, dir: 1 },
      { x: 600, y: 470 - 32, dir: -1 },
      { x: 160, y: 280 - 32, dir: 1 },
      { x: 620, y: 280 - 32, dir: -1 }
    ],
    eggs: [
      { x: 60,  y: 535, collected: false },
      { x: 720, y: 535, collected: false },
      { x: 120, y: 445, collected: false },
      { x: 400, y: 445, collected: false },
      { x: 660, y: 445, collected: false },
      { x: 160, y: 355, collected: false },
      { x: 620, y: 355, collected: false },
      { x: 80,  y: 255, collected: false },
      { x: 400, y: 255, collected: false },
      { x: 700, y: 255, collected: false },
      { x: 260, y: 165, collected: false },
      { x: 520, y: 165, collected: false }
    ],
    corns: [
      { x: 400, y: 76,  collected: false },
      { x: 200, y: 546, collected: false }
    ]
  },

  // === NÍVEL 9: O MOINHO VERTICAL ===
  {
    name: "NÍVEL 09: O MOINHO VERTICAL",
    platforms: [
      { x: 30, y: 560, w: 740, h: 12 },
      { x: 40,  y: 470, w: 250, h: 10 },
      { x: 360, y: 470, w: 320, h: 10 },
      { x: 120, y: 380, w: 340, h: 10 },
      { x: 530, y: 380, w: 230, h: 10 },
      { x: 40,  y: 290, w: 260, h: 10 },
      { x: 370, y: 290, w: 320, h: 10 },
      { x: 120, y: 200, w: 330, h: 10 },
      { x: 520, y: 200, w: 240, h: 10 },
      { x: 200, y: 110, w: 400, h: 10 }
    ],
    ladders: [
      { x: 100, y: 470, w: 24, h: 90 },
      { x: 460, y: 470, w: 24, h: 90 },
      { x: 220, y: 380, w: 24, h: 90 },
      { x: 620, y: 380, w: 24, h: 90 },
      { x: 140, y: 290, w: 24, h: 90 },
      { x: 500, y: 290, w: 24, h: 90 },
      { x: 260, y: 200, w: 24, h: 90 },
      { x: 660, y: 200, w: 24, h: 90 },
      { x: 350, y: 110, w: 24, h: 90 },
      { x: 450, y: 110, w: 24, h: 90 }
    ],
    elevators: [
      { x: 700, y: 500, w: 56, h: 12, vy: -75, type: "up", minY: 100, maxY: 550 }
    ],
    kennel: { x: 40, y: 222, w: 68, h: 68 },
    harrys: [
      { x: 160, y: 470 - 32, dir: 1 },
      { x: 480, y: 380 - 32, dir: -1 },
      { x: 200, y: 290 - 32, dir: 1 },
      { x: 580, y: 200 - 32, dir: -1 }
    ],
    eggs: [
      { x: 60,  y: 535, collected: false },
      { x: 550, y: 535, collected: false },
      { x: 180, y: 445, collected: false },
      { x: 600, y: 445, collected: false },
      { x: 240, y: 355, collected: false },
      { x: 420, y: 355, collected: false },
      { x: 700, y: 355, collected: false },
      { x: 100, y: 265, collected: false },
      { x: 560, y: 265, collected: false },
      { x: 320, y: 175, collected: false },
      { x: 300, y: 85,  collected: false },
      { x: 500, y: 85,  collected: false }
    ],
    corns: [
      { x: 600, y: 176, collected: false },
      { x: 250, y: 546, collected: false }
    ]
  },

  // === NÍVEL 10: O GRANDE ARMAZÉM REAL ===
  {
    name: "NÍVEL 10: O GRANDE ARMAZÉM REAL",
    platforms: [
      { x: 30,  y: 560, w: 310, h: 12 },
      { x: 426, y: 560, w: 344, h: 12 },
      { x: 40,  y: 470, w: 290, h: 10 },
      { x: 426, y: 470, w: 334, h: 10 },
      { x: 80,  y: 380, w: 250, h: 10 },
      { x: 426, y: 380, w: 300, h: 10 },
      { x: 40,  y: 280, w: 290, h: 10 },
      { x: 426, y: 280, w: 334, h: 10 },
      { x: 60,  y: 190, w: 270, h: 10 },
      { x: 426, y: 190, w: 270, h: 10 },
      { x: 140, y: 100, w: 190, h: 10 },
      { x: 426, y: 100, w: 230, h: 10 }
    ],
    ladders: [
      { x: 100, y: 470, w: 24, h: 90 },
      { x: 680, y: 470, w: 24, h: 90 },
      { x: 180, y: 380, w: 24, h: 90 },
      { x: 580, y: 380, w: 24, h: 90 },
      { x: 120, y: 280, w: 24, h: 100 },
      { x: 640, y: 280, w: 24, h: 100 },
      { x: 220, y: 190, w: 24, h: 90 },
      { x: 520, y: 190, w: 24, h: 90 },
      { x: 260, y: 100, w: 24, h: 90 },
      { x: 480, y: 100, w: 24, h: 90 }
    ],
    elevators: [
      { x: 352, y: 530, w: 58, h: 12, vy: -75, type: "up", minY: 60, maxY: 550 },
      { x: 352, y: 290, w: 58, h: 12, vy: -75, type: "up", minY: 60, maxY: 550 }
    ],
    kennel: { x: 50, y: 122, w: 68, h: 68 },
    harrys: [
      { x: 160, y: 470 - 32, dir: 1 },
      { x: 600, y: 470 - 32, dir: -1 },
      { x: 200, y: 280 - 32, dir: -1 },
      { x: 560, y: 190 - 32, dir: 1 }
    ],
    eggs: [
      { x: 60,  y: 535, collected: false },
      { x: 720, y: 535, collected: false },
      { x: 160, y: 445, collected: false },
      { x: 620, y: 445, collected: false },
      { x: 120, y: 355, collected: false },
      { x: 680, y: 355, collected: false },
      { x: 80,  y: 255, collected: false },
      { x: 600, y: 255, collected: false },
      { x: 200, y: 165, collected: false },
      { x: 500, y: 165, collected: false },
      { x: 200, y: 75,  collected: false },
      { x: 550, y: 75,  collected: false }
    ],
    corns: [
      { x: 280, y: 446, collected: false },
      { x: 480, y: 446, collected: false },
      { x: 220, y: 76,  collected: false }
    ]
  }
];

// --- JOGADOR: PIU (A GALINHA) ---
class ChickenPlayer {
  constructor() {
    this.reset();
  }

  reset() {
    this.w = 26;
    this.h = 28;
    this.x = 240;
    this.y = 532;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = false;
    this.isClimbing = false;
    this.currentLadder = null;
    this.walkAnimTimer = 0;
    this.walkFrame = 0;
    this.ridingElevator = null;
  }

  update(dt, platforms, ladders, elevators) {
    const currentSpeed = PIU_SPEED;
    const footY = this.y + this.h;
    const inLadderX = (l) => (this.x + this.w * 0.7 > l.x && this.x + this.w * 0.3 < l.x + l.w);

    // 1. MODO DE ESCADA (TREPAR / DESCER)
    if (this.isClimbing && this.currentLadder) {
      const l = this.currentLadder;

      if (keys.up) {
        this.vy = -CLIMB_SPEED;
        this.x += (l.x + (l.w - this.w) / 2 - this.x) * 0.3;

        // Chegou ao topo da escada?
        if (this.y + this.h <= l.y + 4) {
          this.y = l.y - this.h;
          this.isClimbing = false;
          this.isGrounded = true;
          this.vy = 0;
          this.currentLadder = null;
        }
      } else if (keys.down) {
        this.vy = CLIMB_SPEED;
        this.x += (l.x + (l.w - this.w) / 2 - this.x) * 0.3;

        // Chegou à base da escada?
        if (this.y + this.h >= l.y + l.h) {
          this.y = (l.y + l.h) - this.h;
          this.isClimbing = false;
          this.isGrounded = true;
          this.vy = 0;
          this.currentLadder = null;
        }
      } else {
        this.vy = 0;
      }

      // DESEMBARQUE EM PISOS INTERMÉDIOS (Escadas que servem múltiplos níveis):
      // Se a Piu estiver a meio de uma escada longa e o jogador carregar para a Esquerda ou Direita
      // junto a uma viga que cruza a escada, ela desembarca nessa viga!
      if (keys.left || keys.right) {
        const lateralDir = keys.left ? -1 : 1;
        this.facing = lateralDir;

        const interPlat = platforms.find(p => 
          Math.abs(footY - p.y) <= 10 &&
          (lateralDir < 0 ? (this.x > p.x && this.x <= p.x + p.w + 12) : (this.x + this.w >= p.x - 12 && this.x + this.w < p.x + p.w))
        );

        if (interPlat) {
          this.y = interPlat.y - this.h;
          this.isClimbing = false;
          this.isGrounded = true;
          this.currentLadder = null;
          this.vy = 0;
          this.x += lateralDir * 6;
        } else {
          // Ligeiro deslocamento lateral
          this.x += lateralDir * currentSpeed * 0.5 * dt;
        }
      }

      // Se sair completamente fora da escada na horizontal, solta a escada
      if (this.x + this.w * 0.8 < l.x || this.x + this.w * 0.2 > l.x + l.w) {
        this.isClimbing = false;
        this.currentLadder = null;
      }

      // Saltar para fora da escada
      if (keys.jump) {
        this.isClimbing = false;
        this.currentLadder = null;
        this.vy = PIU_JUMP;
        audio.jump();
      }
    } else {
      // 2. FORA DA ESCADA: VERIFICAR SE QUER ENTRAR PARA SUBIR OU DESCER
      if (keys.down) {
        const ladderToDescend = ladders.find(l => 
          inLadderX(l) && (
            Math.abs(footY - l.y) <= 12 || 
            (footY > l.y && this.y < l.y + l.h)
          )
        );

        if (ladderToDescend) {
          this.isClimbing = true;
          this.currentLadder = ladderToDescend;
          this.x = ladderToDescend.x + (ladderToDescend.w - this.w) / 2;
          if (footY <= ladderToDescend.y + 4) {
            this.y = ladderToDescend.y - this.h + 8;
          }
          this.vy = CLIMB_SPEED;
          this.isGrounded = false;
        }
      } else if (keys.up) {
        const ladderToClimb = ladders.find(l => 
          inLadderX(l) && (
            Math.abs(footY - (l.y + l.h)) <= 12 ||
            (this.y + this.h > l.y && this.y < l.y + l.h)
          )
        );

        if (ladderToClimb) {
          this.isClimbing = true;
          this.currentLadder = ladderToClimb;
          this.x = ladderToClimb.x + (ladderToClimb.w - this.w) / 2;
          this.vy = -CLIMB_SPEED;
          this.isGrounded = false;
        }
      }

      // Se não está na escada, movimento normal
      if (!this.isClimbing) {
        this.vx = 0;
        if (keys.left) {
          this.vx = -currentSpeed;
          this.facing = -1;
        }
        if (keys.right) {
          this.vx = currentSpeed;
          this.facing = 1;
        }

        this.vy += GRAVITY * dt;

        if (keys.jump && this.isGrounded) {
          this.vy = PIU_JUMP;
          this.isGrounded = false;
          this.ridingElevator = null;
          audio.jump();
        }
      }
    }

    // Animação de corrida
    if (Math.abs(this.vx) > 10 && this.isGrounded) {
      this.walkAnimTimer += dt * 12;
      this.walkFrame = Math.floor(this.walkAnimTimer) % 2;
    } else {
      this.walkFrame = 0;
    }

    // Atualização de posição X
    this.x += this.vx * dt;
    if (this.x < 10) this.x = 10;
    if (this.x + this.w > CANVAS_WIDTH - 10) this.x = CANVAS_WIDTH - 10 - this.w;

    // Atualização de posição Y
    const prevY = this.y;
    this.y += this.vy * dt;

    // Colisão com Plataformas e Elevadores quando NÃO está a trepar escada
    if (!this.isClimbing) {
      this.isGrounded = false;
      const feetPrev = prevY + this.h;
      const feetCurr = this.y + this.h;

      // A. Aterrar em Vigas Estáticas (Jump-Through)
      if (this.vy >= 0) {
        for (const p of platforms) {
          if (this.x + this.w * 0.8 > p.x && this.x + this.w * 0.2 < p.x + p.w) {
            if (feetPrev <= p.y + 6 && feetCurr >= p.y) {
              this.y = p.y - this.h;
              this.vy = 0;
              this.isGrounded = true;
              this.ridingElevator = null;
              break;
            }
          }
        }
      }

      // B. Aterrar e Andar em Elevadores Verticais (Nível 3)
      if (elevators && elevators.length > 0 && this.vy >= 0) {
        for (const el of elevators) {
          if (this.x + this.w * 0.7 > el.x && this.x + this.w * 0.3 < el.x + el.w) {
            if (feetPrev <= el.y + 10 && feetCurr >= el.y - 2) {
              this.y = el.y - this.h;
              this.vy = 0;
              this.isGrounded = true;
              this.ridingElevator = el;
              break;
            }
          }
        }
      }

      // Se estiver a andar num elevador, acompanha o seu movimento contínuo
      if (this.ridingElevator && this.isGrounded) {
        this.y = this.ridingElevator.y - this.h;
        // Se sair fora da largura do elevador, cai
        if (this.x + this.w * 0.7 < this.ridingElevator.x || this.x + this.w * 0.3 > this.ridingElevator.x + this.ridingElevator.w) {
          this.ridingElevator = null;
          this.isGrounded = false;
        }
      }
    }

        // --- REGRAS DE ELEVADOR & POÇO (NÍVEL 3) ---
    const hasElevatorShaft = (elevators && elevators.length > 0);
    const inShaftColumn = (this.x + this.w * 0.5 > 335 && this.x + this.w * 0.5 < 435);

    // A. Queda no poço do elevador (Nível 3): qualquer queda no vão entre as plataformas ou abaixo do chão tira a vida!
    if (hasElevatorShaft) {
      const midX = this.x + this.w * 0.5;
      const onLeftGround = (midX >= 25 && midX <= 338);
      const onRightGround = (midX >= 428 && midX <= 775);

      if ((!onLeftGround && !onRightGround && (this.y + this.h >= 560)) || (this.y > 572)) {
        this.ridingElevator = null;
        triggerLifeLost();
        return;
      }
    }

    // B. Chão de segurança para níveis normais
    if (this.y + this.h > 572) {
      this.y = 572 - this.h;
      this.vy = 0;
      this.isGrounded = true;
      this.ridingElevator = null;
    }

    // C. Esmagamento contra o teto ao subir no elevador (Nível 3): perde a vida!
    if (hasElevatorShaft && (this.ridingElevator || inShaftColumn)) {
      if (this.y <= 60) {
        this.ridingElevator = null;
        triggerLifeLost();
        return;
      }
    }
  }

  draw(c) {
    c.save();
    c.translate(this.x + this.w / 2, this.y + this.h / 2);
    c.scale(this.facing, 1);

    c.fillStyle = "#f5f5f5";
    c.beginPath();
    c.ellipse(-1, 2, 10, 8, 0, 0, Math.PI * 2);
    c.fill();

    c.beginPath();
    c.arc(5, -4, 6, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#e53935";
    c.beginPath();
    c.arc(4, -10, 3, 0, Math.PI * 2);
    c.arc(7, -9, 2.5, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#ffb300";
    c.beginPath();
    c.moveTo(10, -5);
    c.lineTo(15, -3);
    c.lineTo(10, -1);
    c.closePath();
    c.fill();

    c.fillStyle = "#000";
    c.fillRect(6, -6, 2, 2);

    c.fillStyle = "#e0e0e0";
    if (!this.isGrounded && !this.isClimbing) {
      c.beginPath();
      c.ellipse(-3, -1, 7, 4, -0.4, 0, Math.PI * 2);
      c.fill();
    } else {
      c.beginPath();
      c.ellipse(-4, 3, 6, 4, 0.2, 0, Math.PI * 2);
      c.fill();
    }

    c.strokeStyle = "#fb8c00";
    c.lineWidth = 2;
    const legOffset = (this.walkFrame === 1) ? 3 : -2;
    c.beginPath();
    c.moveTo(-2, 10);
    c.lineTo(-2 + legOffset, 14);
    c.moveTo(4, 10);
    c.lineTo(4 - legOffset, 14);
    c.stroke();

    c.restore();
  }
}

// --- INIMIGO: HENHOUSE HARRY & OS SEUS AJUDANTES ---
class FarmerHarry {
  constructor(x, y, dir = 1) {
    this.w = 26;
    this.h = 32;
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.speed = 72;
    this.climbSpeed = 60;
    this.facing = dir;
    this.vx = this.speed * dir;
    this.vy = 0;
    this.isClimbing = false;
    this.climbDir = 0;
    this.currentLadder = null;
    this.ladderCooldown = 0;
    this.animTimer = 0;
    this.frame = 0;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.facing = 1;
    this.vx = this.speed;
    this.vy = 0;
    this.isClimbing = false;
    this.climbDir = 0;
    this.currentLadder = null;
    this.ladderCooldown = 0;
  }

  update(dt, platforms, ladders) {
    this.animTimer += dt * 8;
    this.frame = Math.floor(this.animTimer) % 2;

    if (this.ladderCooldown > 0) {
      this.ladderCooldown -= dt;
    }

    if (this.isClimbing && this.currentLadder) {
      this.y += this.climbDir * this.climbSpeed * dt;

      // Subir
      if (this.climbDir < 0) {
        if (this.y + this.h <= this.currentLadder.y + 4) {
          this.y = this.currentLadder.y - this.h;
          this.exitLadder(platforms);
        }
      } 
      // Descer
      else if (this.climbDir > 0) {
        if (this.y + this.h >= this.currentLadder.y + this.currentLadder.h - 4) {
          this.y = this.currentLadder.y + this.currentLadder.h - this.h;
          this.exitLadder(platforms);
        }
      }

      // Possibilidade de sair em pisos intermédios em escadas compridas
      if (this.isClimbing && Math.random() < 0.03) {
        const footY = this.y + this.h;
        const interPlat = platforms.find(p => Math.abs(footY - p.y) < 8 && this.x + this.w > p.x && this.x < p.x + p.w);
        if (interPlat) {
          this.y = interPlat.y - this.h;
          this.exitLadder(platforms);
        }
      }
    } else {
      this.x += this.vx * dt;

      const footY = this.y + this.h;
      let curPlatform = platforms.find(p => 
        Math.abs(footY - p.y) < 6 &&
        this.x + this.w * 0.8 > p.x && 
        this.x + this.w * 0.2 < p.x + p.w
      );

      // Inverter nas bordas da plataforma (não cai no vazio nem anda de elevador)
      if (curPlatform) {
        if (this.x <= curPlatform.x + 2 && this.vx < 0) {
          this.vx = this.speed;
          this.facing = 1;
        } else if (this.x + this.w >= curPlatform.x + curPlatform.w - 2 && this.vx > 0) {
          this.vx = -this.speed;
          this.facing = -1;
        }
      } else {
        this.vx = -this.vx;
        this.facing = this.vx > 0 ? 1 : -1;
        this.x += this.vx * dt * 2;
      }

      // Cruzamento de escadas: oportunidade de subir ou descer aleatoriamente
      if (this.ladderCooldown <= 0) {
        const farmerCenterX = this.x + this.w / 2;

        for (const l of ladders) {
          const inLadderX = farmerCenterX >= l.x - 6 && farmerCenterX <= l.x + l.w + 6;
          if (!inLadderX) continue;

          const canGoUp = Math.abs(footY - (l.y + l.h)) < 12 || (l.multiTier && footY > l.y + 20 && footY <= l.y + l.h);
          const canGoDown = Math.abs(footY - l.y) < 12 || (l.multiTier && footY >= l.y && footY < l.y + l.h - 20);

          if (canGoUp || canGoDown) {
            if (Math.random() < 0.55) {
              let chosenDir = 0;
              if (canGoUp && canGoDown) {
                chosenDir = Math.random() < 0.5 ? -1 : 1;
              } else if (canGoUp) {
                chosenDir = -1;
              } else {
                chosenDir = 1;
              }

              this.isClimbing = true;
              this.currentLadder = l;
              this.climbDir = chosenDir;
              this.x = l.x + (l.w - this.w) / 2;
              this.vx = 0;
              this.vy = chosenDir * this.climbSpeed;
              break;
            } else {
              this.ladderCooldown = 1.0;
            }
          }
        }
      }
    }
  }

  exitLadder(platforms) {
    this.isClimbing = false;
    this.currentLadder = null;
    this.climbDir = 0;
    this.vy = 0;
    this.ladderCooldown = 1.4;

    const footY = this.y + this.h;
    const plat = platforms.find(p => Math.abs(footY - p.y) < 8 && this.x + this.w > p.x && this.x < p.x + p.w);
    if (plat) {
      if (this.x - plat.x < 12) {
        this.facing = 1;
      } else if ((plat.x + plat.w) - (this.x + this.w) < 12) {
        this.facing = -1;
      } else {
        this.facing = Math.random() < 0.5 ? 1 : -1;
      }
    } else {
      this.facing = Math.random() < 0.5 ? 1 : -1;
    }
    this.vx = this.facing * this.speed;
  }

  draw(c) {
    c.save();
    c.translate(this.x + this.w / 2, this.y + this.h / 2);

    if (this.isClimbing) {
      // De costas na escada
      c.fillStyle = "#8d6e63";
      c.fillRect(-7, -22, 14, 8);
      c.fillStyle = "#d7ccc8";
      c.fillRect(-12, -15, 24, 4);

      c.fillStyle = "#4e342e";
      c.fillRect(-6, -11, 12, 4);

      c.fillStyle = "#1e88e5";
      c.fillRect(-7, -7, 14, 17);
      c.fillStyle = "#ffb300";
      c.fillRect(-5, -6, 2, 2);
      c.fillRect(3, -6, 2, 2);

      c.fillStyle = "#3e2723";
      const climbFrame = Math.floor(this.animTimer * 1.5) % 2;
      if (climbFrame === 0) {
        c.fillRect(-8, 10, 5, 5);
        c.fillRect(3, 7, 5, 5);
        c.fillStyle = "#ffcc80";
        c.fillRect(-10, -5, 3, 5);
        c.fillRect(7, -8, 3, 5);
      } else {
        c.fillRect(-8, 7, 5, 5);
        c.fillRect(3, 10, 5, 5);
        c.fillStyle = "#ffcc80";
        c.fillRect(-10, -8, 3, 5);
        c.fillRect(7, -5, 3, 5);
      }
    } else {
      // De perfil a caminhar
      c.scale(this.facing, 1);

      c.fillStyle = "#d7ccc8";
      c.fillRect(-12, -16, 24, 4);
      c.fillStyle = "#8d6e63";
      c.fillRect(-7, -22, 14, 6);

      c.fillStyle = "#ffcc80";
      c.fillRect(-6, -12, 12, 10);
      c.fillStyle = "#4e342e";
      c.fillRect(1, -7, 6, 3);
      c.fillStyle = "#000";
      c.fillRect(3, -10, 2, 2);

      c.fillStyle = "#1e88e5";
      c.fillRect(-7, -2, 14, 12);

      c.fillStyle = "#3e2723";
      const leg = (this.frame === 0) ? 3 : -3;
      c.fillRect(-6 + leg, 10, 5, 6);
      c.fillRect(1 - leg, 10, 5, 6);
    }

    c.restore();
  }
}

// --- O CÃO DE GUARDA (BOBI / REX) ---
class GuardDog {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.w = 34;
    this.h = 24;
    this.speed = 150;
    this.climbSpeed = 95;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.active = false;
    this.isClimbing = false;
    this.climbDir = 0;
    this.currentLadder = null;
    this.ladderCooldown = 0;
    this.animTimer = 0;
    this.frame = 0;
    this.barkTimer = 0;
  }

  reset(x, y) {
    if (x !== undefined && y !== undefined) {
      this.startX = x;
      this.startY = y;
    }
    this.x = this.startX;
    this.y = this.startY;
    this.active = false;
    this.isClimbing = false;
    this.climbDir = 0;
    this.currentLadder = null;
    this.ladderCooldown = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.barkTimer = 0;
  }

  release() {
    this.active = true;
    this.isClimbing = false;
    this.currentLadder = null;
    this.vy = 0;
    this.vx = 140;
    audio.dogBark();
  }

  update(dt, platforms, ladders, piu) {
    if (!this.active) return;

    if (this.ladderCooldown > 0) {
      this.ladderCooldown -= dt;
    }

    // Ladrar periodicamente durante a perseguição
    this.barkTimer += dt;
    if (this.barkTimer > 4.5) {
      this.barkTimer = 0;
      audio.dogBark();
    }

    this.animTimer += dt * (this.isClimbing ? 8 : 14);
    this.frame = Math.floor(this.animTimer) % 2;

    // 1. MODO DE TREPAR / DESCER ESCADA
    if (this.isClimbing && this.currentLadder) {
      const l = this.currentLadder;
      this.y += this.climbDir * this.climbSpeed * dt;
      this.x += (l.x + (l.w - this.w) / 2 - this.x) * 0.25;

      const footY = this.y + this.h;
      const piuFootY = piu.y + piu.h;

      // Se estiver a subir
      if (this.climbDir < 0) {
        if (this.y + this.h <= l.y + 4) {
          this.y = l.y - this.h;
          this.isClimbing = false;
          this.currentLadder = null;
          this.ladderCooldown = 0.5;
          this.vy = 0;
        }
      }
      // Se estiver a descer
      else if (this.climbDir > 0) {
        if (this.y + this.h >= l.y + l.h - 4) {
          this.y = l.y + l.h - this.h;
          this.isClimbing = false;
          this.currentLadder = null;
          this.ladderCooldown = 0.5;
          this.vy = 0;
        }
      }

      // Desembarque em plataformas intermédias se a Piu estiver nesse nível
      if (this.isClimbing && Math.abs(footY - piuFootY) < 14) {
        const interPlat = platforms.find(p => Math.abs(footY - p.y) < 8 && this.x + this.w * 0.7 > p.x && this.x + this.w * 0.3 < p.x + p.w);
        if (interPlat) {
          this.y = interPlat.y - this.h;
          this.isClimbing = false;
          this.currentLadder = null;
          this.ladderCooldown = 0.5;
          this.vy = 0;
        }
      }
      return;
    }

    // 2. MODO DE CAMINHADA / CORRIDA / QUEDA
    const footY = this.y + this.h;
    const piuFootY = piu.y + piu.h;
    const dy = piuFootY - footY;
    const dx = (piu.x + piu.w / 2) - (this.x + this.w / 2);

    // Plataforma atual onde o Bobi se apoia
    const curPlat = platforms.find(p => 
      Math.abs(footY - p.y) <= 8 && 
      this.x + this.w * 0.7 > p.x && 
      this.x + this.w * 0.3 < p.x + p.w
    );

    // Decisão de IA de Navegação:
    // A. Piu está NO MESMO PISO (diferença vertical < 28px):
    if (Math.abs(dy) < 28) {
      if (dx > 6) {
        this.vx = this.speed;
        this.facing = 1;
      } else if (dx < -6) {
        this.vx = -this.speed;
        this.facing = -1;
      } else {
        this.vx = 0;
      }
    }
    // B. Piu está num PISO INFERIOR (dy >= 28): O Bobi tem de DESCER!
    else if (dy >= 28) {
      let chosenLadder = null;
      if (curPlat && this.ladderCooldown <= 0) {
        const downLadders = ladders.filter(l => 
          Math.abs(footY - l.y) <= 16 && 
          l.y + l.h > footY + 25 &&
          l.x + l.w > curPlat.x - 12 && 
          l.x < curPlat.x + curPlat.w + 12
        );
        if (downLadders.length > 0) {
          downLadders.sort((a, b) => Math.abs((a.x + a.w/2) - (piu.x + piu.w/2)) - Math.abs((b.x + b.w/2) - (piu.x + piu.w/2)));
          chosenLadder = downLadders[0];
        }
      }

      if (chosenLadder) {
        const ladderMidX = chosenLadder.x + chosenLadder.w / 2;
        const dogMidX = this.x + this.w / 2;
        if (Math.abs(dogMidX - ladderMidX) < 12) {
          this.isClimbing = true;
          this.currentLadder = chosenLadder;
          this.climbDir = 1;
          this.vx = 0;
          this.vy = 0;
          this.x = chosenLadder.x + (chosenLadder.w - this.w) / 2;
          return;
        } else if (dogMidX < ladderMidX) {
          this.vx = this.speed;
          this.facing = 1;
        } else {
          this.vx = -this.speed;
          this.facing = -1;
        }
      } else if (curPlat) {
        // Sem escada nesta viga: corre até à borda e salta/cai para o nível de baixo!
        const targetSide = (piu.x > (curPlat.x + curPlat.w / 2)) ? 1 : -1;
        this.vx = this.speed * targetSide;
        this.facing = targetSide;
      } else {
        // Em queda livre: acelera na direção da Piu
        this.vx = (dx > 0 ? 1 : -1) * 110;
        this.facing = dx > 0 ? 1 : -1;
      }
    }
    // C. Piu está num PISO SUPERIOR (dy < -28): O Bobi tem de SUBIR!
    else {
      let chosenLadder = null;
      if (curPlat && this.ladderCooldown <= 0) {
        const upLadders = ladders.filter(l => 
          Math.abs(footY - (l.y + l.h)) <= 16 && 
          l.x + l.w > curPlat.x - 12 && 
          l.x < curPlat.x + curPlat.w + 12
        );
        if (upLadders.length > 0) {
          upLadders.sort((a, b) => Math.abs((a.x + a.w/2) - (piu.x + piu.w/2)) - Math.abs((b.x + b.w/2) - (piu.x + piu.w/2)));
          chosenLadder = upLadders[0];
        }
      }

      if (chosenLadder) {
        const ladderMidX = chosenLadder.x + chosenLadder.w / 2;
        const dogMidX = this.x + this.w / 2;
        if (Math.abs(dogMidX - ladderMidX) < 12) {
          this.isClimbing = true;
          this.currentLadder = chosenLadder;
          this.climbDir = -1;
          this.vx = 0;
          this.vy = 0;
          this.x = chosenLadder.x + (chosenLadder.w - this.w) / 2;
          return;
        } else if (dogMidX < ladderMidX) {
          this.vx = this.speed;
          this.facing = 1;
        } else {
          this.vx = -this.speed;
          this.facing = -1;
        }
      } else {
        this.vx = (dx > 0 ? 1 : -1) * this.speed;
        this.facing = dx > 0 ? 1 : -1;
      }
    }

    // Movimento físico e gravidade
    this.x += this.vx * dt;
    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;

    // Aterrar nas plataformas
    if (this.vy >= 0) {
      for (const p of platforms) {
        if (this.x + this.w * 0.7 > p.x && this.x + this.w * 0.3 < p.x + p.w) {
          const feet = this.y + this.h;
          if (feet >= p.y && feet <= p.y + 16) {
            this.y = p.y - this.h;
            this.vy = 0;
            break;
          }
        }
      }
    }

    // Limites laterais da arena
    if (this.x < 24) { this.x = 24; this.vx = Math.abs(this.vx); }
    if (this.x + this.w > 776) { this.x = 776 - this.w; this.vx = -Math.abs(this.vx); }

    // Chão de segurança
    if (this.y + this.h > 572) {
      this.y = 572 - this.h;
      this.vy = 0;
    }
  }

  draw(c) {
    if (!this.active) return;
    c.save();
    c.translate(this.x + this.w / 2, this.y + this.h / 2);

    if (this.isClimbing) {
      // Bobi a subir/descer na escada
      c.fillStyle = "#8d6e63";
      c.fillRect(-10, -10, 20, 18);
      c.fillStyle = "#6d4c41";
      c.fillRect(-8, -14, 16, 6);
      c.fillStyle = "#4e342e";
      c.fillRect(-10, -16, 4, 5);
      c.fillRect(6, -16, 4, 5);
      const climbShift = (this.frame === 0) ? 3 : -3;
      c.fillStyle = "#4e342e";
      c.fillRect(-12, -6 + climbShift, 4, 5);
      c.fillRect(8, -6 - climbShift, 4, 5);
      c.fillRect(-11, 6 - climbShift, 4, 6);
      c.fillRect(7, 6 + climbShift, 4, 6);
    } else {
      c.scale(this.facing, 1);

      c.fillStyle = "#8d6e63";
      c.fillRect(-12, -6, 24, 12);

      c.fillStyle = "#6d4c41";
      c.fillRect(4, -12, 12, 11);
      c.fillStyle = "#ff5252";
      c.fillRect(14, -6, 4, 3);

      c.fillStyle = "#4e342e";
      c.fillRect(2, -14, 5, 7);

      c.fillStyle = "#ff1744";
      c.fillRect(10, -10, 3, 3);

      c.fillStyle = "#4e342e";
      c.fillRect(-16, -10 + (this.frame * 4), 5, 4);

      c.fillStyle = "#4e342e";
      const run = (this.frame === 0) ? 4 : -4;
      c.fillRect(-10 + run, 6, 4, 6);
      c.fillRect(6 - run, 6, 4, 6);
    }
    c.restore();
  }
}

// --- INSTÂNCIAS DE JOGO ATUAIS ---
let currentLevel = levels[0];
const piu = new ChickenPlayer();
let harrys = [];
let guardDog = new GuardDog(levels[0].kennel.x + 10, levels[0].kennel.y + 20);

function loadLevel(idx) {
  currentLevelIdx = idx % levels.length;
  currentLevel = levels[currentLevelIdx];

  // Recriar ovos e milhos
  currentLevel.eggs.forEach(e => e.collected = false);
  currentLevel.corns.forEach(c => c.collected = false);

  // Recriar Agricultores para este nível
  harrys = currentLevel.harrys.map(h => new FarmerHarry(h.x, h.y, h.dir));

  // Resetar cão de guarda na casota deste nível
  guardDog.reset(currentLevel.kennel.x + 10, currentLevel.kennel.y + 20);

  // Resetar Piu
  piu.reset();

  timeRemaining = 999;
  timerFrozenRemaining = 0;
  dogReleased = false;
  bonus = 3000 + currentLevelIdx * 500;
}

// --- DESENHO DE ELEMENTOS RETRO ---
function drawPlatform(c, p) {
  c.fillStyle = "#1565c0";
  c.fillRect(p.x, p.y, p.w, p.h);

  c.fillStyle = "#64b5f6";
  c.fillRect(p.x, p.y, p.w, 2);
  c.fillRect(p.x, p.y + p.h - 2, p.w, 2);

  for (let x = p.x + 4; x < p.x + p.w - 4; x += 12) {
    c.fillRect(x, p.y + 2, 2, p.h - 4);
  }
}

function drawLadder(c, l) {
  c.fillStyle = l.multiTier ? "#ffca28" : "#ffb300";
  c.fillRect(l.x, l.y, 4, l.h);
  c.fillRect(l.x + l.w - 4, l.y, 4, l.h);

  for (let y = l.y + 8; y < l.y + l.h; y += 12) {
    c.fillRect(l.x + 3, y, l.w - 6, 3);
  }
}

function drawElevator(c, el) {
  // Plataforma Móvel do Elevador (SÓ SOBE)
  c.fillStyle = "#ff6f00";
  c.fillRect(el.x, el.y, el.w, el.h);

  c.fillStyle = "#ffe082";
  c.fillRect(el.x, el.y, el.w, 2);
  c.fillRect(el.x, el.y + el.h - 2, el.w, 2);

  c.fillStyle = "#ffffff";
  c.font = "8px 'Press Start 2P', monospace";
  c.textAlign = "center";
  c.fillText("▲", el.x + el.w / 2, el.y + 9);

  // Desenhar a viga de teto com aviso de PERIGO DE ESMAGAMENTO no cimo do poço
  c.fillStyle = "#d32f2f";
  c.fillRect(el.x - 4, 52, el.w + 8, 8);
  c.fillStyle = "#ffeb3b";
  for (let sx = el.x - 2; sx < el.x + el.w + 4; sx += 8) {
    c.fillRect(sx, 52, 4, 8);
  }
}

function drawKennel(c, k, dogReleased) {
  c.save();
  c.fillStyle = "#d32f2f";
  c.beginPath();
  c.moveTo(k.x - 4, k.y + 24);
  c.lineTo(k.x + k.w / 2, k.y);
  c.lineTo(k.x + k.w + 4, k.y + 24);
  c.closePath();
  c.fill();

  c.fillStyle = "#795548";
  c.fillRect(k.x, k.y + 24, k.w, k.h - 24);

  c.fillStyle = "#fff8e1";
  c.fillRect(k.x + 12, k.y + 26, k.w - 24, 10);
  c.fillStyle = "#000";
  c.font = "7px 'Press Start 2P', monospace";
  c.textAlign = "center";
  c.fillText("BOBI", k.x + k.w / 2, k.y + 34);

  if (dogReleased) {
    c.fillStyle = "#1a0d00";
    c.fillRect(k.x + 14, k.y + 40, k.w - 28, k.h - 40);
  } else {
    c.fillStyle = "#111";
    c.fillRect(k.x + 14, k.y + 40, k.w - 28, k.h - 40);

    if (Math.floor(Date.now() / 400) % 2 === 0) {
      c.fillStyle = "#ff1744";
      c.fillRect(k.x + 22, k.y + 48, 4, 3);
      c.fillRect(k.x + 36, k.y + 48, 4, 3);
    }

    c.strokeStyle = "#b0bec5";
    c.lineWidth = 2;
    for (let gx = k.x + 18; gx < k.x + k.w - 14; gx += 8) {
      c.beginPath();
      c.moveTo(gx, k.y + 40);
      c.lineTo(gx, k.y + k.h);
      c.stroke();
    }
  }
  c.restore();
}

function drawEgg(c, x, y) {
  c.save();
  c.fillStyle = "#fff9c4";
  c.beginPath();
  c.ellipse(x + 10, y + 12, 9, 12, 0, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = "#ffffff";
  c.beginPath();
  c.ellipse(x + 8, y + 8, 3, 5, -0.3, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawCorn(c, x, y) {
  c.save();
  c.fillStyle = "#ffd600";
  c.beginPath();
  c.moveTo(x + 8, y);
  c.lineTo(x + 16, y + 14);
  c.lineTo(x, y + 14);
  c.closePath();
  c.fill();

  c.fillStyle = "#ff6d00";
  c.fillRect(x + 6, y + 8, 3, 3);
  c.fillRect(x + 10, y + 11, 2, 2);
  c.restore();
}

// --- ECRÃ 1: MENU DE ENTRADA RETRO (Fiel ao Arcade 1984 - Imagens 1 e 3) ---
function drawTitleScreen(c) {
  c.fillStyle = "#000000";
  c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Grande Logótipo no Topo
  c.font = "32px 'Press Start 2P', monospace";
  c.textAlign = "center";
  c.fillStyle = "#d4e157";
  c.fillText("A REVOLTA DAS GALINHAS", CANVAS_WIDTH / 2, 85);

  // Painel Esquerdo: Créditos & Opções
  c.textAlign = "left";
  c.font = "11px 'Press Start 2P', monospace";

  c.fillStyle = "#ba68c8";
  c.fillText("(C) 1984 - 2026", 50, 160);
  c.fillText("TRIBUTO JOGOS ARCADE", 50, 190);

  c.fillStyle = "#81c784";
  c.fillText("UM JOGO DE PERICIA", 50, 240);
  c.fillText("PARA 1 JOGADOR", 50, 270);

  c.fillStyle = "#b0bec5";
  c.fillText("Dedicado aos classicos:", 50, 330);
  c.fillStyle = "#e0e0e0";
  c.fillText("Arcade 8-Bit (1984)", 50, 355);

  c.fillStyle = "#ffb74d";
  c.fillText("CONTROLOS:", 50, 410);
  c.font = "9px 'Press Start 2P', monospace";
  c.fillStyle = "#ffffff";
  c.fillText("MOVER:      [O/P] ou [◄/►]", 50, 435);
  c.fillText("ESCADAS:    [Q/A] ou [▲/▼]", 50, 455);
  c.fillText("SALTAR:     [ESPAÇO] ou TOQUE", 50, 475);

  // Painel Direito: Caixa Azul Clássica dos RECORDES (HIGH SCORES)
  const boxX = 430;
  const boxY = 135;
  const boxW = 330;
  const boxH = 360;

  c.fillStyle = "#282b68";
  c.fillRect(boxX, boxY, boxW, boxH);
  c.strokeStyle = "#5c6bc0";
  c.lineWidth = 3;
  c.strokeRect(boxX, boxY, boxW, boxH);

  c.font = "12px 'Press Start 2P', monospace";
  c.textAlign = "center";
  c.fillStyle = "#ffd54f";
  c.fillText("HIGH SCORES", boxX + boxW / 2, boxY + 35);

  c.textAlign = "left";
  c.font = "10px 'Press Start 2P', monospace";
  const scores = loadHighScores();
  scores.forEach((s, idx) => {
    c.fillStyle = (idx === 0) ? "#00e5ff" : "#ffffff";
    const lineY = boxY + 75 + idx * 36;
    const dots = ".".repeat(Math.max(2, 14 - s.name.length));
    c.fillText(`${s.name}${dots}${String(s.score).padStart(6, "0")}`, boxX + 25, lineY);
  });

  // Rodapé do Menu: Estável, sem piscar e com bastante espaçamento para conforto visual
  c.textAlign = "center";

  // Frase Principal: Ouro suave fixo, sem alternar nem piscar depressa
  c.fillStyle = "#ffeb3b";
  c.font = "12px 'Press Start 2P', monospace";
  c.fillText("★   PRESSIONA [ESPACO] OU TOCA PARA JOGAR   ★", CANVAS_WIDTH / 2, 534);

  // Sub-legenda com espaçamento desafogado
  c.fillStyle = "#80deea";
  c.font = "9px 'Press Start 2P', monospace";
  c.fillText("[I] INSTRUCOES     -     [M] SOM     -     [CRT] SCANLINES", CANVAS_WIDTH / 2, 568);
}

// --- ECRÃ 2: INSTRUÇÕES RETRO (Fiel à Imagem 2 com o texto do GDD) ---
function drawInstructionsScreen(c) {
  c.fillStyle = "#000000";
  c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  c.font = "20px 'Press Start 2P', monospace";
  c.textAlign = "center";
  c.fillStyle = "#d4e157";
  c.fillText("A REVOLTA DAS GALINHAS", CANVAS_WIDTH / 2, 55);

  c.font = "12px 'Press Start 2P', monospace";
  c.fillStyle = "#ba68c8";
  c.fillText("INSTRUCOES & HISTORIA (1984 - 2026)", CANVAS_WIDTH / 2, 85);

  c.textAlign = "left";
  c.font = "9px 'Press Start 2P', monospace";
  c.fillStyle = "#e0e0e0";

  let y = 130;
  const lh = 22;

  c.fillText("Durante decadas, os agricultores da quinta", 50, y); y += lh;
  c.fillText("roubaram os ovos do celeiro nos anos 80.", 50, y); y += lh;
  
  c.fillStyle = "#ffff00";
  c.fillText("AGORA, A PACIÊNCIA DAS GALINHAS ACABOU!", 50, y); y += lh + 6;

  c.fillStyle = "#e0e0e0";
  c.fillText("Guia a destemida Piu pelos celeiros para resgatar", 50, y); y += lh;
  c.fillText("todos os 12 ovos roubados de cada piso.", 50, y); y += lh + 8;

  // Mini-tabela com Sprites
  drawEgg(c, 50, y - 10);
  c.fillStyle = "#ffd54f";
  c.fillText("OVOS: Resgata os 12 ovos para concluir o nivel (+100 pts).", 85, y); y += lh + 6;

  drawCorn(c, 50, y - 8);
  c.fillStyle = "#ffb300";
  c.fillText("MILHO: Bica o milho para CONGELAR O CRONÓMETRO durante 12s!", 85, y); y += lh + 6;

  // Mini Harry
  c.save();
  c.translate(62, y - 2);
  c.fillStyle = "#d7ccc8"; c.fillRect(-8, -12, 16, 3);
  c.fillStyle = "#ffcc80"; c.fillRect(-4, -9, 8, 7);
  c.fillStyle = "#1e88e5"; c.fillRect(-5, -2, 10, 8);
  c.restore();
  c.fillStyle = "#ef5350";
  c.fillText("AGRICULTORES: Nao saltes por cima - eles apanham-te sempre!", 85, y); y += lh + 6;

  // Elevador (Nível 3)
  c.fillStyle = "#ff6f00";
  c.fillRect(50, y - 10, 24, 12);
  c.fillStyle = "#fff";
  c.font = "7px 'Press Start 2P', monospace";
  c.fillText("▲", 62, y);
  c.font = "9px 'Press Start 2P', monospace";
  c.fillStyle = "#4fc3f7";
  c.fillText("ELEVADORES: Só SOBEM! Salta antes do teto ou morres esmagada!", 85, y); y += lh + 6;

  // Cão Bobi
  c.fillStyle = "#8d6e63"; c.fillRect(50, y - 8, 20, 10);
  c.fillStyle = "#ff1744"; c.fillRect(66, y - 8, 3, 3);
  c.fillStyle = "#ff5252";
  c.fillText("CÃO BOBI: Se o TEMPO for a zero, o cão arromba a casota!", 85, y); y += lh + 18;

  // Rodapé
  c.textAlign = "center";
  c.font = "11px 'Press Start 2P', monospace";
  c.fillStyle = "#ffd54f";
  c.fillText("PRESSIONA [ESPAÇO] OU TOCA PARA VOLTAR AO MENU", CANVAS_WIDTH / 2, 555);
}

// --- HUD DO JOGO EM CURSO ---
function drawHUD(c) {
  c.save();
  c.font = "12px 'Press Start 2P', monospace";
  c.fillStyle = "#ffffff";

  c.fillText(`SCORE ${String(score).padStart(6, "0")}`, 40, 26);

  if (timerFrozenRemaining > 0) {
    c.fillStyle = Math.floor(Date.now() / 200) % 2 === 0 ? "#ffd600" : "#ffffff";
    c.fillText(`TEMPO ${String(Math.max(0, Math.floor(timeRemaining))).padStart(3, "0")} [PAUSA]`, 580, 26);
  } else {
    c.fillStyle = "#00e5ff";
    c.fillText(`TEMPO ${String(Math.max(0, Math.floor(timeRemaining))).padStart(3, "0")}`, 640, 26);
  }

  c.fillStyle = "#ffff00";
  c.fillText(`NÍVEL 0${currentLevelIdx + 1}`, 40, 48);

  c.fillStyle = "#ff9100";
  c.fillText(`BÓNUS ${String(Math.floor(bonus)).padStart(4, "0")}`, 320, 48);

  c.fillStyle = "#ffffff";
  c.fillText("VIDAS", 600, 48);
  for (let i = 0; i < lives; i++) {
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(680 + i * 22, 44, 6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ff1744";
    c.fillRect(682 + i * 22, 39, 3, 3);
  }

  if (dogReleased) {
    if (Math.floor(Date.now() / 250) % 2 === 0) {
      c.fillStyle = "#ff1744";
      c.font = "14px 'Press Start 2P', monospace";
      c.textAlign = "center";
      c.fillText("⚠ CÃO SOLTO! FOGE DA CASOTA! ⚠", CANVAS_WIDTH / 2, 80);
    }
  }

  c.restore();
}

// --- LOOP PRINCIPAL DO JOGO ---
let lastTime = 0;

function update(dt) {
  if (gameState !== "PLAYING" || isGamePaused) return;

  // Atualizar Elevadores (Nível 3) - SÓ SOBEM!
  if (currentLevel.elevators && currentLevel.elevators.length > 0) {
    currentLevel.elevators.forEach(el => {
      el.y += el.vy * dt;

      // Se a Piu estiver no elevador e chegar ao teto: MORRE ESMAGADA!
      if (piu.ridingElevator === el) {
        if (el.y <= 85 || piu.y <= 65) {
          piu.ridingElevator = null;
          triggerLifeLost();
          return;
        }
      }

      // Ao chegar ao topo, recicla na base do poço
      if (el.y < el.minY) {
        el.y = el.maxY;
      }
    });
  }

  // Atualizar Tempo & Bónus
  if (timerFrozenRemaining > 0) {
    timerFrozenRemaining -= dt;
  } else if (timeRemaining > 0) {
    timeRemaining -= dt * 8;
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      if (!dogReleased) {
        dogReleased = true;
        guardDog.release();
      }
    }
  }

  if (bonus > 0) {
    bonus = Math.max(0, bonus - dt * 25);
  }

  // Atualizar Piu com suporte a elevadores
  piu.update(dt, currentLevel.platforms, currentLevel.ladders, currentLevel.elevators);

  // Atualizar Agricultores
  harrys.forEach(h => h.update(dt, currentLevel.platforms, currentLevel.ladders));

  // Atualizar Cão de Guarda
  if (dogReleased) {
    guardDog.update(dt, currentLevel.platforms, currentLevel.ladders, piu);
  }

  // Recolha de Ovos (12 por nível)
  let allCollected = true;
  currentLevel.eggs.forEach(egg => {
    if (!egg.collected) {
      allCollected = false;
      if (piu.x + piu.w > egg.x && piu.x < egg.x + 20 &&
          piu.y + piu.h > egg.y && piu.y < egg.y + 24) {
        egg.collected = true;
        score += 100;
        audio.egg();
      }
    }
  });

  // Recolha de Milho (Congelador de Tempo)
  currentLevel.corns.forEach(corn => {
    if (!corn.collected) {
      if (piu.x + piu.w > corn.x && piu.x < corn.x + 16 &&
          piu.y + piu.h > corn.y && piu.y < corn.y + 14) {
        corn.collected = true;
        score += 50;
        timerFrozenRemaining = 12.0; // Congela o relógio durante 12s!
        audio.corn();
      }
    }
  });

  // Condição de Vitória do Nível
  if (allCollected) {
    gameState = "LEVEL_CLEAR";
    score += Math.floor(bonus);
    audio.levelWin();
    setTimeout(() => {
      loadLevel(currentLevelIdx + 1);
      gameState = "PLAYING";
    }, 3500);
    return;
  }

  // Deteção de Colisão com Agricultores (Hitbox Justa e Precisa)
  for (const h of harrys) {
    const overlapX = (piu.x + piu.w * 0.72 > h.x + 3 && piu.x + piu.w * 0.28 < h.x + h.w - 3);

    if (overlapX) {
      // 1. NAS ESCADAS: Só colide se os corpos realmente se tocarem fisicamente!
      // (Se a galinha estiver por baixo do agricultor com espaço entre eles, NÃO perde a vida)
      if (piu.isClimbing || h.isClimbing) {
        const physicalTouchY = (piu.y + piu.h * 0.85 > h.y + 2 && piu.y + piu.h * 0.15 < h.y + h.h - 2);
        if (physicalTouchY) {
          triggerLifeLost();
          break;
        }
      } 
      // 2. NAS PLATAFORMAS:
      else {
        // A. Toque físico direto a caminhar no mesmo nível
        const directTouchY = (piu.y + piu.h * 0.85 > h.y && piu.y + piu.h * 0.15 < h.y + h.h);
        if (directTouchY) {
          triggerLifeLost();
          break;
        }

        // B. Tentativa de saltar por cima no mesmo piso (regra Arcade 1984):
        // Se a Piu tentar passar em salto por cima da cabeça do Harry na mesma plataforma
        const feetDiff = (h.y + h.h) - (piu.y + piu.h);
        if (feetDiff >= 0 && feetDiff < 42) {
          triggerLifeLost();
          break;
        }
      }
    }
  }

  // Deteção de Colisão com Cão de Guarda (Hitbox física justa)
  if (dogReleased && guardDog.active) {
    const dogOverlapX = (piu.x + piu.w * 0.75 > guardDog.x + 3 && piu.x + piu.w * 0.25 < guardDog.x + guardDog.w - 3);
    const dogOverlapY = (piu.y + piu.h * 0.85 > guardDog.y + 2 && piu.y + piu.h * 0.15 < guardDog.y + guardDog.h - 2);
    if (dogOverlapX && dogOverlapY) {
      triggerLifeLost();
    }
  }
}

function triggerLifeLost() {
  gameState = "LOST_LIFE";
  lives--;
  audio.die();

  setTimeout(() => {
    if (lives <= 0) {
      if (checkIfHighScore(score)) {
        gameState = "NEW_RECORD";
        playerNameInput = "";
        audio.levelWin();
        const mobInp = document.getElementById("mobile-name-input");
        if (mobInp) {
          mobInp.value = "";
          mobInp.focus();
        }
      } else {
        gameState = "GAME_OVER";
        setTimeout(() => {
          if (gameState === "GAME_OVER") gameState = "TITLE";
        }, 3500);
      }
    } else {
      piu.reset();
      harrys.forEach(h => h.reset());
      gameState = "PLAYING";
    }
  }, 1600);
}

function drawNewRecordScreen(c) {
  c.fillStyle = "#000000";
  c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Moldura Arcade Central
  const bX = 140, bY = 90, bW = 520, bH = 420;
  c.fillStyle = "#1e1e40";
  c.fillRect(bX, bY, bW, bH);
  c.strokeStyle = "#ffd54f";
  c.lineWidth = 4;
  c.strokeRect(bX, bY, bW, bH);

  // Título com efeito néon pulsante
  c.textAlign = "center";
  c.font = "20px 'Press Start 2P', monospace";
  c.fillStyle = Math.floor(Date.now() / 250) % 2 === 0 ? "#ffff00" : "#ffd54f";
  c.fillText("★ NOVO RECORDE! ★", CANVAS_WIDTH / 2, bY + 60);

  c.font = "12px 'Press Start 2P', monospace";
  c.fillStyle = "#00e5ff";
  c.fillText(`PONTUAÇÃO: ${String(score).padStart(6, "0")}`, CANVAS_WIDTH / 2, bY + 110);

  c.fillStyle = "#ffffff";
  c.font = "10px 'Press Start 2P', monospace";
  c.fillText("CONSEGUISTE ENTRAR NO TOP 7!", CANVAS_WIDTH / 2, bY + 150);
  c.fillText("DIGITA O TEU NOME (MAX 8 LETRAS):", CANVAS_WIDTH / 2, bY + 195);

  // Caixa de Input do Nome
  const inX = 250, inY = bY + 225, inW = 300, inH = 55;
  c.fillStyle = "#0a0a14";
  c.fillRect(inX, inY, inW, inH);
  c.strokeStyle = "#64b5f6";
  c.lineWidth = 2;
  c.strokeRect(inX, inY, inW, inH);

  // Texto digitado com cursor a piscar
  c.font = "22px 'Press Start 2P', monospace";
  c.fillStyle = "#ffeb3b";
  const cursor = Math.floor(Date.now() / 300) % 2 === 0 ? "_" : " ";
  const displayTxt = (playerNameInput + cursor).padEnd(8, " ");
  c.fillText(displayTxt, inX + inW / 2, inY + 38);

  // Botão Retro "GUARDAR"
  const btnX = 270, btnY = bY + 315, btnW = 260, btnH = 45;
  c.fillStyle = "#2e7d32";
  c.fillRect(btnX, btnY, btnW, btnH);
  c.strokeStyle = "#a5d6a7";
  c.lineWidth = 2;
  c.strokeRect(btnX, btnY, btnW, btnH);

  c.fillStyle = "#ffffff";
  c.font = "12px 'Press Start 2P', monospace";
  c.fillText("✔ GUARDAR RECORDE", btnX + btnW / 2, btnY + 28);

  c.fillStyle = "#90a4ae";
  c.font = "8px 'Press Start 2P', monospace";
  c.fillText("CARREGA [ENTER] OU CLICA NO BOTÃO PARA CONCLUIR", CANVAS_WIDTH / 2, bY + 395);
}

function render() {
  if (gameState === "TITLE") {
    drawTitleScreen(ctx);
    return;
  }

  if (gameState === "INSTRUCTIONS") {
    drawInstructionsScreen(ctx);
    return;
  }

  if (gameState === "NEW_RECORD") {
    drawNewRecordScreen(ctx);
    return;
  }

  // Fundo Preto do Jogo
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Vigas e Escadas
  currentLevel.platforms.forEach(p => drawPlatform(ctx, p));
  currentLevel.ladders.forEach(l => drawLadder(ctx, l));

  // Elevadores (Nível 3)
  if (currentLevel.elevators) {
    currentLevel.elevators.forEach(el => drawElevator(ctx, el));
  }

  // Casota do Cão
  drawKennel(ctx, currentLevel.kennel, dogReleased);

  // Ovos e Milho
  currentLevel.eggs.forEach(egg => {
    if (!egg.collected) drawEgg(ctx, egg.x, egg.y);
  });
  currentLevel.corns.forEach(corn => {
    if (!corn.collected) drawCorn(ctx, corn.x, corn.y);
  });

  // Personagens
  harrys.forEach(h => h.draw(ctx));
  guardDog.draw(ctx);
  piu.draw(ctx);

  // HUD
  drawHUD(ctx);

  // Ecrãs de Fim de Nível e Game Over
  if (gameState === "LEVEL_CLEAR") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 200, CANVAS_WIDTH, 200);

    ctx.fillStyle = "#ffeb3b";
    ctx.font = "24px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("NÍVEL CONCLUÍDO!", CANVAS_WIDTH / 2, 270);

    ctx.fillStyle = "#ffffff";
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.fillText("TODOS OS 12 OVOS SALVOS!", CANVAS_WIDTH / 2, 315);
    ctx.fillStyle = "#00e5ff";
    ctx.font = "11px 'Press Start 2P', monospace";
    ctx.fillText(`A PREPARAR O NÍVEL 0${((currentLevelIdx + 1) % levels.length) + 1}...`, CANVAS_WIDTH / 2, 355);
  } else if (gameState === "GAME_OVER") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 180, CANVAS_WIDTH, 240);

    ctx.fillStyle = "#ff1744";
    ctx.font = "28px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("FIM DE JOGO", CANVAS_WIDTH / 2, 255);

    ctx.fillStyle = "#ffd54f";
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.fillText(`PONTUAÇÃO: ${String(score).padStart(6, "0")}`, CANVAS_WIDTH / 2, 305);

    ctx.fillStyle = "#ffffff";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText("A VOLTAR AO MENU PRINCIPAL... [ESPAÇO]", CANVAS_WIDTH / 2, 360);
  }

  // Ecrã de Pausa Arcade Retro
  if (isGamePaused && gameState === "PLAYING") {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const boxW = 480;
    const boxH = 150;
    const boxX = (CANVAS_WIDTH - boxW) / 2;
    const boxY = (CANVAS_HEIGHT - boxH) / 2;

    ctx.fillStyle = "#0a0e1c";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = "#ffd600";
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.strokeStyle = "#ff9100";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX + 5, boxY + 5, boxW - 10, boxH - 10);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const blink = Math.floor(Date.now() / 450) % 2 === 0;
    ctx.font = "24px 'Press Start 2P', monospace";
    ctx.fillStyle = blink ? "#ffd600" : "#ffffff";
    ctx.shadowColor = "#ffab00";
    ctx.shadowBlur = 10;
    ctx.fillText("|| JOGO EM PAUSA ||", CANVAS_WIDTH / 2, boxY + 45);

    ctx.shadowBlur = 0;
    ctx.font = "11px 'Press Start 2P', monospace";
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("TOQUE NO ECRÃ PARA CONTINUAR", CANVAS_WIDTH / 2, boxY + 95);

    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = "#888888";
    ctx.fillText("[ ESC OU TOQUE EM QUALQUER SÍTIO ]", CANVAS_WIDTH / 2, boxY + 125);
    ctx.restore();
  }

}

function startGame() {
  score = 0;
  lives = 5;
  loadLevel(0);
  gameState = "PLAYING";
}

window.addEventListener("keydown", (e) => {
  if (gameState === "GAME_OVER" && (e.key === " " || e.key === "Enter" || e.key === "Escape")) {
    gameState = "TITLE";
  }

});

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// Iniciar Motor e Controlos
setupInput();

  // --- PAUSA POR TOQUE NO ECRÃ (TIPO VÍDEO) E AUTO-PAUSA ---
  function handleScreenTap(e) {
    if (isGamePaused) {
      e.preventDefault();
      togglePause(false);
      return;
    }

    if (gameState === "PLAYING") {
      const target = e.target;
      if (target && target.closest && target.closest("#btn-jump, #joystick-zone, #btn-menu-toggle, #btn-instr-toggle, #btn-sound-toggle, #btn-crt-toggle, #btn-close-hint, #highscore-modal, button, input")) {
        return;
      }
      togglePause(true);
    }
  }

  window.addEventListener("pointerdown", handleScreenTap);

  window.addEventListener("blur", () => {
    if (gameState === "PLAYING" && !isGamePaused) togglePause(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameState === "PLAYING" && !isGamePaused) togglePause(true);
  });
  window.addEventListener("orientationchange", () => {
    if (gameState === "PLAYING" && !isGamePaused) togglePause(true);
  });

requestAnimationFrame(gameLoop);
