// Game constants
const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 30;
const EMPTY = 0;
const BINARY_0 = 1;
const BINARY_1 = 2;

// Tetromino shapes with binary values (0 or 1)
const SHAPES = [
    // I shape
    {
        shape: [
            [1, 1, 1, 1]
        ],
        color: '#10B981' // green
    },
    // J shape
    {
        shape: [
            [0, 1, 0],
            [0, 1, 0],
            [1, 1, 0]
        ],
        color: '#EF4444' // red
    },
    // L shape
    {
        shape: [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 1]
        ],
        color: '#10B981' // green
    },
    // O shape
    {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#EF4444' // red
    },
    // S shape
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#10B981' // green
    },
    // T shape
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#EF4444' // red
    },
    // Z shape
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#10B981' // green
    }
];

// Game state
let canvas, ctx, nextCanvas, nextCtx;
let board = [];
let currentPiece, nextPiece;
let score = 0;
let gameOver = false;
let gameLoop;
let dropStart, dropInterval = 1000; // 1 second initial drop speed
let lastTime = 0;
let isPaused = false;
let level = 1;
let linesCleared = 0;

// DOM elements
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const desktopScoreElement = document.getElementById('desktop-score');
const desktopLevelElement = document.getElementById('desktop-level');
const desktopLinesElement = document.getElementById('desktop-lines');
const finalScoreElement = document.getElementById('final-score');
const startButton = document.getElementById('start-btn');
const resetButton = document.getElementById('reset-btn');
const playAgainButton = document.getElementById('play-again');
const gameOverElement = document.getElementById('game-over');

// Mobile control elements
const mobileStartBtn = document.getElementById('mobile-start');
const mobileLeftBtn = document.getElementById('mobile-left');
const mobileRightBtn = document.getElementById('mobile-right');
const mobileRotateBtn = document.getElementById('mobile-rotate');
const mobileUpBtn = document.getElementById('mobile-up');
const mobileDownBtn = document.getElementById('mobile-down');
let mobileSwapBtn = document.getElementById('mobile-swap'); // Make it let so we can reassign
const mobileHardDropBtn = document.getElementById('mobile-hard-drop');

// Initialize mobile buttons

// Touch control variables
let touchStartX = 0;
let touchStartY = 0;
let lastTap = 0;
let tapTimeout;
let isSwiping = false;

// Initialize the game
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('next-piece-canvas');
    nextCtx = nextCanvas.getContext('2d');
    
    // Set main game canvas dimensions
    canvas.width = COLS * CELL_SIZE;
    canvas.height = ROWS * CELL_SIZE;
    
    // Set next piece canvas dimensions for mobile
    const nextPieceSize = 4 * CELL_SIZE;
    nextCanvas.width = nextPieceSize;
    nextCanvas.height = nextPieceSize;
    nextCtx = nextCanvas.getContext('2d');
    nextCtx.imageSmoothingEnabled = false;
    
    // Initialize desktop next piece canvas if it exists
    const desktopNextCanvas = document.getElementById('desktop-next-piece');
    if (desktopNextCanvas) {
        const desktopCtx = desktopNextCanvas.getContext('2d');
        desktopNextCanvas.width = 120; // Fixed size for desktop
        desktopNextCanvas.height = 120;
        desktopCtx.imageSmoothingEnabled = false;
    }
    
    // Initialize empty board
    resetBoard();
    
    // Set up event listeners
    document.addEventListener('keydown', handleKeyPress);
    
    // Desktop controls
    if (startButton) startButton.addEventListener('click', startGame);
    if (resetButton) resetButton.addEventListener('click', resetGame);
    if (playAgainButton) playAgainButton.addEventListener('click', resetGame);
    
    // Mobile controls
    if (mobileStartBtn) {
        mobileStartBtn.addEventListener('click', () => {
            if (isPaused) {
                togglePause();
            } else if (gameLoop) {
                togglePause();
            } else {
                startGame();
            }
        });
    }
    
    // Movement controls
    if (mobileLeftBtn) mobileLeftBtn.addEventListener('click', () => movePiece(-1));
    if (mobileRightBtn) mobileRightBtn.addEventListener('click', () => movePiece(1));
    
    // Rotation controls (both rotate buttons do the same thing)
    if (mobileRotateBtn) mobileRotateBtn.addEventListener('click', () => rotatePiece(1));
    if (mobileUpBtn) mobileUpBtn.addEventListener('click', () => rotatePiece(1));
    
    // Drop and hard drop
    if (mobileDownBtn) mobileDownBtn.addEventListener('click', () => dropPiece());
    if (mobileHardDropBtn) mobileHardDropBtn.addEventListener('click', hardDrop);
    
    // Initialize swap button with fresh event listeners
    const swapBtnId = 'mobile-swap';
    let swapBtn = document.getElementById(swapBtnId);
    
    if (swapBtn) {
        const newSwapBtn = swapBtn.cloneNode(true);
        
        newSwapBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Visual feedback
            this.style.transform = 'scale(0.9)';
            setTimeout(() => { this.style.transform = ''; }, 100);
            
            swapPieceValues();
            return false;
        };
        
        swapBtn.parentNode.replaceChild(newSwapBtn, swapBtn);
        mobileSwapBtn = newSwapBtn;
    }
    
    // Touch controls for swiping
    if (canvas) {
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    
    // Draw initial empty board
    drawBoard();
}

