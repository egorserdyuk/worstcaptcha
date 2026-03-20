/**
 * Worst Captcha - The Most Annoying Captcha Ever Created
 * Features:
 * - 6×6 grid of chaotically crawling shapes
 * - Instructions that change every 1.8 seconds
 * - Score exactly 25 correct clicks in 12 seconds
 * - Wrong click: -3 points, screen shake, "BOT DETECTED" sound
 * - Cursor disappearing/inverting
 * - Shapes changing at click time
 * - Click too fast detection
 * - White text on white background once per session
 */

class WorstCaptcha {
    constructor() {
        this.gridSize = 6;
        this.shapes = [];
        this.instructions = [];
        this.currentInstructionIndex = 0;
        this.score = 0;
        this.targetScore = 25;
        this.timeLimit = 12;
        this.instructionInterval = 1.8;
        this.startTime = null;
        this.isActive = false;
        this.seed = null;
        this.whiteTextUsed = false;
        this.lastClickTime = 0;
        this.clickCount = 0;
        this.wrongClicks = 0;
        
        // Audio context for bot sound
        this.audioContext = null;
        
        // Animation frame ID
        this.animationId = null;
        
        // 3-step captcha system
        this.currentStep = 1;
        this.step2Notes = [];
        this.step2CurrentNoteIndex = 0;
        this.step2TargetFrequency = 0;
        this.step2MicrophoneStream = null;
        this.step2Analyser = null;
        this.step2IsListening = false;
        this.step2MatchedNotes = 0;
        this.step2TimeLimit = 60; // 1 minute for step 2
        this.step2StartTime = null;
        this.step2IsNoteMatched = false; // Flag to prevent multiple matches
        
        // Step 3: Image selection
        this.step3Images = [];
        this.step3CurrentCategory = '';
        this.step3SelectedIndices = [];
        this.step3Score = 0;
        this.step3TotalCategories = 5;
        this.step3Is18Plus = false;
        this.step3Skipped = false;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Initialize Quill editor
        this.quill = new Quill('#editor', {
            theme: 'snow',
            placeholder: 'Write your comment here...'
        });
        
        // Set up event listeners
        document.getElementById('submit-comment').addEventListener('click', () => this.showCaptcha());
        document.getElementById('captcha-close').addEventListener('click', () => this.hideCaptcha());
        
        // Checkbox interaction
        document.getElementById('captcha-check').addEventListener('change', (e) => {
            if (e.target.checked) {
                // Add spinning animation inside checkbox
                const checkboxCustom = document.querySelector('.checkbox-custom');
                checkboxCustom.classList.add('spinning');
                
                // Show captcha after a brief delay (like Google reCAPTCHA)
                setTimeout(() => {
                    checkboxCustom.classList.remove('spinning');
                    this.showCaptcha();
                }, 800);
            }
        });
        
        // Load comments
        this.loadComments();
    }
    
    async showCaptcha() {
        // Check if comment is empty
        const content = this.quill.getText().trim();
        if (!content) {
            alert('Please write a comment first!');
            return;
        }
        
        // Show captcha widget
        document.getElementById('captcha-widget').classList.remove('hidden');
        
        // Generate captcha session
        await this.generateCaptcha();
        
        // Start the game
        this.startGame();
    }
    
    hideCaptcha() {
        document.getElementById('captcha-widget').classList.add('hidden');
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Stop microphone if active
        if (this.step2MicrophoneStream) {
            this.step2MicrophoneStream.getTracks().forEach(track => track.stop());
            this.step2MicrophoneStream = null;
        }
        this.step2IsListening = false;
        this.step2StartTime = null;
        
        // Reset checkbox and clean check field
        this.resetCheckbox();
        
        // Show step 1 instruction and status again
        document.getElementById('captcha-instruction').classList.remove('hidden');
        document.querySelector('.captcha-status').classList.remove('hidden');
        document.querySelector('.captcha-progress').classList.remove('hidden');
    }
    
    resetCheckbox() {
        const checkbox = document.getElementById('captcha-check');
        checkbox.checked = false;
        const checkboxCustom = document.querySelector('.checkbox-custom');
        checkboxCustom.classList.remove('spinning');
        
        // Remove completed class
        const captchaCheckbox = document.getElementById('captcha-checkbox');
        captchaCheckbox.classList.remove('completed');
    }
    
