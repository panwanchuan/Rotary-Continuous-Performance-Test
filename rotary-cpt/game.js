// Game state
const gameState = {
    isRunning: false,
    isDemo: true,
    demoDuration: 30000, // 30 seconds
    fullGameDuration: 15 * 60 * 1000, // 15 minutes
    gameDuration: 30000, // Active duration (demo or full)
    startTime: null,
    currentTime: 0,

    // Pause state
    isPaused: false,
    totalPausedDuration: 0,
    pauseStartTime: null,

    // Pointer state
    pointerAngle: 0,
    pointerSpeed: 0.06, // doubled
    baseSpeed: 0.06, // doubled
    speedChangeInterval: 3000, // Change speed every 3 seconds
    lastSpeedChange: null,
    lastFrameTime: null,

    // Distractor pointer (visual only)
    distractorAngle: 0,
    distractorSpeed: 0.045,

    // Trial state
    currentTrial: null,
    trials: [],
    trialStartTime: null,

    // Response tracking
    responses: [],
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    correctRejections: 0,

    // Canvas
    canvas: null,
    ctx: null,
    centerX: 0,
    centerY: 0,
    radius: 200,

    // Animation
    animationId: null,
};

// Initialize game
function initGame() {
    gameState.canvas = document.getElementById('game-canvas');
    gameState.ctx = gameState.canvas.getContext('2d');

    // Set canvas size
    const size = 500;
    gameState.canvas.width = size;
    gameState.canvas.height = size;
    gameState.centerX = size / 2;
    gameState.centerY = size / 2;
    gameState.radius = 200;

    // Event listeners
    document.getElementById('start-demo-btn').addEventListener('click', startDemo);
    document.getElementById('start-full-game-btn')?.addEventListener('click', startFullGame);
    document.getElementById('restart-btn').addEventListener('click', () => {
        showScreen('start-screen');
        resetGame();
    });
    document.getElementById('play-full-game-btn')?.addEventListener('click', startFullGame);
    document.getElementById('pause-btn')?.addEventListener('click', pauseGame);
    document.getElementById('stop-btn')?.addEventListener('click', stopGame);
    document.getElementById('resume-btn-overlay')?.addEventListener('click', resumeGame);
    document.getElementById('stop-btn-overlay')?.addEventListener('click', stopGame);

    // Use spacebar instead of click
    document.addEventListener('keydown', handleKeyPress);
}

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Reset game state
function resetGame() {
    gameState.isRunning = false;
    gameState.startTime = null;
    gameState.currentTime = 0;

    gameState.pointerAngle = 0;
    gameState.pointerSpeed = gameState.baseSpeed;

    // Reset distractor
    gameState.distractorAngle = 0;

    gameState.currentTrial = null;
    gameState.trials = [];
    gameState.trialStartTime = null;
    gameState.responses = [];
    gameState.hits = 0;
    gameState.misses = 0;
    gameState.falseAlarms = 0;
    gameState.correctRejections = 0;
    gameState.lastFrameTime = null;
    gameState.lastSpeedChange = null;
    gameState.isPaused = false;
    gameState.totalPausedDuration = 0;
    gameState.pauseStartTime = null;

    updateStats();

    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
        gameState.animationId = null;
    }
}

// Start demo (30 seconds)
function startDemo() {
    resetGame();
    showScreen('game-screen');
    gameState.isRunning = true;
    gameState.isDemo = true;
    gameState.gameDuration = gameState.demoDuration;
    gameState.startTime = Date.now();
    hidePauseOverlay();
    setGameControlsForRunning();

    generateTrials(gameState.gameDuration);

    setTimeout(() => startNextTrial(), 1000);

    gameState.lastFrameTime = Date.now();
    gameState.lastSpeedChange = Date.now();
    gameLoop();
}

