// Game Constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BIRD_SIZE = 48;
const PLAYER_RENDER_SIZE = 64;
const BIRD_HITBOX_SCALE = 0.72;
const BIRD_X = 20;
const BIRD_TARGET_X = 140;
const BIRD_FORWARD_SPEED = 1.1;
const GRAVITY = 0.25;
const FLAP_VELOCITY = -6;
const PIPE_WIDTH = 60;
const PIPE_GAP_EASY = 160;
const PIPE_GAP_HARD = 105;
const PIPE_SPEED = 3;
const PIPE_INTERVAL = 180;
const FRAME_DURATION_MS = 1000 / 60;
const PIPE_INTERVAL_MS = PIPE_INTERVAL * FRAME_DURATION_MS;
const DIFFICULTY_THRESHOLD = 10;
const GAME_OVER_MODAL_DELAY_MS = 2000;
const LEADERBOARD_STORAGE_KEY = "flappy_local_leaderboard_v1";
const LEADERBOARD_LIMIT = 10;
const GAME_AUDIO_SRC = "vikram-dialogue.mp3";
const OUT_AUDIO_SRC = "out.mp3";

// Assets
const playerImg = new Image();
playerImg.src = "player.png";

const gameAudio = new Audio(GAME_AUDIO_SRC);
const outAudio = new Audio(OUT_AUDIO_SRC);
gameAudio.loop = true;
gameAudio.volume = 0.6;
gameAudio.preload = "auto";
outAudio.volume = 0.8;
outAudio.preload = "auto";
let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    [gameAudio, outAudio].forEach((audioEl) => {
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

function startGameAudio() {
    const playPromise = gameAudio.play();
    if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
    }
}

function stopGameAudio() {
    gameAudio.pause();
    gameAudio.currentTime = 0;
}

function playOutAudio() {
    const crashAudio = outAudio.cloneNode();
    crashAudio.volume = outAudio.volume;
    crashAudio.currentTime = 0;
    const playPromise = crashAudio.play();
    if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
    }
}

// Game State
let gameRunning = false;
let gameOver = false;
let score = 0;
let pipes = [];
let gameOverModalTimer = null;
let lastFrameTime = 0;
let pipeSpawnTimerMs = 0;

// Canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const disclaimerPage = document.getElementById("disclaimerPage");
const acceptDisclaimerBtn = document.getElementById("acceptDisclaimerBtn");
let disclaimerAccepted = !disclaimerPage || !acceptDisclaimerBtn;

function acceptDisclaimer() {
    disclaimerAccepted = true;
    if (disclaimerPage) {
        disclaimerPage.classList.add("hidden");
    }
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.min(CANVAS_WIDTH, rect.width);
    canvas.height = (canvas.width / CANVAS_WIDTH) * CANVAS_HEIGHT;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Leaderboard (localStorage)
function loadLeaderboardData() {
    try {
        const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map((item) => ({
                player_name: String(item.player_name || "").trim().slice(0, 50),
                score: Number(item.score) || 0,
                timestamp: Number(item.timestamp) || 0
            }))
            .filter((item) => item.player_name && Number.isFinite(item.score))
            .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
            .slice(0, LEADERBOARD_LIMIT);
    } catch (error) {
        console.error("Failed to load leaderboard:", error);
        return [];
    }
}

function saveLeaderboardData(entries) {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries.slice(0, LEADERBOARD_LIMIT)));
}

function addScoreToLeaderboard(playerName, playerScore) {
    const entries = loadLeaderboardData();
    entries.push({
        player_name: playerName,
        score: playerScore,
        timestamp: Date.now()
    });
    entries.sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
    const topEntries = entries.slice(0, LEADERBOARD_LIMIT);
    saveLeaderboardData(topEntries);
    return topEntries;
}

function renderLeaderboard(entries = loadLeaderboardData()) {
    const leaderboardList = document.getElementById("leaderboardList");

    if (!entries.length) {
        leaderboardList.innerHTML = '<div class="empty-leaderboard">No scores yet. Be the first!</div>';
        return;
    }

    leaderboardList.innerHTML = "";
    entries.forEach((entry, index) => {
        const rank = index + 1;
        const item = document.createElement("div");
        item.className = `leaderboard-item${rank <= 3 ? ` top-${rank}` : ""}`;

        const rankSpan = document.createElement("span");
        rankSpan.className = "rank";
        rankSpan.textContent = rank;

        const nameSpan = document.createElement("span");
        nameSpan.className = "name";
        nameSpan.textContent = entry.player_name;

        const scoreSpan = document.createElement("span");
        scoreSpan.className = "score-col";
        scoreSpan.textContent = entry.score;

        item.appendChild(rankSpan);
        item.appendChild(nameSpan);
        item.appendChild(scoreSpan);
        leaderboardList.appendChild(item);
    });
}

