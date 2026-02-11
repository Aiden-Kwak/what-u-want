// Load saved API key from localStorage
const API_KEY_STORAGE_KEY = 'openai_api_key';

window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        document.getElementById('apiKey').placeholder = 'API Key가 저장되어 있습니다';
    }
});

// Global variables for SSE
let eventSource = null;
let sessionId = null;

// Clear logs button
document.getElementById('clearLogsBtn').addEventListener('click', () => {
    document.getElementById('logContainer').innerHTML = '';
});

// Add log to UI
function addLog(level, message) {
    const logContainer = document.getElementById('logContainer');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level.toLowerCase()}`;
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-level">${level}</span>: ${message}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Connect to SSE
async function connectSSE(sessionId) {
    if (eventSource) {
        eventSource.close();
    }
    
    eventSource = new EventSource(`/api/logs/stream?session_id=${sessionId}`);
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            addLog(data.level, data.message);
        } catch (e) {
            // Ignore keepalive messages
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
    };
}

document.getElementById('translationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let apiKey = document.getElementById('apiKey').value.trim();
    
    // If no API key entered, try to load from localStorage
    if (!apiKey) {
        apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
    }
    
    const sourceLang = document.getElementById('sourceLang').value;
    const targetLang = document.getElementById('targetLang').value;
    const model = document.getElementById('model').value;
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File size exceeds 50MB limit');
        return;
    }
    
    // Show progress with detailed status
    const progressContainer = document.getElementById('progressContainer');
    const resultContainer = document.getElementById('resultContainer');
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const submitBtnSpinner = document.getElementById('submitBtnSpinner');
    const statusMessage = document.getElementById('statusMessage');
    
    progressContainer.style.display = 'block';
    resultContainer.style.display = 'none';
    submitBtn.disabled = true;
    submitBtnText.textContent = '⏳ Processing...';
    submitBtnSpinner.style.display = 'inline-block';
    
    // Clear previous logs
    document.getElementById('logContainer').innerHTML = '';
    document.getElementById('clearLogsBtn').style.display = 'inline-block';
    
    // Update status message
    statusMessage.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        <strong>Step 1/3:</strong> Creating log session...
    `;
    
    try {
        // Create log session
        const sessionResponse = await fetch('/api/logs/session', {
            method: 'POST'
        });
        const sessionData = await sessionResponse.json();
        sessionId = sessionData.session_id;
        
        // Connect to SSE
        connectSSE(sessionId);
        addLog('INFO', 'Log session created successfully');
        
        statusMessage.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            <strong>Step 2/3:</strong> Uploading file...
        `;
    } catch (error) {
        addLog('ERROR', `Failed to create log session: ${error.message}`);
    }
    
    const startTime = Date.now();
    let statusInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        statusMessage.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            <strong>Step 3/3:</strong> Translating with GPT...
            <div class="mt-2 small text-muted">
                ⏱️ Elapsed time: ${minutes}m ${seconds}s<br>
                📊 Check logs below for real-time progress<br>
                🔄 Please wait, translation in progress...
            </div>
        `;
    }, 1000);
    
    // Validate language selection
    if (sourceLang === targetLang) {
        alert('시작 언어와 완료 언어가 같습니다. 다른 언어를 선택해주세요.');
        return;
    }
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    if (apiKey) {
        formData.append('api_key', apiKey);
    }
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);
    formData.append('model', model);
    if (sessionId) {
        formData.append('session_id', sessionId);
    }
    
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        // Stop status interval
        if (statusInterval) {
            clearInterval(statusInterval);
        }
        
        // Close SSE connection
        if (eventSource) {
            eventSource.close();
            addLog('INFO', 'Translation completed, closing log stream');
        }
        
        // Hide progress
        document.getElementById('progressContainer').style.display = 'none';
        document.getElementById('resultContainer').style.display = 'block';
        
        if (response.ok && result.success) {
            // Success
            const alertDiv = document.getElementById('resultAlert');
            alertDiv.className = 'alert alert-success';
            alertDiv.innerHTML = `
                <h5 class="alert-heading">✅ Success!</h5>
                <p>${result.message}</p>
                <hr>
                <p class="mb-0">
                    <strong>Sheets processed:</strong> ${result.sheets_processed}<br>
                    <strong>Filename:</strong> ${result.filename}
                </p>
            `;
            
            // Show download button
            const downloadBtn = document.getElementById('downloadBtn');
            downloadBtn.style.display = 'block';
            downloadBtn.onclick = () => {
                window.location.href = result.download_url;
            };
        } else {
            // Error
            const alertDiv = document.getElementById('resultAlert');
            alertDiv.className = 'alert alert-danger';
            alertDiv.innerHTML = `
                <h5 class="alert-heading">❌ Error</h5>
                <p>${result.detail || 'Translation failed'}</p>
            `;
            
            // Hide download button
            document.getElementById('downloadBtn').style.display = 'none';
        }
    } catch (error) {
        // Hide progress
        document.getElementById('progressContainer').style.display = 'none';
        document.getElementById('resultContainer').style.display = 'block';
        
        const alertDiv = document.getElementById('resultAlert');
        alertDiv.className = 'alert alert-danger';
        alertDiv.innerHTML = `
            <h5 class="alert-heading">❌ Network Error</h5>
            <p>Failed to connect to the server. Please check your connection and try again.</p>
            <hr>
            <p class="mb-0"><small>${error.message}</small></p>
        `;
        
        // Hide download button
        document.getElementById('downloadBtn').style.display = 'none';
    } finally {
        // Clear status interval
        if (statusInterval) {
            clearInterval(statusInterval);
        }
        
        // Reset button
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtnText').textContent = '🚀 Start Translation';
        document.getElementById('submitBtnSpinner').style.display = 'none';
    }
});

// File input change handler
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);
        console.log(`Selected file: ${file.name} (${fileSize} MB)`);
    }
});

// Prompt templates
const promptTemplates = {
    'en': 'Translate the following CSV data to English. Maintain the exact CSV format.',
    'ko': 'Translate the following CSV data to Korean. Maintain the exact CSV format.',
    'ja': 'Translate the following CSV data to Japanese. Maintain the exact CSV format.',
    'zh': 'Translate the following CSV data to Chinese. Maintain the exact CSV format.',
    'es': 'Translate the following CSV data to Spanish. Maintain the exact CSV format.',
    'fr': 'Translate the following CSV data to French. Maintain the exact CSV format.',
    'de': 'Translate the following CSV data to German. Maintain the exact CSV format.'
};

// You can add a language selector if needed
// For now, users can manually edit the prompt

// Made with Bob
