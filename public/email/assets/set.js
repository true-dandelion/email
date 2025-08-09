class SettingsManager {
    constructor() {
        this.init();
        this.defaultEmail = null; // 缓存默认邮箱
        this.isDataLoaded = false; // 标记数据是否已加载
        window.settingsManager = this; // 暴露到全局
    }

    init() {
        this.bindEvents();
        this.checkSettingsPage();
        
        // 监听设置页面显示事件
        document.addEventListener('showSettings', () => {
            this.showSettingsPage();
        });
    }

    bindEvents() {
        const setButton = document.getElementById('set-b');
        const emailNavigation = document.getElementById('emailNavigation');
        
        if (setButton && emailNavigation) {
            setButton.addEventListener('click', () => {
                emailNavigation.style.display = 'none';
                this.showSettingsPage();
            });
            
            // 为其他导航项添加事件监听器，恢复显示
            const otherNavItems = document.querySelectorAll('.nav-item:not(#set-b)');
            otherNavItems.forEach(item => {
                item.addEventListener('click', function() {
                    emailNavigation.style.display = 'block';
                    document.getElementById('emailItems').innerHTML = '';
                });
            });
        }
    }

    showSettingsPage() {
        const emailItems = document.getElementById('emailItems');
        if (!emailItems) return;

        // 使用setone.js中的模板
        emailItems.innerHTML = SettingsTemplates.settingsPage;

        // 添加样式
        this.addSettingsStyles();
        
        // 绑定导航点击事件
        this.bindNavigationEvents();
        
        // 进入设置页面时立即加载数据
        this.loadAllSettingsData();
    }
    
    async loadAllSettingsData() {
        if (this.isDataLoaded) {
            // 如果数据已加载，直接更新显示
            this.updateDisplayWithCachedData();
            return;
        }
        
        try {
            // 先加载默认邮箱并缓存
            await this.loadDefaultEmail();
            // 然后加载映射规则，使用缓存的邮箱
            await this.loadMappingRules();
            this.isDataLoaded = true;
        } catch (error) {
            console.error('加载设置数据失败:', error);
        }
    }
    
    updateDisplayWithCachedData() {
        // 使用缓存的数据更新显示
        const defaultEmailEl = document.getElementById('default-email');
        if (defaultEmailEl && this.defaultEmail) {
            defaultEmailEl.textContent = this.defaultEmail;
        }
        
        // 重新加载映射规则（可能数据有更新）
        this.loadMappingRules();
    }

    bindNavigationEvents() {
        const navItems = document.querySelectorAll('.settings-nav-item');
        const contentArea = document.querySelector('.settings-content');
        
        // 点击导航项滚动到对应位置
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.target.getAttribute('data-target');
                const targetElement = document.getElementById(target);
                if (targetElement) {
                    // 移除所有active类
                    navItems.forEach(nav => nav.classList.remove('active'));
                    // 添加active类到当前点击的项
                    e.target.classList.add('active');
                    
                    // 计算目标位置（相对于contentArea的顶部）
                    const targetOffset = targetElement.offsetTop;
                    contentArea.scrollTo({
                        top: targetOffset,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // 监听滚动事件，自动更新导航激活状态
        if (contentArea) {
            contentArea.addEventListener('scroll', () => {
                const sections = document.querySelectorAll('.settings-section');
                let currentSection = '';
                
                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    const sectionHeight = section.offsetHeight;
                    const scrollTop = contentArea.scrollTop;
                    
                    // 检查section是否在视口中（相对于contentArea）
                    if (scrollTop >= sectionTop - 50 && scrollTop < sectionTop + sectionHeight - 50) {
                        currentSection = section.id;
                    }
                });
                
                // 更新导航激活状态
                if (currentSection) {
                    navItems.forEach(nav => {
                        nav.classList.remove('active');
                        if (nav.getAttribute('data-target') === currentSection) {
                            nav.classList.add('active');
                        }
                    });
                }
            });
        }
        
        // 默认激活第一个导航项
        if (navItems.length > 0) {
            navItems[0].classList.add('active');
        }
        
        // 绑定邮件映射相关事件
        this.bindMappingEvents();
    }
    
    bindMappingEvents() {
        // 保存映射按钮事件
        const saveBtn = document.getElementById('save-mapping-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveMapping();
            });
        }
        
        // 回车键保存映射
        const emailInput = document.getElementById('new-mapping-email');
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveMapping();
                }
            });
            
            emailInput.addEventListener('input', () => {
                this.validateEmail(emailInput.value);
            });
        }
    }
    
    validateEmail(email) {
        const emailInput = document.getElementById('new-mapping-email');
        const validationMessage = document.getElementById('email-validation-message');
        
        if (!email) {
            emailInput.style.borderColor = '';
            validationMessage.style.display = 'none';
            return false;
        }
        
        if (email.endsWith('@shaoxin.top')) {
            emailInput.style.borderColor = '';
            validationMessage.style.display = 'none';
            return true;
        } else {
            emailInput.style.borderColor = '#dc3545';
            validationMessage.textContent = '邮件地址后缀必须为 @shaoxin.top';
            validationMessage.style.display = 'block';
            return false;
        }
    }
    
    async loadDefaultEmail() {
        if (this.defaultEmail) {
            // 如果已缓存，直接更新显示
            const defaultEmailEl = document.getElementById('default-email');
            if (defaultEmailEl) {
                defaultEmailEl.textContent = this.defaultEmail;
            }
            return this.defaultEmail;
        }
        
        try {
            const response = await fetch('/bmail/eaddress');
            if (!response.ok) throw new Error('获取默认邮箱失败');
            
            const result = await response.json();
            this.defaultEmail = result.data?.email || '未设置';
            
            const defaultEmailEl = document.getElementById('default-email');
            if (defaultEmailEl) {
                defaultEmailEl.textContent = this.defaultEmail;
            }
            
            return this.defaultEmail;
        } catch (error) {
            console.error('获取默认邮箱失败:', error);
            const defaultEmailEl = document.getElementById('default-email');
            if (defaultEmailEl) {
                defaultEmailEl.textContent = '加载失败';
            }
            return '加载失败';
        }
    }
    
    async loadMappingRules() {
        const rulesList = document.getElementById('mapping-rules-list');
        if (!rulesList) return;
        
        try {
            // 使用缓存的默认邮箱，如果没有则先获取
            let targetEmail = this.defaultEmail;
            if (!targetEmail || targetEmail === '未设置') {
                targetEmail = await this.loadDefaultEmail();
            }
            
            // 获取已保存的映射数据
            const response = await fetch('/bmail/bmapsuf');
            if (!response.ok) throw new Error('获取映射数据失败');
            
            const result = await response.json();
            const mappingEmails = result.mappingEmails || [];
            
            if (!Array.isArray(mappingEmails) || mappingEmails.length === 0) {
                rulesList.innerHTML = '<div class="loading">暂无映射规则</div>';
                return;
            }
            
            rulesList.innerHTML = '';
            mappingEmails.forEach(rule => {
                const ruleItem = this.createRuleItem(rule, targetEmail);
                rulesList.appendChild(ruleItem);
            });
            
        } catch (error) {
            console.error('获取映射数据失败:', error);
            rulesList.innerHTML = '<div class="error">加载映射数据失败</div>';
        }
    }
    
    createRuleItem(rule, targetEmail) {
        const div = document.createElement('div');
        div.className = 'rule-item';
        div.innerHTML = `
            <span class="source-email">${rule.address}</span>
            <span class="arrow">→</span>
            <span class="target-email">${targetEmail}</span>
            <button class="delete-rule" data-id="${rule.id}" data-address="${rule.address}">删除</button>
        `;
        
        // 绑定删除事件
        const deleteBtn = div.querySelector('.delete-rule');
        deleteBtn.addEventListener('click', () => {
            this.deleteMapping(rule.id, rule.address);
        });
        
        return div;
    }
    
    async saveMapping() {
        const emailInput = document.getElementById('new-mapping-email');
        const address = emailInput.value.trim();
        const validationMessage = document.getElementById('email-validation-message');
        
        // 先隐藏之前的验证提示
        validationMessage.style.display = 'none';
        
        if (!address) {
            validationMessage.textContent = '请输入邮件地址';
            validationMessage.style.display = 'block';
            emailInput.style.borderColor = '#dc3545';
            return;
        }
        
        if (!this.isValidEmail(address)) {
            validationMessage.textContent = '请输入有效的邮件地址';
            validationMessage.style.display = 'block';
            emailInput.style.borderColor = '#dc3545';
            return;
        }
        
        if (!this.validateEmail(address)) {
            validationMessage.textContent = '邮件地址后缀必须为 @shaoxin.top';
            validationMessage.style.display = 'block';
            return;
        }
        
        try {
            const response = await fetch('/bmail/mapsuf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ maddress: address })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // 隐藏验证提示
                validationMessage.style.display = 'none';
                emailInput.value = '';
                emailInput.style.borderColor = '';
                
                // 显示模态窗口成功提示
                this.showModalMessage('映射保存成功');
                await this.loadMappingRules();
            } else {
                // 保存失败时也在原位置显示错误
                validationMessage.textContent = result.message || '保存映射失败';
                validationMessage.style.color = '#dc3545';
                validationMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('保存映射失败:', error);
            validationMessage.textContent = '网络错误，保存映射失败';
            validationMessage.style.display = 'block';
        }
    }
    
    async deleteMapping(mappingId, address) {
        // 创建自定义确认模态窗口
        const confirmed = await this.showConfirmModal(`确定要删除邮箱 ${address} 的映射吗？`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch('/bmail/mapsuf', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ maddress: address })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showModalMessage('映射删除成功');
                await this.loadMappingRules(); // 重新加载规则列表
            } else {
                this.showModalMessage(result.message || '删除映射失败', 'error');
            }
        } catch (error) {
            console.error('删除映射失败:', error);
            this.showModalMessage('网络错误，删除映射失败', 'error');
        }
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    showModalMessage(message, type = 'success') {
        // 移除已存在的模态窗口
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        // 现代UI配色方案
        const styles = {
            success: {
                headerBg: 'rgba(34, 197, 94, 0.1)', // 淡绿色背景
                headerColor: '#15803d', // 深绿色文字
                borderColor: 'rgba(34, 197, 94, 0.3)' // 绿色边框
            },
            error: {
                headerBg: 'rgba(239, 68, 68, 0.1)', // 淡红色背景
                headerColor: '#dc2626', // 深红色文字
                borderColor: 'rgba(239, 68, 68, 0.3)' // 红色边框
            }
        };

        const style = styles[type] || styles.success;

        // 创建模态窗口
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header" style="background-color: ${style.headerBg}; border-left: 4px solid ${style.borderColor}">
                    <h3 class="modal-title" style="color: ${style.headerColor}">
                        ${type === 'success' ? '操作成功' : '操作失败'}
                    </h3>
                </div>
                <div class="modal-body">
                    <p class="modal-message">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-button primary" id="modal-confirm">确定</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 触发动画
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        // 关闭模态窗口的函数
        const closeModal = () => {
            modal.classList.remove('active');
            // 等待动画完成后移除元素
            setTimeout(() => {
                modal.remove();
            }, 300);
        };

        // 绑定关闭事件
        modal.querySelector('#modal-confirm').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // 3秒后自动关闭
        setTimeout(closeModal, 3000);
    }

    showConfirmModal(message) {
        return new Promise((resolve) => {
            // 移除已存在的模态窗口
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) {
                existingModal.remove();
            }

            // 创建确认模态窗口
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content confirm-modal">
                    <div class="modal-header confirm-header">
                        <h3 class="modal-title">确认操作</h3>
                    </div>
                    <div class="modal-body">
                        <p class="modal-message">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-button secondary" id="confirm-no">取消</button>
                        <button class="modal-button primary" id="confirm-yes">确定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 触发动画
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);

            // 处理确认结果
            const handleClose = (confirmed) => {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.remove();
                    resolve(confirmed);
                }, 300);
            };

            modal.querySelector('#confirm-yes').addEventListener('click', () => handleClose(true));
            modal.querySelector('#confirm-no').addEventListener('click', () => handleClose(false));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) handleClose(false);
            });
        });
    }

    addSettingsStyles() {
        if (document.getElementById('settings-styles')) return;

        const style = document.createElement('style');
        style.id = 'settings-styles';
        // 保留原有样式并添加现代模态窗口样式
        style.textContent = SettingsTemplates.styles + `
            /* 基础模态框样式 */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.4);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
                backdrop-filter: blur(2px);
            }

            .modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .modal-content {
                width: 90%;
                max-width: 420px;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                overflow: hidden;
                transform: translateY(15px) scale(0.98);
                transition: transform 0.3s ease;
            }

            .modal-overlay.active .modal-content {
                transform: translateY(0) scale(1);
            }

            /* 头部样式 */
            .modal-header {
                padding: 16px 24px;
            }

            .modal-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                line-height: 1.4;
            }

            .confirm-header {
                background-color: rgba(59, 130, 246, 0.1);
                border-left: 4px solid #3b82f6;
            }

            .confirm-header .modal-title {
                color: #1e40af;
            }

            /* 主体内容样式 */
            .modal-body {
                padding: 24px;
                border-top: 1px solid #f1f5f9;
            }

            .modal-message {
                margin: 0;
                font-size: 15px;
                color: #334155;
                line-height: 1.6;
            }

            /* 底部按钮样式 */
            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #f1f5f9;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            .modal-button {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .modal-button.primary {
                background-color: #3b82f6;
                color: #ffffff;
            }

            .modal-button.primary:hover {
                background-color: #2563eb;
                box-shadow: 0 2px 5px rgba(59, 130, 246, 0.2);
            }

            .modal-button.secondary {
                background-color: #f1f5f9;
                color: #64748b;
            }

            .modal-button.secondary:hover {
                background-color: #e2e8f0;
            }

            /* 确认模态框特殊样式 */
            .confirm-modal .modal-footer {
                flex-direction: row-reverse;
            }
        `;
        
        document.head.appendChild(style);
    }

    checkSettingsPage() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('set')) {
            const emailNavigation = document.getElementById('emailNavigation');
            if (emailNavigation) {
                emailNavigation.style.display = 'none';
            }
            this.showSettingsPage();
        }
    }
}

// 初始化设置管理器
document.addEventListener('DOMContentLoaded', function() {
    new SettingsManager();
});
