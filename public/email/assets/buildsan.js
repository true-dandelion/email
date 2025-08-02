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
            insertLinkBtn.addEventListener('click', () => {
                this.insertLink();
            });
        }
    };

    // 插入图片
    window.ComposeEmail.prototype.insertImage = function(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.alt = file.name;
            
            const editor = document.getElementById('compose-content');
            const selection = window.getSelection();
            
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.insertNode(img);
            } else {
                editor.appendChild(img);
            }
            
            editor.focus();
        };
        reader.readAsDataURL(file);
    };

    // 插入链接
    window.ComposeEmail.prototype.insertLink = function() {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        
        // 使用createCustomModal创建模态窗口
        const modal = createCustomModal();
        
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
            
            if (linkUrl && linkText) {
                if (selectedText) {
                    // 如果有选中文本，直接创建链接
                    document.execCommand('createLink', false, linkUrl);
                } else {
                    // 如果没有选中文本，插入新的链接元素
                    const link = document.createElement('a');
                    link.href = linkUrl;
                    link.textContent = linkText;
                    link.target = '_blank';
                    
                    const editor = document.getElementById('compose-content');
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        range.insertNode(link);
                    } else {
                        editor.appendChild(link);
                    }
                }
            }
            
            document.getElementById('compose-content').focus();
        });
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
        
        // 添加文件到列表
        files.forEach(file => {
            const attachmentItem = document.createElement('div');
            attachmentItem.className = 'attachment-item';
            
            const fileName = document.createElement('span');
            fileName.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'attachment-remove';
            removeBtn.addEventListener('click', () => {
                attachmentItem.remove();
                // 如果没有附件了，隐藏附件列表
                if (attachmentList.children.length === 1) {
                    attachmentList.style.display = 'none';
                }
            });
            
            attachmentItem.appendChild(fileName);
            attachmentItem.appendChild(removeBtn);
            attachmentList.appendChild(attachmentItem);
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
        
        // 基本验证
        if (!toEmail) {
            alert('请输入收件人邮箱地址');
            document.getElementById('compose-to').focus();
            return;
        }
        
        if (!subject) {
            alert('请输入邮件主题');
            document.getElementById('compose-subject').focus();
            return;
        }
        
        if (!content || content.trim() === '') {
            alert('请输入邮件内容');
            document.getElementById('compose-content').focus();
            return;
        }
        
        // 构建邮件数据
        const emailData = {
            to: toEmail,
            cc: ccEmail,
            bcc: bccEmail,
            subject: subject,
            content: content,
            attachments: this.getAttachments()
        };
        
        // 这里应该调用发送邮件的API
        console.log('发送邮件:', emailData);
        alert('邮件发送功能暂未实现，请联系开发者');
    };
    
    // 保存草稿
    window.ComposeEmail.prototype.saveDraft = function() {
        const toEmail = document.getElementById('compose-to').value.trim();
        const ccEmail = document.getElementById('compose-cc').value.trim();
        const bccEmail = document.getElementById('compose-bcc').value.trim();
        const subject = document.getElementById('compose-subject').value.trim();
        const content = document.getElementById('compose-content').innerHTML;
        
        // 构建草稿数据
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
        
        // 这里应该调用保存草稿的API
        console.log('保存草稿:', draftData);
        alert('草稿保存成功');
    };
    
    // 丢弃邮件
    window.ComposeEmail.prototype.discardEmail = function() {
        if (confirm('确定要丢弃这封邮件吗？未保存的内容将会丢失。')) {
            // 清空所有输入框
            document.getElementById('compose-to').value = '';
            document.getElementById('compose-cc').value = '';
            document.getElementById('compose-bcc').value = '';
            document.getElementById('compose-subject').value = '';
            document.getElementById('compose-content').innerHTML = '';
            
            // 清空附件列表
            const attachmentList = document.getElementById('attachment-list');
            if (attachmentList) {
                attachmentList.style.display = 'none';
                attachmentList.innerHTML = '<div class="attachment-title">附件:</div>';
            }
            
            // 关闭编辑窗口或标签页
            if (window.emailApp && window.emailApp.activeTabId) {
                window.emailApp.closeEmailTab(window.emailApp.activeTabId);
            }
            
            console.log('邮件已丢弃');
        }
    };
    
    // 获取附件列表
    window.ComposeEmail.prototype.getAttachments = function() {
        const attachmentList = document.getElementById('attachment-list');
        const attachments = [];
        
        if (attachmentList) {
            const attachmentItems = attachmentList.querySelectorAll('.attachment-item');
            attachmentItems.forEach(item => {
                const fileName = item.querySelector('span').textContent;
                if (fileName) {
                    attachments.push({
                        name: fileName.split(' (')[0], // 移除文件大小部分
                        size: fileName.match(/\((.+?)\)/)?.[1] || '0 Bytes'
                    });
                }
            });
        }
        
        return attachments;
    };
    
    // 更新标签页标题
    window.ComposeEmail.prototype.updateTabTitle = function(title) {
        // 这个方法用于更新邮件编辑器的标签页标题
        if (window.emailApp && window.emailApp.activeTabId) {
            const tab = window.emailApp.emailTabs.get(window.emailApp.activeTabId);
            if (tab) {
                tab.subject = title;
                window.emailApp.renderEmailTabs();
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

// 导出到全局作用域
window.createCustomModal = createCustomModal;