const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreValue = document.getElementById("scoreValue");
const scoreModal = document.getElementById("scoreModal");
const finalScoreValue = document.getElementById("finalScoreValue");
const playerNameInput = document.getElementById("playerNameInput");
const saveScoreBtn = document.getElementById("saveScoreBtn");
const restartBtn = document.getElementById("restartBtn");
const saveMessage = document.getElementById("saveMessage");
const scoreTableBody = document.getElementById("scoreTableBody");

let width = 0;
let height = 0;
let gameOver = false;
let score = 0;

const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  Space: false
};

const bullets = [];
const rocks = [];
const hitParticles = [];

const player = {
  x: 0,
  y: 0,
  width: 56,
  height: 72,
  speed: 470,
  color: "#22d3ee"
};

let bulletCooldown = 0;
let spawnTimer = 0;
let rockBaseSpeed = 52;
let lastTime = 0;
let gameTime = 0;
let hasSavedCurrentScore = false;
const dangerLineOffset = 130;
let gameOverModalTimer = null;

const SCORE_STORAGE_KEY = "skyBarrageLocalScores";
const rockImage = new Image();
rockImage.src = "stones.png";
const bgImage = new Image();
bgImage.src = "bg.jpg";
bgImage.onerror = () => {
  bgImage.src = "bg.png";
};
const hitSound = new Audio("dengue_dengue.mp3");
hitSound.preload = "auto";
hitSound.volume = 0.45;
const outSound = new Audio("out.mp3");
outSound.preload = "auto";
outSound.volume = 0.7;
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  [hitSound, outSound].forEach((audioEl) => {
    audioEl.muted = true;
    const playPromise = audioEl.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.muted = false;
  });
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = width;
  canvas.height = height;

  player.x = Math.min(Math.max(player.x, 0), width - player.width);
  player.y = height - player.height - 24;
}

function resetPlayerPosition() {
  player.x = width / 2 - player.width / 2;
  player.y = height - player.height - 24;
}

function createBullet() {
  const centerX = player.x + player.width / 2;
  bullets.push({
    x: centerX - 9,
    y: player.y - 12,
    width: 5,
    height: 14,
    speed: 700
  });
  bullets.push({
    x: centerX + 4,
    y: player.y - 12,
    width: 5,
    height: 14,
    speed: 700
  });
}

function createRock() {
  const rockSize = 34 + Math.random() * 28;
  const x = Math.random() * (width - rockSize);

  rocks.push({
    x,
    y: -rockSize,
    width: rockSize,
    height: rockSize,
    speed: rockBaseSpeed + Math.random() * 36,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2.2
  });
}

function rectsCollide(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function getStoredScores() {
  try {
    const raw = localStorage.getItem(SCORE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.name === "string" && typeof item.score === "number");
  } catch (error) {
    return [];
  }
}

function setStoredScores(scores) {
  localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores));
}

function updateScoreBadge() {
  scoreValue.textContent = String(score);
}

function spawnHitParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.25;
    const speed = 80 + Math.random() * 120;
    hitParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0.45 + Math.random() * 0.2,
      maxLife: 0.45 + Math.random() * 0.2,
      size: 2 + Math.random() * 2.4
    });
  }
}

function playHitSound() {
  // Clone allows rapid overlapping hit sounds during quick shots.
  const sfx = hitSound.cloneNode();
  sfx.volume = hitSound.volume;
  sfx.play().catch(() => {});
}