// Start full game (15 minutes). Play after demo or from start.
function startFullGame() {
    resetGame();
    showScreen('game-screen');
    gameState.isRunning = true;
    gameState.isDemo = false;
    gameState.gameDuration = gameState.fullGameDuration;
    gameState.startTime = Date.now();
    hidePauseOverlay();
    setGameControlsForRunning();

    generateTrials(gameState.gameDuration);

    setTimeout(() => startNextTrial(), 1000);

    gameState.lastFrameTime = Date.now();
    gameState.lastSpeedChange = Date.now();
    gameLoop();
}

function setGameControlsForRunning() {
    const wrap = document.getElementById('game-controls-wrap');
    if (wrap) wrap.style.display = 'flex';
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    if (pauseBtn) { pauseBtn.style.display = 'inline-block'; pauseBtn.disabled = false; }
    if (stopBtn) { stopBtn.style.display = 'inline-block'; stopBtn.disabled = false; }
}

function showPauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.add('active');
}

function hidePauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.remove('active');
}

function pauseGame() {
    if (!gameState.isRunning || gameState.isPaused) return;
    gameState.isPaused = true;
    gameState.pauseStartTime = Date.now();

    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
        gameState.animationId = null;
    }

    const wrap = document.getElementById('game-controls-wrap');
    if (wrap) wrap.style.display = 'none';

    displayResultsInOverlay();
    showPauseOverlay();
}

function resumeGame() {
    if (!gameState.isRunning || !gameState.isPaused) return;
    gameState.totalPausedDuration += Date.now() - gameState.pauseStartTime;
    gameState.isPaused = false;
    gameState.pauseStartTime = null;

    hidePauseOverlay();
    const wrap = document.getElementById('game-controls-wrap');
    if (wrap) wrap.style.display = 'flex';

    gameState.lastFrameTime = Date.now();
    gameState.lastSpeedChange = Date.now();
    gameLoop();
}

function stopGame() {
    if (!gameState.isRunning) return;
    gameState.isRunning = false;
    gameState.isPaused = false;
    if (gameState.pauseStartTime) {
        gameState.totalPausedDuration += Date.now() - gameState.pauseStartTime;
        gameState.pauseStartTime = null;
    }
    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
        gameState.animationId = null;
    }
    hidePauseOverlay();
    endGameShowResults();
}

// Elapsed game time (excluding paused time)
function getElapsed() {
    let paused = gameState.totalPausedDuration;
    if (gameState.isPaused && gameState.pauseStartTime)
        paused += Date.now() - gameState.pauseStartTime;
    return Date.now() - gameState.startTime - paused;
}