// Reset the game board
function resetBoard() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(EMPTY));
    score = 0;
    level = 1;
    linesCleared = 0;
    dropInterval = 1000;
    updateScore(0);
    gameOver = false;
    if (gameOverElement) gameOverElement.classList.add('hidden');
}

// Start a new game
function startGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
    }
    
    resetBoard();
    isPaused = false;
    gameOver = false;
    nextPiece = createRandomPiece();
    spawnNewPiece();
    dropStart = performance.now();
    gameLoop = requestAnimationFrame(gameUpdate);
    
    // Update desktop button
    if (startButton) {
        startButton.textContent = 'Pause';
        startButton.removeEventListener('click', startGame);
        startButton.addEventListener('click', togglePause);
    }
    
    // Update mobile button
    if (mobileStartBtn) {
        mobileStartBtn.textContent = 'PAUSE';
        mobileStartBtn.style.background = 'linear-gradient(135deg, #F7768E, #FF9E64)';
    }
}

// Toggle pause state
function togglePause() {
    isPaused = !isPaused;
    
    // Update desktop button
    if (startButton) {
        startButton.textContent = isPaused ? 'Resume' : 'Pause';
    }
    
    // Update mobile button
    if (mobileStartBtn) {
        mobileStartBtn.textContent = isPaused ? 'RESUME' : 'PAUSE';
        mobileStartBtn.style.background = isPaused 
            ? 'linear-gradient(135deg, #7DCFFF, #7AA2F7)' 
            : 'linear-gradient(135deg, #F7768E, #FF9E64)';
    }
    
    if (!isPaused) {
        dropStart = performance.now();
        gameLoop = requestAnimationFrame(gameUpdate);
    }
}

// Reset the game
function resetGame() {
    cancelAnimationFrame(gameLoop);
    
    // Reset desktop button
    if (startButton) {
        startButton.textContent = 'Start Game';
        startButton.removeEventListener('click', togglePause);
        startButton.addEventListener('click', startGame);
    }
    
    // Reset mobile button
    if (mobileStartBtn) {
        mobileStartBtn.textContent = 'START';
        mobileStartBtn.style.background = 'rgba(255, 255, 255, 0.9)';
    }
    
    resetBoard();
    drawBoard();
}

// Create a random piece
function createRandomPiece() {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    const shape = JSON.parse(JSON.stringify(SHAPES[shapeIndex]));
    
    // Randomly assign 0 or 1 to each cell in the shape
    for (let y = 0; y < shape.shape.length; y++) {
        for (let x = 0; x < shape.shape[y].length; x++) {
            if (shape.shape[y][x] === 1) {
                shape.shape[y][x] = Math.random() < 0.5 ? BINARY_0 : BINARY_1;
            }
        }
    }
    
    return {
        shape: shape.shape,
        color: shape.color,
        x: Math.floor(COLS / 2) - Math.floor(shape.shape[0].length / 2),
        y: 0
    };
}

// Spawn a new piece
function spawnNewPiece() {
    currentPiece = nextPiece;
    nextPiece = createRandomPiece();
    drawNextPiece();
    
    // Check for game over
    if (isCollision(0, 0)) {
        endGame();
    }
}

