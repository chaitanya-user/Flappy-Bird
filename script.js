const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Constants & Variables ---
let gameLoop;
let frames = 0;
let score = 0;
let bestScore = localStorage.getItem('flappy_best') || 0;
let gameState = 'START'; // START, PLAYING, GAMEOVER

// Canvas dimensions (fixed internal resolution for pixel art style)
const WIDTH = 320;
const HEIGHT = 480;
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Game Speed
let speed = 2;

// --- Audio (Optional - placeholders to prevent crash if added later) ---
const sounds = {
    flap: null,
    score: null,
    hit: null,
    die: null
};

// --- Game Objects ---

const bg = {
    // Sky color is handled by CSS, but we can draw clouds and cityline here
    draw: function () {
        ctx.fillStyle = '#4ec0ca';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Draw some distant clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        // Cloud 1
        ctx.beginPath();
        ctx.arc(100 - (frames * 0.5) % (WIDTH + 100), 300, 30, 0, Math.PI * 2);
        ctx.arc(140 - (frames * 0.5) % (WIDTH + 100), 300, 40, 0, Math.PI * 2);
        ctx.arc(180 - (frames * 0.5) % (WIDTH + 100), 300, 30, 0, Math.PI * 2);
        ctx.fill();

        // Cloud 2
        ctx.beginPath();
        ctx.arc(280 - (frames * 0.3) % (WIDTH + 150), 100, 20, 0, Math.PI * 2);
        ctx.arc(310 - (frames * 0.3) % (WIDTH + 150), 100, 30, 0, Math.PI * 2);
        ctx.arc(340 - (frames * 0.3) % (WIDTH + 150), 100, 20, 0, Math.PI * 2);
        ctx.fill();

        // City Silhouette
        ctx.fillStyle = '#a3e8cc';
        ctx.beginPath();
        // Building 1
        ctx.fillRect(0, HEIGHT - fg.h - 100, 40, 100);
        // Building 2
        ctx.fillRect(40, HEIGHT - fg.h - 60, 20, 60);
        // Building 3
        ctx.fillRect(60, HEIGHT - fg.h - 140, 50, 140);
        // Building 4
        ctx.fillRect(110, HEIGHT - fg.h - 80, 40, 80);
        // Building 5
        ctx.fillRect(150, HEIGHT - fg.h - 120, 60, 120);
        // Building 6
        ctx.fillRect(210, HEIGHT - fg.h - 50, 30, 50);
        // Building 7
        ctx.fillRect(240, HEIGHT - fg.h - 90, 50, 90);
        // Building 8
        ctx.fillRect(290, HEIGHT - fg.h - 110, 30, 110);
        ctx.fill();

        // Moving parallax city layer
        ctx.fillStyle = '#89ddbb'; // slightly darker
        const offset = (frames * 0.2) % 200;
        ctx.beginPath();
        ctx.moveTo(0, HEIGHT - fg.h);
        // Create random-looking skyline using sine waves for simplicity without defining array
        for (let x = 0; x <= WIDTH; x += 10) {
            let h = 30 + Math.abs(Math.sin((x + offset) * 0.05)) * 40;
            ctx.lineTo(x, HEIGHT - fg.h - h);
            ctx.lineTo(x + 10, HEIGHT - fg.h - h);
        }
        ctx.lineTo(WIDTH, HEIGHT - fg.h);
        ctx.lineTo(0, HEIGHT - fg.h);
        ctx.fill();
    }
}

const fg = {
    h: 112,
    x: 0,
    dx: 2,
    draw: function () {
        ctx.fillStyle = '#ded895';
        ctx.fillRect(0, HEIGHT - this.h, WIDTH, this.h);

        // Grass top
        ctx.fillStyle = '#73bf2e';
        ctx.fillRect(0, HEIGHT - this.h, WIDTH, 12);

        // Border
        ctx.strokeStyle = '#553c2a'; // darker brown
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, HEIGHT - this.h);
        ctx.lineTo(WIDTH, HEIGHT - this.h);
        ctx.stroke();

        // Pattern on ground to show movement
        ctx.fillStyle = '#cbb968'; // lighter sand
        for (let i = 0; i < WIDTH / 20 + 1; i++) {
            // Chevron pattern
            ctx.beginPath();
            let xPos = (i * 20) - (this.x % 20);
            ctx.moveTo(xPos, HEIGHT - this.h + 15);
            ctx.lineTo(xPos + 10, HEIGHT - this.h + 25);
            ctx.lineTo(xPos, HEIGHT - this.h + 35);
            ctx.lineTo(xPos - 5, HEIGHT - this.h + 30);
            ctx.fill();
        }
    },
    update: function () {
        if (gameState === 'PLAYING') {
            this.x = (this.x + this.dx) % 20; // Loop the ground pattern
        }
    }
}