// Generate trials for a given duration (ms)
function generateTrials(duration) {
    const totalTime = duration;
    const minTrialInterval = 2000; // Minimum 2 seconds between trial starts (includes delay)
    const maxTrialInterval = 4000; // Maximum 4 seconds between trial starts (includes delay)
    const baseWindowDuration = 2000; // Base 2 seconds

    // Pointer rotation speed in radians per second (use base speed for trial generation)
    const pointerSpeedRadPerSec = gameState.baseSpeed * 60;

    let currentTime = 0;
    let trialId = 0;
    let simulatedPointerAngle = 0; // Track pointer position during generation

    while (currentTime < totalTime) {
        // Random interval between trial starts
        const interval = minTrialInterval + Math.random() * (maxTrialInterval - minTrialInterval);
        currentTime += interval;

        // Update simulated pointer position during interval
        simulatedPointerAngle += pointerSpeedRadPerSec * (interval / 1000);

        if (currentTime >= totalTime) break;

        // 70% Go trials, 30% No-Go trials for demo
        const isGoTrial = Math.random() < 0.7;

        // Window size in radians (about 45 degrees)
        const windowSize = Math.PI / 4;

        // Normalize pointer angle
        let normalizedPointer = ((simulatedPointerAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

        // Find a good window position that's not too close or too far
        const minTimeToReach = 200; // Minimum 200ms travel time
        const maxTimeToReach = 2500; // Maximum 2.5 seconds travel time
        const minAngleDistance = (minTimeToReach / 1000) * pointerSpeedRadPerSec; // Minimum angle in radians
        const maxAngleDistance = (maxTimeToReach / 1000) * pointerSpeedRadPerSec; // Maximum angle in radians

        let windowAngle;
        let angleDiff;
        let timeToReach;
        let attempts = 0;
        const maxAttempts = 20;

        do {
            // Random angle for window position
            windowAngle = Math.random() * Math.PI * 2;

            // Normalize window angle
            let normalizedWindow = ((windowAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

            // Calculate shortest angular distance
            angleDiff = Math.abs(normalizedPointer - normalizedWindow);
            if (angleDiff > Math.PI) {
                angleDiff = Math.PI * 2 - angleDiff;
            }

            // Calculate time to reach window entry point
            timeToReach = (angleDiff / pointerSpeedRadPerSec) * 1000;

            attempts++;

            if (attempts >= maxAttempts) {
                if (timeToReach < minTimeToReach) {
                    const direction = Math.random() < 0.5 ? 1 : -1;
                    windowAngle = normalizedPointer + (direction * minAngleDistance);
                    windowAngle = ((windowAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

                    let adjustedNormalizedWindow = ((windowAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                    angleDiff = Math.abs(normalizedPointer - adjustedNormalizedWindow);
                    if (angleDiff > Math.PI) {
                        angleDiff = Math.PI * 2 - angleDiff;
                    }
                    timeToReach = (angleDiff / pointerSpeedRadPerSec) * 1000;
                } else if (timeToReach > maxTimeToReach) {
                    const direction = Math.random() < 0.5 ? 1 : -1;
                    windowAngle = normalizedPointer + (direction * maxAngleDistance);
                    windowAngle = ((windowAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

                    let adjustedNormalizedWindow = ((windowAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                    angleDiff = Math.abs(normalizedPointer - adjustedNormalizedWindow);
                    if (angleDiff > Math.PI) {
                        angleDiff = Math.PI * 2 - angleDiff;
                    }
                    timeToReach = (angleDiff / pointerSpeedRadPerSec) * 1000;
                }
                break;
            }
        } while (timeToReach < minTimeToReach || timeToReach > maxTimeToReach);

        // Calculate time for pointer to travel through entire window
        const timeToTravelThrough = (windowSize / pointerSpeedRadPerSec) * 1000;

        const minTimeInWindow = 1500;
        const buffer = 800;
        const windowDuration = Math.max(
            baseWindowDuration,
            timeToReach + timeToTravelThrough + minTimeInWindow + buffer
        );

        const trial = {
            id: trialId++,
            startTime: currentTime,
            duration: windowDuration,
            isGoTrial: isGoTrial,
            windowAngle: windowAngle,
            windowSize: windowSize,
            responded: false,
            responseTime: null,
            pointerEntryTime: null,
        };

        gameState.trials.push(trial);
    }
}

// Start next trial
function startNextTrial() {
    if (!gameState.isRunning || gameState.isPaused) return;

    const elapsed = getElapsed();
    const nextTrial = gameState.trials.find(t =>
        !t.responded && t.startTime <= elapsed && elapsed < t.startTime + t.duration
    );

    if (nextTrial && !gameState.currentTrial) {
        gameState.currentTrial = nextTrial;
        gameState.trialStartTime = Date.now();

        // Update instruction
        const instruction = document.getElementById('trial-instruction');
        if (nextTrial.isGoTrial) {
            instruction.textContent = 'Blue window - Press SPACEBAR when pointer is inside!';
            instruction.style.color = '#2196F3';
        } else {
            instruction.textContent = 'Red window - Do NOT press SPACEBAR!';
            instruction.style.color = '#f44336';
        }
    }

    if (!gameState.currentTrial) {
        const upcomingTrial = gameState.trials.find(t =>
            t.startTime > elapsed && t.startTime <= elapsed + 100
        );
        if (upcomingTrial) {
            setTimeout(() => startNextTrial(), upcomingTrial.startTime - elapsed);
        }
    }
}

// Handle key press (spacebar)
function handleKeyPress(event) {
    if (!gameState.isRunning || gameState.isPaused || !gameState.currentTrial) return;

    // Only respond to spacebar
    if (event.code !== 'Space' && event.key !== ' ') return;

    // Prevent default behavior (scrolling)
    event.preventDefault();

    const pressTime = Date.now();
    const trial = gameState.currentTrial;

    // Calculate pointer angle at press time (REAL pointer only)
    const pointerAngle = gameState.pointerAngle;

    // Normalize angles to [0, 2π]
    let normalizedPointer = ((pointerAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
    let normalizedWindow = ((trial.windowAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

    // Calculate angle difference
    let angleDiff = Math.abs(normalizedPointer - normalizedWindow);
    if (angleDiff > Math.PI) {
        angleDiff = Math.PI * 2 - angleDiff;
    }

    // Check if pointer is within window
    const isInWindow = angleDiff <= trial.windowSize / 2;

    if (trial.isGoTrial) {
        if (isInWindow && !trial.responded) {
            trial.responded = true;
            trial.responseTime = pressTime - gameState.trialStartTime;

            // Calculate reaction time from pointer entry
            if (trial.pointerEntryTime) {
                const rt = pressTime - trial.pointerEntryTime;
                gameState.responses.push({
                    type: 'hit',
                    reactionTime: rt,
                    trial: trial.id
                });
            }

            gameState.hits++;
            updateStats();

            endTrialEarly();
        } else if (!isInWindow && !trial.responded) {
            // Anticipatory still counts as hit (existing behavior)
            trial.responded = true;
            gameState.hits++;
            updateStats();

            endTrialEarly();
        }
    } else {
        // No-Go trial - any press is a false alarm
        if (!trial.responded) {
            trial.responded = true;
            trial.responseTime = pressTime - gameState.trialStartTime;
            gameState.falseAlarms++;
            gameState.responses.push({
                type: 'false_alarm',
                reactionTime: pressTime - gameState.trialStartTime,
                trial: trial.id
            });
            updateStats();

            endTrialEarly();
        }
    }
}

// End trial early when player responds
function endTrialEarly() {
    if (!gameState.currentTrial) return;

    gameState.currentTrial = null;
    gameState.trialStartTime = null;

    // Update instruction
    document.getElementById('trial-instruction').textContent = 'Wait for the next window... Press SPACEBAR to respond';
    document.getElementById('trial-instruction').style.color = '#555';

    // Wait 1 second before starting next trial
    setTimeout(() => startNextTrial(), 1000);
}

// Update statistics display
function updateStats() {
    document.getElementById('hits-count').textContent = gameState.hits;
    document.getElementById('misses-count').textContent = gameState.misses;
    document.getElementById('false-alarms-count').textContent = gameState.falseAlarms;
}

// Draw game
function draw() {
    const ctx = gameState.ctx;
    const centerX = gameState.centerX;
    const centerY = gameState.centerY;
    const radius = gameState.radius;

    // Clear canvas
    ctx.clearRect(0, 0, gameState.canvas.width, gameState.canvas.height);

    // Draw outer circle
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw center point
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw current trial window if active
    if (gameState.currentTrial) {
        const trial = gameState.currentTrial;
        const elapsed = Date.now() - gameState.trialStartTime;

        if (elapsed < trial.duration) {
            const startAngle = trial.windowAngle - trial.windowSize / 2;
            const endAngle = trial.windowAngle + trial.windowSize / 2;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();

            if (trial.isGoTrial) {
                ctx.strokeStyle = '#2196F3';
                ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
            } else {
                ctx.strokeStyle = '#f44336';
                ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
            }

            ctx.lineWidth = 5;
            ctx.fill();
            ctx.stroke();

            // Draw window edges more prominently
            ctx.strokeStyle = trial.isGoTrial ? '#1976D2' : '#D32F2F';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(startAngle) * radius,
                centerY + Math.sin(startAngle) * radius
            );
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(endAngle) * radius,
                centerY + Math.sin(endAngle) * radius
            );
            ctx.stroke();

            // Check if REAL pointer has entered the window
            if (!trial.pointerEntryTime) {
                const pointerAngle = gameState.pointerAngle;
                let normalizedPointer = ((pointerAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                let normalizedWindow = ((trial.windowAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

                let angleDiff = Math.abs(normalizedPointer - normalizedWindow);
                if (angleDiff > Math.PI) {
                    angleDiff = Math.PI * 2 - angleDiff;
                }

                if (angleDiff <= trial.windowSize / 2) {
                    trial.pointerEntryTime = Date.now();
                }
            }
        } else {
            // Trial ended
            if (trial.isGoTrial && !trial.responded) {
                gameState.misses++;
                updateStats();
            } else if (!trial.isGoTrial && !trial.responded) {
                gameState.correctRejections++;
            }

            gameState.currentTrial = null;
            gameState.trialStartTime = null;

            // Start next trial after 1 second delay
            setTimeout(() => startNextTrial(), 1000);

            // Update instruction
            document.getElementById('trial-instruction').textContent = 'Wait for the next window... Press SPACEBAR to respond';
            document.getElementById('trial-instruction').style.color = '#555';
        }
    }

    // Draw distractor pointer (visual only)
    {
        const distractorLength = radius - 25;
        const dx = centerX + Math.cos(gameState.distractorAngle) * distractorLength;
        const dy = centerY + Math.sin(gameState.distractorAngle) * distractorLength;

        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(dx, dy);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Draw rotating pointer (REAL)
    const pointerLength = radius - 10;
    const pointerX = centerX + Math.cos(gameState.pointerAngle) * pointerLength;
    const pointerY = centerY + Math.sin(gameState.pointerAngle) * pointerLength;

    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(pointerX, pointerY);
    ctx.stroke();

    // Draw pointer tip
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.arc(pointerX, pointerY, 8, 0, Math.PI * 2);
    ctx.fill();
}

// Format seconds as m:ss
function formatTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : String(s);
}

// Game loop
function gameLoop() {
    if (!gameState.isRunning || gameState.isPaused) return;

    const now = Date.now();
    const elapsed = getElapsed();

    // Update timer
    const remainingMs = Math.max(0, gameState.gameDuration - elapsed);
    const remainingSec = Math.ceil(remainingMs / 1000);
    const timerEl = document.getElementById('timer-display');
    const suffixEl = document.getElementById('timer-suffix');
    if (timerEl) timerEl.textContent = gameState.isDemo ? remainingSec : formatTimer(remainingSec);
    if (suffixEl) suffixEl.textContent = gameState.isDemo ? 's' : '';

    // Change REAL pointer speed periodically (variable speed)
    if (gameState.lastSpeedChange && (now - gameState.lastSpeedChange) >= gameState.speedChangeInterval) {
        const speedMultiplier = 0.5 + Math.random() * 1.0; // 0.5 to 1.5
        gameState.pointerSpeed = gameState.baseSpeed * speedMultiplier;
        gameState.lastSpeedChange = now;
    }

    // Update angles (frame-rate independent)
    if (gameState.lastFrameTime) {
        const deltaTime = (now - gameState.lastFrameTime) / 1000;
        gameState.pointerAngle += gameState.pointerSpeed * deltaTime * 60;
        gameState.distractorAngle += gameState.distractorSpeed * deltaTime * 60;
    }
    gameState.lastFrameTime = now;

    startNextTrial();
    draw();

    if (elapsed >= gameState.gameDuration) {
        endGameShowResults();
        return;
    }

    gameState.animationId = requestAnimationFrame(gameLoop);
}

function computeResults() {
    const goTrials = gameState.trials.filter(t => t.isGoTrial);
    const noGoTrials = gameState.trials.filter(t => !t.isGoTrial);
    const totalGoTrials = goTrials.length;
    const totalNoGoTrials = noGoTrials.length;
    const hitRate = totalGoTrials > 0 ? gameState.hits / totalGoTrials : 0;
    const falseAlarmRate = totalNoGoTrials > 0 ? gameState.falseAlarms / totalNoGoTrials : 0;
    const zHit = hitRate >= 1 ? 3 : hitRate <= 0 ? -3 :
        Math.sqrt(2) * inverseError(2 * hitRate - 1);
    const zFA = falseAlarmRate >= 1 ? 3 : falseAlarmRate <= 0 ? -3 :
        Math.sqrt(2) * inverseError(2 * falseAlarmRate - 1);
    const dPrime = zHit - zFA;
    const hitRTs = gameState.responses
        .filter(r => r.type === 'hit' && r.reactionTime)
        .map(r => r.reactionTime);
    const meanRT = hitRTs.length > 0
        ? hitRTs.reduce((a, b) => a + b, 0) / hitRTs.length
        : 0;
    const rtVariance = hitRTs.length > 0
        ? hitRTs.reduce((sum, rt) => sum + Math.pow(rt - meanRT, 2), 0) / hitRTs.length
        : 0;
    const rtSD = Math.sqrt(rtVariance);
    const totalTrials = gameState.trials.length;
    const correctResponses = gameState.hits + gameState.correctRejections;
    const accuracy = totalTrials > 0 ? (correctResponses / totalTrials) * 100 : 0;
    return {
        accuracy, meanRT, rtSD,
        hits: gameState.hits, misses: gameState.misses,
        falseAlarms: gameState.falseAlarms, correctRejections: gameState.correctRejections,
        hitRate, falseAlarmRate, dPrime,
    };
}

function displayResultsInOverlay() {
    const r = computeResults();
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('pause-accuracy-value', r.accuracy.toFixed(1) + '%');
    set('pause-reaction-time-value', Math.round(r.meanRT) + ' ms');
    set('pause-results-hits', String(r.hits));
    set('pause-results-misses', String(r.misses));
    set('pause-results-false-alarms', String(r.falseAlarms));
    set('pause-results-correct-rejections', String(r.correctRejections));
    set('pause-hit-rate', (r.hitRate * 100).toFixed(1) + '%');
    set('pause-false-alarm-rate', (r.falseAlarmRate * 100).toFixed(1) + '%');
    set('pause-d-prime', r.dPrime.toFixed(2));
    set('pause-mean-rt', Math.round(r.meanRT) + ' ms');
    set('pause-rt-sd', Math.round(r.rtSD) + ' ms');
}

function displayResultsOnFinalScreen(r) {
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('accuracy-value', r.accuracy.toFixed(1) + '%');
    set('reaction-time-value', Math.round(r.meanRT) + ' ms');
    set('results-hits', String(r.hits));
    set('results-misses', String(r.misses));
    set('results-false-alarms', String(r.falseAlarms));
    set('results-correct-rejections', String(r.correctRejections));
    set('hit-rate', (r.hitRate * 100).toFixed(1) + '%');
    set('false-alarm-rate', (r.falseAlarmRate * 100).toFixed(1) + '%');
    set('d-prime', r.dPrime.toFixed(2));
    set('mean-rt', Math.round(r.meanRT) + ' ms');
    set('rt-sd', Math.round(r.rtSD) + ' ms');
}

// End game (timer finished or stop) and show results screen
function endGameShowResults() {
    gameState.isRunning = false;
    gameState.isPaused = false;
    gameState.pauseStartTime = null;
    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
        gameState.animationId = null;
    }
    hidePauseOverlay();

    const r = computeResults();
    displayResultsOnFinalScreen(r);
    const title = document.querySelector('#results-screen h1');
    if (title) title.textContent = gameState.isDemo ? 'Demo Results' : 'Game Results';
    const playFull = document.getElementById('play-full-game-btn');
    if (playFull) playFull.style.display = gameState.isDemo ? 'inline-block' : 'none';
    showScreen('results-screen');
}

// Inverse error function approximation
function inverseError(x) {
    // Approximation using Winitzki's formula
    const a = 0.147;
    const sign = x < 0 ? -1 : 1;
    const ln = Math.log(1 - x * x);
    return sign * Math.sqrt(
        Math.sqrt(
            Math.pow((2 / (Math.PI * a)) + ln / 2, 2) - ln / a
        ) - (2 / (Math.PI * a)) - ln / 2
    );
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initGame);