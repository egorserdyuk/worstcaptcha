const pixelmatchScript=document.createElement('script');pixelmatchScript.src='https://cdn.jsdelivr.net/npm/pixelmatch@7.1.0/index.min.js';pixelmatchScript.onload=()=>{};document.head.appendChild(pixelmatchScript);class WorstCaptcha{constructor(){this.audioContext=null;this.currentStep=1;this.drawingCanvas=null;this.drawingCtx=null;this.isDrawing=!1;this.drawingData=null;this.drawingStartTime=null;this.drawingTimeLimit=30;this.drawingTimerInterval=null;this.artImagePath=null;this.edgeImage=null;this.drawingSubmitting=!1;this.step2Notes=[];this.step2CurrentNoteIndex=0;this.step2TargetFrequency=0;this.step2MicrophoneStream=null;this.step2Analyser=null;this.step2IsListening=!1;this.step2MatchedNotes=0;this.step2TimeLimit=60;this.step2StartTime=null;this.step2IsNoteMatched=!1;this.step3Images=[];this.step3CurrentCategory='';this.step3SelectedIndices=[];this.step3TotalCategories=1;this.step3Is18Plus=!1;this.step3Skipped=!1;this.step3Submitting=!1;this.overallScore=0;this.init()}
async init(){this.quill=new Quill('#editor',{theme:'snow',placeholder:'Write your comment here...'});document.getElementById('submit-comment').addEventListener('click',()=>this.handleCommentSubmit());document.getElementById('captcha-close').addEventListener('click',()=>this.hideCaptcha());document.getElementById('captcha-check').addEventListener('change',(e)=>{const captchaCheckbox=document.getElementById('captcha-checkbox');if(captchaCheckbox.classList.contains('completed')){e.target.checked=!0;return}
if(e.target.checked){const checkboxCustom=document.querySelector('.checkbox-custom');checkboxCustom.classList.add('spinning');setTimeout(()=>{checkboxCustom.classList.remove('spinning');this.showCaptcha()},800)}});document.getElementById('captcha-check').addEventListener('click',(e)=>{const captchaCheckbox=document.getElementById('captcha-checkbox');if(captchaCheckbox.classList.contains('completed')&&e.target.checked){e.preventDefault()}});this.loadComments()}
handleCommentSubmit(){const content=this.quill.getText().trim();if(!content){alert('Please write a comment first!');return}
const captchaCheckbox=document.getElementById('captcha-checkbox');if(captchaCheckbox.classList.contains('completed')){this.submitComment()}else{this.showCaptcha()}}
async showCaptcha(){document.getElementById('captcha-widget').classList.remove('hidden');this.startGame()}
hideCaptcha(){document.getElementById('captcha-widget').classList.add('hidden');this.drawingSubmitting=!1;if(this.drawingTimerInterval){clearInterval(this.drawingTimerInterval);this.drawingTimerInterval=null}
if(this.step2MicrophoneStream){this.step2MicrophoneStream.getTracks().forEach(track=>track.stop());this.step2MicrophoneStream=null}
this.step2IsListening=!1;this.step2StartTime=null;const captchaCheckbox=document.getElementById('captcha-checkbox');if(!captchaCheckbox.classList.contains('completed')){this.resetCheckbox()}}
resetCheckbox(){const checkbox=document.getElementById('captcha-check');checkbox.checked=!1;const checkboxCustom=document.querySelector('.checkbox-custom');checkboxCustom.classList.remove('spinning');const captchaCheckbox=document.getElementById('captcha-checkbox');captchaCheckbox.classList.remove('completed')}
startGame(){this.startDrawingChallenge()}
async startDrawingChallenge(){try{const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),10000);const response=await fetch('/api/captcha/drawing/generate',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal});clearTimeout(timeoutId);const data=await response.json();if(data.success){this.artImagePath=data.image_path;this.edgeImage=data.edge_image;this.drawingTimeLimit=data.time_limit;this.drawingStartTime=Date.now();this.showDrawingUI()}else{}}catch(error){alert('Failed to load drawing challenge. Please refresh the page.')}}
showDrawingUI(){const grid=document.getElementById('captcha-grid');grid.innerHTML=`
            <div class="drawing-container">
                <h3>Step 1: Drawing Challenge</h3>
                <p>Draw the edges/contours of the art image shown below. You have ${this.drawingTimeLimit} seconds!</p>
                <div class="drawing-workspace">
                    <div class="reference-image">
                        <h4>Reference Image</h4>
                        <img src="${this.artImagePath}" alt="Reference Art" id="reference-art">
                    </div>
                    <div class="drawing-area">
                        <h4>Your Drawing</h4>
                        <canvas id="drawing-canvas" width="400" height="400"></canvas>
                        <div class="drawing-tools">
                            <button id="clear-canvas" class="btn btn-secondary">Clear</button>
                            <button id="submit-drawing" class="btn btn-primary">Submit</button>
                        </div>
                    </div>
                </div>
                <div class="drawing-progress">
                    <span>Time: <span id="drawing-time">${this.drawingTimeLimit}s</span></span>
                    <span>Match: <span id="drawing-match">--</span>%</span>
                </div>
            </div>
        `;this.drawingCanvas=document.getElementById('drawing-canvas');this.drawingCtx=this.drawingCanvas.getContext('2d');this.drawingCtx.fillStyle='white';this.drawingCtx.fillRect(0,0,this.drawingCanvas.width,this.drawingCanvas.height);this.drawingCtx.strokeStyle='black';this.drawingCtx.lineWidth=2;this.drawingCtx.lineCap='round';this.drawingCtx.lineJoin='round';this.drawingCanvas.addEventListener('mousedown',(e)=>this.startDrawing(e));this.drawingCanvas.addEventListener('mousemove',(e)=>this.draw(e));this.drawingCanvas.addEventListener('mouseup',()=>this.stopDrawing());this.drawingCanvas.addEventListener('mouseout',()=>this.stopDrawing());this.drawingCanvas.addEventListener('touchstart',(e)=>this.startDrawing(e));this.drawingCanvas.addEventListener('touchmove',(e)=>this.draw(e));this.drawingCanvas.addEventListener('touchend',()=>this.stopDrawing());document.getElementById('clear-canvas').addEventListener('click',()=>this.clearCanvas());document.getElementById('submit-drawing').addEventListener('click',()=>this.submitDrawing());this.startDrawingTimer()}