function renderScoreTable() {
  const scores = getStoredScores();
  scoreTableBody.innerHTML = "";

  if (scores.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan='3'>No scores yet. Be the first!</td>";
    scoreTableBody.appendChild(row);
    return;
  }

  scores.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${index + 1}</td><td>${entry.name}</td><td>${entry.score}</td>`;
    scoreTableBody.appendChild(row);
  });
}

function showScoreModal() {
  finalScoreValue.textContent = String(score);
  saveMessage.textContent = "";
  playerNameInput.disabled = false;
  saveScoreBtn.disabled = false;
  playerNameInput.focus();
  scoreModal.classList.remove("hidden");
  renderScoreTable();
}

function hideScoreModal() {
  scoreModal.classList.add("hidden");
}

function saveCurrentScore() {
  if (hasSavedCurrentScore) {
    saveMessage.textContent = "Score already saved for this round.";
    return;
  }

  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    saveMessage.textContent = "Please enter a name.";
    return;
  }

  const scores = getStoredScores();
  scores.push({ name: playerName, score });
  scores.sort((a, b) => b.score - a.score);
  const topScores = scores.slice(0, 10);
  setStoredScores(topScores);

  hasSavedCurrentScore = true;
  saveMessage.textContent = "Score saved successfully!";
  playerNameInput.disabled = true;
  saveScoreBtn.disabled = true;
  renderScoreTable();
}

function triggerGameOver() {
  if (gameOver) return;
  gameOver = true;
  outSound.currentTime = 0;
  outSound.play().catch(() => {});
  gameOverModalTimer = setTimeout(() => {
    showScoreModal();
    gameOverModalTimer = null;
  }, 2000);
}

function resetGame() {
  if (gameOverModalTimer) {
    clearTimeout(gameOverModalTimer);
    gameOverModalTimer = null;
  }
  outSound.pause();
  outSound.currentTime = 0;
  gameOver = false;
  score = 0;
  gameTime = 0;
  spawnTimer = 0;
  bulletCooldown = 0;
  rockBaseSpeed = 52;
  hasSavedCurrentScore = false;
  bullets.length = 0;
  rocks.length = 0;
  hitParticles.length = 0;
  keys.ArrowLeft = false;
  keys.ArrowRight = false;
  keys.Space = false;
  saveMessage.textContent = "";
  playerNameInput.value = "";
  hideScoreModal();
  updateScoreBadge();
  resetPlayerPosition();
  lastTime = 0;
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (gameOver) return;

  gameTime += dt;

  rockBaseSpeed = 52 + gameTime * 3;

  if (keys.ArrowLeft) {
    player.x -= player.speed * dt;
  }

  if (keys.ArrowRight) {
    player.x += player.speed * dt;
  }

  player.x = Math.max(0, Math.min(player.x, width - player.width));

  bulletCooldown -= dt;
  if (keys.Space && bulletCooldown <= 0) {
    createBullet();
    bulletCooldown = 0.12;
  }

  spawnTimer += dt;
  const spawnInterval = Math.max(0.8, 1.25 - gameTime * 0.012);
  while (spawnTimer >= spawnInterval) {
    createRock();
    spawnTimer -= spawnInterval;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.y -= bullet.speed * dt;

    if (bullet.y + bullet.height < 0) {
      bullets.splice(i, 1);
    }
  }

  for (let i = rocks.length - 1; i >= 0; i--) {
    const rock = rocks[i];
    rock.y += rock.speed * dt;
    rock.angle += rock.spin * dt;

    if (rock.y > height) {
      rocks.splice(i, 1);
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    let bulletHit = false;

    for (let j = rocks.length - 1; j >= 0; j--) {
      if (rectsCollide(bullets[i], rocks[j])) {
        const hitX = rocks[j].x + rocks[j].width / 2;
        const hitY = rocks[j].y + rocks[j].height / 2;
        bullets.splice(i, 1);
        rocks.splice(j, 1);
        score += 10;
        updateScoreBadge();
        playHitSound();
        spawnHitParticles(hitX, hitY);
        bulletHit = true;
        break;
      }
    }

    if (bulletHit) continue;
  }

  const gameOverLineY = height - dangerLineOffset;
  for (let i = 0; i < rocks.length; i++) {
    if (rocks[i].y + rocks[i].height >= gameOverLineY) {
      triggerGameOver();
      break;
    }
  }

  for (let i = hitParticles.length - 1; i >= 0; i--) {
    const p = hitParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
    p.life -= dt;

    if (p.life <= 0) {
      hitParticles.splice(i, 1);
    }
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = "rgba(34, 211, 238, 0.7)";
  ctx.shadowBlur = 20;

  ctx.fillStyle = "#0ea5e9";
  ctx.beginPath();
  ctx.moveTo(player.width / 2, 0);
  ctx.lineTo(player.width, player.height);
  ctx.lineTo(player.width * 0.7, player.height * 0.78);
  ctx.lineTo(player.width * 0.3, player.height * 0.78);
  ctx.lineTo(0, player.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(player.width / 2 - 6, player.height * 0.35, 12, 18);

  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(6, player.height * 0.58, player.width - 12, 8);

  ctx.fillStyle = "rgba(251, 191, 36, 0.85)";
  ctx.fillRect(player.width / 2 - 5, player.height - 4, 10, 10);

  ctx.restore();
}

function drawBackgroundImage() {
  if (!(bgImage.complete && bgImage.naturalWidth > 0)) {
    return;
  }

  const imgW = bgImage.naturalWidth;
  const imgH = bgImage.naturalHeight;
  const imgRatio = imgW / imgH;
  const canvasRatio = width / height;

  let drawW;
  let drawH;
  let drawX;
  let drawY;

  if (imgRatio > canvasRatio) {
    drawH = height;
    drawW = drawH * imgRatio;
    drawX = (width - drawW) / 2;
    drawY = 0;
  } else {
    drawW = width;
    drawH = drawW / imgRatio;
    drawX = 0;
    drawY = (height - drawH) / 2;
  }

  ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
  // Slight global dim so gameplay objects pop against photo background.
  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  ctx.fillRect(0, 0, width, height);
}

function drawBullets() {
  ctx.fillStyle = "#fde047";
  bullets.forEach((bullet) => {
    ctx.shadowColor = "rgba(250, 204, 21, 0.9)";
    ctx.shadowBlur = 10;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    ctx.shadowBlur = 0;
  });
}

function drawRocks() {
  rocks.forEach((rock) => {
    const cx = rock.x + rock.width / 2;
    const cy = rock.y + rock.height / 2;
    const radius = rock.width / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rock.angle);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.94, 0, Math.PI * 2);
    ctx.clip();

    if (rockImage.complete && rockImage.naturalWidth > 0) {
      ctx.drawImage(rockImage, -radius, -radius, rock.width, rock.height);
    } else {
      // Fallback if the image file is unavailable.
      ctx.fillStyle = "#6b7280";
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.94, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 245, 195, 0.9)";
    ctx.lineWidth = 3.4;
    ctx.shadowColor = "rgba(250, 204, 21, 0.9)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.5)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.03, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - radius * 0.22, cy - radius * 0.2, radius * 0.45, Math.PI * 1.1, Math.PI * 1.8);
    ctx.stroke();
    ctx.restore();
  });
}

function drawHitParticles() {
  hitParticles.forEach((p) => {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawUI() {
  const gameOverLineY = height - dangerLineOffset;
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, gameOverLineY);
  ctx.lineTo(width, gameOverLineY);
  ctx.stroke();

  ctx.fillStyle = "rgba(74, 222, 128, 0.95)";
  ctx.font = "bold 16px Trebuchet MS";
  ctx.fillText("Arms Block", 16, gameOverLineY - 8);

}

function render() {
  ctx.clearRect(0, 0, width, height);
  drawBackgroundImage();
  drawPlayer();
  drawBullets();
  drawRocks();
  drawHitParticles();
  drawUI();
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  update(dt);
  render();

  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

window.addEventListener("keydown", (e) => {
  unlockAudio();
  if (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "Space") {
    e.preventDefault();
  }

  if (e.code === "ArrowLeft") keys.ArrowLeft = true;
  if (e.code === "ArrowRight") keys.ArrowRight = true;
  if (e.code === "Space") keys.Space = true;
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft") keys.ArrowLeft = false;
  if (e.code === "ArrowRight") keys.ArrowRight = false;
  if (e.code === "Space") keys.Space = false;
});

saveScoreBtn.addEventListener("click", saveCurrentScore);
restartBtn.addEventListener("click", resetGame);
playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    saveCurrentScore();
  }
});

canvas.addEventListener("touchstart", (e) => {
  unlockAudio();
  if (e.touches.length > 0) {
    const touchX = e.touches[0].clientX;
    player.x = touchX - player.width / 2;
    player.x = Math.max(0, Math.min(player.x, width - player.width));
  }
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
  unlockAudio();
  if (e.touches.length > 0) {
    const touchX = e.touches[0].clientX;
    player.x = touchX - player.width / 2;
    player.x = Math.max(0, Math.min(player.x, width - player.width));
  }
}, { passive: true });

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetPlayerPosition();
updateScoreBadge();
renderScoreTable();
requestAnimationFrame(gameLoop);