    async generateCaptcha() {
        try {
            const response = await fetch('/api/captcha/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            
            const data = await response.json();
            this.seed = data.seed;
            this.instructions = data.instructions;
            this.shapes = data.shapes;
            this.currentInstructionIndex = 0;
            this.score = 0;
            this.wrongClicks = 0;
            this.clickCount = 0;
            this.whiteTextUsed = false;
            
            // Render grid
            this.renderGrid();
            
            // Update instruction
            this.updateInstruction();
            
        } catch (error) {
            console.error('Failed to generate captcha:', error);
        }
    }
    
    renderGrid() {
        const grid = document.getElementById('captcha-grid');
        grid.innerHTML = '';
        
        for (let i = 0; i < 36; i++) {
            const cell = document.createElement('div');
            cell.className = 'captcha-cell';
            cell.dataset.id = i;
            
            const shape = this.shapes[i];
            const shapeEl = document.createElement('div');
            shapeEl.className = `shape ${shape.type}`;
            shapeEl.style.backgroundColor = shape.color;
            
            if (shape.type === 'triangle') {
                shapeEl.style.borderBottomColor = shape.color;
            }
            
            cell.appendChild(shapeEl);
            
            cell.addEventListener('click', (e) => this.handleCellClick(i, e));
            
            grid.appendChild(cell);
        }
    }
    
    startGame() {
        this.isActive = true;
        this.startTime = Date.now();
        this.lastInstructionChange = Date.now();
        
        // Start animation loop
        this.animate();
        
        // Start timer
        this.updateTimer();
        
        // Start instruction change interval
        this.instructionTimer = setInterval(() => {
            this.changeInstruction();
        }, this.instructionInterval * 1000);
        
        // Start cursor tricks
        this.startCursorTricks();
        
        // Start shape change tricks
        this.startShapeChangeTricks();
    }
    
    animate() {
        if (!this.isActive) return;
        
        // Move shapes
        this.shapes.forEach((shape, index) => {
            shape.x += shape.speed_x;
            shape.y += shape.speed_y;
            
            // Bounce off walls (limit movement to stay within cell)
            if (shape.x < -20 || shape.x > 20) shape.speed_x *= -1;
            if (shape.y < -20 || shape.y > 20) shape.speed_y *= -1;
            
            // Update position
            const cell = document.querySelector(`[data-id="${index}"]`);
            if (cell) {
                const shapeEl = cell.querySelector('.shape');
                shapeEl.style.transform = `translate(-50%, -50%) translate(${shape.x}px, ${shape.y}px) rotate(${shape.rotation}deg) scale(${shape.scale})`;
                shapeEl.style.opacity = shape.opacity;
            }
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    updateTimer() {
        if (!this.isActive) return;
        
        const elapsed = (Date.now() - this.startTime) / 1000;
        const remaining = Math.max(0, this.timeLimit - elapsed);
        
        document.getElementById('captcha-time').textContent = `Time: ${remaining.toFixed(1)}s`;
        document.getElementById('captcha-score').textContent = `Score: ${this.score}/${this.targetScore}`;
        
        // Update progress bar
        const progress = (this.score / this.targetScore) * 100;
        document.getElementById('progress-bar').style.width = `${progress}%`;
        
        if (remaining <= 0) {
            this.gameOver(false);
            return;
        }
        
        requestAnimationFrame(() => this.updateTimer());
    }
    
    changeInstruction() {
        if (!this.isActive) return;
        
        this.currentInstructionIndex = (this.currentInstructionIndex + 1) % this.instructions.length;
        this.updateInstruction();
        
        // White text on white background trick (once per session)
        if (!this.whiteTextUsed && Math.random() < 0.2) {
            this.whiteTextUsed = true;
            const instructionEl = document.getElementById('captcha-instruction');
            instructionEl.classList.add('white-text');
            setTimeout(() => {
                instructionEl.classList.remove('white-text');
            }, 2000);
        }
    }
    
    updateInstruction() {
        const instructionEl = document.getElementById('captcha-instruction');
        instructionEl.textContent = this.instructions[this.currentInstructionIndex];
    }
    
    async handleCellClick(cellId, event) {
        if (!this.isActive) return;
        
        // Check for too-fast clicking
        const now = Date.now();
        const timeBetweenClicks = now - this.lastClickTime;
        
        if (this.lastClickTime > 0 && timeBetweenClicks < 150) {
            this.triggerBotDetection();
            return;
        }
        
        this.lastClickTime = now;
        this.clickCount++;
        
        // Visual feedback
        const cell = event.currentTarget;
        cell.classList.add('clicked');
        setTimeout(() => cell.classList.remove('clicked'), 300);
        
        // Send click to server for verification
        try {
            const response = await fetch('/api/captcha/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shape_id: cellId,
                    instruction_index: this.currentInstructionIndex,
                    click_time: now
                })
            });
            
            const data = await response.json();
            
            if (data.restart) {
                this.triggerBotDetection();
                return;
            }
            
            if (data.valid) {
                this.score = data.score;
            } else {
                this.score = data.score;
                this.wrongClicks = data.wrong_clicks;
                
                // Trigger screen shake and sound
                this.triggerScreenShake();
                this.playBotSound();
            }
            
            // Check if completed
            if (data.completed) {
                this.gameOver(true);
            }
            
        } catch (error) {
            console.error('Failed to verify click:', error);
        }
    }
    
    triggerScreenShake() {
        const overlay = document.getElementById('shake-overlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('active');
        
        setTimeout(() => {
            overlay.classList.remove('active');
            overlay.classList.add('hidden');
        }, 500);
    }
    
    triggerBotDetection() {
        this.isActive = false;
        clearInterval(this.instructionTimer);
        
        const overlay = document.getElementById('bot-overlay');
        overlay.classList.remove('hidden');
        
        this.playBotSound();
        
        setTimeout(() => {
            overlay.classList.add('hidden');
            this.hideCaptcha();
        }, 2000);
    }
    
    playBotSound() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    startCursorTricks() {
        // Hide cursor randomly
        setInterval(() => {
            if (!this.isActive) return;
            
            if (Math.random() < 0.1) {
                document.body.classList.add('cursor-hidden');
                setTimeout(() => {
                    document.body.classList.remove('cursor-hidden');
                }, 700);
            }
        }, 3000);
        
        // Invert cursor direction
        setInterval(() => {
            if (!this.isActive) return;
            
            if (Math.random() < 0.05) {
                document.body.classList.add('cursor-inverted');
                setTimeout(() => {
                    document.body.classList.remove('cursor-inverted');
                }, 1000);
            }
        }, 5000);
    }
    
    startShapeChangeTricks() {
        setInterval(() => {
            if (!this.isActive) return;
            
            // Randomly change shape colors
            const randomIndex = Math.floor(Math.random() * 36);
            const shape = this.shapes[randomIndex];
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
            shape.color = colors[Math.floor(Math.random() * colors.length)];
            
            const cell = document.querySelector(`[data-id="${randomIndex}"]`);
            if (cell) {
                const shapeEl = cell.querySelector('.shape');
                shapeEl.style.backgroundColor = shape.color;
                if (shape.type === 'triangle') {
                    shapeEl.style.borderBottomColor = shape.color;
                }
            }
        }, 500);
        
        // Randomly change shape types
        setInterval(() => {
            if (!this.isActive) return;
            
            if (Math.random() < 0.1) {
                const randomIndex = Math.floor(Math.random() * 36);
                const shape = this.shapes[randomIndex];
                const types = ['square', 'circle', 'triangle', 'optical'];
                shape.type = types[Math.floor(Math.random() * types.length)];
                
                const cell = document.querySelector(`[data-id="${randomIndex}"]`);
                if (cell) {
                    const shapeEl = cell.querySelector('.shape');
                    shapeEl.className = `shape ${shape.type}`;
                    shapeEl.style.backgroundColor = shape.color;
                    if (shape.type === 'triangle') {
                        shapeEl.style.borderBottomColor = shape.color;
                    }
                }
            }
        }, 1000);
    }
    
    gameOver(completed) {
        this.isActive = false;
        clearInterval(this.instructionTimer);
        
        if (completed) {
            if (this.currentStep === 1) {
                // Step 1 completed - move to step 2
                this.currentStep = 2;
                this.startStep2();
            } else if (this.currentStep === 2) {
                // Step 2 completed - move to step 3 (to be implemented)
                this.currentStep = 3;
                this.startStep3();
            } else if (this.currentStep === 3) {
                // All steps completed
                const captchaCheckbox = document.getElementById('captcha-checkbox');
                captchaCheckbox.classList.add('completed');
                
                const checkbox = document.getElementById('captcha-check');
                checkbox.checked = true;
                
                alert('🎉 Captcha completed! You can now submit your comment.');
                this.hideCaptcha();
                this.submitComment();
            }
        } else {
            // Time expired - proceed to next step without interruption
            if (this.currentStep === 1) {
                // Failed step 1 - proceed to step 2 anyway
                this.currentStep = 2;
                this.startStep2();
            } else if (this.currentStep === 2) {
                // Failed step 2 - proceed to step 3 anyway
                this.currentStep = 3;
                this.startStep3();
            } else {
                // Failed step 3 - reset
                alert('⏰ Time expired! Please try again.');
                this.resetCheckbox();
                this.hideCaptcha();
            }
        }
    }
    
    // Step 2: Note Singing
    async startStep2() {
        // Generate 3 random notes (frequencies in Hz)
        const noteFrequencies = [261.63, 329.63, 392.00]; // C4, E4, G4
        this.step2Notes = noteFrequencies.sort(() => Math.random() - 0.5);
        this.step2CurrentNoteIndex = 0;
        this.step2MatchedNotes = 0;
        
        // Show step 2 UI
        this.showStep2UI();
        
        // Don't request microphone access automatically - let user click "Access Microphone" button
        // Timer will start after microphone access is granted
    }
    
    // Convert frequency (Hz) to note name
    frequencyToNote(frequency) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const A4 = 440;
        const semitones = 12 * Math.log2(frequency / A4);
        const noteIndex = Math.round(semitones) + 9; // A4 is index 9
        const octave = Math.floor((noteIndex + 3) / 12) + 4; // Calculate octave
        const noteName = noteNames[(noteIndex % 12 + 12) % 12]; // Ensure positive index
        return noteName + octave;
    }
    
    showStep2UI() {
        // Hide step 1 instruction and status
        document.getElementById('captcha-instruction').classList.add('hidden');
        document.querySelector('.captcha-status').classList.add('hidden');
        document.querySelector('.captcha-progress').classList.add('hidden');
        
        const grid = document.getElementById('captcha-grid');
        grid.innerHTML = `
            <div class="step2-container">
                <h3>Step 2: Sing the Notes</h3>
                <p>You must sing the note shown below. No audio preview is available - use your musical knowledge!</p>
                <div class="note-display">
                    <div class="target-note">
                        <span>Target Note:</span>
                        <span id="target-note-freq">${this.frequencyToNote(this.step2Notes[0])}</span>
                    </div>
                    <div class="user-note">
                        <span>Your Pitch:</span>
                        <span id="user-note-freq">--</span>
                    </div>
                </div>
                <div class="note-progress">
                    <span>Notes matched: <span id="notes-matched">0</span>/3</span>
                    <span id="step2-time" style="margin-left: 20px; color: #4CAF50;">Time: ${this.step2TimeLimit.toFixed(1)}s</span>
                </div>
                <button id="access-mic-btn" class="btn btn-primary">🎤 Access Microphone</button>
                <div class="mic-status" id="mic-status">Click the button above to grant microphone access</div>
            </div>
        `;
        
        document.getElementById('access-mic-btn').addEventListener('click', () => this.setupMicrophone());
    }
    
    updateStep2Timer() {
        if (!this.step2StartTime || this.currentStep !== 2) return;
        
        const elapsed = (Date.now() - this.step2StartTime) / 1000;
        const remaining = Math.max(0, this.step2TimeLimit - elapsed);
        
        // Update timer display if it exists
        const timerEl = document.getElementById('step2-time');
        if (timerEl) {
            timerEl.textContent = `Time: ${remaining.toFixed(1)}s`;
            
            // Change color when time is running low
            if (remaining < 10) {
                timerEl.style.color = '#ff4444';
            } else if (remaining < 20) {
                timerEl.style.color = '#ff9800';
            } else {
                timerEl.style.color = '#4CAF50';
            }
        }
        
        if (remaining <= 0) {
            // Time expired - move to step 3
            this.step2IsListening = false;
            if (this.step2MicrophoneStream) {
                this.step2MicrophoneStream.getTracks().forEach(track => track.stop());
            }
            this.currentStep = 3;
            this.startStep3();
            return;
        }
        
        requestAnimationFrame(() => this.updateStep2Timer());
    }
    
    async setupMicrophone() {
        try {
            // On iOS Safari, we need to handle AudioContext suspension
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Resume AudioContext if suspended (iOS requirement)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.step2MicrophoneStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false
                }
            });
            