startDrawing(e){this.isDrawing=!0;const rect=this.drawingCanvas.getBoundingClientRect();const x=(e.clientX||e.touches[0].clientX)-rect.left;const y=(e.clientY||e.touches[0].clientY)-rect.top;this.drawingCtx.beginPath();this.drawingCtx.moveTo(x,y)}
draw(e){if(!this.isDrawing)return;const rect=this.drawingCanvas.getBoundingClientRect();const x=(e.clientX||e.touches[0].clientX)-rect.left;const y=(e.clientY||e.touches[0].clientY)-rect.top;this.drawingCtx.lineTo(x,y);this.drawingCtx.stroke()}
stopDrawing(){this.isDrawing=!1}
clearCanvas(){this.drawingCtx.fillStyle='white';this.drawingCtx.fillRect(0,0,this.drawingCanvas.width,this.drawingCanvas.height)}
startDrawingTimer(){this.drawingTimerInterval=setInterval(()=>{const elapsed=(Date.now()-this.drawingStartTime)/1000;const remaining=Math.max(0,this.drawingTimeLimit-elapsed);const timeEl=document.getElementById('drawing-time');if(timeEl){timeEl.textContent=`${remaining.toFixed(1)}s`;if(remaining<10){timeEl.style.color='#ff4444'}else if(remaining<20){timeEl.style.color='#ff9800'}else{timeEl.style.color='#4CAF50'}}
if(remaining<=0){this.submitDrawing()}},100)}
async submitDrawing(){if(this.drawingSubmitting){return}
this.drawingSubmitting=!0;if(this.drawingTimerInterval){clearInterval(this.drawingTimerInterval);this.drawingTimerInterval=null}
const drawingData=this.drawingCanvas.toDataURL('image/png');try{const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),10000);const response=await fetch('/api/captcha/drawing/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drawing_data:drawingData}),signal:controller.signal});clearTimeout(timeoutId);const data=await response.json();const matchEl=document.getElementById('drawing-match');if(matchEl&&data.match_percentage!==undefined){matchEl.textContent=data.match_percentage.toFixed(2)}
if(data.valid){setTimeout(()=>{this.gameOver(!0)},3000)}else{setTimeout(()=>{this.gameOver(!1)},3000)}}catch(error){this.drawingSubmitting=!1;alert('Failed to submit drawing. Please try again.')}}
async calculateMatchPercentage(drawingData){if(typeof pixelmatch==='undefined'){return this.fallbackComparison(drawingData)}
try{const edgeImg=new Image();edgeImg.src=this.edgeImage;await new Promise((resolve,reject)=>{edgeImg.onload=resolve;edgeImg.onerror=reject});const userImg=new Image();userImg.src=drawingData;await new Promise((resolve,reject)=>{userImg.onload=resolve;userImg.onerror=reject});const edgeCanvas=document.createElement('canvas');edgeCanvas.width=edgeImg.width;edgeCanvas.height=edgeImg.height;const edgeCtx=edgeCanvas.getContext('2d');edgeCtx.drawImage(edgeImg,0,0);const userCanvas=document.createElement('canvas');userCanvas.width=edgeImg.width;userCanvas.height=edgeImg.height;const userCtx=userCanvas.getContext('2d');userCtx.drawImage(userImg,0,0,edgeImg.width,edgeImg.height);const edgeData=edgeCtx.getImageData(0,0,edgeImg.width,edgeImg.height);const userData=userCtx.getImageData(0,0,edgeImg.width,edgeImg.height);const diffData=new Uint8Array(edgeData.data.length);const diffPixelCount=pixelmatch(edgeData.data,userData.data,diffData,edgeImg.width,edgeImg.height,{threshold:0.15,includeAA:!1});const totalPixels=edgeImg.width*edgeImg.height;const matchPercentage=Math.max(0,100-(diffPixelCount/totalPixels*100));const edgePixels=this.countEdgePixels(edgeData);const userEdgePixels=this.countEdgePixels(userData);const coverageRatio=userEdgePixels>0?Math.min(1,edgePixels/userEdgePixels):0;const coverageBonus=coverageRatio*10;const finalScore=Math.min(100,matchPercentage+coverageBonus);return finalScore}catch(error){return this.fallbackComparison(drawingData)}}
async fallbackComparison(drawingData){try{const edgeImg=new Image();edgeImg.src=this.edgeImage;await new Promise((resolve,reject)=>{edgeImg.onload=resolve;edgeImg.onerror=reject});const userImg=new Image();userImg.src=drawingData;await new Promise((resolve,reject)=>{userImg.onload=resolve;userImg.onerror=reject});const edgeCanvas=document.createElement('canvas');edgeCanvas.width=edgeImg.width;edgeCanvas.height=edgeImg.height;const edgeCtx=edgeCanvas.getContext('2d');edgeCtx.drawImage(edgeImg,0,0);const userCanvas=document.createElement('canvas');userCanvas.width=edgeImg.width;userCanvas.height=edgeImg.height;const userCtx=userCanvas.getContext('2d');userCtx.drawImage(userImg,0,0,edgeImg.width,edgeImg.height);const edgeData=edgeCtx.getImageData(0,0,edgeImg.width,edgeImg.height);const userData=userCtx.getImageData(0,0,edgeImg.width,edgeImg.height);const edgePixels=this.countEdgePixels(edgeData);const userEdgePixels=this.countEdgePixels(userData);let overlapCount=0;const data1=edgeData.data;const data2=userData.data;for(let i=0;i<data1.length;i+=4){const r1=data1[i];const g1=data1[i+1];const b1=data1[i+2];const r2=data2[i];const g2=data2[i+1];const b2=data2[i+2];const isEdge1=r1<128&&g1<128&&b1<128;const isEdge2=r2<128&&g2<128&&b2<128;if(isEdge1&&isEdge2){overlapCount++}}
const totalEdgePixels=Math.max(edgePixels,1);const overlapPercentage=(overlapCount/totalEdgePixels)*100;const userBonus=Math.min(20,(userEdgePixels/edgePixels)*10);const finalScore=Math.min(100,overlapPercentage+userBonus);return finalScore}catch(error){return 0}}
countEdgePixels(imageData){let edgeCount=0;const data=imageData.data;for(let i=0;i<data.length;i+=4){const r=data[i];const g=data[i+1];const b=data[i+2];if(r<128&&g<128&&b<128){edgeCount++}}
return edgeCount}
triggerBotDetection(){alert('🤖 Bot detected! Please try again.');this.resetCheckbox();this.hideCaptcha()}
gameOver(completed){if(this.drawingTimerInterval){clearInterval(this.drawingTimerInterval);this.drawingTimerInterval=null}
if(completed){this.overallScore++;if(this.currentStep===1){this.currentStep=2;this.startStep2()}else if(this.currentStep===2){this.currentStep=3;this.startStep3()}else if(this.currentStep===3){const captchaCheckbox=document.getElementById('captcha-checkbox');captchaCheckbox.classList.add('completed');const checkbox=document.getElementById('captcha-check');checkbox.checked=!0;alert('🎉 Captcha completed! Click "Leave a Comment" to post your comment.');this.hideCaptcha()}}else{if(this.currentStep===1){this.currentStep=2;this.startStep2()}else if(this.currentStep===2){this.currentStep=3;this.startStep3()}else if(this.currentStep===3){if(this.overallScore>=2){const captchaCheckbox=document.getElementById('captcha-checkbox');captchaCheckbox.classList.add('completed');const checkbox=document.getElementById('captcha-check');checkbox.checked=!0;alert('🎉 Captcha completed! Click "Leave a Comment" to post your comment.');this.hideCaptcha()}else{alert('❌ Not enough challenges passed. Please try again.');this.resetCheckbox();this.hideCaptcha()}}}}
async startStep2(){const noteFrequencies=[261.63,329.63,392.00];this.step2Notes=noteFrequencies.sort(()=>Math.random()-0.5);this.step2CurrentNoteIndex=0;this.step2MatchedNotes=0;this.step2TargetFrequency=this.step2Notes[0];this.showStep2UI()}
frequencyToNote(frequency){const noteNames=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];const A4=440;const semitones=12*Math.log2(frequency/A4);const noteIndex=Math.round(semitones)+9;const octave=Math.floor((noteIndex+3)/12)+4;const noteName=noteNames[(noteIndex%12+12)%12];return noteName+octave}
showStep2UI(){const grid=document.getElementById('captcha-grid');grid.innerHTML=`
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
        `;document.getElementById('access-mic-btn').addEventListener('click',()=>this.setupMicrophone())}
