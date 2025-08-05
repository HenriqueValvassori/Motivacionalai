document.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('game-canvas');
            const ctx = canvas.getContext('2d');
            const scoreDisplay = document.getElementById('score-display');
            const highScoreDisplay = document.getElementById('high-score-display');
            const startScreen = document.getElementById('start-screen');
            const gameOverScreen = document.getElementById('game-over');
            const finalScoreDisplay = document.getElementById('final-score');
            const startButton = document.getElementById('start-button');
            const restartButton = document.getElementById('restart-button');
            const ground = document.getElementById('ground');
            
            // Game variables
            let gameRunning = false;
            let score = 0;
            let highScore = 0;
            let animationFrameId;
            let gameSpeed = 5;
            let speedIncreaseTimer = 0;
            
            // Dino variables
            const dino = {
                x: 50,
                y: 230,
                width: 40,
                height: 60,
                velocity: 0,
                gravity: 0.8,
                jumpForce: -15,
                isJumping: false,
                frame: 0
            };
            
            // Obstacle variables
            const obstacles = [];
            const obstacleTypes = [
                { width: 30, height: 50, color: '#ff00ff' }, // Small cyber crate
                { width: 50, height: 30, color: '#00ffff' },  // Low hurdle
                { width: 40, height: 60, color: '#ff00ff' }  // Tall cyber crate
            ];
            let obstacleTimer = 0;
            const obstacleInterval = 1500; // milliseconds
            
            // Game controls
            let upPressed = false;
            let downPressed = false;
            
            // Event listeners
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' || e.key === 'ArrowUp') {
                    upPressed = true;
                    if (!gameRunning) {
                        startGame();
                    }
                }
                if (e.key === 'ArrowDown') {
                    downPressed = true;
                }
            });
            canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Previne o scroll da página em dispositivos móveis
        if (!gameRunning) {
            startGame();
        }
        bird.velocity = bird.jumpForce; // Faz o pássaro pular
    });
            document.addEventListener('keyup', (e) => {
                if (e.code === 'Space' || e.key === 'ArrowUp') {
                    upPressed = false;
                }
                if (e.key === 'ArrowDown') {
                    downPressed = false;
                }
            });
            
            startButton.addEventListener('click', startGame);
            restartButton.addEventListener('click', startGame);
            
            // Start game function
            function startGame() {
                gameRunning = true;
                score = 0;
                dino.y = 230;
                dino.velocity = 0;
                dino.isJumping = false;
                dino.frame = 0;
                obstacles.length = 0;
                obstacleTimer = 0;
                gameSpeed = 5;
                speedIncreaseTimer = 0;
                
                startScreen.style.display = 'none';
                gameOverScreen.style.display = 'none';
                scoreDisplay.textContent = '0';
                
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                
                gameLoop();
            }
            
            // Game loop
            function gameLoop() {
                update();
                draw();
                
                if (gameRunning) {
                    animationFrameId = requestAnimationFrame(gameLoop);
                }
            }
            
            // Update game state
            function update() {
                // Update dino
                if (upPressed && !dino.isJumping) {
                    dino.velocity = dino.jumpForce;
                    dino.isJumping = true;
                }
                
                // Ducking mechanic
                if (downPressed && !dino.isJumping) {
                    dino.height = 30;
                    dino.y = 260;
                } else if (!dino.isJumping) {
                    dino.height = 60;
                    dino.y = 230;
                }
                
                dino.velocity += dino.gravity;
                dino.y += dino.velocity;
                
                // Check if dino lands
                if (dino.y > 230) {
                    dino.y = 230;
                    dino.velocity = 0;
                    dino.isJumping = false;
                }
                
                // Update score
                score++;
                scoreDisplay.textContent = Math.floor(score / 10);
                
                // Increase game speed over time
                speedIncreaseTimer++;
                if (speedIncreaseTimer > 500) {
                    gameSpeed += 0.5;
                    speedIncreaseTimer = 0;
                }
                
                // Update obstacles
                obstacleTimer += 16; // assuming ~60fps
                
                if (obstacleTimer > obstacleInterval) {
                    createObstacle();
                    obstacleTimer = Math.random() * 500; // Randomize next obstacle
                }
                
                for (let i = obstacles.length - 1; i >= 0; i--) {
                    obstacles[i].x -= gameSpeed;
                    
                    // Check collision with dino
                    if (
                        dino.x + dino.width > obstacles[i].x &&
                        dino.x < obstacles[i].x + obstacles[i].width &&
                        dino.y + dino.height > obstacles[i].y &&
                        dino.y < obstacles[i].y + obstacles[i].height
                    ) {
                        gameOver();
                    }
                    
                    // Remove obstacles that are off screen
                    if (obstacles[i].x + obstacles[i].width < 0) {
                        obstacles.splice(i, 1);
                    }
                }
            }
            
            // Draw everything
            function draw() {
                // Clear canvas
                ctx.fillStyle = '#0a0a1a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw grid lines
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                
                // Draw dino
                ctx.fillStyle = '#00ffff';
                
                // Dino body
                ctx.beginPath();
                ctx.moveTo(dino.x, dino.y + dino.height);
                ctx.lineTo(dino.x + dino.width * 0.3, dino.y + dino.height * 0.7);
                ctx.lineTo(dino.x + dino.width * 0.7, dino.y + dino.height * 0.7);
                ctx.lineTo(dino.x + dino.width, dino.y + dino.height);
                ctx.lineTo(dino.x + dino.width * 0.8, dino.y + dino.height * 0.3);
                ctx.lineTo(dino.x + dino.width * 0.5, dino.y);
                ctx.lineTo(dino.x + dino.width * 0.2, dino.y + dino.height * 0.3);
                ctx.closePath();
                ctx.fill();
                
                // Dino eye
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(dino.x + dino.width * 0.6, dino.y + dino.height * 0.3, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Dino glow
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Draw obstacles
                obstacles.forEach(obstacle => {
                    ctx.fillStyle = obstacle.color;
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                    
                    // Obstacle details
                    if (obstacle.width === 30) { // Small crate
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                        ctx.fillRect(obstacle.x + 5, obstacle.y + 5, 20, 40);
                    } else if (obstacle.width === 50) { // Low hurdle
                        ctx.fillStyle = '#ff00ff';
                        ctx.fillRect(obstacle.x + 10, obstacle.y - 5, 30, 5);
                    }
                    
                    // Obstacle glow
                    ctx.shadowColor = obstacle.color;
                    ctx.shadowBlur = 10;
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                    ctx.shadowBlur = 0;
                });
                
                // Draw ground
                ctx.fillStyle = '#333';
                ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
                
                // Ground details
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;
                for (let x = 0; x < canvas.width; x += 40) {
                    ctx.beginPath();
                    ctx.moveTo(x, canvas.height - 20);
                    ctx.lineTo(x + 20, canvas.height - 10);
                    ctx.stroke();
                }
            }
            
            // Create a new obstacle
            function createObstacle() {
                const type = Math.floor(Math.random() * obstacleTypes.length);
                const obstacle = {
                    ...obstacleTypes[type],
                    x: canvas.width,
                    y: canvas.height - 20 - obstacleTypes[type].height
                };
                
                obstacles.push(obstacle);
            }
            
            // Game over
            function gameOver() {
                gameRunning = false;
                const finalScore = Math.floor(score / 10);
                finalScoreDisplay.textContent = `Score: ${finalScore}`;
                gameOverScreen.style.display = 'flex';
                
                if (finalScore > highScore) {
                    highScore = finalScore;
                    highScoreDisplay.textContent = `HI: ${highScore}`;
                }
            }
            
            // Initial draw
            draw();
        });