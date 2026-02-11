// API Key Management
const API_KEY_STORAGE_KEY = 'openai_api_key';

// Load and display current status
function updateStatus() {
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const statusDiv = document.getElementById('keyStatus');
    const statusMessage = document.getElementById('statusMessage');
    
    if (apiKey) {
        statusDiv.className = 'alert alert-success';
        const maskedKey = apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4);
        statusMessage.innerHTML = `
            ✅ <strong>API Key가 등록되어 있습니다</strong><br>
            <small>Key: ${maskedKey}</small>
        `;
        document.getElementById('apiKeyInput').value = apiKey;
    } else {
        statusDiv.className = 'alert alert-warning';
        statusMessage.innerHTML = `
            ⚠️ <strong>등록된 API Key가 없습니다</strong><br>
            <small>아래에서 API Key를 등록해주세요.</small>
        `;
    }
}

// Toggle password visibility
document.getElementById('toggleKeyBtn').addEventListener('click', () => {
    const input = document.getElementById('apiKeyInput');
    const btn = document.getElementById('toggleKeyBtn');
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈 숨기기';
    } else {
        input.type = 'password';
        btn.textContent = '👁️ 보기';
    }
});

// Save API Key
document.getElementById('saveKeyBtn').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    
    if (!apiKey) {
        alert('API Key를 입력해주세요.');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        if (!confirm('OpenAI API Key는 보통 "sk-"로 시작합니다. 계속하시겠습니까?')) {
            return;
        }
    }
    
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    alert('✅ API Key가 저장되었습니다!');
    updateStatus();
});

// Test API Key
document.getElementById('testKeyBtn').addEventListener('click', async () => {
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const testResult = document.getElementById('testResult');
    const testBtn = document.getElementById('testKeyBtn');
    
    if (!apiKey) {
        alert('먼저 API Key를 저장해주세요.');
        return;
    }
    
    testBtn.disabled = true;
    testBtn.textContent = '🔄 테스트 중...';
    testResult.style.display = 'block';
    testResult.className = 'alert alert-info';
    testResult.textContent = '⏳ API Key를 테스트하는 중입니다...';
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-nano',
                messages: [
                    { role: 'user', content: 'Hello' }
                ],
                max_tokens: 5
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult.className = 'alert alert-success';
            testResult.innerHTML = `
                <h5 class="alert-heading">✅ API Key가 정상적으로 작동합니다!</h5>
                <p>모델: ${data.model}</p>
                <p>응답: ${data.choices[0].message.content}</p>
            `;
        } else {
            const error = await response.json();
            testResult.className = 'alert alert-danger';
            testResult.innerHTML = `
                <h5 class="alert-heading">❌ API Key 오류</h5>
                <p>${error.error?.message || 'API Key가 유효하지 않습니다.'}</p>
            `;
        }
    } catch (error) {
        testResult.className = 'alert alert-danger';
        testResult.innerHTML = `
            <h5 class="alert-heading">❌ 네트워크 오류</h5>
            <p>${error.message}</p>
        `;
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = '🧪 API Key 테스트';
    }
});

// Delete API Key
document.getElementById('deleteKeyBtn').addEventListener('click', () => {
    if (!confirm('정말로 API Key를 삭제하시겠습니까?')) {
        return;
    }
    
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    document.getElementById('apiKeyInput').value = '';
    alert('🗑️ API Key가 삭제되었습니다.');
    updateStatus();
});

// Initialize
updateStatus();

// Made with Bob