// Draw the next piece with the same styling as the main game
function drawNextPiece() {
    if (!nextPiece) return;
    
    // Draw for mobile next piece
    drawNextPieceOnCanvas(nextCanvas, nextCtx);
    
    // Draw for desktop next piece if it exists
    const desktopNextCanvas = document.getElementById('desktop-next-piece');
    if (desktopNextCanvas) {
        const desktopCtx = desktopNextCanvas.getContext('2d');
        drawNextPieceOnCanvas(desktopNextCanvas, desktopCtx);
    }
}

function drawNextPieceOnCanvas(canvas, ctx) {
    const cellSize = Math.min(20, CELL_SIZE * 0.8); // Slightly smaller for next piece preview
    const pieceWidth = nextPiece.shape[0].length * cellSize;
    const pieceHeight = nextPiece.shape.length * cellSize;
    
    // Center the piece in the canvas
    const offsetX = (canvas.width - pieceWidth) / 2;
    const offsetY = (canvas.height - pieceHeight) / 2;
    
    // Clear with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (nextPiece.shape[y][x] !== EMPTY) {
                const value = nextPiece.shape[y][x];
                const posX = offsetX + x * cellSize;
                const posY = offsetY + y * cellSize;
                const size = cellSize - 1;
                
                // Draw cell with rock texture
                const pattern = createRockTexture(value === BINARY_0 ? '#F7768E' : '#7DCFFF');
                ctx.fillStyle = pattern;
                ctx.beginPath();
                ctx.roundRect(posX, posY, size, size, 4);
                ctx.fill();
                
                // Add inner highlight
                const gradient = ctx.createLinearGradient(posX, posY, posX + size, posY + size);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // Add border
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Add binary digit
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillStyle = '#1A1B26';
                ctx.font = `${Math.floor(cellSize * 0.6)}px 'JetBrains Mono', monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    value === BINARY_0 ? '0' : '1',
                    posX + cellSize / 2,
                    posY + cellSize / 2
                );
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
            }
        }
    }
}

// Draw the game board
function drawBoard() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the board
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            drawCell(x, y, board[y][x]);
        }
    }
    
    // Draw the current piece
    if (currentPiece) {
        drawPiece();
    }
}

// Create rock-like texture
function createRockTexture(color) {
    const canvas = document.createElement('canvas');
    const size = 20;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    
    // Add noise for texture
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Add some random noise to RGB channels
        const noise = Math.random() * 30 - 15;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise)); // B
    }
    
    ctx.putImageData(imageData, 0, 0);
    return ctx.createPattern(canvas, 'repeat');
}

// Draw a single cell with rock-like texture
function drawCell(x, y, value) {
    if (value === EMPTY) return;
    
    let color, textColor = '#1A1B26'; // Dark text for better contrast
    let pattern;
    
    if (value === BINARY_0) {
        pattern = createRockTexture('#F7768E'); // Coral red
    } else if (value === BINARY_1) {
        pattern = createRockTexture('#7DCFFF'); // Sky blue
    }
    
    // Draw cell with rock texture and border
    const size = CELL_SIZE - 1;
    const posX = x * CELL_SIZE;
    const posY = y * CELL_SIZE;
    
    // Draw cell with texture
    ctx.fillStyle = pattern;
    ctx.beginPath();
    ctx.roundRect(posX, posY, size, size, 4);
    ctx.fill();
    
    // Add inner highlight for depth
    const gradient = ctx.createLinearGradient(posX, posY, posX + size, posY + size);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Add binary digit with shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = textColor;
    ctx.font = `${Math.floor(CELL_SIZE * 0.6)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        value === BINARY_0 ? '0' : '1',
        x * CELL_SIZE + CELL_SIZE / 2,
        y * CELL_SIZE + CELL_SIZE / 2
    );
}

// Draw the current piece
function drawPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x] !== EMPTY) {
                const boardX = currentPiece.x + x;
                const boardY = currentPiece.y + y;
                
                // Only draw if it's within the visible board
                if (boardY >= 0) {
                    drawCell(boardX, boardY, currentPiece.shape[y][x]);
                }
            }
        }
    }
}