updateStep2Timer(){if(!this.step2StartTime||this.currentStep!==2)return;const elapsed=(Date.now()-this.step2StartTime)/1000;const remaining=Math.max(0,this.step2TimeLimit-elapsed);const timerEl=document.getElementById('step2-time');if(timerEl){timerEl.textContent=`Time: ${remaining.toFixed(1)}s`;if(remaining<10){timerEl.style.color='#ff4444'}else if(remaining<20){timerEl.style.color='#ff9800'}else{timerEl.style.color='#4CAF50'}}
if(remaining<=0){this.step2IsListening=!1;if(this.step2MicrophoneStream){this.step2MicrophoneStream.getTracks().forEach(track=>track.stop())}
this.gameOver(!1);return}
requestAnimationFrame(()=>this.updateStep2Timer())}
async setupMicrophone(){try{if(!this.audioContext){this.audioContext=new(window.AudioContext||window.webkitAudioContext)()}
if(this.audioContext.state==='suspended'){await this.audioContext.resume()}
this.step2MicrophoneStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!1}});const source=this.audioContext.createMediaStreamSource(this.step2MicrophoneStream);this.step2Analyser=this.audioContext.createAnalyser();this.step2Analyser.fftSize=2048;this.step2Analyser.smoothingTimeConstant=0.8;source.connect(this.step2Analyser);this.step2IsListening=!0;this.step2StartTime=Date.now();this.detectPitch();document.getElementById('mic-status').textContent='🎤 Microphone active - sing the note!';document.getElementById('mic-status').style.color='#4CAF50';const accessMicBtn=document.getElementById('access-mic-btn');if(accessMicBtn){accessMicBtn.style.display='none'}
this.updateStep2Timer()}catch(err){const micStatus=document.getElementById('mic-status');micStatus.innerHTML='❌ Microphone access denied<br><small>Please allow microphone access in your browser settings and reload the page</small>';micStatus.style.color='#ff4444';micStatus.style.background='#ffebee';micStatus.style.padding='15px';micStatus.style.borderRadius='8px'}}
playTargetNote(){if(!this.audioContext){this.audioContext=new(window.AudioContext||window.webkitAudioContext)()}
this.step2TargetFrequency=this.step2Notes[this.step2CurrentNoteIndex];const oscillator=this.audioContext.createOscillator();const gainNode=this.audioContext.createGain();oscillator.connect(gainNode);gainNode.connect(this.audioContext.destination);oscillator.frequency.value=this.step2TargetFrequency;oscillator.type='sine';gainNode.gain.setValueAtTime(0.3,this.audioContext.currentTime);gainNode.gain.exponentialRampToValueAtTime(0.01,this.audioContext.currentTime+1);oscillator.start(this.audioContext.currentTime);oscillator.stop(this.audioContext.currentTime+1);document.getElementById('target-note-freq').textContent=this.frequencyToNote(this.step2TargetFrequency)}
detectPitch(){if(!this.step2IsListening||!this.step2Analyser)return;const bufferLength=this.step2Analyser.fftSize;const buffer=new Float32Array(bufferLength);this.step2Analyser.getFloatTimeDomainData(buffer);const pitch=this.autoCorrelate(buffer,this.audioContext.sampleRate);if(pitch>0){document.getElementById('user-note-freq').textContent=this.frequencyToNote(pitch);const tolerance=this.step2TargetFrequency*0.1;if(Math.abs(pitch-this.step2TargetFrequency)<tolerance){if(!this.step2IsNoteMatched){this.step2IsNoteMatched=!0;this.onNoteMatched()}}else{this.step2IsNoteMatched=!1}}
requestAnimationFrame(()=>this.detectPitch())}
autoCorrelate(buffer,sampleRate){const SIZE=buffer.length;const MAX_SAMPLES=Math.floor(SIZE/2);let best_offset=-1;let best_correlation=0;let rms=0;for(let i=0;i<SIZE;i++){rms+=buffer[i]*buffer[i]}
rms=Math.sqrt(rms/SIZE);if(rms<0.01)return-1;let lastCorrelation=1;for(let offset=1;offset<MAX_SAMPLES;offset++){let correlation=0;for(let i=0;i<MAX_SAMPLES;i++){correlation+=Math.abs(buffer[i]-buffer[i+offset])}
correlation=1-(correlation/MAX_SAMPLES);if(correlation>0.9&&correlation>lastCorrelation){const foundGoodCorrelation=correlation>best_correlation;if(foundGoodCorrelation){best_correlation=correlation;best_offset=offset}}
lastCorrelation=correlation}
if(best_correlation>0.01){return sampleRate/best_offset}
return-1}
async onNoteMatched(){this.step2MatchedNotes++;document.getElementById('notes-matched').textContent=this.step2MatchedNotes;const userNoteEl=document.getElementById('user-note-freq');userNoteEl.style.color='#4CAF50';setTimeout(()=>{userNoteEl.style.color=''},500);if(this.step2MatchedNotes>=3){this.step2IsListening=!1;this.step2StartTime=null;if(this.step2MicrophoneStream){this.step2MicrophoneStream.getTracks().forEach(track=>track.stop())}
try{const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),10000);await fetch('/api/captcha/step2/complete',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal});clearTimeout(timeoutId)}catch(error){}
this.gameOver(!0)}else{setTimeout(()=>{this.step2CurrentNoteIndex++;this.step2TargetFrequency=this.step2Notes[this.step2CurrentNoteIndex];document.getElementById('target-note-freq').textContent=this.frequencyToNote(this.step2Notes[this.step2CurrentNoteIndex]);this.step2IsNoteMatched=!1},1000)}}
async startStep3(){this.showAgeVerification()}
showAgeVerification(){const grid=document.getElementById('captcha-grid');grid.innerHTML=`
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
        `;document.getElementById('age-yes-btn').addEventListener('click',()=>this.handleAgeVerification(!0));document.getElementById('age-no-btn').addEventListener('click',()=>this.handleAgeVerification(!1))}
