// 邮件接收相关API
class ReceiveAPI {
    constructor() {
        this.baseURL = '/amail';
        this.eventSource = null;
        this.onNewMail = null; // 新邮件回调函数
        this.onConnected = null; // 连接建立回调函数
        this.onHeartbeat = null; // 心跳回调函数
    }

    // 获取收件箱邮件
    async getReceiveEmails() {
        try {
            const response = await fetch(`${this.baseURL}/Receive`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('获取收件箱邮件失败:', error);
            throw error;
        }
    }

    // 获取所有邮件状态
    async getEmailStates() {
        try {
            const response = await fetch(`${this.baseURL}/state`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('获取邮件状态失败:', error);
            throw error;
        }
    }

    // 更新指定邮件状态
    async updateEmailState(mailId, stateData) {
        try {
            const requestBody = { mailId, ...stateData };
            const response = await fetch(`${this.baseURL}/state`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('更新邮件状态失败:', error);
            throw error;
        }
    }

    // 删除邮件
    async deleteEmail(mailId) {
        try {
            const response = await fetch(`${this.baseURL}/Receive/${mailId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('删除邮件失败:', error);
            throw error;
        }
    }

    // 格式化时间戳
    formatTimestamp(timestamp) {
        const date = new Date(parseInt(timestamp));
        const now = new Date();
        const diff = now - date;
        
        // 如果是今天
        if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        
        // 如果是本年
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('zh-CN', { 
                month: '2-digit', 
                day: '2-digit' 
            });
        }
        
        // 其他情况显示完整日期
        return date.toLocaleDateString('zh-CN');
    }

    // 解析邮件地址
    parseEmailAddress(emailStr) {
        const match = emailStr.match(/^(.+?)\s+(.+@.+)$/);
        if (match) {
            return {
                name: match[1].trim(),
                email: match[2].trim()
            };
        }
        return {
            name: emailStr,
            email: emailStr
        };
    }

    // 建立SSE连接
    connectSSE() {
        try {
            // 如果已有连接，先关闭
            if (this.eventSource) {
                this.closeSSE();
            }

            // 建立新的SSE连接
            this.eventSource = new EventSource(`/amail/sse/notifications`);

            // 监听消息事件
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleSSEMessage(data);
                } catch (error) {
                    console.error('解析SSE消息失败:', error);
                }
            };

            // 监听连接打开事件
            this.eventSource.onopen = () => {
            };

            // 监听错误事件
            this.eventSource.onerror = (error) => {
                console.error('SSE连接错误:', error);
                // 可以在这里实现重连逻辑
            };

        } catch (error) {
            console.error('建立SSE连接失败:', error);
        }
    }

    // 处理SSE消息
    handleSSEMessage(data) {
        switch (data.type) {
            case 'connected':
                if (this.onConnected) {
                    this.onConnected(data);
                }
                break;

            case 'heartbeat':
                if (this.onHeartbeat) {
                    this.onHeartbeat(data);
                }
                break;

            case 'new_mail':
                if (this.onNewMail) {
                    this.onNewMail(data);
                }
                break;

            default:
        }
    }

    // 关闭SSE连接
    closeSSE() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    // 设置新邮件回调
    setOnNewMail(callback) {
        this.onNewMail = callback;
    }

    // 设置连接建立回调
    setOnConnected(callback) {
        this.onConnected = callback;
    }

    // 设置心跳回调
    setOnHeartbeat(callback) {
        this.onHeartbeat = callback;
    }

    // 获取连接状态
    getConnectionState() {
        if (!this.eventSource) {
            return 'CLOSED';
        }
        switch (this.eventSource.readyState) {
            case EventSource.CONNECTING:
                return 'CONNECTING';
            case EventSource.OPEN:
                return 'OPEN';
            case EventSource.CLOSED:
                return 'CLOSED';
            default:
                return 'UNKNOWN';
        }
    }
}

// 创建全局实例
window.receiveAPI = new ReceiveAPI();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReceiveAPI;
}

// 邮件视图关闭功能
function closeEmailView() {
    // 获取全局的EmailApp实例
    if (window.emailApp) {
        // 关闭当前激活的标签页
        if (window.emailApp.activeTabId) {
            window.emailApp.closeEmailTab(window.emailApp.activeTabId);
        } else {
            // 如果没有激活的标签页，清空所有标签页
            window.emailApp.emailTabs.clear();
            window.emailApp.activeTabId = null;
            window.emailApp.renderEmailTabs();
        }
        
        // 移除所有邮件项的选中状态
        const selectedItems = document.querySelectorAll('.nav-email-item.selected');
        selectedItems.forEach(item => {
            item.classList.remove('selected');
        });
        
        // 清除URL参数
        const url = new URL(window.location);
        url.searchParams.delete('m');
        // 清除所有文件夹参数
        const folderParams = ['create', 'Inbox', 'litter', 'Send', 'draft', 'Delete', 'Job', 'individual', 'significant'];
        folderParams.forEach(param => {
            url.searchParams.delete(param);
        });
        window.history.replaceState({}, document.title, url.pathname + url.search);
        
        console.log('邮件视图已关闭');
    } else {
        // 兼容旧版本的关闭方式
        const emailItems = document.getElementById('emailItems');
        if (emailItems) {
            emailItems.innerHTML = `
            `;
        }
    }
}

// 将函数添加到全局作用域
window.closeEmailView = closeEmailView;