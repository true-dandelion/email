document.addEventListener('DOMContentLoaded', function() {
    // 添加CSS样式以美化发送状态的显示
    const style = document.createElement('style');
    style.textContent = `
        .email-tabs {
            display: flex;
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
            overflow-x: auto;
            min-height: 40px;
        }
        
        .tab-item {
            padding: 8px 16px;
            cursor: pointer;
            border-right: 1px solid #ddd;
            background: #e9ecef;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .tab-item.active {
            background: white;
            border-bottom: 2px solid #007bff;
        }
        
        .tab-close {
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 3px;
            background: rgba(0,0,0,0.1);
        }
        
        .tab-close:hover {
            background: rgba(0,0,0,0.2);
        }
        
        .email-content {
            padding: 20px;
            background: white;
            min-height: 400px;
        }
        
        .email-meta {
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
        }
        
        .meta-item {
            margin-bottom: 10px;
            display: flex;
            align-items: flex-start;
        }
        
        .meta-label {
            font-weight: bold;
            width: 80px;
            flex-shrink: 0;
            color: #666;
        }
        
        .meta-value {
            flex: 1;
            word-break: break-all;
        }
        
        .meta-value small {
            color: #666;
            font-size: 0.9em;
        }
        
        .error-status {
            color: #dc3545;
            font-weight: bold;
        }
        
        .meta-separator {
            margin: 15px 0;
        }
        
        .email-attachments {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        
        .attachment-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        
        .attachment-item:last-child {
            border-bottom: none;
        }
        
        .attachment-item button {
            padding: 2px 8px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        
        .attachment-item button:hover {
            background: #0056b3;
        }
    `;
    document.head.appendChild(style);
    // 获取邮件导航元素
    const emailNavigation = document.getElementById('emailNavigation');

    // 渲染已发送邮件列表
    function renderSentEmails() {
        // 显示加载状态
        emailNavigation.innerHTML = `
            <div class="navigation-header">
                <h3 class="navigation-title">已发送</h3>
            </div>
            <div class="navigation-content">
                <div class="loading-state">
                    <div class="loading-text">加载中...</div>
                </div>
            </div>
        `;

        // 发送请求获取已发送邮件数据
        fetch('/cmail/sent')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data.mails.length > 0) {
                    // 有邮件数据，渲染列表
                    const mails = data.data.mails;
                    let html = `
                        <div class="navigation-header">
                            <h3 class="navigation-title">已发送</h3>
                        </div>
                        <div class="navigation-content">
                            <ul class="email-list">
                    `;

                    mails.forEach(mail => {
                        // 格式化时间戳为可读日期
                        const date = new Date(parseInt(mail.timestamp));
                        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

                        // 创建邮件项
                        // 格式化日期为月/日格式
                        const monthDayFormat = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

                        html += `
                            <li class="nav-email-item" data-filename="${mail.timestamp}_${mail.id}" data-subject="${mail.subject || '[无主题]'}" data-from="${mail.to}" data-timestamp="${mail.timestamp}">
                                <div class="nav-email-from">${mail.to}</div>
                                <div class="nav-email-subject">${mail.subject || '[无主题]'}</div>
                                <div class="nav-email-time">${monthDayFormat}</div>
                            </li>
                        `;
                    });

                    html += '</ul></div>';
                    emailNavigation.innerHTML = html;

                    // 添加邮件点击事件
                    addEmailClickEvents();
                } else {
                    // 无邮件数据
                    emailNavigation.innerHTML = `
                        <div class="navigation-header">
                            <h3 class="navigation-title">已发送</h3>
                        </div>
                        <div class="navigation-content">
                            <div class="empty-state">
                                <div class="empty-text">暂无邮件</div>
                                <div class="empty-subtext">您的已发送是空的</div>
                            </div>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('获取已发送邮件失败:', error);
                emailNavigation.innerHTML = `
                    <div class="navigation-header">
                        <h3 class="navigation-title">已发送</h3>
                    </div>
                    <div class="navigation-content">
                        <div class="error-state">
                            <div class="error-text">加载失败</div>
                            <div class="error-subtext">无法获取已发送邮件，请重试</div>
                        </div>
                    </div>
                `;
            });
    }

    // 添加邮件点击事件
    function addEmailClickEvents() {
        const emailItems = document.querySelectorAll('.nav-email-item');
        emailItems.forEach(item => {
            item.addEventListener('click', function() {
                const emailId = this.getAttribute('data-filename');
                const subject = this.getAttribute('data-subject');
                const to = this.getAttribute('data-from');
                const timestamp = this.getAttribute('data-timestamp');
                
                // 更新URL参数
                updateUrlParams(emailId);
                
                // 加载邮件详情
                loadEmailDetail(emailId, subject, to, timestamp);
            });
        });
    }

    // 更新URL参数
    function updateUrlParams(emailId) {
        const url = new URL(window.location);
        
        // 清除create参数（如果存在）
        url.searchParams.delete('create');
        
        // 设置邮件ID参数
        url.searchParams.set('m', emailId);
        
        // 确保有已发送文件夹参数
        url.searchParams.set('Send', '');
        
        window.history.pushState({}, '', url);
    }

    // 加载邮件详情
    async function loadEmailDetail(emailId, subject, to, timestamp) {
        const emailItems = document.getElementById('emailItems');
        
        // 显示加载状态
        emailItems.innerHTML = `
            <div class="email-detail loading">
                <div class="email-detail-header">
                    <h3>加载中...</h3>
                </div>
                <div class="email-detail-content">
                    <p>正在获取邮件详情...</p>
                </div>
            </div>
        `;
        
        try {
            // 使用完整的邮件ID（包含时间戳前缀）
            const apiUrl = `/cmail/examdeta/${emailId}`;
            
            // 调用邮件详情接口
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                displayEmailDetails(data.data, emailId, subject, to, timestamp);
            } else {
                throw new Error(data.message || '获取邮件详情失败');
            }
        } catch (error) {
            console.error('获取邮件详情失败:', error);
            emailItems.innerHTML = `
                <div class="email-detail">
                    <div class="email-detail-header">
                        <h3>加载失败</h3>
                    </div>
                    <div class="email-detail-content">
                        <p>无法获取邮件详情: ${error.message}</p>
                        <p>请求接口: /cmail/examdeta/${emailId}</p>
                    </div>
                </div>
            `;
        }
    }

    // 邮件标签页管理
    let emailTabs = new Map();
    let activeTabId = null;

    // 显示邮件详情（带标签页）
    function displayEmailDetails(emailData, emailId, subject, to, timestamp) {
        const emailItems = document.getElementById('emailItems');
        
        // 格式化时间
        const date = new Date(parseInt(timestamp));
        const formattedTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        // 准备邮件数据
        const emailInfo = {
            from: emailData.from || { name: '未知发件人', email: '' },
            to: emailData.to || [{ name: to, email: to }],
            cc: emailData.cc || [],
            bcc: emailData.bcc || [],
            subject: subject,
            content: emailData.content || emailData.html || emailData.text || '<p>无内容</p>',
            attachments: emailData.attachments || [],
            date: formattedTime
        };
        
        // 添加标签页
        if (!emailTabs.has(emailId)) {
            emailTabs.set(emailId, {
                id: emailId,
                subject: subject,
                from: emailData.from || { name: '未知发件人', email: '' },
                to: emailData.to || [{ name: to, email: to }],
                cc: emailData.cc || [],
                bcc: emailData.bcc || [],
                content: emailData.content || emailData.html || emailData.text || '<p>无内容</p>',
                attachments: emailData.attachments || [],
                formattedTime: formattedTime,
                sendStatus: emailData.sendStatus || null
            });
        }
        
        activeTabId = emailId;
        renderEmailTabs();
        
        // 添加选中状态到导航项
        const navItems = document.querySelectorAll('.nav-email-item');
        navItems.forEach(item => {
            item.classList.remove('selected');
            if (item.getAttribute('data-filename') === emailId) {
                item.classList.add('selected');
            }
        });
    }

    // 渲染邮件标签页
    function renderEmailTabs() {
        const emailItems = document.getElementById('emailItems');
        
        if (emailTabs.size === 0) {
            emailItems.innerHTML = '';
            return;
        }

        // 创建标签页容器
        let tabsHtml = '<div class="email-headers-container loaded">';
        
        for (const [tabId, tabData] of emailTabs) {
            const isActive = tabId === activeTabId;
            tabsHtml += `
                <div class="email-header-bar ${isActive ? 'active' : ''}" data-tab-id="${tabId}">
                    <span class="email-subject" title="${tabData.subject}">${tabData.subject}</span>
                    <div class="email-divider"></div>
                    <button class="email-close-btn" data-tab-id="${tabId}">
                        <svg t="1753856628434" class="icon" viewBox="0 0 1024 1024" version="1.1" p-id="4474" width="16" height="16">
                            <path d="M572.91974805 512l242.82096754-242.82096757c16.30246778-16.30246778 16.30246778-43.75925563 0-60.91974802-16.30246778-16.30246778-43.75925563-16.30246778-60.91974802 0L512 451.08025195 269.17903243 208.25928441c-16.30246778-16.30246778-43.75925563-16.30246778-60.91974802 0-16.30246778 16.30246778-16.30246778 43.75925563 0 60.91974802L451.08025195 512l-242.82096754 242.82096757c-16.30246778 16.30246778-16.30246778 43.75925563 0 60.91974802 16.30246778 16.30246778 43.75925563 16.30246778 60.91974802 0l242.82096757-242.82096754 242.82096757 242.82096754c16.30246778 16.30246778 43.75925563 16.30246778 60.91974802 0 16.30246778-16.30246778 16.30246778-43.75925563 0-60.91974802L572.91974805 512z" fill="#3A414B" p-id="4475"></path>
                        </svg>
                    </button>
                </div>
            `;
        }
        
        tabsHtml += '</div>';
        
        // 添加当前激活标签页的内容
        if (activeTabId && emailTabs.has(activeTabId)) {
            const activeTab = emailTabs.get(activeTabId);
            
            // 格式化发件人显示
            const formatEmailAddress = (emailObj) => {
                if (!emailObj) return '未知发件人';
                const name = emailObj.name || emailObj.address || '';
                const address = emailObj.address || '';
                
                if (name && name.trim() && name !== address) {
                    return `${name} &lt;${address}&gt;`;
                } else {
                    return address || '未知发件人';
                }
            };

            // 格式化收件人/抄送显示
            const formatEmailList = (emailList) => {
                if (!emailList || emailList.length === 0) return '';
                return emailList.map(recipient => {
                    const name = recipient.name || recipient.address || '';
                    const address = recipient.address || '';
                    
                    if (name && name.trim() && name !== address) {
                        return `${name} &lt;${address}&gt;`;
                    } else {
                        return address;
                    }
                }).join(', ');
            };

            // 格式化发送状态显示
            const formatSendStatus = (sendStatus) => {
                if (!sendStatus) return '';
                
                const stateMap = {
                    'sent': '已发送',
                    'failed': '发送失败',
                    'pending': '发送中',
                    'delivered': '已送达'
                };
                
                const stateText = stateMap[sendStatus.state] || sendStatus.state;
                const time = sendStatus.timestamp ? new Date(sendStatus.timestamp).toLocaleString('zh-CN') : '';
                const reason = sendStatus.reason ? `原因：${sendStatus.reason}` : '';
                
                return `
                    <div class="meta-item">
                        <span class="meta-label">发送状态:</span>
                        <span class="meta-value ${sendStatus.state === 'failed' ? 'error-status' : ''}">
                            ${stateText}
                            ${time ? `<br><small>${time}</small>` : ''}
                            ${reason ? `<br><small>${reason}</small>` : ''}
                        </span>
                    </div>`;
            };

            // 使用iframe显示HTML内容
            const getEmailContent = (content) => {
                if (!content) return '<div class="email-text-content">无内容</div>';
                
                // 如果是HTML内容，使用iframe
                if (content.includes('<') && content.includes('>')) {
                    const safeContent = content.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                    return `
                        <div class="email-content">
                            <iframe srcdoc="${safeContent}" 
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-popups-to-escape-sandbox" 
                                style="width: 100%; border: none; height: 20px;" 
                                onload="this.style.height = this.contentDocument.body.scrollHeight + 'px';" 
                                referrerpolicy="no-referrer">
                            </iframe>
                        </div>
                    `;
                } else {
                    // 纯文本内容
                    return `<div class="email-content"><div class="email-text-content">${content}</div></div>`;
                }
            };

            // 使用EmailRenderer渲染邮件内容
            let emailContentHtml = '';
            
            if (typeof EmailRenderer !== 'undefined') {
                emailContentHtml = EmailRenderer.renderEmailContent(activeTab, activeTabId, 'downloadAttachment', activeTab.formattedTime);
                // 添加发送状态（已发送邮件特有）
                if (activeTab.sendStatus) {
                    // 找到收件人信息后插入发送状态
                    emailContentHtml = emailContentHtml.replace(
                        '</div>\n                    </div>\n                    <br class="meta-separator">',
                        `</div>\n                    </div>\n                    ${formatSendStatus(activeTab.sendStatus)}\n                    <br class="meta-separator">`
                    );
                }
            } else {
                emailContentHtml = `
                    <div class="email-meta">
                        <div class="meta-item">
                            <span class="meta-label">发件人:</span>
                            <span class="meta-value">${formatEmailAddress(activeTab.from)}</span>
                        </div>
                        
                        <div class="meta-item">
                            <span class="meta-label">收件人:</span>
                            <span class="meta-value">${formatEmailList(activeTab.to)}</span>
                        </div>
                        
                        ${formatSendStatus(activeTab.sendStatus)}
                        
                        ${activeTab.cc.length > 0 ? `
                            <div class="meta-item">
                                <span class="meta-label">抄送:</span>
                                <span class="meta-value">${formatEmailList(activeTab.cc)}</span>
                            </div>
                        ` : ''}
                    </div>
                    <br class="meta-separator">
                    <p><strong>时间:</strong> ${activeTab.formattedTime}</p>
                    
                    ${getEmailContent(activeTab.content)}
                    
                    ${activeTab.attachments.length > 0 ? `
                        <div class="email-attachments">
                            <h4>附件 (${activeTab.attachments.length})</h4>
                            ${activeTab.attachments.map(attachment => `
                                <div class="attachment-item">
                                    <span>${attachment.filename || attachment.name}</span>
                                    <span class="attachment-size">${formatFileSize(attachment.size || 0)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                `;
            }
            
            tabsHtml += `
                <div class="email-detail loaded">
                    <div class="email-detail-header">
                        <h3>${activeTab.subject}</h3>
                    </div>
                    <div class="email-detail-content">
                        ${emailContentHtml}
                    </div>
                </div>
            `;
        }
        
        emailItems.innerHTML = tabsHtml;
        
        // 绑定标签页事件
        bindTabEvents();
    }

    // 绑定标签页事件
    function bindTabEvents() {
        document.querySelectorAll('.email-header-bar').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (e.target === tab.querySelector('.email-close-btn') || 
                    tab.querySelector('.email-close-btn').contains(e.target)) {
                    return;
                }
                
                const tabId = tab.dataset.tabId;
                switchEmailTab(tabId);
            });
        });

        document.querySelectorAll('.email-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tabId = btn.dataset.tabId;
                closeEmailTab(tabId);
            });
        });
    }

    // 切换标签页
    function switchEmailTab(tabId) {
        if (emailTabs.has(tabId)) {
            activeTabId = tabId;
            renderEmailTabs();
            
            // 更新URL参数
            const url = new URL(window.location);
            url.searchParams.set('m', tabId);
            window.history.pushState({}, '', url);
        }
    }

    // 关闭标签页
    function closeEmailTab(tabId) {
        if (emailTabs.has(tabId)) {
            emailTabs.delete(tabId);
            
            if (activeTabId === tabId) {
                // 如果有其他标签页，切换到第一个
                if (emailTabs.size > 0) {
                    activeTabId = emailTabs.keys().next().value;
                } else {
                    activeTabId = null;
                    // 清除URL参数
                    const url = new URL(window.location);
                    url.searchParams.delete('m');
                    window.history.pushState({}, '', url);
                }
            }
            
            renderEmailTabs();
            
            // 如果关闭的是当前标签页，清除导航选中状态
            if (activeTabId === null) {
                document.querySelectorAll('.nav-email-item').forEach(item => {
                    item.classList.remove('selected');
                });
            }
        }
    }

    // 清除所有标签页
    function clearAllEmailTabs() {
        emailTabs.clear();
        activeTabId = null;
        
        // 清除URL参数
        const url = new URL(window.location);
        url.searchParams.delete('m');
        window.history.pushState({}, '', url);
        
        // 清除导航选中状态
        document.querySelectorAll('.nav-email-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 清空邮件显示区域
        const emailItems = document.getElementById('emailItems');
        if (emailItems) {
            emailItems.innerHTML = '';
        }
    }

    // 下载附件函数已移除
    window.downloadAttachment = function(emailId, filename) {
        console.log('附件下载功能已移除');
    };

    // 监听文件夹切换事件
    document.addEventListener('folderSwitched', function(e) {
        if (e.detail.folderName === '已发送') {
            renderSentEmails();
        } else {
            // 当离开已发送文件夹时，清除所有标签页
            clearAllEmailTabs();
        }
    });

    // 检查URL参数并加载邮件详情
    function checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('Send')) {
            renderSentEmails();
            
            // 检查是否有邮件ID参数，直接加载邮件详情
            const emailId = urlParams.get('m');
            if (emailId) {
                loadEmailFromUrl(emailId);
                return true;
            }
        }
        return false;
    }

    // 从URL加载邮件详情
    async function loadEmailFromUrl(emailId) {
        try {
            // 显示加载状态
            const emailItems = document.getElementById('emailItems');
            if (emailItems) {
                emailItems.innerHTML = `
                    <div class="email-detail loading">
                        <div class="email-detail-header">
                            <h3>加载中...</h3>
                        </div>
                        <div class="email-detail-content">
                            <p>正在获取邮件详情...</p>
                        </div>
                    </div>
                `;
            }

            // 直接调用API获取详情
            const apiUrl = `/cmail/examdeta/${emailId}`;
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                // 从emailId提取时间戳
                const timestamp = emailId.split('_')[0];
                const subject = data.data.subject || '[无主题]';
                const to = data.data.to && data.data.to.length > 0 ? 
                         (data.data.to[0].email || data.data.to[0].address || data.data.to[0]) : '未知收件人';
                
                // 添加到标签页并显示
                if (!emailTabs.has(emailId)) {
                    emailTabs.set(emailId, {
                        id: emailId,
                        subject: subject,
                        from: data.data.from || { name: '未知发件人', email: '' },
                        to: data.data.to || [{ name: to, email: to }],
                        cc: data.data.cc || [],
                        bcc: data.data.bcc || [],
                        content: data.data.content || data.data.html || data.data.text || '<p>无内容</p>',
                        attachments: data.data.attachments || [],
                        formattedTime: new Date(parseInt(timestamp)).toLocaleString('zh-CN'),
                        sendStatus: data.data.sendStatus || null
                    });
                }
                
                activeTabId = emailId;
                renderEmailTabs();
                
                // 添加选中状态到导航项（如果存在）
                setTimeout(() => {
                    const navItems = document.querySelectorAll('.nav-email-item');
                    for (const item of navItems) {
                        if (item.getAttribute('data-filename') === emailId) {
                            item.classList.add('selected');
                            break;
                        }
                    }
                }, 100);
            } else {
                throw new Error(data.message || '获取邮件详情失败');
            }
        } catch (error) {
            console.error('从URL加载邮件失败:', error);
            const emailItems = document.getElementById('emailItems');
            if (emailItems) {
                emailItems.innerHTML = `
                    <div class="email-detail">
                        <div class="email-detail-header">
                            <h3>加载失败</h3>
                        </div>
                        <div class="email-detail-content">
                            <p>无法获取邮件详情: ${error.message}</p>
                            <p>请求接口: /cmail/examdeta/${emailId}</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    // 页面加载时检查URL参数并加载数据
    function handlePageLoad() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('Send')) {
            // 始终重新请求邮件列表
            renderSentEmails();
            
            // 然后检查是否需要加载特定邮件
            const emailId = urlParams.get('m');
            if (emailId) {
                setTimeout(() => {
                    loadEmailFromUrl(emailId);
                }, 100);
            }
        }
    }

    // 立即执行页面加载逻辑
    handlePageLoad();

    // 监听文件夹切换事件
    document.addEventListener('folderSwitched', function(e) {
        if (e.detail.folderName === '已发送') {
            renderSentEmails();
        }
    });
});