async handleAgeVerification(is18Plus){this.step3Is18Plus=is18Plus;try{const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),10000);const response=await fetch('/api/captcha/step3/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({is_18_plus:is18Plus}),signal:controller.signal});clearTimeout(timeoutId);const data=await response.json();if(data.skipped){this.step3Skipped=!0;this.completeCaptcha()}else{this.step3Images=data.images;this.step3CurrentCategory=data.current_category;this.step3TotalCategories=data.total_categories;this.step3SelectedIndices=[];this.showImageGrid()}}catch(error){alert('Failed to load image selection. Please refresh the page.')}}
showImageGrid(){const grid=document.getElementById('captcha-grid');let gridHTML=`
            <div class="step3-container">
                <h3>Step 3: Image Selection</h3>
                <p class="step3-instruction">Select all images with <span id="target-category" class="category-highlight">${this.step3CurrentCategory}</span></p>
                <div class="image-grid">
        `;for(let i=0;i<16;i++){const image=this.step3Images[i];gridHTML+=`
                <div class="image-cell" data-index="${i}">
                    <img src="${image.path}" loading="lazy">
                    <div class="selection-overlay"></div>
                </div>
            `}
gridHTML+=`
                </div>
                <div class="step3-controls">
                    <div class="step3-progress">
                        <span>Challenge: 1/1</span>
                    </div>
                    <button id="step3-submit-btn" class="btn btn-primary">VERIFY</button>
                </div>
            </div>
        `;grid.innerHTML=gridHTML;document.querySelectorAll('.image-cell').forEach(cell=>{cell.addEventListener('click',(e)=>this.handleImageClick(e))});document.getElementById('step3-submit-btn').addEventListener('click',()=>this.submitImageSelection())}
handleImageClick(event){const cell=event.currentTarget;const index=parseInt(cell.dataset.index);if(this.step3SelectedIndices.includes(index)){this.step3SelectedIndices=this.step3SelectedIndices.filter(i=>i!==index);cell.classList.remove('selected')}else{this.step3SelectedIndices.push(index);cell.classList.add('selected')}}
async submitImageSelection(){if(this.step3Submitting){return}
this.step3Submitting=!0;try{const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),10000);const response=await fetch('/api/captcha/step3/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selected_indices:this.step3SelectedIndices}),signal:controller.signal});clearTimeout(timeoutId);const data=await response.json();if(data.valid){if(data.completed){this.completeCaptcha()}else{this.step3CurrentCategory=data.next_category;this.step3SelectedIndices=[];document.getElementById('target-category').textContent=this.step3CurrentCategory;document.querySelectorAll('.image-cell').forEach(cell=>{cell.classList.remove('selected')});this.step3Submitting=!1}}else{this.showCorrectSelection(data.correct_indices);this.step3Submitting=!1}}catch(error){this.step3Submitting=!1;alert('Failed to verify selection. Please try again.')}}
showCorrectSelection(correctIndices){document.querySelectorAll('.image-cell').forEach((cell,index)=>{if(correctIndices.includes(index)){cell.classList.add('correct')}else if(this.step3SelectedIndices.includes(index)){cell.classList.add('incorrect')}});setTimeout(()=>{this.step3Submitting=!1;this.step3SelectedIndices=[];this.startStep3()},2000)}
resetCaptcha(){this.currentStep=1;this.step3Submitting=!1;this.step3SelectedIndices=[];this.drawingSubmitting=!1;if(this.drawingTimerInterval){clearInterval(this.drawingTimerInterval);this.drawingTimerInterval=null}
if(this.step2MicrophoneStream){this.step2MicrophoneStream.getTracks().forEach(track=>track.stop());this.step2MicrophoneStream=null}
this.step2IsListening=!1;this.step2StartTime=null;this.startDrawingChallenge()}
async completeCaptcha(){try{const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),10000);const response=await fetch('/api/captcha/step3/complete',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal});clearTimeout(timeoutId);const data=await response.json();if(data.overall_score>=2){const captchaCheckbox=document.getElementById('captcha-checkbox');captchaCheckbox.classList.add('completed');const checkbox=document.getElementById('captcha-check');checkbox.checked=!0;alert('🎉 Captcha completed! Click "Leave a Comment" to post your comment.');this.hideCaptcha()}else{this.showBotDetection()}}catch(error){alert('Failed to complete captcha. Please try again.');this.showBotDetection()}}
showBotDetection(){const botCaption=document.createElement('div');botCaption.className='bot-detection-caption';botCaption.innerHTML=`
            <div class="bot-detection-content">
                <span class="bot-icon">🤖</span>
                <span class="bot-text">Bot detected</span>
            </div>
        `;const captchaWidget=document.getElementById('captcha-widget');captchaWidget.appendChild(botCaption);setTimeout(()=>{botCaption.classList.add('animate__animated','animate__shakeX')},100);setTimeout(()=>{botCaption.remove();this.hideCaptcha();this.resetCheckbox()},2000)}