            const source = this.audioContext.createMediaStreamSource(this.step2MicrophoneStream);
            this.step2Analyser = this.audioContext.createAnalyser();
            this.step2Analyser.fftSize = 2048;
            this.step2Analyser.smoothingTimeConstant = 0.8;
            
            source.connect(this.step2Analyser);
            
            this.step2IsListening = true;
            this.step2StartTime = Date.now();
            this.detectPitch();
            
            // Update UI to show microphone is active
            document.getElementById('mic-status').textContent = '🎤 Microphone active - sing the note!';
            document.getElementById('mic-status').style.color = '#4CAF50';
            
            // Hide the access microphone button
            const accessMicBtn = document.getElementById('access-mic-btn');
            if (accessMicBtn) {
                accessMicBtn.style.display = 'none';
            }
            
            // Start step 2 timer
            this.updateStep2Timer();
            
        } catch (err) {
            console.error('Microphone access denied:', err);
            const micStatus = document.getElementById('mic-status');
            micStatus.innerHTML = '❌ Microphone access denied<br><small>Please allow microphone access in your browser settings and reload the page</small>';
            micStatus.style.color = '#ff4444';
            micStatus.style.background = '#ffebee';
            micStatus.style.padding = '15px';
            micStatus.style.borderRadius = '8px';
        }
    }
    
    playTargetNote() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        this.step2TargetFrequency = this.step2Notes[this.step2CurrentNoteIndex];
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = this.step2TargetFrequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 1);
        
        document.getElementById('target-note-freq').textContent = this.frequencyToNote(this.step2TargetFrequency);
    }
    
    detectPitch() {
        if (!this.step2IsListening || !this.step2Analyser) return;
        
        const bufferLength = this.step2Analyser.fftSize;
        const buffer = new Float32Array(bufferLength);
        this.step2Analyser.getFloatTimeDomainData(buffer);
        
        // Autocorrelation pitch detection
        const pitch = this.autoCorrelate(buffer, this.audioContext.sampleRate);
        
        if (pitch > 0) {
            document.getElementById('user-note-freq').textContent = this.frequencyToNote(pitch);
            
            // Check if pitch matches target (within 10% tolerance)
            const tolerance = this.step2TargetFrequency * 0.1;
            if (Math.abs(pitch - this.step2TargetFrequency) < tolerance) {
                if (!this.step2IsNoteMatched) {
                    this.step2IsNoteMatched = true;
                    this.onNoteMatched();
                }
            } else {
                // Reset flag when user stops singing the correct note
                this.step2IsNoteMatched = false;
            }
        }
        
        requestAnimationFrame(() => this.detectPitch());
    }
    
    autoCorrelate(buffer, sampleRate) {
        // Autocorrelation algorithm for pitch detection
        const SIZE = buffer.length;
        const MAX_SAMPLES = Math.floor(SIZE / 2);
        let best_offset = -1;
        let best_correlation = 0;
        let rms = 0;
        
        for (let i = 0; i < SIZE; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        
        if (rms < 0.01) return -1; // Not enough signal
        
        let lastCorrelation = 1;
        for (let offset = 1; offset < MAX_SAMPLES; offset++) {
            let correlation = 0;
            for (let i = 0; i < MAX_SAMPLES; i++) {
                correlation += Math.abs(buffer[i] - buffer[i + offset]);
            }
            correlation = 1 - (correlation / MAX_SAMPLES);
            
            if (correlation > 0.9 && correlation > lastCorrelation) {
                const foundGoodCorrelation = correlation > best_correlation;
                if (foundGoodCorrelation) {
                    best_correlation = correlation;
                    best_offset = offset;
                }
            }
            lastCorrelation = correlation;
        }
        
        if (best_correlation > 0.01) {
            return sampleRate / best_offset;
        }
        return -1;
    }
    
    async onNoteMatched() {
        this.step2MatchedNotes++;
        document.getElementById('notes-matched').textContent = this.step2MatchedNotes;
        
        // Visual feedback
        const userNoteEl = document.getElementById('user-note-freq');
        userNoteEl.style.color = '#4CAF50';
        setTimeout(() => {
            userNoteEl.style.color = '';
        }, 500);
        
        if (this.step2MatchedNotes >= 3) {
            // Step 2 completed successfully - add to overall score
            this.step2IsListening = false;
            this.step2StartTime = null;
            if (this.step2MicrophoneStream) {
                this.step2MicrophoneStream.getTracks().forEach(track => track.stop());
            }
            
            // Notify backend that step 2 is completed
            try {
                await fetch('/api/captcha/step2/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('Failed to mark step 2 as complete:', error);
            }
            
            this.gameOver(true);
        } else {
            // Move to next note
            this.step2CurrentNoteIndex++;
            // Update the target frequency for pitch detection
            this.step2TargetFrequency = this.step2Notes[this.step2CurrentNoteIndex];
            // Update the target note display without playing audio
            document.getElementById('target-note-freq').textContent = this.frequencyToNote(this.step2Notes[this.step2CurrentNoteIndex]);
        }
    }
    
    // Step 3: Image Selection with Age Verification
    async startStep3() {
        // Show age verification first
        this.showAgeVerification();
    }
    
    showAgeVerification() {
        // Hide step 1 instruction and status
        document.getElementById('captcha-instruction').classList.add('hidden');
        document.querySelector('.captcha-status').classList.add('hidden');
        document.querySelector('.captcha-progress').classList.add('hidden');
        
        const grid = document.getElementById('captcha-grid');
        grid.innerHTML = `
            <div class="step3-container">
                <h3>Step 3: Age Verification</h3>
                <p>Before continuing, please confirm your age.</p>
                <div class="age-verification">
                    <p>Are you 18 years or older?</p>
                    <div class="age-buttons">
                        <button id="age-yes-btn" class="btn btn-primary">Yes, I'm 18+</button>
                        <button id="age-no-btn" class="btn btn-secondary">No, I'm under 18</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('age-yes-btn').addEventListener('click', () => this.handleAgeVerification(true));
        document.getElementById('age-no-btn').addEventListener('click', () => this.handleAgeVerification(false));
    }
    
    async handleAgeVerification(is18Plus) {
        this.step3Is18Plus = is18Plus;
        
        try {
            const response = await fetch('/api/captcha/step3/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_18_plus: is18Plus })
            });
            
            const data = await response.json();
            
            if (data.skipped) {
                // User is under 18, skip this step
                this.step3Skipped = true;
                this.completeCaptcha();
            } else {
                // User is 18+, show image grid
                this.step3Images = data.images;
                this.step3CurrentCategory = data.current_category;
                this.step3TotalCategories = data.total_categories;
                this.step3Score = 0;
                this.step3SelectedIndices = [];
                this.showImageGrid();
            }
        } catch (error) {
            console.error('Failed to generate step 3:', error);
        }
    }
    
    showImageGrid() {
        const grid = document.getElementById('captcha-grid');
        
        // Create 4x4 grid HTML
        let gridHTML = `
            <div class="step3-container">
                <h3>Step 3: Image Selection</h3>
                <p class="step3-instruction">Find all <span id="target-category" class="category-highlight">${this.step3CurrentCategory}</span> images</p>
                <div class="image-grid">
        `;
        
        // Add 16 image cells
        for (let i = 0; i < 16; i++) {
            const image = this.step3Images[i];
            gridHTML += `
                <div class="image-cell" data-index="${i}">
                    <img src="${image.path}" alt="${image.category}" loading="lazy">
                    <div class="selection-overlay"></div>
                </div>
            `;
        }
        
        gridHTML += `
                </div>
                <div class="step3-controls">
                    <div class="step3-progress">
                        <span>Category: <span id="category-progress">1</span>/${this.step3TotalCategories}</span>
                        <span>Score: <span id="step3-score">0</span></span>
                    </div>
                    <button id="step3-submit-btn" class="btn btn-primary">Submit Selection</button>
                </div>
            </div>
        `;
        
        grid.innerHTML = gridHTML;
        
        // Add click handlers to image cells
        document.querySelectorAll('.image-cell').forEach(cell => {
            cell.addEventListener('click', (e) => this.handleImageClick(e));
        });
        
        // Add submit handler
        document.getElementById('step3-submit-btn').addEventListener('click', () => this.submitImageSelection());
    }
    
    handleImageClick(event) {
        const cell = event.currentTarget;
        const index = parseInt(cell.dataset.index);
        
        // Toggle selection
        if (this.step3SelectedIndices.includes(index)) {
            this.step3SelectedIndices = this.step3SelectedIndices.filter(i => i !== index);
            cell.classList.remove('selected');
        } else {
            this.step3SelectedIndices.push(index);
            cell.classList.add('selected');
        }
    }
    
    async submitImageSelection() {
        try {
            const response = await fetch('/api/captcha/step3/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selected_indices: this.step3SelectedIndices
                })
            });
            
            const data = await response.json();
            
            if (data.valid) {
                // Correct selection
                this.step3Score = data.score;
                document.getElementById('step3-score').textContent = this.step3Score;
                
                if (data.completed) {
                    // All categories completed - backend will handle overall score
                    this.completeCaptcha();
                } else {
                    // Move to next category
                    this.step3CurrentCategory = data.next_category;
                    this.step3SelectedIndices = [];
                    document.getElementById('target-category').textContent = this.step3CurrentCategory;
                    document.getElementById('category-progress').textContent =
                        parseInt(document.getElementById('category-progress').textContent) + 1;
                    
                    // Clear selections
                    document.querySelectorAll('.image-cell').forEach(cell => {
                        cell.classList.remove('selected');
                    });
                }
            } else {
                // Wrong selection - show correct indices
                this.showCorrectSelection(data.correct_indices);
            }
        } catch (error) {
            console.error('Failed to verify selection:', error);
        }
    }
    
    showCorrectSelection(correctIndices) {
        // Highlight correct images
        document.querySelectorAll('.image-cell').forEach((cell, index) => {
            if (correctIndices.includes(index)) {
                cell.classList.add('correct');
            } else if (this.step3SelectedIndices.includes(index)) {
                cell.classList.add('incorrect');
            }
        });
        
        // Clear selections after a delay
        setTimeout(() => {
            this.step3SelectedIndices = [];
            document.querySelectorAll('.image-cell').forEach(cell => {
                cell.classList.remove('selected', 'correct', 'incorrect');
            });
        }, 1500);
    }
    
    async completeCaptcha() {
        // Notify backend that step 3 is completed
        try {
            await fetch('/api/captcha/step3/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Failed to mark step 3 as complete:', error);
        }
        
        // Check if overall score is >= 2
        if (this.overallScore >= 2) {
            const captchaCheckbox = document.getElementById('captcha-checkbox');
            captchaCheckbox.classList.add('completed');
            
            const checkbox = document.getElementById('captcha-check');
            checkbox.checked = true;
            
            alert('🎉 Captcha completed! You can now submit your comment.');
            this.hideCaptcha();
            this.submitComment();
        } else {
            alert('❌ Captcha failed! You need at least 2 points to pass. Please try again.');
            this.hideCaptcha();
            this.resetCheckbox();
        }
    }
    
    async submitComment() {
        const author = document.getElementById('author').value || 'Anonymous';
        const content = this.quill.getText().trim();
        const htmlContent = this.quill.root.innerHTML;
        
        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author: author,
                    content: content,
                    html_content: htmlContent
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear editor
                this.quill.setText('');
                
                // Reload comments
                this.loadComments();
            } else {
                alert('Failed to submit comment: ' + (data.error || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('Failed to submit comment:', error);
            alert('Failed to submit comment');
        }
    }
    
    async loadComments() {
        try {
            const response = await fetch('/api/comments');
            const data = await response.json();
            
            const commentsList = document.getElementById('comments-list');
            commentsList.innerHTML = '';
            
            if (data.comments.length === 0) {
                commentsList.innerHTML = '<p style="text-align: center; color: #999;">No comments yet. Be the first to leave one!</p>';
                return;
            }
            
            // Display comments in reverse order (newest first)
            data.comments.reverse().forEach(comment => {
                const commentEl = document.createElement('div');
                commentEl.className = 'comment-item';
                
                const time = new Date(comment.timestamp);
                const timeStr = time.toLocaleString();
                
                commentEl.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(comment.author)}</span>
                        <span class="comment-time">${timeStr}</span>
                    </div>
                    <div class="comment-content">${comment.html_content || this.escapeHtml(comment.content)}</div>
                `;
                
                commentsList.appendChild(commentEl);
            });
            
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.captcha = new WorstCaptcha();
});