// Check for collisions
function isCollision(offsetX, offsetY, rotatedShape = null) {
    const shape = rotatedShape || currentPiece.shape;
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] !== EMPTY) {
                const newX = currentPiece.x + x + offsetX;
                const newY = currentPiece.y + y + offsetY;
                
                // Check boundaries
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                // Check for collision with existing pieces (only if newY >= 0)
                if (newY >= 0 && board[newY][newX] !== EMPTY) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Move the current piece
function movePiece(offsetX) {
    if (isPaused || gameOver) return;
    
    if (!isCollision(offsetX, 0)) {
        currentPiece.x += offsetX;
        drawBoard();
    }
}

// Rotate the current piece
function rotatePiece(direction) {
    if (isPaused || gameOver) return;
    
    const rotated = [];
    const shape = currentPiece.shape;
    
    // Create a rotated version of the shape
    if (direction > 0) {
        // Rotate clockwise
        for (let x = 0; x < shape[0].length; x++) {
            const newRow = [];
            for (let y = shape.length - 1; y >= 0; y--) {
                newRow.push(shape[y][x]);
            }
            rotated.push(newRow);
        }
    } else {
        // Rotate counter-clockwise
        for (let x = shape[0].length - 1; x >= 0; x--) {
            const newRow = [];
            for (let y = 0; y < shape.length; y++) {
                newRow.push(shape[y][x]);
            }
            rotated.push(newRow);
        }
    }
    
    // Check if rotation is valid
    if (!isCollision(0, 0, rotated)) {
        currentPiece.shape = rotated;
        drawBoard();
    }
}

// Drop the current piece one row
function dropPiece() {
    if (isPaused || gameOver) return;
    
    if (!isCollision(0, 1)) {
        currentPiece.y++;
        drawBoard();
        return true;
    }
    
    // If we can't move down, lock the piece in place
    lockPiece();
    return false;
}

// Lock the current piece in place
function lockPiece() {
    // Add the piece to the board
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x] !== EMPTY) {
                const boardX = currentPiece.x + x;
                const boardY = currentPiece.y + y;
                
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.shape[y][x];
                }
            }
        }
    }
    
    // Check for completed lines
    clearLines();
    
    // Spawn a new piece
    spawnNewPiece();
    
    // Reset the drop timer
    dropStart = performance.now();
}

// Swap 0s and 1s in the current piece
function swapPieceValues() {
    if (!currentPiece || isPaused || gameOver) return false;
    
    // Create a deep copy of the current shape to modify
    const newShape = [];
    
    for (let y = 0; y < currentPiece.shape.length; y++) {
        newShape[y] = [];
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            const currentValue = currentPiece.shape[y][x];
            
            if (currentValue === BINARY_0) {
                newShape[y][x] = BINARY_1;
            } else if (currentValue === BINARY_1) {
                newShape[y][x] = BINARY_0;
            } else {
                newShape[y][x] = currentValue;
            }
        }
    }
    
    // Update the current piece's shape and redraw
    currentPiece.shape = newShape;
    drawBoard();
    return true;
}

// Clear 2x2 sections of the same binary digit (0 or 1)
function clearLines() {
    const clearedPositions = [];
    let clearedCount = 0;
    
    // Find all 2x2 blocks of the same value
    for (let y = 0; y < ROWS - 1; y++) {
        for (let x = 0; x < COLS - 1; x++) {
            const value = board[y][x];
            
            // Skip empty cells
            if (value === EMPTY) continue;
            
            // Check for 2x2 block of the same value
            if (board[y][x + 1] === value && 
                board[y + 1][x] === value && 
                board[y + 1][x + 1] === value) {
                
                // Mark these positions to be cleared
                clearedPositions.push(
                    {x, y},
                    {x: x + 1, y},
                    {x, y: y + 1},
                    {x: x + 1, y: y + 1}
                );
                clearedCount++;
            }
        }
    }
    
    // Clear all marked positions
    clearedPositions.forEach(pos => {
        if (board[pos.y] && board[pos.y][pos.x] !== undefined) {
            board[pos.y][pos.x] = EMPTY;
        }
    });
    
    // Apply gravity to make pieces fall
    if (clearedCount > 0) {
        applyGravity();
        // Award points based on number of 2x2 blocks cleared (50 points per block)
        updateScore(score + (clearedCount * 50));
        return true;
    }
    
    return false;
}

// Apply gravity to make pieces fall after clearing
function applyGravity() {
    for (let x = 0; x < COLS; x++) {
        let emptyRow = ROWS - 1;
        
        // Move from bottom to top
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y][x] !== EMPTY) {
                // If this cell is not empty and not in the right position, move it down
                if (y < emptyRow) {
                    board[emptyRow][x] = board[y][x];
                    board[y][x] = EMPTY;
                }
                emptyRow--;
            }
        }
    }
    
    // Recursively check for new 2x2 blocks after gravity
    if (clearLines()) {
        // If more blocks were cleared, apply gravity again
        applyGravity();
    }
}

