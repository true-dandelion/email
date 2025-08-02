let currentSelectedEmail = null;

// 初始化邮件显示
function initializeEmailDisplay() {
    displayEmailList();
}

// 显示邮件列表
function displayEmailList(emails = []) {
    const emailItemsContainer = document.getElementById('emailItems');
    
    if (emails.length === 0) {
        emailItemsContainer.innerHTML = '';
        return;
    }
    
    let emailListHTML = '';
    
    emails.forEach(email => {
        emailListHTML += createEmailItemHTML(email);
    });
    
    emailItemsContainer.innerHTML = emailListHTML;
    
    // 添加点击事件监听器
    addEmailClickListeners();
}

// 创建邮件项HTML
function createEmailItemHTML(email) {
    const readClass = email.isRead ? '' : 'unread';
    const importantClass = email.isImportant ? 'important' : '';
    const attachmentIcon = email.hasAttachment ? '<span class="attachment-icon">📎</span>' : '';
    
    return `
        <div class="email-item ${readClass} ${importantClass}" data-email-id="${email.id}">
            <div class="email-header">
                <div class="email-from">
                    <div class="sender-name">${email.from.name}</div>
                    <div class="sender-email">${email.from.email}</div>
                </div>
                <div class="email-time">${email.time}</div>
            </div>
            <div class="email-to">
                <span class="to-label">收件人:</span>
                <span class="recipient">${email.to}</span>
            </div>
            <div class="email-subject">
                ${attachmentIcon}
                ${email.subject}
                ${email.isImportant ? '<span class="important-flag">⭐</span>' : ''}
            </div>
            <div class="email-preview">
                ${email.content.substring(0, 100)}${email.content.length > 100 ? '...' : ''}
            </div>
        </div>
    `;
}

// 添加邮件点击事件监听器
function addEmailClickListeners() {
    const emailItems = document.querySelectorAll('.email-item');
    
    emailItems.forEach(item => {
        item.addEventListener('click', async function() {
            const emailId = parseInt(this.dataset.emailId);
            await selectEmail(emailId);
            displayEmailDetail(emailId);
        });
    });
}

