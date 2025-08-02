class EmailRenderer {
    /**
     * 渲染邮件元信息
     * @param {Object} email - 邮件对象
     * @returns {string} - 邮件元信息HTML
     */
    static renderEmailMeta(email) {
        // 格式化收件人信息的通用函数
        const formatRecipients = (recipients) => {
            if (!recipients || !Array.isArray(recipients) || recipients.length === 0) return '';
            return recipients.map(recipient => {
                if (typeof recipient === 'object') {
                    const name = recipient.name || '';
                    const email = recipient.address || recipient.email || '';
                    // 如果name和email相同，说明只有一个标识符，直接显示
                    if (name === email) {
                        return email;
                    }
                    // 如果有name且不同于email，显示完整格式
                    return name ? `${name} &lt;${email}&gt;` : email;
                }
                return recipient;
            }).join(', ');
        };

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

        // 处理收件人信息
        const toInfo = formatRecipients(email.to);
        const ccInfo = formatRecipients(email.cc);

        // 构建收件人信息HTML
        let recipientsHtml = '';
        if (toInfo) {
            recipientsHtml += `
                <div class="meta-item">
                    <span class="meta-label">收件人:</span>
                    <span class="meta-value">${toInfo}</span>
                </div>`;
        }
        if (ccInfo) {
            recipientsHtml += `
                <div class="meta-item">
                    <span class="meta-label">抄送:</span>
                    <span class="meta-value">${ccInfo}</span>
                </div>`;
        }

        return `
            <div class="email-meta">
                <div class="meta-item">
                    <span class="meta-label">发件人:</span>
                    <span class="meta-value">${fromInfo.name} &lt;${fromInfo.email}&gt;</span>
                </div>
                ${recipientsHtml}
            </div>
            <br class="meta-separator">`;
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} - 格式化后的大小
     */
    static formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        
        if (i === 0) return bytes + ' B';
        
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    }

    /**
     * 渲染附件列表
     * @param {Array} attachments - 附件数组
     * @param {string} emailId - 邮件ID（格式：timestamp_fileName）
     * @param {string} downloadFunctionName - 下载函数名称
     * @returns {string} - 附件HTML
     */
    static renderAttachments(attachments, emailId, downloadFunctionName) {
        if (!attachments || attachments.length === 0) {
            return '';
        }

        const attachmentItems = attachments.map(attachment => {
            const formattedSize = this.formatFileSize(attachment.size);
            return `
                <div class="attachment-item">
                    <div class="attachment-icon">
                        ${window.VectorIcons.annex}
                    </div>
                    <div class="attachment-info">
                        <div class="attachment-name">${attachment.filename || attachment.name || '未知文件'}</div>
                        <div class="attachment-size">${formattedSize}</div>
                    </div>
                    <button class="attachment-download-btn" onclick="${downloadFunctionName}('${emailId}', '${attachment.filename || attachment.name}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7,10 12,15 17,10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                </div>`;
        }).join('');

        return `
            <div class="attachments-section">
                <h4>附件</h4>
                <div class="attachments-list">
                    ${attachmentItems}
                </div>
            </div>`;
    }

    /**
     * 渲染完整的邮件内容
     * @param {Object} email - 邮件对象
     * @param {string} emailId - 邮件ID（格式：timestamp_fileName）
     * @param {string} downloadFunctionName - 下载函数名称
     * @param {string} formattedTime - 格式化的时间（可选）
     * @returns {string} - 完整邮件HTML
     */
    static renderEmailContent(email, emailId, downloadFunctionName, formattedTime = null) {
        const metaHtml = this.renderEmailMeta(email);
        
        // 处理邮件内容中的换行符，将\n\n转换为<br><br>，将\n转换为<br>
        // 并识别链接，显示为蓝色无下划线
        const processedContent = (email.content || '')
            .replace(/\n\n+/g, '<br><br>')  // 处理空行
            .replace(/\n/g, '<br>')         // 处理普通换行
            .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color: blue; text-decoration: none;">$1</a>');  // 处理链接，在新页面打开且不包含HTML标签
        
        const contentHtml = `<div class="email-content">${processedContent}</div>`;
        
        // 如果有附件，添加5个空行和分隔符
        const spacingHtml = (email.attachments && email.attachments.length > 0) ? 
            '<br><br><br><br><br><hr>' : '';
        
        const attachmentsHtml = this.renderAttachments(email.attachments, emailId, downloadFunctionName);

        // 如果提供了时间信息，添加时间显示
        const timeHtml = formattedTime ? `<p><strong>时间:</strong> ${formattedTime}</p>` : '';

        return `
            ${metaHtml}
            ${timeHtml}
            ${contentHtml}
            ${spacingHtml}
            ${attachmentsHtml}`;
    }

    /**
     * 下载附件的通用函数
     * @param {string} emailId - 邮件ID（格式：timestamp_fileName）
     * @param {string} attachmentName - 附件名称
     */
    static downloadAttachment(emailId, attachmentName) {
        try {
            const downloadUrl = `/amail/Receive/${emailId}/attachment/${attachmentName}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = attachmentName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('下载附件失败:', error);
            alert('下载附件失败，请重试');
        }
    }
}

// 导出到全局作用域
window.EmailRenderer = EmailRenderer;