// Update the score and level
function updateScore(newScore) {
// Ensure score is always a whole number
score = Math.floor(newScore);

// Update score displays
if (scoreElement) scoreElement.textContent = score.toLocaleString();
if (desktopScoreElement) desktopScoreElement.textContent = score.toLocaleString();

// Update level based on score (every 500 points)
const newLevel = Math.floor(score / 500) + 1;
if (newLevel > level) {
    level = newLevel;
    // Increase speed (minimum 100ms, maximum 10x speed)
    dropInterval = Math.max(100, 1000 - (level * 50));

    // Update level displays
    if (levelElement) levelElement.textContent = level;
    if (desktopLevelElement) desktopLevelElement.textContent = level;

    // Visual feedback for level up
    if (levelElement) {
        levelElement.style.transform = 'scale(1.3)';
        levelElement.style.color = '#FF9E64';
        setTimeout(() => {
            levelElement.style.transform = 'scale(1)';
            levelElement.style.color = '';
        }, 500);
    }
}

// Update lines cleared (1 line = 4 cells cleared)
const newLines = Math.floor(score / 100);
if (newLines > linesCleared) {
    linesCleared = newLines;
    if (linesElement) linesElement.textContent = linesCleared;
    if (desktopLinesElement) desktopLinesElement.textContent = linesCleared;
}
}

// Touch control handlers
// Touch control handlers
function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwiping = false;
    
    // Handle double tap for hard drop
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
        // Double tap detected
        e.preventDefault();
        hardDrop();
    } else {
        // Single tap (first tap)
        tapTimeout = setTimeout(() => {
            // Single tap handler if needed
        }, 310);
    }
    lastTap = currentTime;
}

function handleTouchMove(e) {
    if (!touchStartX || !touchStartY) return;
    
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX;
    const diffY = touch.clientY - touchStartY;
    
    // Only trigger swipe after minimum distance
    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isSwiping = true;
        clearTimeout(tapTimeout);
        
        // Horizontal swipe takes precedence
        if (Math.abs(diffX) > Math.abs(diffY)) {
            e.preventDefault();
            if (diffX > 0) movePiece(1);
            else movePiece(-1);
        } 
        // Vertical swipe down for soft drop
        else if (diffY > 0) {
            e.preventDefault();
            dropPiece();
        }
        
        // Reset start position for continuous movement
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
}

function handleTouchEnd() {
    if (!isSwiping) {
        // Handle tap (rotate)
        rotatePiece(1);
    }
    
    // Reset touch state
    touchStartX = 0;
    touchStartY = 0;
    isSwiping = false;
    clearTimeout(tapTimeout);
}

// Handle keyboard input
function handleKeyPress(e) {
    if (isPaused && e.key !== 'p' && e.key !== 'Escape') return;
    
    switch (e.key) {
        case 'ArrowLeft':
            movePiece(-1);
            break;
        case 'ArrowRight':
            movePiece(1);
            break;
        case 'ArrowDown':
            dropPiece();
            break;
        case 'ArrowUp':
        case 'x':
            rotatePiece(1); // Rotate clockwise
            break;
        case 'z':
        case 'Control':
            rotatePiece(-1); // Rotate counter-clockwise
            break;
        case 'b':
        case 'B':
            swapPieceValues();
            break;
        case ' ':
            hardDrop();
            break;
        case 'p':
        case 'Escape':
            togglePause();
            break;
    }
}

// Hard drop - instantly drop the piece to the bottom
function hardDrop() {
    if (isPaused || gameOver) return;
    
    while (dropPiece()) {
        // Keep dropping until we can't drop anymore
    }
}

// Game over
function endGame() {
    gameOver = true;
    cancelAnimationFrame(gameLoop);
    finalScoreElement.textContent = score;
    gameOverElement.classList.remove('hidden');
    
    // Update high score in local storage
    const highScore = localStorage.getItem('binaryTetrisHighScore') || 0;
    if (score > highScore) {
        localStorage.setItem('binaryTetrisHighScore', score);
    }
}

// Game update loop
function gameUpdate(time = 0) {
    if (isPaused || gameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    // Drop the piece automatically
    if (time - dropStart > dropInterval) {
        dropPiece();
        dropStart = time;
    }
    
    // Draw the game
    drawBoard();
    
    // Continue the game loop
    gameLoop = requestAnimationFrame(gameUpdate);
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', init);