// 选中邮件
async function selectEmail(emailId) {
    // 移除之前的选中状态
    const previousSelected = document.querySelector('.email-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }
    
    // 添加新的选中状态
    const selectedItem = document.querySelector(`[data-email-id="${emailId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
        selectedItem.classList.remove('unread');
    }
    
    // 更新邮件为已读状态
    const email = sampleEmails.find(e => e.id === emailId);
    if (email) {
        email.isRead = true;
        currentSelectedEmail = email;
        
        // 向后端发送状态更新，将邮件标记为已读
        try {
            if (window.receiveAPI) {
                await window.receiveAPI.updateEmailState(emailId.toString(), { read: true });
            }
        } catch (error) {
            console.error('更新邮件已读状态失败:', error);
        }
    }
}

// 显示邮件详情
function displayEmailDetail(emailId) {
    // 更新地址栏参数
    const url = new URL(window.location);
    url.searchParams.set('m', emailId);
    
    // 确保有对应的文件夹参数
    if (window.emailApp && window.emailApp.currentFolder) {
        const folderMap = {
            '收件箱': 'Inbox',
            '垃圾邮件': 'litter',
            '已发送': 'Send',
            '草稿箱': 'draft',
            '已删除': 'Delete',
            '工作': 'Job',
            '个人': 'individual',
            '重要': 'significant'
        };
        
        const folderParam = folderMap[window.emailApp.currentFolder];
        if (folderParam) {
            // 清除其他文件夹参数
            Object.values(folderMap).forEach(param => {
                if (param !== folderParam) {
                    url.searchParams.delete(param);
                }
            });
            // 设置当前文件夹参数
            url.searchParams.set(folderParam, '');
        }
    }
    
    window.history.pushState({}, '', url);
    
    // 调用邮件详情API
    fetchEmailDetail(emailId);
}

// 获取邮件详情的API调用
function fetchEmailDetail(emailId) {
    // 直接使用emailId构建API URL
    const apiUrl = `/amail/Receive/${emailId}`;
    
    // 调用邮件详情接口
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(emailData => {
            // 显示邮件详情，传递emailId作为fileName
            showEmailDetailModal(emailData, emailId);
        })
        .catch(error => {
            console.error('获取邮件详情失败:', error);
            alert('无法获取邮件详情');
        });
}

// 显示邮件详情模态框
function showEmailDetailModal(emailData, fileName) {
    // 检查是否有success字段，如果有则使用data字段
    const email = emailData.success ? emailData.data : emailData;
    
    // 设置fileName到email对象中，供下载使用
    email.fileName = fileName;
    
    // 处理发件人信息
    let fromInfo = { name: '未知发件人', email: '' };
    if (email.from) {
        if (typeof email.from === 'object') {
            fromInfo = {
                name: email.from.name || '未知发件人',
                email: email.from.address || email.from.email || ''
            };
        } else {
            fromInfo = window.receiveAPI ? window.receiveAPI.parseEmailAddress(email.from) : { name: email.from, email: '' };
        }
    }
    
    // 格式化收件人信息的通用函数
    const formatRecipients = (recipients) => {
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) return '';
        return recipients.map(recipient => {
            if (typeof recipient === 'object') {
                const name = recipient.name || '';
                const email = recipient.address || recipient.email || '';
                return name ? `${name} <${email}>` : email;
            }
            return recipient;
        }).join(', ');
    };
    
    // 处理收件人信息
    const toInfo = formatRecipients(email.to);
    
    // 处理抄送信息
    const ccInfo = formatRecipients(email.cc);
    
    // 处理密送信息
    const bccInfo = formatRecipients(email.bcc);
    
    // 处理时间
    let formattedTime = '未知时间';
    if (email.date) {
        // 检查是否为时间戳格式（数字）
        if (typeof email.date === 'number') {
            const date = new Date(email.date * 1000); // 时间戳转换为毫秒
            formattedTime = date.toLocaleString('zh-CN');
        } else {
            // 处理ISO日期字符串格式
            const date = new Date(email.date);
            formattedTime = date.toLocaleString('zh-CN');
        }
    } else if (email.timestamp) {
        formattedTime = window.receiveAPI ? window.receiveAPI.formatTimestamp(email.timestamp) : '未知时间';
    }
    
    // 处理邮件内容
    const content = email.html || email.text || email.content || email.body || '邮件内容为空';
    email.content = content;
    
    // 使用EmailRenderer渲染邮件内容
    const emailContentHtml = EmailRenderer.renderEmailContent(email, fileName, 'downloadAttachmentFromModal', formattedTime);
    
    // 创建模态框HTML
    const modalHTML = `
        <div class="email-detail-modal" id="emailDetailModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${email.subject || '无主题'}</h3>
                    <button class="close-btn" onclick="closeEmailDetailModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${emailContentHtml}
                </div>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 添加样式（如果CSS中没有的话）
    addModalStyles();
}

// 关闭邮件详情模态框
function closeEmailDetailModal() {
    const modal = document.getElementById('emailDetailModal');
    if (modal) {
        modal.remove();
    }
}

// 添加模态框样式
function addModalStyles() {
    const existingStyle = document.getElementById('emailModalStyles');
    if (existingStyle) return;
    
    const style = document.createElement('style');
    style.id = 'emailModalStyles';
    style.textContent = `
        .email-detail-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .modal-content {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 800px;
            max-height: 80%;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 18px;
            color: #333;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        .close-btn:hover {
            background-color: #f0f0f0;
            color: #666;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .email-meta {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .meta-row {
            display: flex;
            margin-bottom: 8px;
        }
        
        .meta-label {
            font-weight: 600;
            color: #666;
            width: 80px;
            flex-shrink: 0;
        }
        
        .meta-value {
            color: #333;
        }
        
        .email-content {
            line-height: 1.6;
            color: #333;
            white-space: pre-wrap;
        }
        
        .email-subject {
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .email-preview {
            color: #666;
            font-size: 13px;
            margin-top: 4px;
        }
        
        .attachment-icon {
            color: #666;
        }
        
        .important-flag {
            color: #ff9800;
        }
        
        .email-item.unread {
            background-color: #f8f9fa;
            border-left: 3px solid #2196f3;
        }
        
        .email-item.unread .sender-name {
            font-weight: 700;
        }
    `;
    
    document.head.appendChild(style);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeEmailDisplay();
});

// 导出函数供其他模块使用
// 从模态框下载附件函数
function downloadAttachmentFromModal(emailId, attachmentName) {
    EmailRenderer.downloadAttachment(emailId, attachmentName);
}

window.EmailDisplay = {
    initializeEmailDisplay,
    displayEmailList,
    selectEmail,
    displayEmailDetail,
    fetchEmailDetail,
    closeEmailDetailModal
};