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
            
            // Game variables
            let gameRunning = false;
            let score = 0;
            let highScore = 0;
            let animationFrameId;
            let gameSpeed = 2;
            let lanes = [];
            
            // Player variables
            const player = {
                x: 200,
                y: 550,
                width: 30,
                height: 30,
                color: '#00ffff'
            };
            
            // Obstacles (cars, rivers, logs)
            const obstacles = [];
            const obstacleTypes = [
                { type: 'car', width: 50, height: 30, color: '#ff00ff', speed: 3 }, // Cybercar
                { type: 'car', width: 70, height: 25, color: '#00ffff', speed: -4 }, // Reverse cybercar
                { type: 'river', width: 400, height: 40, color: 'rgba(0, 255, 255, 0.2)' }, // Neon river
                { type: 'log', width: 80, height: 30, color: '#663300', speed: 2 } // Floating log
            ];
            
            // Initialize lanes (road, river, safe zones)
            function initLanes() {
                lanes = [];
                for (let i = 0; i < 15; i++) {
                    const type = Math.random() > 0.5 ? (Math.random() > 0.5 ? 'road' : 'river') : 'safe';
                    lanes.push({
                        y: i * 40,
                        type: type,
                        obstacles: []
                    });
                }
            }
            
            // Generate obstacles for lanes
            function generateObstacles() {
                lanes.forEach(lane => {
                    if (lane.type === 'road' || lane.type === 'river') {
                        const obstacleCount = Math.floor(Math.random() * 3) + 1;
                        for (let i = 0; i < obstacleCount; i++) {
                            const obstacleType = lane.type === 'road' ? 
                                (Math.random() > 0.5 ? obstacleTypes[0] : obstacleTypes[1]) :
                                obstacleTypes[3];
                            
                            lane.obstacles.push({
                                ...obstacleType,
                                x: Math.random() * 400,
                                y: lane.y
                            });
                        }
                    }
                });
            }
            
            // Event listeners
            document.addEventListener('keydown', (e) => {
                if (!gameRunning) return;
                
                switch(e.key) {
                    case 'ArrowUp':
                        player.y -= 40;
                        score++;
                        scoreDisplay.textContent = score;
                        break;
                    case 'ArrowDown':
                        if (player.y < 550) player.y += 40;
                        break;
                    case 'ArrowLeft':
                        if (player.x > 0) player.x -= 40;
                        break;
                    case 'ArrowRight':
                        if (player.x < 370) player.x += 40;
                        break;
                }
            });
            
            startButton.addEventListener('click', startGame);
            restartButton.addEventListener('click', startGame);
            
            // Start game function
            function startGame() {
                gameRunning = true;
                score = 0;
                player.x = 200;
                player.y = 550;
                
                initLanes();
                generateObstacles();
                
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
                // Move obstacles
                lanes.forEach(lane => {
                    if (lane.type === 'road' || lane.type === 'river') {
                        lane.obstacles.forEach(obstacle => {
                            obstacle.x += obstacle.speed;
                            
                            // Wrap around screen
                            if (obstacle.speed > 0 && obstacle.x > 400) {
                                obstacle.x = -obstacle.width;
                            } else if (obstacle.speed < 0 && obstacle.x < -obstacle.width) {
                                obstacle.x = 400;
                            }
                            
                            // Check collision with player
                            if (
                                player.y < lane.y + 40 &&
                                player.y + player.height > lane.y &&
                                player.x + player.width > obstacle.x &&
                                player.x < obstacle.x + obstacle.width
                            ) {
                                if (lane.type === 'road') {
                                    gameOver();
                                } else if (lane.type === 'river' && obstacle.type !== 'log') {
                                    gameOver();
                                }
                            }
                        });
                    }
                });
                
                // Check if player falls in river without log
                const currentLane = lanes.find(lane => player.y >= lane.y && player.y < lane.y + 40);
                if (currentLane && currentLane.type === 'river') {
                    let onLog = false;
                    currentLane.obstacles.forEach(obstacle => {
                        if (
                            player.x + player.width > obstacle.x &&
                            player.x < obstacle.x + obstacle.width
                        ) {
                            onLog = true;
                            player.x += obstacle.speed; // Move with log
                        }
                    });
                    
                    if (!onLog) {
                        gameOver();
                    }
                }
                
                // Check if player reaches top (new lane generation)
                if (player.y < 100) {
                    player.y += 400;
                    lanes.forEach(lane => lane.y += 400);
                    lanes = lanes.filter(lane => lane.y < 600);
                    
                    // Add new lanes at the top
                    for (let i = 0; i < 5; i++) {
                        const type = Math.random() > 0.5 ? (Math.random() > 0.5 ? 'road' : 'river') : 'safe';
                        lanes.unshift({
                            y: -40 * (i + 1),
                            type: type,
                            obstacles: []
                        });
                        
                        // Add obstacles to new lanes
                        if (type === 'road' || type === 'river') {
                            const obstacleCount = Math.floor(Math.random() * 2) + 1;
                            for (let j = 0; j < obstacleCount; j++) {
                                const obstacleType = type === 'road' ? 
                                    (Math.random() > 0.5 ? obstacleTypes[0] : obstacleTypes[1]) :
                                    obstacleTypes[3];
                                
                                lanes[0].obstacles.push({
                                    ...obstacleType,
                                    x: Math.random() * 400,
                                    y: lanes[0].y
                                });
                            }
                        }
                    }
                }
            }
            
            // Draw everything
            function draw() {
                // Clear canvas
                ctx.fillStyle = '#0a0a1a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw lanes
                lanes.forEach(lane => {
                    if (lane.type === 'road') {
                        ctx.fillStyle = '#111122';
                    } else if (lane.type === 'river') {
                        ctx.fillStyle = 'rgba(0, 50, 100, 0.3)';
                    } else {
                        ctx.fillStyle = '#0a0a20';
                    }
                    
                    ctx.fillRect(0, lane.y, 400, 40);
                    
                    // Draw lane markings
                    if (lane.type === 'road') {
                        ctx.strokeStyle = '#00ffff';
                        ctx.lineWidth = 2;
                        for (let x = 0; x < 400; x += 40) {
                            ctx.beginPath();
                            ctx.moveTo(x, lane.y + 20);
                            ctx.lineTo(x + 20, lane.y + 20);
                            ctx.stroke();
                        }
                    } else if (lane.type === 'river') {
                        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                        ctx.lineWidth = 1;
                        for (let x = 0; x < 400; x += 20) {
                            ctx.beginPath();
                            ctx.moveTo(x, lane.y + 10);
                            ctx.lineTo(x + 10, lane.y + 30);
                            ctx.stroke();
                        }
                    }
                    
                    // Draw obstacles
                    lane.obstacles.forEach(obstacle => {
                        ctx.fillStyle = obstacle.color;
                        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                        
                        // Add details to cars
                        if (obstacle.type === 'car') {
                            ctx.fillStyle = '#000';
                            ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10);
                            
                            // Car windows
                            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                            ctx.fillRect(obstacle.x + 10, obstacle.y + 10, obstacle.width - 20, 5);
                        }
                        
                        // Add details to logs
                        if (obstacle.type === 'log') {
                            ctx.strokeStyle = '#996633';
                            ctx.lineWidth = 2;
                            for (let i = 0; i < 3; i++) {
                                ctx.beginPath();
                                ctx.arc(obstacle.x + 20 + (i * 20), obstacle.y + 15, 5, 0, Math.PI * 2);
                                ctx.stroke();
                            }
                        }
                        
                        // Glow effect
                        ctx.shadowColor = obstacle.color;
                        ctx.shadowBlur = 10;
                        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                        ctx.shadowBlur = 0;
                    });
                });
                
                // Draw player
                ctx.fillStyle = player.color;
                ctx.beginPath();
                ctx.arc(player.x + 15, player.y + 15, 15, 0, Math.PI * 2);
                ctx.fill();
                
                // Player glow
                ctx.shadowColor = player.color;
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Player eye
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(player.x + 20, player.y + 10, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Game over
            function gameOver() {
                gameRunning = false;
                finalScoreDisplay.textContent = `Score: ${score}`;
                gameOverScreen.style.display = 'flex';
                
                if (score > highScore) {
                    highScore = score;
                    highScoreDisplay.textContent = `HI: ${highScore}`;
                }
            }
            
            // Initial draw
            initLanes();
            draw();
        });