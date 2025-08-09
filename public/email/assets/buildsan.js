if (window.ComposeEmail) {
    // 绑定文件事件
    window.ComposeEmail.prototype.bindFileEvents = function() {
        // 插入图片
        const insertImageBtn = document.getElementById('insert-image-btn');
        const imageFileInput = document.getElementById('image-file-input');
        
        if (insertImageBtn && imageFileInput) {
            insertImageBtn.addEventListener('click', () => {
                imageFileInput.click();
            });
            
            imageFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.insertImage(file);
                }
            });
        }

        // 添加附件
        const attachFileBtn = document.getElementById('attach-file-btn');
        const attachmentFileInput = document.getElementById('attachment-file-input');
        
        if (attachFileBtn && attachmentFileInput) {
            attachFileBtn.addEventListener('click', () => {
                attachmentFileInput.click();
            });
            
            attachmentFileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    this.addAttachments(files);
                }
            });
        }
    };

    // 绑定链接事件
    window.ComposeEmail.prototype.bindLinkEvents = function() {
        const insertLinkBtn = document.getElementById('insert-link-btn');
        if (insertLinkBtn) {
            insertLinkBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.insertLink();
            });
        } else {
            console.warn('未找到插入链接按钮');
        }
    };

    // 插入图片
    window.ComposeEmail.prototype.insertImage = function(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '100px';
            img.style.height = '75px'; // 4:3比例
            img.style.objectFit = 'cover';
            img.alt = file.name;
            
            const editor = document.getElementById('compose-content');
            editor.appendChild(img);
            
            // 将光标移动到最后
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            
            editor.focus();
        };
        reader.readAsDataURL(file);
    };

    // 插入链接
    window.ComposeEmail.prototype.insertLink = function() {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        
        if (typeof window.createCustomModal === 'function') {
            // 使用createCustomModal创建模态窗口
            const modal = window.createCustomModal();
            
            // 如果有选中文本，预填充到文本框
            if (selectedText) {
                // 等待DOM渲染完成后设置值
                setTimeout(() => {
                    const textInputs = document.querySelectorAll('input[type="text"]');
                    // 找到模态框中的第一个文本输入框（文本输入框）
                    for (let input of textInputs) {
                        if (input.offsetParent !== null) { // 确保输入框是可见的
                            input.value = selectedText;
                            break;
                        }
                    }
                }, 10);
            }
            
            // 设置确认回调
            modal.onConfirm(() => {
                const values = modal.getValues();
                const linkText = values.text || values.link;
                const linkUrl = values.link;
                
                if (linkUrl) {
                    const editor = document.getElementById('compose-content');
                    
                    // 总是在编辑器末尾添加链接
                    const link = document.createElement('a');
                    link.href = linkUrl;
                    link.textContent = linkText;
                    link.target = '_blank';
                    link.style.color = '#0066cc';
                    link.style.textDecoration = 'underline';

                    editor.appendChild(link);
                    
                    // 将光标移动到最后
                    const newSelection = window.getSelection();
                    const newRange = document.createRange();
                    newRange.selectNodeContents(editor);
                    newRange.collapse(false);
                    newSelection.removeAllRanges();
                    newSelection.addRange(newRange);

                }
                
                document.getElementById('compose-content').focus();
            });
        } else {
            console.error('createCustomModal函数未定义');
        }
    };

    // 添加附件
    window.ComposeEmail.prototype.addAttachments = function(files) {
        // 创建附件列表容器（如果不存在）
        let attachmentList = document.getElementById('attachment-list');
        if (!attachmentList) {
            attachmentList = document.createElement('div');
            attachmentList.id = 'attachment-list';
            attachmentList.className = 'attachment-list';
            
            const composeActions = document.querySelector('.compose-actions');
            composeActions.parentNode.insertBefore(attachmentList, composeActions);
            
            // 添加标题
            const title = document.createElement('div');
            title.className = 'attachment-title';
            title.textContent = '附件:';
            attachmentList.appendChild(title);
        }
        
        // 缓存文件对象
        if (!this.attachedFiles) {
            this.attachedFiles = [];
        }
        
        // 添加文件到列表
        files.forEach(file => {
            const attachmentItem = document.createElement('div');
            attachmentItem.className = 'attachment-item';
            attachmentItem.dataset.filename = file.name;
            
            const fileName = document.createElement('span');
            fileName.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'attachment-remove';
            removeBtn.addEventListener('click', () => {
                attachmentItem.remove();
                
                // 从缓存中移除文件
                this.attachedFiles = this.attachedFiles.filter(f => f.name !== file.name);
                
                // 如果没有附件了，隐藏附件列表
                if (attachmentList.children.length === 1) {
                    attachmentList.style.display = 'none';
                }
            });
            
            attachmentItem.appendChild(fileName);
            attachmentItem.appendChild(removeBtn);
            attachmentList.appendChild(attachmentItem);
            
            // 缓存文件对象
            this.attachedFiles.push(file);
        });
        
        attachmentList.style.display = 'block';
    };

    // 格式化文件大小
    window.ComposeEmail.prototype.formatFileSize = function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    // 绑定分割线事件
    window.ComposeEmail.prototype.bindHrEvent = function() {
        const hrBtn = document.getElementById('insert-hr-btn');
        if (hrBtn) {
            hrBtn.addEventListener('click', () => {
                this.insertHorizontalRule();
            });
        }
    };
    
    // 插入分割线
    window.ComposeEmail.prototype.insertHorizontalRule = function() {
        const editor = document.getElementById('compose-content');
        if (editor) {
            editor.focus();
            document.execCommand('insertHorizontalRule', false, null);
        }
    };
    
    // 发送邮件
    window.ComposeEmail.prototype.sendEmail = function() {
        const toEmail = document.getElementById('compose-to').value.trim();
        const ccEmail = document.getElementById('compose-cc').value.trim();
        const bccEmail = document.getElementById('compose-bcc').value.trim();
        const subject = document.getElementById('compose-subject').value.trim();
        const content = document.getElementById('compose-content').innerHTML;
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        // 验证收件人邮箱格式
        const emails = toEmail.split(',').map(email => email.trim()).filter(email => email);
        for (let email of emails) {
            if (!emailRegex.test(email)) {
                this.showEmailValidationModal('收件人邮件地址格式错误', '邮件地址必须为xxx@xxx.xx格式', 'compose-to');
                return;
            }
        }
        
        // 验证抄送邮箱格式
        if (ccEmail) {
            const ccEmails = ccEmail.split(',').map(email => email.trim()).filter(email => email);
            for (let email of ccEmails) {
                if (!emailRegex.test(email)) {
                    this.showEmailValidationModal('抄送邮件地址格式错误', '抄送邮件地址必须为xxx@xxx.xx格式', 'compose-cc');
                    return;
                }
            }
        }
        
        // 验证密送邮箱格式
        if (bccEmail) {
            const bccEmails = bccEmail.split(',').map(email => email.trim()).filter(email => email);
            for (let email of bccEmails) {
                if (!emailRegex.test(email)) {
                    this.showEmailValidationModal('密送邮件地址格式错误', '密送邮件地址必须为xxx@xxx.xx格式', 'compose-bcc');
                    return;
                }
            }
        }
        
        // 如果收件人和主题都存在，直接发送
        if (toEmail && subject) {
            this.sendEmailWithAPI(toEmail, ccEmail, bccEmail, subject, content);
        } else {
            // 否则显示验证模态窗口
            this.showValidationModal();
        }
    };
    
    window.ComposeEmail.prototype.showEmailValidationModal = function(title, message, focusField) {
        const modal = createValidationModal();
        modal.setTitle(title);
        modal.setMessages([message]);
        modal.showContinueButton(false);

        modal.onCancel(() => {
            modal.close();
            document.getElementById(focusField).focus();
        });
    };

    window.ComposeEmail.prototype.showValidationModal = function() {
        const toEmail = document.getElementById('compose-to').value.trim();
        const ccEmail = document.getElementById('compose-cc').value.trim();
        const bccEmail = document.getElementById('compose-bcc').value.trim();
        const subject = document.getElementById('compose-subject').value.trim();
        const content = document.getElementById('compose-content').innerHTML;
        const modal = createValidationModal();
        
        let validationMessages = [];
        let showContinueButton = true;
        
        // 验证收件人邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!toEmail) {
            validationMessages.push('• 收件人邮箱地址不能为空');
            showContinueButton = false;
        } else {
            const emails = toEmail.split(',').map(email => email.trim()).filter(email => email);
            for (let email of emails) {
                if (!emailRegex.test(email)) {
                    this.showEmailValidationModal('收件人邮件地址格式错误', '邮件地址必须为xxx@xxx.xx格式', 'compose-to');
                    return;
                }
            }
        }
        
        // 验证抄送邮箱格式
        if (ccEmail) {
            const ccEmails = ccEmail.split(',').map(email => email.trim()).filter(email => email);
            for (let email of ccEmails) {
                if (!emailRegex.test(email)) {
                    this.showEmailValidationModal('抄送邮件地址格式错误', '抄送邮件地址必须为xxx@xxx.xx格式', 'compose-cc');
                    return;
                }
            }
            if (showContinueButton) {
                validationMessages.push('• 已添加抄送：' + ccEmail);
            }
        }
        
        // 验证密送邮箱格式
        if (bccEmail) {
            const bccEmails = bccEmail.split(',').map(email => email.trim()).filter(email => email);
            for (let email of bccEmails) {
                if (!emailRegex.test(email)) {
                    this.showEmailValidationModal('密送邮件地址格式错误', '密送邮件地址必须为xxx@xxx.xx格式', 'compose-bcc');
                    return;
                }
            }
            if (showContinueButton) {
                validationMessages.push('• 已添加密送：' + bccEmail);
            }
        }
        
        if (!subject && toEmail && showContinueButton) {
            validationMessages.push('• 邮件主题为空，是否继续发送？');
        }
        
        modal.setMessages(validationMessages);
        modal.setTitle('发送邮件确认');
        modal.showContinueButton(showContinueButton);

        modal.onCancel(() => {
            modal.close();
            if (!toEmail) {
                document.getElementById('compose-to').focus();
            } else if (!showContinueButton && toEmail) {
                document.getElementById('compose-to').focus();
            } else if (!subject) {
                document.getElementById('compose-subject').focus();
            } else if (!content || content.trim() === '') {
                document.getElementById('compose-content').focus();
            }
        });
        
        modal.onContinue(() => {
            modal.close();
            this.sendEmailWithAPI(toEmail, ccEmail, bccEmail, subject, content);
        });
    };
    window.ComposeEmail.prototype.saveDraft = function() {
        const toEmail = document.getElementById('compose-to').value.trim();
        const ccEmail = document.getElementById('compose-cc').value.trim();
        const bccEmail = document.getElementById('compose-bcc').value.trim();
        const subject = document.getElementById('compose-subject').value.trim();
        const content = document.getElementById('compose-content').innerHTML;
        
        const draftData = {
            to: toEmail,
            cc: ccEmail,
            bcc: bccEmail,
            subject: subject,
            content: content,
            attachments: this.getAttachments(),
            isDraft: true,
            savedAt: new Date().toISOString()
        };

        alert('草稿保存成功');
    };
    
    // 丢弃邮件
    window.ComposeEmail.prototype.discardEmail = function() {
        // 清空所有输入框
        document.getElementById('compose-to').value = '';
        document.getElementById('compose-cc').value = '';
        document.getElementById('compose-bcc').value = '';
        document.getElementById('compose-subject').value = '';
        document.getElementById('compose-content').innerHTML = '';
        
        // 清空附件列表和缓存
        const attachmentList = document.getElementById('attachment-list');
        if (attachmentList) {
            attachmentList.style.display = 'none';
            attachmentList.innerHTML = '<div class="attachment-title">附件:</div>';
        }
        
        // 清空缓存的文件对象
        if (this.attachedFiles) {
            this.attachedFiles = [];
        }
        
        // 关闭编辑窗口或标签页
        if (window.emailApp && window.emailApp.activeTabId) {
            window.emailApp.closeEmailTab(window.emailApp.activeTabId);
        }

    };
    
    // 获取附件列表
    window.ComposeEmail.prototype.getAttachments = function() {
        const attachments = [];
        
        if (this.attachedFiles && this.attachedFiles.length > 0) {
            this.attachedFiles.forEach(file => {
                attachments.push({
                    name: file.name,
                    size: this.formatFileSize(file.size),
                    type: file.type
                });
            });
        }
        
        return attachments;
    };
    
    // 通过API发送邮件
    window.ComposeEmail.prototype.sendEmailWithAPI = function(toEmail, ccEmail, bccEmail, subject, content) {
        const loadingModal = createLoadingModal();
        loadingModal.show('正在发送邮件...');
        
        // 准备邮件数据
        let emailData = {};
        
        // 处理收件人
        if (toEmail.includes(',')) {
            emailData.to = toEmail.split(',').map(email => email.trim()).filter(email => email);
        } else {
            emailData.to = toEmail.trim();
        }
        
        emailData.subject = subject;
        emailData.content = content;
        
        // 处理抄送
        if (ccEmail) {
            if (ccEmail.includes(',')) {
                emailData.cc = ccEmail.split(',').map(email => email.trim()).filter(email => email);
            } else {
                emailData.cc = ccEmail.trim();
            }
        }
        
        // 处理密送
        if (bccEmail) {
            if (bccEmail.includes(',')) {
                emailData.bcc = bccEmail.split(',').map(email => email.trim()).filter(email => email);
            } else {
                emailData.bcc = bccEmail.trim();
            }
        }
        
        // 处理附件
        const attachments = this.getAttachments();
        if (attachments && attachments.length > 0) {
            // 将附件转换为base64格式
            const filePromises = this.convertAttachmentsToBase64();
            Promise.all(filePromises)
                .then(base64Files => {
                    if (base64Files.length > 0) {
                        emailData.annex = base64Files[0].data; // 单附件
                        emailData.annexname = base64Files[0].name;
                    }
                    this.sendEmailRequest(emailData);
                })
                .catch(error => {
                    loadingModal.close();
                    console.error('处理附件时出错:', error);
                    alert('处理附件失败，请重试');
                });
        } else {
            // 无附件，直接发送
            this.sendEmailRequest(emailData);
        }
    };

    // 创建加载中的模态窗口
    function createLoadingModal() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #1890ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        `;
        
        const text = document.createElement('div');
        text.textContent = '发送中...';
        text.style.cssText = 'color: #666;';
        
        modal.appendChild(spinner);
        modal.appendChild(text);
        overlay.appendChild(modal);
        
        // 添加CSS动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(overlay);
        
        return {
            show: function(message) {
                text.textContent = message || '发送中...';
                overlay.style.display = 'flex';
            },
            close: function() {
                overlay.remove();
                style.remove();
            }
        };
    }

    // 将附件转换为base64格式
    window.ComposeEmail.prototype.convertAttachmentsToBase64 = function() {
        const promises = [];
        
        if (this.attachedFiles && this.attachedFiles.length > 0) {
            this.attachedFiles.forEach(file => {
                const promise = new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        resolve({
                            name: file.name,
                            data: e.target.result.split(',')[1], // 移除data:前缀
                            type: file.type
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                promises.push(promise);
            });
        }
        
        return promises;
    };

    // 发送邮件请求
    window.ComposeEmail.prototype.sendEmailRequest = function(emailData) {
        // 发送API请求
        fetch('/amail/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 关闭加载模态窗口
            const loadingModal = document.querySelector('.loading-modal-overlay');
            if (loadingModal && loadingModal.close) {
                loadingModal.close();
            } else if (loadingModal) {
                loadingModal.remove();
            }
            
            if (data.success) {
                this.discardEmail(); // 发送成功后清空表单
            } else {
                alert(`邮件发送失败：${data.message || '未知错误'}`);
            }
        })
        .catch(error => {
            // 关闭加载模态窗口
            const loadingModal = document.querySelector('.loading-modal-overlay');
            if (loadingModal && loadingModal.close) {
                loadingModal.close();
            } else if (loadingModal) {
                loadingModal.remove();
            }
            
            console.error('发送邮件时出错:', error);
            alert(`邮件发送失败：${error.message}`);
        });
    };

    // 更新标签页标题
    window.ComposeEmail.prototype.updateTabTitle = function(title) {
        // 这个方法用于更新邮件编辑器的标签页标题
        if (window.emailApp && window.emailApp.activeTabId) {
            const tab = window.emailApp.emailTabs.get(window.emailApp.activeTabId);
            if (tab) {
                tab.subject = title;
                // 只更新标签页标题文本，不重新渲染整个标签页结构
                const tabElement = document.querySelector(`.email-header-bar[data-tab-id="${window.emailApp.activeTabId}"] .email-subject`);
                if (tabElement) {
                    tabElement.textContent = title;
                    tabElement.title = title;
                }
            }
        }
        
        // 也可以更新浏览器标题
        document.title = title ? `${title} - 邮件编辑` : '新邮件 - 邮件编辑';
    };
}