// Bird
const bird = {
    x: BIRD_X,
    y: CANVAS_HEIGHT / 2,
    velocity: 0,
    width: BIRD_SIZE,
    height: BIRD_SIZE,

    flap() {
        this.velocity = FLAP_VELOCITY;
    },

    update(dtFactor = 1) {
        this.velocity += GRAVITY * dtFactor;
        this.y += this.velocity * dtFactor;
        this.x = Math.min(BIRD_TARGET_X, this.x + BIRD_FORWARD_SPEED * dtFactor);
        if (this.velocity > 10) this.velocity = 10;
    },

    getHitbox() {
        const hitboxSize = this.width * BIRD_HITBOX_SCALE;
        const offset = (this.width - hitboxSize) / 2;
        return {
            x: this.x + offset,
            y: this.y + offset,
            width: hitboxSize,
            height: hitboxSize
        };
    },

    draw(context) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = PLAYER_RENDER_SIZE / 2;

        if (playerImg.complete && playerImg.naturalWidth > 0) {
            context.save();
            context.translate(centerX, centerY);
            const tilt = Math.max(-0.45, Math.min(0.65, this.velocity * 0.06));
            context.rotate(tilt);

            context.beginPath();
            context.arc(0, 0, radius, 0, Math.PI * 2);
            context.clip();
            context.drawImage(playerImg, -radius, -radius, PLAYER_RENDER_SIZE, PLAYER_RENDER_SIZE);

            context.lineWidth = 3;
            context.strokeStyle = "#ffffff";
            context.beginPath();
            context.arc(0, 0, radius - 1, 0, Math.PI * 2);
            context.stroke();
            context.restore();
            return;
        }

        context.fillStyle = "#FFD700";
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.fill();
    },

    isCollidingWithGround() {
        const hitbox = this.getHitbox();
        return hitbox.y + hitbox.height >= CANVAS_HEIGHT;
    }
};

// Pipes
function createPipe() {
    const currentGap = score >= DIFFICULTY_THRESHOLD ? PIPE_GAP_HARD : PIPE_GAP_EASY;
    const minGapY = 60;
    const maxGapY = CANVAS_HEIGHT - currentGap - 60;
    const gapY = Math.random() * (maxGapY - minGapY) + minGapY;

    return {
        x: CANVAS_WIDTH,
        gapY,
        width: PIPE_WIDTH,
        gapHeight: currentGap,
        passed: false,

        update(dtFactor = 1) {
            this.x -= PIPE_SPEED * dtFactor;
        },

        draw(context) {
            const bodyColor = "#32c56f";
            const edgeColor = "#249f58";
            const capOverhang = 6;
            const capHeight = 16;
            const pipeLabel = "Arms Block";

            context.fillStyle = bodyColor;
            context.strokeStyle = edgeColor;
            context.lineWidth = 3;

            context.fillRect(this.x, 0, this.width, this.gapY);
            context.strokeRect(this.x, 0, this.width, this.gapY);
            context.fillRect(this.x - capOverhang, this.gapY - capHeight, this.width + capOverhang * 2, capHeight);
            context.strokeRect(this.x - capOverhang, this.gapY - capHeight, this.width + capOverhang * 2, capHeight);

            context.save();
            context.translate(this.x + this.width / 2, this.gapY / 2);
            context.rotate(-Math.PI / 2);
            context.fillStyle = "#ffffff";
            context.font = "bold 16px Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(pipeLabel, 0, 0);
            context.restore();

            const bottomPipeY = this.gapY + this.gapHeight;
            const bottomPipeHeight = CANVAS_HEIGHT - bottomPipeY;
            context.fillRect(this.x, bottomPipeY, this.width, bottomPipeHeight);
            context.strokeRect(this.x, bottomPipeY, this.width, bottomPipeHeight);
            context.fillRect(this.x - capOverhang, bottomPipeY, this.width + capOverhang * 2, capHeight);
            context.strokeRect(this.x - capOverhang, bottomPipeY, this.width + capOverhang * 2, capHeight);

            context.save();
            context.translate(this.x + this.width / 2, bottomPipeY + bottomPipeHeight / 2);
            context.rotate(-Math.PI / 2);
            context.fillStyle = "#ffffff";
            context.font = "bold 16px Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(pipeLabel, 0, 0);
            context.restore();
        },

        isOffScreen() {
            return this.x + this.width < 0;
        },

        collidesWith(currentBird) {
            const hitbox = currentBird.getHitbox();
            const overlapsX = hitbox.x + hitbox.width > this.x && hitbox.x < this.x + this.width;
            if (!overlapsX) return false;

            const inGap = hitbox.y >= this.gapY && hitbox.y + hitbox.height <= this.gapY + this.gapHeight;
            return !inGap;
        }
    };
}

// UI helpers
function updateScoreDisplay() {
    document.getElementById("score").textContent = score;
}