async submitComment(){const author=document.getElementById('author').value||'Anonymous';const content=this.quill.getText().trim();const htmlContent=this.quill.root.innerHTML;try{const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),10000);const csrfToken=document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');const response=await fetch('/api/comments',{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrfToken||''},body:JSON.stringify({author:author,content:content,html_content:htmlContent}),signal:controller.signal});clearTimeout(timeoutId);const data=await response.json();if(data.success){this.quill.setText('');this.loadComments()}else{alert('Failed to submit comment: '+(data.error||'Unknown error'))}}catch(error){alert('Failed to submit comment. Please try again.')}}
async loadComments(){try{const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),10000);const response=await fetch('/api/comments',{signal:controller.signal});clearTimeout(timeoutId);const data=await response.json();const commentsList=document.getElementById('comments-list');commentsList.innerHTML='';if(data.comments.length===0){commentsList.innerHTML='<p style="text-align: center; color: #999;">No comments yet. Be the first to leave one!</p>';return}
data.comments.reverse().forEach(comment=>{const commentEl=document.createElement('div');commentEl.className='comment-item';const time=new Date(comment.timestamp);const timeStr=time.toLocaleString();commentEl.innerHTML=`
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(comment.author)}</span>
                        <span class="comment-time">${timeStr}</span>
                    </div>
                    <div class="comment-content">${comment.html_content || this.escapeHtml(comment.content)}</div>
                `;commentsList.appendChild(commentEl)})}catch(error){alert('Failed to load comments. Please refresh the page.')}}
escapeHtml(text){const div=document.createElement('div');div.textContent=text;return div.innerHTML}}
document.addEventListener('DOMContentLoaded',()=>{window.captcha=new WorstCaptcha()})