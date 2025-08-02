const loginForm = document.getElementById('loginForm');

// 设置cookie的工具函数
function setCookie(name, value, days, path = '/') {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; path=${path}; expires=${expires.toUTCString()}; SameSite=Strict`;
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const z = formData.get('z');
    const m = formData.get('m');

    // 检查用户名和密码是否为空
    const errorMessage = document.querySelector('.error-message');
    if (!z || !z.trim()) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = '请输入用户名';
        return;
    }

    if (!m || !m.trim()) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = '请输入密码';
        return;
    }

    // 检查公钥是否已获取
    if (!globalPublicKey) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = '系统初始化中，请稍后重试';
        return;
    }

    const encryptedData = encryptLoginData(z, m);

    if (!encryptedData) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = '加密过程出错，请稍后重试';
        return;
    }

    try {
        const response = await fetch('/login/pas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                y: encryptedData.y,
                k: encryptedData.k,
                conversation: globalConversationId
            }),
            credentials: 'include'
        });

        const data = await response.json();
        if (data.success) {
            window.location.href = data.data.redirectUrl;
        } else {
            const errorMessage = document.querySelector('.error-message');
            errorMessage.style.display = 'block';
            errorMessage.textContent = data.message;
        }
    } catch (error) {
        console.error('登录请求出错:', error);
        const errorMessage = document.querySelector('.error-message');
        errorMessage.style.display = 'block';
        errorMessage.textContent = '登录请求出错，请稍后重试';
    }
});

// 全局变量存储公钥和会话ID
let globalPublicKey = null;
let globalConversationId = null;


// 页面加载后获取公钥
document.addEventListener('DOMContentLoaded', function () {
    fetch('/conversation')
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应错误');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                globalPublicKey = data.m;
                globalConversationId = data.conversation;
            } else {
                console.error('获取公钥失败');
            }
        })
        .catch(error => {
            console.error('获取失败:', error);
        });
});