const bird = {
    x: 50,
    y: 150,
    w: 34,
    h: 24,
    radius: 12,
    speed: 0,
    gravity: 0.25,
    jump: 4.6,
    rotation: 0,

    draw: function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        // Rotation based on speed
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.speed * 0.1)));
        if (gameState == 'START') this.rotation = 0;
        ctx.rotate(this.rotation);

        // -- Body --
        ctx.fillStyle = '#f4bc1c'; // Yellow
        ctx.strokeStyle = '#000'; // Outline
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Simple oval shape approximate
        ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // -- Eye --
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(8, -8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(10, -8, 2, 0, Math.PI * 2);
        ctx.fill();

        // -- Wing --
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-6, 4, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // -- Beak --
        ctx.fillStyle = '#e35123'; // Orange
        ctx.beginPath();
        ctx.moveTo(8, 2);
        ctx.lineTo(16, 6);
        ctx.lineTo(8, 10);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    },

    flap: function () {
        this.speed = -this.jump;
    },

    update: function () {
        // Period (start screen hover)
        if (gameState === 'START') {
            this.y = 150 + Math.cos(frames / 15) * 5;
            this.rotation = 0;
        } else {
            this.speed += this.gravity;
            this.y += this.speed;

            // Floor collision
            if (this.y + this.h / 2 >= HEIGHT - fg.h) {
                this.y = HEIGHT - fg.h - this.h / 2;
                gameOver();
            }

            // Ceiling collision (optional, usually flappy bird doesn't kill on ceiling but prevents going over)
            if (this.y - this.h / 2 <= 0) {
                this.y = this.h / 2;
                this.speed = 0;
            }
        }
    },
    reset: function () {
        this.speed = 0;
        this.rotation = 0;
        this.y = 150;
    }
}