function showGameOverModal() {
    document.getElementById("finalScore").textContent = score;
    document.getElementById("gameOverModal").classList.add("show");
    const nameInput = document.getElementById("playerName");
    const saveMessage = document.getElementById("saveMessage");
    const saveButton = document.getElementById("saveScoreBtn");

    nameInput.value = "";
    saveMessage.textContent = "";
    saveMessage.className = "save-message";
    saveButton.disabled = false;
    nameInput.focus();

    renderLeaderboard();
}

function hideGameOverModal() {
    document.getElementById("gameOverModal").classList.remove("show");
}

// Game flow
function startGame() {
    unlockAudio();
    if (gameOverModalTimer) {
        clearTimeout(gameOverModalTimer);
        gameOverModalTimer = null;
    }

    gameRunning = true;
    gameOver = false;
    score = 0;
    lastFrameTime = 0;
    pipeSpawnTimerMs = 0;
    bird.x = BIRD_X;
    bird.y = CANVAS_HEIGHT / 2;
    bird.velocity = 0;
    pipes = [];

    stopGameAudio();
    startGameAudio();
    updateScoreDisplay();
    hideGameOverModal();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    if (gameOver) return;

    gameRunning = false;
    gameOver = true;
    stopGameAudio();
    playOutAudio();

    gameOverModalTimer = setTimeout(() => {
        showGameOverModal();
        gameOverModalTimer = null;
    }, GAME_OVER_MODAL_DELAY_MS);
}

function saveScore() {
    const playerNameInput = document.getElementById("playerName");
    const saveMessage = document.getElementById("saveMessage");
    const saveButton = document.getElementById("saveScoreBtn");
    const playerName = playerNameInput.value.trim();

    if (!playerName) {
        saveMessage.textContent = "Please enter your name!";
        saveMessage.className = "save-message error";
        return;
    }

    if (playerName.length > 50) {
        saveMessage.textContent = "Name is too long!";
        saveMessage.className = "save-message error";
        return;
    }

    const finalEntries = addScoreToLeaderboard(playerName, score);
    renderLeaderboard(finalEntries);
    saveMessage.textContent = "Score saved successfully!";
    saveMessage.className = "save-message success";
    saveButton.disabled = true;
}

// Game loop
function gameLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaMs = Math.min(50, Math.max(8, timestamp - lastFrameTime));
    lastFrameTime = timestamp;
    const dtFactor = deltaMs / FRAME_DURATION_MS;

    bird.update(dtFactor);

    pipeSpawnTimerMs += deltaMs;
    while (pipeSpawnTimerMs >= PIPE_INTERVAL_MS) {
        pipes.push(createPipe());
        pipeSpawnTimerMs -= PIPE_INTERVAL_MS;
    }

    pipes.forEach((pipe) => pipe.update(dtFactor));

    pipes = pipes.filter((pipe) => {
        if (pipe.isOffScreen()) return false;

        const hitbox = bird.getHitbox();
        const birdCenterX = hitbox.x + hitbox.width / 2;
        if (!pipe.passed && pipe.x + pipe.width < birdCenterX) {
            pipe.passed = true;
            score += 1;
            updateScoreDisplay();
        }
        return true;
    });

    const collision = pipes.some((pipe) => pipe.collidesWith(bird));
    const hitTop = bird.getHitbox().y < 0;
    if (collision || bird.isCollidingWithGround() || hitTop) {
        endGame();
        return;
    }

    draw();

    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / CANVAS_WIDTH;
    const scaleY = canvas.height / CANVAS_HEIGHT;
    ctx.scale(scaleX, scaleY);

    pipes.forEach((pipe) => pipe.draw(ctx));
    bird.draw(ctx);

    ctx.strokeStyle = "#8B7355";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - 10);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!gameRunning && !gameOver && disclaimerAccepted) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(30, CANVAS_HEIGHT / 2 - 55, CANVAS_WIDTH - 60, 90);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Tap or Space to Start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = "16px Arial";
        ctx.fillText("Avoid the arms blocks", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 28);
    }
}

// Input
document.addEventListener("keydown", (event) => {
    unlockAudio();
    if (event.code !== "Space") return;
    event.preventDefault();
    if (!disclaimerAccepted) {
        acceptDisclaimer();
    }

    if (!gameRunning && !gameOver) {
        startGame();
    } else if (gameRunning) {
        bird.flap();
    }
});

canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    unlockAudio();
    if (!disclaimerAccepted) {
        acceptDisclaimer();
    }
    if (!gameRunning && !gameOver) {
        startGame();
    } else if (gameRunning) {
        bird.flap();
    }
}, { passive: false });

// Modal actions
document.getElementById("saveScoreBtn").addEventListener("click", saveScore);
document.getElementById("restartBtn").addEventListener("click", startGame);
if (acceptDisclaimerBtn) {
    acceptDisclaimerBtn.addEventListener("click", acceptDisclaimer);
}

// Initial UI state
updateScoreDisplay();
renderLeaderboard();
draw();





