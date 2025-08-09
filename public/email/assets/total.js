// 退出登录和切换账户功能
document.addEventListener('DOMContentLoaded', function() {
    // 存储邮件地址的函数
    let baddress = null;

    // 从接口获取邮件地址
    async function getEmailFromAPI() {
        try {
            const response = await fetch('/bmail/eaddress', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('获取邮件地址失败');
            }
            
            const result = await response.json();
            if (result.success && result.data && result.data.email) {
                baddress = result.data.email;
                return result.data.email;
            } else {
                throw new Error('邮件地址格式错误');
            }
        } catch (error) {
            console.error('获取邮件地址错误:', error);
            return null;
        }
    }

    // 设置账户显示名称
    async function initializeEmail() {
        const email = await getEmailFromAPI();
        const usernameElement = document.querySelector('.username');
        if (usernameElement && email) {
            usernameElement.textContent = email;
        }
    }

    // 初始化邮件地址
    initializeEmail();

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