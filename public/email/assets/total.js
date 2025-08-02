// 退出登录和切换账户功能
document.addEventListener('DOMContentLoaded', function() {
    // 解析JWT token获取邮件地址
    function parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    // 从cookie获取authToken并解析邮件地址
    function getEmailFromCookie() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'authToken') {
                const decodedToken = parseJWT(value);
                return decodedToken ? decodedToken.email : null;
            }
        }
        return null;
    }

    // 设置账户显示名称
    const email = getEmailFromCookie();
    const usernameElement = document.querySelector('.username');
    if (usernameElement && email) {
        usernameElement.textContent = email;
    }

    // 获取下拉菜单元素
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    if (dropdownMenu) {
        const logoutItem = dropdownMenu.querySelector('.dropdown-item:nth-child(2)');
        if (logoutItem && logoutItem.textContent.includes('退出登录')) {
            logoutItem.addEventListener('click', function(e) {
                e.preventDefault();
                
                fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                })
                .then(response => {
                    window.location.href = '/login';
                })
                .catch(error => {
                    console.error('退出登录错误:', error);
                    window.location.href = '/login';
                });
            });
        }
        
        const switchAccountItem = dropdownMenu.querySelector('.dropdown-item:nth-child(1)');
        if (switchAccountItem && switchAccountItem.textContent.includes('切换账户')) {
            switchAccountItem.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = '/login';
            });
        }
    }
    
});