const pipes = {
    position: [],
    w: 52,
    h: 400, // Max height of pipe
    gap: 100,
    dx: 2,

    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = p.y;
            let bottomY = p.y + this.h + this.gap;

            // -- Top Pipe --
            ctx.fillStyle = '#73bf2e'; // Light green
            ctx.fillRect(p.x, topY, this.w, this.h);
            ctx.strokeStyle = '#553c2a'; // Outline
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, topY, this.w, this.h);

            // Cap (Rim)
            ctx.fillStyle = '#73bf2e';
            ctx.fillRect(p.x - 2, topY + this.h - 20, this.w + 4, 20);
            ctx.strokeRect(p.x - 2, topY + this.h - 20, this.w + 4, 20);

            // Highlights (Visual flair)
            ctx.fillStyle = '#9ce659'; // Lighter green highlight
            ctx.fillRect(p.x + 4, topY, 4, this.h - 22); // Top pipe stripe
            ctx.fillRect(p.x + 4, topY + this.h - 18, 4, 16); // Rim stripe

            // -- Bottom Pipe --
            ctx.fillStyle = '#73bf2e';
            ctx.fillRect(p.x, bottomY, this.w, this.h);
            ctx.strokeRect(p.x, bottomY, this.w, this.h);

            // Cap (Rim)
            ctx.fillStyle = '#73bf2e';
            ctx.fillRect(p.x - 2, bottomY, this.w + 4, 20);
            ctx.strokeRect(p.x - 2, bottomY, this.w + 4, 20);

            // Highlights
            ctx.fillStyle = '#9ce659';
            ctx.fillRect(p.x + 4, bottomY + 22, 4, this.h - 22);
            ctx.fillRect(p.x + 4, bottomY + 2, 4, 16);
        }
    },

    update: function () {
        // Add new pipe
        if (frames % 100 === 0) {
            // Calculate random Y position
            // We want the gap to be somewhere reasonable
            // Min pipe height showing = 50px
            // Available space = HEIGHT - fg.h
            // y goes from -height to (gap position)
            // Simplified:
            // top pipe y must be between -(this.h - 50) and -(50) ? No.
            // Let's think about the gap's TOP position.
            // Available vertical space = HEIGHT - fg.h (ground).
            // We want the gap to be somewhere in that space.
            // Gap top can range from 20px to HEIGHT - fg.h - 20px - gap.

            // Pipe spawning logic
            // Canvas height: 480
            // Ground height: 112 (fg.h)
            // Playable height: 480 - 112 = 368
            // Pipe gap: 100
            // Minimum pipe visible: let's say 20px

            // We need the Gap to be within [20px from top, 20px from ground]
            // gapTopY = p.y + this.h. 
            // Constraint 1: gapTopY >= 20  => p.y >= 20 - this.h
            // Constraint 2: gapBottomY <= (HEIGHT - fg.h) - 20 => p.y + this.h + this.gap <= 368 - 20 
            // => p.y <= 348 - this.gap - this.h

            let min = 20 - this.h;
            let max = (HEIGHT - fg.h) - 20 - this.gap - this.h;

            // Random Y for the top pipe
            let y = Math.floor(Math.random() * (max - min + 1) + min);

            this.position.push({
                x: WIDTH,
                y: y,
                passed: false
            });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];

            // Move pipe
            p.x -= this.dx;

            // Check collision with bird
            let birdLeft = bird.x - bird.w / 2 + 5; // Hitbox adjustment
            let birdRight = bird.x + bird.w / 2 - 5;
            let birdTop = bird.y - bird.h / 2 + 5;
            let birdBottom = bird.y + bird.h / 2 - 5;

            let pipeLeft = p.x;
            let pipeRight = p.x + this.w;
            let topPipeBottom = p.y + this.h;
            let bottomPipeTop = p.y + this.h + this.gap;

            // Collision logic
            // 1. Within Pipe X range
            if (birdRight > pipeLeft && birdLeft < pipeRight) {
                // 2. Hit Top Pipe OR Hit Bottom Pipe
                if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
                    gameOver();
                }
            }

            // Score update
            if (p.x + this.w < birdLeft && !p.passed) {
                score++;
                scoreDisplay.innerText = score;
                p.passed = true;
                // Optional: play score sound
            }

            // Remove pipes that went off screen
            if (p.x + this.w <= 0) {
                this.position.shift();
                i--; // Adjust index since we removed an element
            }
        }
    },
    reset: function () {
        this.position = [];
    }
}

// --- UI Elements ---
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreSpan = document.getElementById('final-score');
const bestScoreSpan = document.getElementById('best-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// --- Input Handling ---
// Use document to capture clicks anywhere (including UI overlay)
document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        action();
    }
});

document.addEventListener('click', action);
document.addEventListener('touchstart', action, { passive: false }); // Mobile support

startBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent double firing if clicking button
    startGame();
});
restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetGame();
});

function action(e) {
    // If we clicked a button, ignore (handled by specific listeners)
    if (e && e.target && e.target.tagName === 'BUTTON') return;

    if (gameState === 'PLAYING') {
        bird.flap();
    } else if (gameState === 'START') {
        startGame();
    }
}

function startGame() {
    if (gameState === 'START') {
        gameState = 'PLAYING';
        startScreen.classList.add('hidden');
    }
}

function resetGame() {
    gameState = 'START';
    bird.reset();
    pipes.reset();
    score = 0;
    scoreDisplay.innerText = score;
    gameLoop = null;
    frames = 0;
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    loop();
}

function gameOver() {
    gameState = 'GAMEOVER';
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappy_best', bestScore);
    }
    finalScoreSpan.innerText = score;
    bestScoreSpan.innerText = bestScore;
    gameOverScreen.classList.remove('hidden');
}

function update() {
    bird.update();
    fg.update();
    if (gameState === 'PLAYING') {
        pipes.update();
    }
}

function draw() {
    bg.draw();
    pipes.draw();
    fg.draw();
    bird.draw();
}

function loop() {
    update();
    draw();
    frames++;
    if (gameState !== 'GAMEOVER') {
        requestAnimationFrame(loop);
    }
}

// --- Initialization ---
bestScoreSpan.innerText = bestScore; // Show best score on initial load/restart
loop(); // Start the loop immediately to show the "Get Ready" state (START state)
