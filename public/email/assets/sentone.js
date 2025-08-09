class SentEmailManager {
    constructor(emailApp) {
        this.emailApp = emailApp;
        this.emailTabs = new Map();
        this.currentTabId = null;
        this.tabCounter = 0;
    }

    async loadSentEmails() {
        try {
            const response = await fetch('/cmail/sent');
            const data = await response.json();
            
            if (data.success && data.data && data.data.mails) {
                this.renderSentEmailNavigation(data.data.mails);
                
                if (this.emailTabs.size === 0) {
                    this.emailApp.showEmailItemsPlaceholder();
                }
            } else {
                if (this.emailTabs.size === 0) {
                    this.emailApp.showEmptyState();
                }
            }
        } catch (error) {
            console.error('获取已发送邮件失败:', error);
            if (this.emailTabs.size === 0) {
                this.emailApp.showEmptyState();
            }
        }
    }

    renderSentEmailNavigation(mails) {
        const emailNavigation = document.getElementById('emailNavigation');
        
        if (!mails || mails.length === 0) {
            this.emailApp.updateNavigation();
            return;
        }

        const url = new URL(window.location);
        const currentEmailId = url.searchParams.get('m');
        
        const navigationHTML = `
            <div class="navigation-header">
                <h3 class="navigation-title">已发送</h3>
            </div>
            <div class="navigation-content">
                ${mails.map(mail => {
                    const date = new Date(parseInt(mail.timestamp));
                    const formattedTime = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
                    
                    const escapeHtml = (text) => {
                        const div = document.createElement('div');
                        div.textContent = text;
                        return div.innerHTML;
                    };
                    
                    const safeSubject = escapeHtml(mail.subject || '无主题');
                    const safeTo = escapeHtml(mail.to || '未知收件人');
                    const safeFileName = escapeHtml(mail.id || '');
                    const safeTimestamp = escapeHtml(mail.timestamp || '');
                    
                    const emailId = `${safeTimestamp}_${safeFileName}`;
                    const isSelected = currentEmailId === emailId ? 'selected' : '';
                    
                    return `
                        <div class="nav-email-item ${isSelected}" data-filename="${safeFileName}" data-subject="${safeSubject}" data-from="${safeTo}" data-timestamp="${safeTimestamp}">
                            <div class="nav-email-from">${safeTo}</div>
                            <div class="nav-email-subject">${safeSubject}</div>
                            <div class="nav-email-time">${formattedTime}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        emailNavigation.innerHTML = navigationHTML;
        
        emailNavigation.querySelectorAll('.nav-email-item').forEach(item => {
            item.addEventListener('click', () => {
                const emailId = `${item.dataset.timestamp}_${item.dataset.filename}`;
                this.updateUrlParams(emailId);
                this.loadEmailDetail(emailId);
            });
        });
        
        setTimeout(() => {
            this.emailApp.updateEmailListDisplay();
        }, 100);
    }

    async loadSentEmailFromUrl(emailId) {
        try {
            const navItems = document.querySelectorAll('.nav-email-item');
            for (const item of navItems) {
                const itemEmailId = `${item.dataset.timestamp}_${item.dataset.filename}`;
                if (itemEmailId === emailId) {
                    document.querySelectorAll('.nav-email-item.selected').forEach(selectedItem => {
                        selectedItem.classList.remove('selected');
                    });
                    item.classList.add('selected');
                    break;
                }
            }
            
            // 更新URL参数以防止刷新后丢失
            this.updateUrlParams(emailId);
            await this.loadEmailDetail(emailId);
        } catch (error) {
            console.error('从URL加载已发送邮件失败:', error);
        }
    }

    addEmailClickEvents() {
        const emailItems = document.querySelectorAll('.email-item');
        emailItems.forEach(item => {
            item.addEventListener('click', () => {
                const emailId = item.dataset.id;
                this.updateUrlParams(emailId);
                this.loadEmailDetail(emailId);
            });
        });
    }

    updateUrlParams(emailId) {
        const url = new URL(window.location);
        url.searchParams.set('m', emailId);
        window.history.pushState({}, '', url);
    }

    async loadEmailDetail(emailId) {
        try {
            const response = await fetch(`/cmail/examdeta/${emailId}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                // 使用标签系统显示邮件详情
                this.openEmailInTab(emailId, data.data);
            } else {
                console.error('获取邮件详情失败:', data.message);
            }
        } catch (error) {
            console.error('加载邮件详情失败:', error);
        }
    }

    closeEmailTab(emailId) {
        this.emailTabs.delete(emailId);
        
        if (this.currentTabId === emailId) {
            this.currentTabId = null;
            
            if (this.emailTabs.size > 0) {
                const firstTabId = this.emailTabs.keys().next().value;
                this.switchEmailTab(firstTabId);
            } else {
                const emailItems = document.getElementById('emailItems');
                if (emailItems) {
                    emailItems.innerHTML = '<div class="no-email-selected">请选择一封邮件</div>';
                }
                
                // 更新URL，移除邮件ID参数
                const url = new URL(window.location);
                url.searchParams.delete('m');
                window.history.pushState({}, '', url);
            }
        }
        
        this.renderEmailTabs(Array.from(this.emailTabs.values()));
    }
    
    openEmailInTab(emailId, emailData) {
        // 如果标签已存在，直接切换到该标签
        if (this.emailTabs.has(emailId)) {
            this.switchEmailTab(emailId);
            return;
        }
        
        // 将邮件数据添加到标签系统中
        this.emailTabs.set(emailId, emailData);
        this.currentTabId = emailId;
        
        // 更新URL参数
        this.updateUrlParams(emailId);
        
        // 渲染标签和邮件详情
        this.renderEmailTabs(Array.from(this.emailTabs.values()));
        this.displayEmailDetails(emailData);
    }
    
    displayEmailDetails(emailData) {
        const emailItems = document.getElementById('emailItems');
        if (!emailItems) return;
        
        // 处理发件人信息
        const fromAddress = emailData.from ? (emailData.from.address || emailData.from) : '未知发件人';
        const fromName = emailData.from && emailData.from.name ? emailData.from.name : '';
        const fromDisplay = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
        
        // 处理收件人信息
        let toDisplay = '未知收件人';
        if (emailData.to && Array.isArray(emailData.to)) {
            toDisplay = emailData.to.map(recipient => {
                if (typeof recipient === 'object') {
                    const name = recipient.name || '';
                    const address = recipient.address || '';
                    return name ? `${name} <${address}>` : address;
                }
                return recipient;
            }).join(', ');
        } else if (emailData.to) {
            toDisplay = emailData.to;
        }
        
        // 处理发送状态
        let sendStatusText = '';
        if (emailData.sendStatus && emailData.sendStatus.state) {
            const status = emailData.sendStatus.state;
            const statusMap = {
                'sent': '已发送',
                'sending': '发送中',
                'failed': '发送失败',
                'draft': '草稿'
            };
            sendStatusText = statusMap[status] || status;
            if (status === 'failed' && emailData.sendStatus.reason) {
                sendStatusText += ` (${emailData.sendStatus.reason})`;
            }
        }
        
        const emailId = emailData.id || `${emailData.date}_${emailData.messageId || ''}`;
        const formattedTime = new Date(parseInt(emailData.date) * 1000).toLocaleString();
        
        const detailHTML = `
            <div class="email-headers-container loaded">
                <div class="email-header-bar active" data-tab-id="${emailId}">
                    <span class="email-subject" title="${emailData.subject || '无主题'}">${emailData.subject || '无主题'}</span>
                    <div class="email-divider"></div>
                    <button class="email-close-btn" data-tab-id="${emailId}">
                        <svg t="1753856628434" class="icon" viewBox="0 0 1024 1024" version="1.1" p-id="4474" width="16" height="16"><path d="M572.91974805 512l242.82096754-242.82096757c16.30246778-16.30246778 16.30246778-43.75925563 0-60.91974802-16.30246778-16.30246778-43.75925563-16.30246778-60.91974802 0L512 451.08025195 269.17903243 208.25928441c-16.30246778-16.30246778-43.75925563-16.30246778-60.91974802 0-16.30246778 16.30246778-16.30246778 43.75925563 0 60.91974802L451.08025195 512l-242.82096754 242.82096757c-16.30246778 16.30246778-16.30246778 43.75925563 0 60.91974802 16.30246778 16.30246778 43.75925563 16.30246778 60.91974802 0l242.82096757-242.82096754 242.82096757 242.82096754c16.30246778 16.30246778 43.75925563 16.30246778 60.91974802 0 16.30246778-16.30246778 16.30246778-43.75925563 0-60.91974802L572.91974805 512z" fill="#3A414B" p-id="4475"></path></svg>
                    </button>
                </div>
            </div>
            <div class="email-detail loaded">
                <div class="email-detail-header">
                    <h3>${emailData.subject || '无主题'}</h3>
                </div>
                <div class="email-detail-content">
                    <div class="email-meta">
                        <div class="meta-item">
                            <span class="meta-label">发件人:</span>
                            <span class="meta-value">${fromDisplay}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">收件人:</span>
                            <span class="meta-value">${toDisplay}</span>
                        </div>
                        ${sendStatusText ? `<div class="meta-item">
                            <span class="meta-label">发送状态:</span>
                            <span class="meta-value">${sendStatusText}</span>
                        </div>` : ''}
                    </div>
                    <br class="meta-separator">
                    <p><strong>时间:</strong> ${formattedTime}</p>
                    <div class="email-content">
                        ${this.getEmailContent(emailData)}
                    </div>
                </div>
            </div>
        `;
        
        emailItems.innerHTML = detailHTML;
        
        // 添加关闭按钮事件
        const closeBtn = emailItems.querySelector('.email-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeEmailTab(emailId);
            });
        }
    }

    renderEmailTabs(emails) {
        const tabContainer = document.getElementById('emailTabContainer');
        if (!tabContainer) return;
        
        let tabsHTML = '<div class="tab-list">';
        
        emails.forEach(email => {
            const tabId = `tab_${email.id}`;
            const isActive = this.currentTabId === tabId ? 'active' : '';
            
            tabsHTML += `
                <div class="email-tab ${isActive}" data-tab-id="${tabId}">
                    <span class="tab-title">${email.subject || '无主题'}</span>
                    <span class="tab-close">×</span>
                </div>
            `;
        });
        
        tabsHTML += '</div>';
        tabContainer.innerHTML = tabsHTML;
        
        this.bindTabEvents();
    }

    formatSendStatus(status) {
        const statusMap = {
            'sent': '已发送',
            'sending': '发送中',
            'failed': '发送失败',
            'draft': '草稿'
        };
        return statusMap[status] || status || '未知';
    }

    getEmailContent(emailData) {
        if (emailData.html && emailData.html.trim() !== '') {
            // 使用iframe格式显示html内容，与收件箱保持一致
            const escapedHtml = emailData.html.replace(/"/g, '&quot;');
            return `<iframe srcdoc="<div style=&quot;font-family: -apple-system, system-ui; font-size: 14px; color: rgb(0, 0, 0); line-height: 1.43;&quot;>${escapedHtml}</div>" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-popups-to-escape-sandbox" style="width: 100%; border: none; height: 20px;" onload="this.style.height = this.contentDocument.body.scrollHeight + 'px';" referrerpolicy="no-referrer"></iframe>`;
        }
        
        if (emailData.text && emailData.text.trim() !== '') {
            // 纯文本内容也使用iframe格式显示
            const escapedText = emailData.text.replace(/\n/g, '<br>').replace(/"/g, '&quot;');
            return `<iframe srcdoc="<div style=&quot;font-family: -apple-system, system-ui; font-size: 14px; color: rgb(0, 0, 0); line-height: 1.43;&quot;>${escapedText}</div>" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-popups-to-escape-sandbox" style="width: 100%; border: none; height: 20px;" onload="this.style.height = this.contentDocument.body.scrollHeight + 'px';" referrerpolicy="no-referrer"></iframe>`;
        }
        
        return '<p class="no-content">无邮件内容</p>';
    }

    bindTabEvents() {
        const tabs = document.querySelectorAll('.email-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-close')) {
                    this.closeEmailTab(tab.dataset.tabId);
                } else {
                    this.switchEmailTab(tab.dataset.tabId);
                }
            });
        });
    }

    switchEmailTab(tabId) {
        this.currentTabId = tabId;
        
        // 更新URL参数
        this.updateUrlParams(tabId);
        
        document.querySelectorAll('.email-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        const emailData = this.emailTabs.get(tabId);
        if (emailData) {
            this.displayEmailDetails(emailData);
        }
    }

    closeEmailTab(emailId) {
        this.emailTabs.delete(emailId);
        
        if (this.currentTabId === emailId) {
            this.currentTabId = null;
            
            if (this.emailTabs.size > 0) {
                const firstTabId = this.emailTabs.keys().next().value;
                this.switchEmailTab(firstTabId);
            } else {
                const emailItems = document.getElementById('emailItems');
                if (emailItems) {
                    emailItems.innerHTML = '';
                }
                // 清除URL参数
                const url = new URL(window.location);
                url.searchParams.delete('m');
                window.history.pushState({}, '', url);
            }
        }
        
        this.renderEmailTabs(Array.from(this.emailTabs.values()));
    }

    checkUrlParams() {
        const url = new URL(window.location);
        const emailId = url.searchParams.get('m');
        
        if (emailId) {
            this.loadEmailFromUrl(emailId);
        }
    }

    async loadEmailFromUrl(emailId) {
        try {
            const response = await fetch(`/cmail/examdeta/${emailId}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                // 使用标签系统显示邮件详情
                this.openEmailInTab(emailId, data.data);
            } else {
                console.error('加载邮件失败:', data.message || '未知错误');
            }
        } catch (error) {
            console.error('从URL加载邮件失败:', error);
        }
    }

    handlePageLoad() {
        this.checkUrlParams();
        this.loadSentEmails();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SentEmailManager;
} else {
    window.SentEmailManager = SentEmailManager;
}