// 创建优化的链接模态窗口
function createCustomModal() {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(2px);
    `;
    
    // 创建模态框容器
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        background: #fff;
        padding: 24px;
        border-radius: 8px;
        width: 480px;
        max-width: 90vw;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        z-index: 1001;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // 标题区域
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
    `;
    
    const title = document.createElement('h3');
    title.textContent = '插入链接';
    title.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #262626;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        color: #8c8c8c;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
    `;
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // 表单容器
    const form = document.createElement('div');
    form.style.cssText = 'margin-bottom: 24px;';
    
    // 文本输入组
    const textGroup = document.createElement('div');
    textGroup.style.cssText = 'margin-bottom: 20px;';
    
    const textLabel = document.createElement('label');
    textLabel.textContent = '显示文本';
    textLabel.style.cssText = `
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #262626;
    `;
    
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = '请输入链接显示的文本';
    textInput.style.cssText = `
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
        transition: all 0.2s;
        outline: none;
    `;
    
    textGroup.appendChild(textLabel);
    textGroup.appendChild(textInput);
    
    // 链接输入组
    const linkGroup = document.createElement('div');
    linkGroup.style.cssText = 'margin-bottom: 16px;';
    
    const linkLabel = document.createElement('label');
    linkLabel.textContent = '链接地址';
    linkLabel.style.cssText = `
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #262626;
    `;
    
    const linkInputContainer = document.createElement('div');
    linkInputContainer.style.cssText = 'position: relative;';
    
    const linkInput = document.createElement('input');
    linkInput.type = 'url';
    linkInput.placeholder = 'http://shaoxin.top';
    linkInput.style.cssText = `
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
        transition: all 0.2s;
        outline: none;
    `;
    
    linkInputContainer.appendChild(linkInput);
    linkGroup.appendChild(linkLabel);
    linkGroup.appendChild(linkInputContainer);
    
    // 错误提示
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = `
        color: #ff4d4f;
        font-size: 12px;
        margin-top: 4px;
        display: none;
    `;
    linkGroup.appendChild(errorMsg);
    
    // 链接预览
    const preview = document.createElement('div');
    preview.style.cssText = `
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 12px;
        margin-top: 16px;
        display: none;
    `;
    
    const previewLabel = document.createElement('div');
    previewLabel.textContent = '链接预览：';
    previewLabel.style.cssText = `
        font-size: 12px;
        color: #6c757d;
        margin-bottom: 4px;
    `;
    
    const previewLink = document.createElement('a');
    previewLink.target = '_blank';
    previewLink.style.cssText = `
        color: #1890ff;
        text-decoration: none;
        font-size: 14px;
        word-break: break-all;
    `;
    
    preview.appendChild(previewLabel);
    preview.appendChild(previewLink);
    
    form.appendChild(textGroup);
    form.appendChild(linkGroup);
    form.appendChild(preview);
    
    // 按钮区域
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid #f0f0f0;
    `;
    
    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
        padding: 8px 16px;
        background: #fff;
        color: #595959;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        min-width: 80px;
    `;
    
    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认';
    confirmBtn.disabled = true;
    confirmBtn.style.cssText = `
        padding: 8px 16px;
        background: #d9d9d9;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: not-allowed;
        font-size: 14px;
        transition: all 0.2s;
        min-width: 80px;
    `;
    
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    
    // 组装模态框
    modal.appendChild(header);
    modal.appendChild(form);
    modal.appendChild(buttonContainer);
    
    // 添加到文档
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // 动画显示
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // 输入验证和预览更新
    function validateAndUpdate() {
        const linkValue = linkInput.value.trim();
        const textValue = textInput.value.trim();
        
        // 验证链接格式
        const isValidUrl = linkValue && (linkValue.startsWith('http://') || linkValue.startsWith('https://') || linkValue.startsWith('mailto:'));
        
        if (linkValue && !isValidUrl) {
            errorMsg.textContent = '请输入有效的链接地址（以 http://、https:// 或 mailto: 开头）';
            errorMsg.style.display = 'block';
            linkInput.style.borderColor = '#ff4d4f';
        } else {
            errorMsg.style.display = 'none';
            linkInput.style.borderColor = '#d9d9d9';
        }
        
        // 更新确认按钮状态
        if (isValidUrl && textValue) {
            confirmBtn.disabled = false;
            confirmBtn.style.background = '#1890ff';
            confirmBtn.style.cursor = 'pointer';
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.background = '#d9d9d9';
            confirmBtn.style.cursor = 'not-allowed';
        }
        
        // 更新预览
        if (isValidUrl) {
            previewLink.href = linkValue;
            previewLink.textContent = textValue || linkValue;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    }
    
    // 输入事件监听
    textInput.addEventListener('input', validateAndUpdate);
    linkInput.addEventListener('input', validateAndUpdate);
    
    // 焦点样式
    [textInput, linkInput].forEach(input => {
        input.addEventListener('focus', () => {
            input.style.borderColor = '#1890ff';
            input.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.2)';
        });
        
        input.addEventListener('blur', () => {
            if (input === linkInput && input.value && !input.value.match(/^(https?:\/\/|mailto:)/)) {
                return; // 保持错误状态
            }
            input.style.borderColor = '#d9d9d9';
            input.style.boxShadow = 'none';
        });
    });
    
    // 按钮悬停效果
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.borderColor = '#40a9ff';
        cancelBtn.style.color = '#40a9ff';
    });
    
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.borderColor = '#d9d9d9';
        cancelBtn.style.color = '#595959';
    });
    
    confirmBtn.addEventListener('mouseenter', () => {
        if (!confirmBtn.disabled) {
            confirmBtn.style.background = '#40a9ff';
        }
    });
    
    confirmBtn.addEventListener('mouseleave', () => {
        if (!confirmBtn.disabled) {
            confirmBtn.style.background = '#1890ff';
        }
    });
    
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#f5f5f5';
        closeBtn.style.color = '#262626';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'none';
        closeBtn.style.color = '#8c8c8c';
    });
    
    // 关闭模态框的函数
    function closeModal() {
        overlay.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 300);
    }
    
    // 事件监听
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    // 键盘事件
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
        if (e.key === 'Enter' && !confirmBtn.disabled) {
            confirmBtn.click();
        }
    });
    
    // 自动聚焦到第一个输入框
    setTimeout(() => textInput.focus(), 100);
    
    // 返回操作接口
    return {
        getValues: () => ({
            text: textInput.value.trim(),
            link: linkInput.value.trim()
        }),
        onConfirm: (callback) => {
            confirmBtn.addEventListener('click', () => {
                if (!confirmBtn.disabled) {
                    callback();
                    closeModal();
                }
            });
        },
        setError: (message) => {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }
    };
}


// 创建验证模态窗口
function createValidationModal() {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(2px);
    `;
    
    // 创建模态框容器
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        background: #fff;
        padding: 24px;
        border-radius: 8px;
        width: 420px;
        max-width: 90vw;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        z-index: 1001;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // 标题区域
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
    `;
    
    const title = document.createElement('h3');
    title.textContent = '发送邮件确认';
    title.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #262626;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        color: #8c8c8c;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
    `;
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // 消息容器
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
        margin-bottom: 24px;
        font-size: 14px;
        line-height: 1.6;
        color: #595959;
    `;
    
    // 按钮区域
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid #f0f0f0;
    `;
    
    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
        padding: 8px 16px;
        background: #fff;
        color: #595959;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        min-width: 80px;
    `;
    
    // 继续发送按钮
    const continueBtn = document.createElement('button');
    continueBtn.textContent = '继续发送';
    continueBtn.style.cssText = `
        padding: 8px 16px;
        background: #1890ff;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        min-width: 100px;
        display: none;
    `;
    
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(continueBtn);
    
    // 组装模态框
    modal.appendChild(header);
    modal.appendChild(messageContainer);
    modal.appendChild(buttonContainer);
    
    // 添加到文档
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // 动画显示
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // 关闭模态框
    function closeModal() {
        overlay.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
            if (modal && modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
    
    // 回调函数
    let onCancelCallback = null;
    let onContinueCallback = null;
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', () => {
        if (onCancelCallback) onCancelCallback();
        closeModal();
    });
    continueBtn.addEventListener('click', () => {
        if (onContinueCallback) onContinueCallback();
        closeModal();
    });
    overlay.addEventListener('click', closeModal);
    
    return {
        setTitle: function(newTitle) {
            title.textContent = newTitle;
        },
        setMessages: function(messages) {
            messageContainer.innerHTML = '';
            messages.forEach(message => {
                const p = document.createElement('p');
                p.textContent = message;
                p.style.margin = '8px 0';
                messageContainer.appendChild(p);
            });
        },
        showContinueButton: function(show) {
            continueBtn.style.display = show ? 'block' : 'none';
        },
        onCancel: function(callback) {
            onCancelCallback = callback;
        },
        onContinue: function(callback) {
            onContinueCallback = callback;
        },
        close: closeModal
    };
}

// 导出到全局作用域
window.createCustomModal = createCustomModal;
window.createValidationModal = createValidationModal;

// 确保ComposeEmail类在全局作用域可用
if (typeof window.ComposeEmail === 'undefined') {
    window.ComposeEmail = window.ComposeEmail || {};
}

// 初始化链接功能
function initLinkFeature() {
    // 等待所有依赖加载完成
    if (typeof window.ComposeEmail === 'function' && typeof window.createCustomModal === 'function') {
        // 确保ComposeEmail实例存在时绑定链接事件
        const originalInitEditor = window.ComposeEmail.prototype.initEditor;
        window.ComposeEmail.prototype.initEditor = function() {
            originalInitEditor.call(this);
            // 延迟绑定确保DOM已加载
            setTimeout(() => {
                this.bindLinkEvents();
            }, 100);
        };
    } else {
        // 如果依赖未加载，延迟重试
        setTimeout(initLinkFeature, 100);
    }
}

// 启动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLinkFeature);
} else {
    initLinkFeature();
}
