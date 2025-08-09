class EmailApp {
    constructor() {
        this.currentFolder = '收件箱';
        this.emailTabs = new Map();
        this.activeTabId = null;
        this.emailStates = new Map();
        this.initSentEmailManager();
        this.init();
        this.initSSE();
    }

    initSentEmailManager() {
        if (window.SentEmailManager) {
            this.sentEmailManager = new window.SentEmailManager(this);
        }
    }
    init() {
        this.bindEvents();
        this.initializeIcons();
        this.initSidebarToggle();
        const hasUrlParams = this.checkUrlParams();
        if (!hasUrlParams) {
            this.updateEmailList();
        }
        this.loadEmailStates();
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        let hasUrlParams = false;
        
        const folderParams = ['Inbox', 'litter', 'Send', 'draft', 'Delete', 'Job', 'individual', 'significant', 'set'];
        let currentFolder = null;
        let emailId = null;
        
        for (const folder of folderParams) {
            if (urlParams.has(folder)) {
                currentFolder = folder;
                emailId = urlParams.get('m');
                hasUrlParams = true;
                break;
            }
        }
        
        if (currentFolder) {
            const folderMap = {
                'Inbox': '收件箱',
                'litter': '垃圾邮件',
                'Send': '已发送',
                'draft': '草稿箱',
                'Delete': '已删除',
                'Job': '工作',
                'individual': '个人',
                'significant': '重要',
                'set': '设置'
            };
            
            const folderName = folderMap[currentFolder];
            if (folderName) {
                this.switchFolder(folderName);
            }
        }
        
        if (emailId) {
            if (this.emailTabs.has(emailId)) {
                this.switchEmailTab(emailId);
            } else {
                setTimeout(() => {
                    this.loadEmailFromUrl(emailId);
                }, 1000);
            }
            hasUrlParams = true;
        }

        if (urlParams.has('create')) {
            setTimeout(() => {
                this.handleCompose();
            }, 500);
            hasUrlParams = true;
        }
        
        return hasUrlParams;
    }

    clearEmailUrlParam() {
        const url = new URL(window.location);
        url.searchParams.delete('m');
        url.searchParams.delete('create');
        window.history.replaceState({}, '', url);
    }

    updateEmailUrlParam(emailId) {
        const url = new URL(window.location);
        
        url.searchParams.delete('create');
        
        url.searchParams.set('m', emailId);
        
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
        
        const folderParam = folderMap[this.currentFolder];
        if (folderParam) {
            Object.values(folderMap).forEach(param => {
                if (param !== folderParam) {
                    url.searchParams.delete(param);
                }
            });
            url.searchParams.set(folderParam, '');
        }
        
        window.history.replaceState({}, '', url);
    }

    updateEmailListSelection(emailId) {
        document.querySelectorAll('.nav-email-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        const navItems = document.querySelectorAll('.nav-email-item');
        for (const item of navItems) {
            const itemEmailId = `${item.dataset.timestamp}_${item.dataset.filename}`;
            if (itemEmailId === emailId) {
                item.classList.add('selected');
                break;
            }
        }
    }

    async loadEmailFromUrl(emailId) {
        try {
            let apiUrl;
            
            const urlParams = new URLSearchParams(window.location.search);
            let currentFolderType = null;
            
            const folderParams = ['Inbox', 'litter', 'Send', 'draft', 'Delete', 'Job', 'individual', 'significant'];
            for (const folder of folderParams) {
                if (urlParams.has(folder)) {
                    currentFolderType = folder;
                    break;
                }
            }
            

            
            switch (currentFolderType) {
                case 'Inbox':
                default:
                    apiUrl = `/amail/Receive/${emailId}`;
                    break;
                case 'Send':
                    if (this.sentEmailManager) {
                        await this.sentEmailManager.loadEmailFromUrl(emailId);
                        return;
                    } else {
                        apiUrl = `/cmail/examdeta/${emailId}`;
                    }
                    break;
            }

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
            
            await this.fetchEmailDetail(apiUrl, emailId);
        } catch (error) {
            console.error('从URL加载邮件失败:', error);
        }
    }

    // 初始化SSE连接
    initSSE() {
        if (window.receiveAPI) {
            window.receiveAPI.setOnNewMail((data) => {
                this.handleNewMail(data);
            });

            window.receiveAPI.setOnConnected((data) => {
            });

            window.receiveAPI.setOnHeartbeat((data) => {
            });

            window.receiveAPI.connectSSE();
        }
    }

    handleNewMail(data) {
        
        if (this.currentFolder === '收件箱') {
            this.refreshEmails();
        }
        
        this.loadInboxCount();
        
        this.showNewMailNotification(data.data);
    }

    showNewMailNotification(mailData) {
        const notification = document.createElement('div');
        notification.className = 'new-mail-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">新邮件</div>
                <div class="notification-from">发件人: ${mailData.from}</div>
                <div class="notification-subject">主题: ${mailData.subject}</div>
            </div>
            <button class="notification-close">×</button>
        `;

        document.body.appendChild(notification);

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 20000);
    }

    initializeIcons() {
        if (window.IconManager) {
            window.IconManager.injectIconsToCSS();
            
            setTimeout(() => {
                window.IconManager.autoAddNavIcons();
            }, 100);
        }
        
        const composeIcon = document.querySelector('.compose-icon');
        if (composeIcon && window.VectorIcons) {
            composeIcon.innerHTML = window.VectorIcons.newly;
        }


        const deleteIcon = document.querySelector('.delete-icon');
        if (deleteIcon && window.VectorIcons) {
            deleteIcon.innerHTML = window.VectorIcons.deleteIcon;
        }
        
        const markIcon = document.querySelector('.mark-icon');
        if (markIcon && window.VectorIcons) {
            markIcon.innerHTML = window.VectorIcons.mark;
        }
        
        const pinIcon = document.querySelector('.pin-icon');
        if (pinIcon && window.VectorIcons) {
            pinIcon.innerHTML = window.VectorIcons.fixed;
        }
    }

    initSidebarToggle() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const toggleButton = document.createElement('div');
        toggleButton.className = 'sidebar-toggle';
        toggleButton.innerHTML = '◀';
        toggleButton.title = '折叠/展开侧边栏';
        
        toggleButton.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        sidebar.appendChild(toggleButton);
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const toggleButton = document.querySelector('.sidebar-toggle');
        
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
            toggleButton.innerHTML = '◀';
            toggleButton.title = '折叠侧边栏';
        } else {
            sidebar.classList.add('collapsed');
            toggleButton.innerHTML = '▶';
            toggleButton.title = '展开侧边栏';
        }
    }

    bindEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavClick(e);
            });
        });

        const composeBtn = document.querySelector('.compose-btn');
        if (composeBtn) {
            composeBtn.addEventListener('click', () => {
                this.handleCompose();
            });
        }

        const markBtn = document.querySelector('.mark-btn');
        if (markBtn) {
            markBtn.addEventListener('click', () => {
                this.handleMarkEmail();
            });
        }

        const pinBtn = document.querySelector('.pin-btn');
        if (pinBtn) {
            pinBtn.addEventListener('click', () => {
                this.handlePinEmail();
            });
        }

        const deleteBtn = document.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.handleDeleteEmail();
            });
        }

        const userProfile = document.getElementById('userProfile');
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (userProfile && dropdownMenu) {
            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });

            dropdownMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.dropdown-item');
                if (item) {
                    this.handleDropdownClick(item.textContent);
                }
            });
        }

        document.addEventListener('click', () => {
            this.closeDropdown();
        });
    }

    handleNavClick(e) {
        const navItem = e.currentTarget;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        navItem.classList.add('active');

        const navText = navItem.querySelector('.nav-text').textContent;
        this.switchFolder(navText);
    }

    switchFolder(folderName) {
        this.clearAllEmailTabs();
        
        this.resetNavItemText();
        this.currentFolder = folderName;
        
        this.updateNavSelection(folderName);
        
        const url = new URL(window.location);
        const folderMap = {
            '收件箱': 'Inbox',
            '垃圾邮件': 'litter',
            '已发送': 'Send',
            '草稿箱': 'draft',
            '已删除': 'Delete',
            '设置': 'set',
            '工作': 'Job',
            '个人': 'individual',
            '重要': 'significant'
        };
        
        Object.values(folderMap).forEach(param => {
            url.searchParams.delete(param);
        });
        url.searchParams.delete('m');
        url.searchParams.delete('create');
        
        const folderParam = folderMap[folderName];
        if (folderParam) {
            url.searchParams.set(folderParam, '');
        }
        
        window.history.pushState({}, '', url);
        
        const folderEvent = new CustomEvent('folderSwitched', {
            detail: { folderName: folderName }
        });
        document.dispatchEvent(folderEvent);
        
        if (folderName === '设置') {
            const emailNavigation = document.getElementById('emailNavigation');
            if (emailNavigation) {
                emailNavigation.style.display = 'none';
            }
            const emailItems = document.getElementById('emailItems');
            if (emailItems) {
                emailItems.innerHTML = '';
                const event = new CustomEvent('showSettings');
                document.dispatchEvent(event);
            }
        } else {
            const emailNavigation = document.getElementById('emailNavigation');
            if (emailNavigation) {
                emailNavigation.style.display = 'block';
            }
            
            // 确保在切换到已发送文件夹时 SentEmailManager 已初始化
            if (folderName === '已发送' && !this.sentEmailManager && window.SentEmailManager) {
                this.sentEmailManager = new window.SentEmailManager(this);
            }
            
            this.updateEmailList();
        }
    }

    resetNavItemText() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(navItem => {
            const navText = navItem.querySelector('.nav-text');
            const navCount = navItem.querySelector('.nav-count');
            
            if (navText) {
                const text = navText.textContent;
                if (text.includes('(')) {
                    const folderName = text.split(' (')[0];
                    navText.textContent = folderName;
                }
            }
            
            if (navCount && navText && !navText.textContent.includes('收件箱')) {
                navCount.remove();
            }
        });
    }

    updateNavSelection(folderName) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const navItems = document.querySelectorAll('.nav-item');
        for (const navItem of navItems) {
            const navText = navItem.querySelector('.nav-text');
            if (navText && navText.textContent.trim() === folderName) {
                navItem.classList.add('active');
                break;
            }
        }
    }

    handleCompose() {
        const emailNavigation = document.getElementById('emailNavigation');
        if (emailNavigation) {
            emailNavigation.style.display = 'none';
        }
        
        const emailItems = document.getElementById('emailItems');
        if (emailItems) {
            emailItems.innerHTML = '';
        }
        
        const url = new URL(window.location);
        url.searchParams.delete('m');
        url.searchParams.set('create', '');
        window.history.pushState({}, '', url);
        
        if (window.composeEmail) {
            window.composeEmail.openComposeWindow();
        } else {
            setTimeout(() => {
                if (window.composeEmail) {
                    window.composeEmail.openComposeWindow();
                }
            }, 100);
        }
    }

    refreshEmails() {
        this.showLoadingAnimation();

        this.updateEmailList(false);
        this.loadEmailStates();
    }

    showLoadingAnimation() {
        const emailItems = document.getElementById('emailItems');
        const emailHeadersContainer = emailItems.querySelector('.email-headers-container');
        const emailDetail = emailItems.querySelector('.email-detail');
        
        if (emailHeadersContainer) {
            emailHeadersContainer.classList.add('loading');
            emailHeadersContainer.classList.remove('loaded');
        }
        
        if (emailDetail) {
            emailDetail.classList.add('loading');
            emailDetail.classList.remove('loaded');
        }
    }

    hideLoadingAnimation() {
        const emailItems = document.getElementById('emailItems');
        const emailHeadersContainer = emailItems.querySelector('.email-headers-container');
        const emailDetail = emailItems.querySelector('.email-detail');
        
        if (emailHeadersContainer) {
            emailHeadersContainer.classList.remove('loading');
            emailHeadersContainer.classList.add('loaded');
        }
        
        if (emailDetail) {
            emailDetail.classList.remove('loading');
            emailDetail.classList.add('loaded');
        }
    }

    async loadEmailStates() {
        try {
            const response = await window.receiveAPI.getEmailStates();
            
            if (response && response.success && response.data) {
                const states = response.data;
                
                Object.keys(states).forEach(mailId => {
                    const state = { mailId, ...states[mailId] };
                    this.emailStates.set(mailId, state);
                });
                
                this.updateEmailListDisplay();
            }
        } catch (error) {
            console.error('加载邮件状态失败:', error);
        }
    }

    async handleMarkEmail() {
        const selectedEmail = this.getSelectedEmail();
        if (!selectedEmail) {
            alert('请先选择一封邮件');
            return;
        }

        const fileName = selectedEmail.dataset.filename;
        const timestamp = selectedEmail.dataset.timestamp;
        const mailId = `${timestamp}_${fileName}`;
        const currentState = this.emailStates.get(mailId) || {};
        const newMarked = !currentState.marked;

        try {
            await window.receiveAPI.updateEmailState(mailId, { marked: newMarked });
            this.emailStates.set(mailId, { ...currentState, marked: newMarked });
            this.updateEmailItemDisplay(selectedEmail, mailId);
            this.updateButtonStates(mailId);
        } catch (error) {
            console.error('更新邮件标记状态失败:', error);
            alert('操作失败，请重试');
        }
    }

    async handlePinEmail() {
        const selectedEmail = this.getSelectedEmail();
        if (!selectedEmail) {
            alert('请先选择一封邮件');
            return;
        }

        const fileName = selectedEmail.dataset.filename;
        const timestamp = selectedEmail.dataset.timestamp;
        const mailId = `${timestamp}_${fileName}`;
        const currentState = this.emailStates.get(mailId) || {};
        const newPinned = !currentState.pinned;

        try {
            await window.receiveAPI.updateEmailState(mailId, { pinned: newPinned });
            this.emailStates.set(mailId, { ...currentState, pinned: newPinned });
            this.updateEmailItemDisplay(selectedEmail, mailId);
            this.updateButtonStates(mailId);
        } catch (error) {
            console.error('更新邮件置顶状态失败:', error);
            alert('操作失败，请重试');
        }
    }

    initModalStyles() {
        if (!document.getElementById('modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .modal-content {
                    background-color: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    width: 90%;
                    max-width: 400px;
                    overflow: hidden;
                }

                .modal-header {
                    padding: 16px;
                    border-bottom: 1px solid #eee;
                    text-align: center;
                    font-weight: bold;
                    font-size: 16px;
                }

                .modal-header.success {
                    color: #4caf50;
                }

                .modal-header.error {
                    color: #f44336;
                }

                .modal-message {
                    padding: 20px;
                    text-align: center;
                    font-size: 16px;
                    color: #333;
                }

                .modal-buttons {
                    display: flex;
                    justify-content: center;
                    padding: 16px;
                    gap: 10px;
                }

                .modal-button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }

                .modal-button.primary {
                    background-color: #4caf50;
                    color: white;
                }

                .modal-button.secondary {
                    background-color: #f5f5f5;
                    color: #333;
                }
            `;
            document.head.appendChild(style);
        }
    }

    removeExistingModal() {
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }
    }

    showModalMessage(message, type = 'success') {
        this.initModalStyles();
        this.removeExistingModal();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header ${type}">
                    ${type === 'success' ? '操作成功' : '操作失败'}
                </div>
                <div class="modal-message">${message}</div>
                <div class="modal-buttons">
                    <button class="modal-button primary">确定</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const confirmBtn = modal.querySelector('.modal-button.primary');
        confirmBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    showConfirmModal(message) {
        this.initModalStyles();
        this.removeExistingModal();

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">确认操作</div>
                    <div class="modal-message">${message}</div>
                    <div class="modal-buttons">
                        <button class="modal-button secondary">取消</button>
                        <button class="modal-button primary">确认</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const cancelBtn = modal.querySelector('.modal-button.secondary');
            const confirmBtn = modal.querySelector('.modal-button.primary');

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
        });
    }

    async handleDeleteEmail() {
        const selectedEmail = this.getSelectedEmail();
        if (!selectedEmail) {
            this.showModalMessage('请先选择一封邮件', 'error');
            return;
        }

        const fileName = selectedEmail.dataset.filename;
        const timestamp = selectedEmail.dataset.timestamp;
        const mailId = `${timestamp}_${fileName}`;

        const confirmed = await this.showConfirmModal(`是否要删除(${mailId})`);
        if (!confirmed) {
            return;
        }

        try {
            await window.receiveAPI.deleteEmail(mailId);
            
            this.emailStates.delete(mailId);
            
            selectedEmail.remove();
            
            if (this.activeTabId === mailId) {
                this.closeEmailTab(mailId);
            }
            
            this.refreshEmails();
            
            this.showModalMessage('邮件删除成功');
        } catch (error) {
            console.error('删除邮件失败:', error);
            this.showModalMessage('删除失败，请重试', 'error');
        }
    }

    getSelectedEmail() {
        return document.querySelector('.nav-email-item.selected');
    }

    updateEmailItemDisplay(emailItem, mailId) {
        const state = this.emailStates.get(mailId) || {};
        
        if (state.read === false) {
            emailItem.classList.add('unread');
        } else {
            emailItem.classList.remove('unread');
        }

        this.updateEmailStateIndicators(emailItem, state);
    }

    updateEmailStateIndicators(emailItem, state) {
        const existingIndicators = emailItem.querySelectorAll('.email-state-indicator');
        existingIndicators.forEach(indicator => indicator.remove());

        const indicatorContainer = document.createElement('div');
        indicatorContainer.className = 'email-state-indicators';
        indicatorContainer.style.cssText = 'position: absolute; top: 5px; right: 5px; display: flex; gap: 4px;';

        if (state.marked) {
            const markIndicator = document.createElement('span');
            markIndicator.className = 'email-state-indicator mark-indicator';
            markIndicator.innerHTML = '★';
            markIndicator.style.cssText = 'color: #ff9800; font-size: 12px;';
            indicatorContainer.appendChild(markIndicator);
        }

        if (state.pinned) {
            const pinIndicator = document.createElement('span');
            pinIndicator.className = 'email-state-indicator pin-indicator';
            pinIndicator.innerHTML = '📌';
            pinIndicator.style.cssText = 'font-size: 12px;';
            indicatorContainer.appendChild(pinIndicator);
        }

        if (indicatorContainer.children.length > 0) {
            emailItem.style.position = 'relative';
            emailItem.appendChild(indicatorContainer);
        }
    }

    updateEmailListDisplay() {
        const emailItems = document.querySelectorAll('.nav-email-item');
        emailItems.forEach(item => {
            const fileName = item.dataset.filename;
            const timestamp = item.dataset.timestamp;
            if (fileName && timestamp) {
                const mailId = `${timestamp}_${fileName}`;
                this.updateEmailItemDisplay(item, mailId);
            }
        });
    }

    updateButtonStates(mailId) {
        const state = this.emailStates.get(mailId) || {};
        
        const markBtn = document.querySelector('.mark-btn');
        if (markBtn) {
            if (state.marked) {
                markBtn.classList.add('active');
            } else {
                markBtn.classList.remove('active');
            }
        }
        
        const pinBtn = document.querySelector('.pin-btn');
        if (pinBtn) {
            if (state.pinned) {
                pinBtn.classList.add('active');
            } else {
                pinBtn.classList.remove('active');
            }
        }
    }

    async updateEmailList(clearTabs = true) {
        const emailItems = document.getElementById('emailItems');
        const emailNavigation = document.getElementById('emailNavigation');

        if (clearTabs) {
            emailItems.innerHTML = '';
        }
        
        emailNavigation.innerHTML = '';

        if (this.currentFolder === '收件箱') {
            try {
                await this.loadReceiveEmails();
                setTimeout(() => {
                    this.hideLoadingAnimation();
                }, 100);
                return;
            } catch (error) {
                console.error('加载收件箱邮件失败:', error);
                this.showEmptyState();
                this.hideLoadingAnimation();
            }
        } else if (this.currentFolder === '已发送') {
            try {
                if (this.sentEmailManager) {
                    await this.sentEmailManager.loadSentEmails();
                } else {
                    console.error('SentEmailManager 未加载');
                    this.showEmptyState();
                }
                setTimeout(() => {
                    this.hideLoadingAnimation();
                }, 100);
                return;
            } catch (error) {
                console.error('加载已发送邮件失败:', error);
                this.showEmptyState();
                this.hideLoadingAnimation();
            }
        } else {
            this.showEmptyState();
            this.hideLoadingAnimation();
        }
        
        this.updateNavigation();
    }

    updateNavigation() {
        const emailNavigation = document.getElementById('emailNavigation');
        const folderName = this.getFolderDisplayName();
        
        emailNavigation.innerHTML = `
            <div class="navigation-header">
                <h3 class="navigation-title">${folderName}</h3>
            </div>
            <div class="navigation-content">
                <div class="empty-state">
                    <div class="empty-text">暂无邮件</div>
                    <div class="empty-subtext">您的${folderName}是空的</div>
                </div>
            </div>
        `;
    }

    showEmptyState() {
        if (this.emailTabs.length === 0) {
            const emailItems = document.getElementById('emailItems');
            emailItems.innerHTML = `
            `;
        }
    }

    showEmailItemsPlaceholder() {
        if (this.emailTabs.length === 0) {
            const emailItems = document.getElementById('emailItems');
            emailItems.innerHTML = `
            `;
        }
    }

    async loadReceiveEmails() {
        if (!window.receiveAPI) {
            console.error('receiveAPI 未加载');
            return;
        }

        try {
            const response = await window.receiveAPI.getReceiveEmails();
            if (response.success && response.data && response.data.mails) {
                this.updateInboxCount(response.data.mails.length);
                this.renderEmailNavigation(response.data.mails);
                
                if (this.emailTabs.length === 0) {
                    this.showEmailItemsPlaceholder();
                }
            } else {
                this.updateInboxCount(0);
                if (this.emailTabs.length === 0) {
                    this.showEmptyState();
                }
            }
        } catch (error) {
            console.error('获取收件箱邮件失败:', error);
            this.updateInboxCount(0);
            if (this.emailTabs.length === 0) {
                this.showEmptyState();
            }
        }
    }



    async loadInboxCount() {
        if (!window.receiveAPI) {
            return;
        }

        try {
            const response = await window.receiveAPI.getReceiveEmails();
            if (response.success && response.data && response.data.mails) {
                this.updateInboxCount(response.data.mails.length);
            } else {
                this.updateInboxCount(0);
            }
        } catch (error) {
            console.error('获取收件箱邮件数量失败:', error);
            this.updateInboxCount(0);
        }
    }

    updateInboxCount(count) {
        const navItems = document.querySelectorAll('.nav-item');
        let inboxNavItem = null;
        let inboxNavText = null;
        
        navItems.forEach(item => {
            const navText = item.querySelector('.nav-text');
            if (navText && navText.textContent.includes('收件箱')) {
                inboxNavItem = item;
                inboxNavText = navText;
            }
        });
        
        if (inboxNavItem && inboxNavText) {
            const existingCount = inboxNavItem.querySelector('.nav-count');
            if (existingCount) {
                existingCount.remove();
            }
            
            inboxNavText.textContent = '收件箱';
            
            if (count > 0) {
                const countElement = document.createElement('span');
                countElement.className = 'nav-count';
                countElement.textContent = count;
                inboxNavItem.appendChild(countElement);
            }
        }
    }



    renderEmailNavigation(mails) {
        const emailNavigation = document.getElementById('emailNavigation');
        
        if (!mails || mails.length === 0) {
            this.updateNavigation();
            return;
        }

        const url = new URL(window.location);
        const currentEmailId = url.searchParams.get('m');
        
        const navigationHTML = `
            <div class="navigation-header">
                <h3 class="navigation-title">收件箱</h3>
            </div>
            <div class="navigation-content">
                ${mails.map(mail => {
                    const fromInfo = window.receiveAPI.parseEmailAddress(mail.from);
                    const formattedTime = window.receiveAPI.formatTimestamp(mail.timestamp);
                    
                    const escapeHtml = (text) => {
                        const div = document.createElement('div');
                        div.textContent = text;
                        return div.innerHTML;
                    };
                    
                    const safeSubject = escapeHtml(mail.subject || '无主题');
                    const safeFrom = escapeHtml(mail.from || '未知发件人');
                    const safeFileName = escapeHtml(mail.fileName || mail.id || '');
                    const safeTimestamp = escapeHtml(mail.timestamp || '');
                    
                    const emailId = `${safeTimestamp}_${safeFileName}`;
                    const isSelected = currentEmailId === emailId ? 'selected' : '';
                    
                    return `
                        <div class="nav-email-item ${isSelected}" data-filename="${safeFileName}" data-subject="${safeSubject}" data-from="${safeFrom}" data-timestamp="${safeTimestamp}">
                            <div class="nav-email-from">${safeFrom}</div>
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
                this.selectEmailFromNav(item);
            });
        });
        
        setTimeout(() => {
            this.updateEmailListDisplay();
        }, 100);
    }





    async selectEmailFromNav(navItem) {
        document.querySelectorAll('.nav-email-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        navItem.classList.add('selected');
        
        const fileName = navItem.dataset.filename;
        const timestamp = navItem.dataset.timestamp;
        const emailId = `${timestamp}_${fileName}`;
        
        if (this.currentFolder === '收件箱') {
            try {
                const currentState = this.emailStates.get(emailId) || {};
                if (currentState.read !== true) {
                    await window.receiveAPI.updateEmailState(emailId, { read: true });
                    this.emailStates.set(emailId, { ...currentState, read: true });
                    this.updateEmailItemDisplay(navItem, emailId);
                }
            } catch (error) {
                console.error('更新邮件已读状态失败:', error);
            }
        }
        
        this.updateButtonStates(emailId);
        
        const url = new URL(window.location);
        url.searchParams.set('m', emailId);
        window.history.pushState({}, '', url);
        
        let apiUrl;
        switch (this.currentFolder) {
            case '收件箱':
            default:
                apiUrl = `/amail/Receive/${emailId}`;
                break;
        }
        
        this.fetchEmailDetail(apiUrl, emailId);
    }

    async fetchEmailDetail(apiUrl, fileName) {
        const emailItems = document.getElementById('emailItems');
        
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
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const emailData = await response.json();
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.showEmailDetails(emailData, fileName);
            
            setTimeout(() => {
                this.hideLoadingAnimation();
            }, 100);
            
        } catch (error) {
            console.error('获取邮件详情失败:', error);
            emailItems.innerHTML = `
                <div class="email-detail">
                    <div class="email-detail-header">
                        <h3>加载失败</h3>
                    </div>
                    <div class="email-detail-content">
                        <p>无法获取邮件详情: ${error.message}</p>
                        <p>请求接口: ${apiUrl}</p>
                    </div>
                </div>
            `;
        }
    }

    showEmailDetails(emailData, emailId) {
        const selectedItem = document.querySelector('.nav-email-item.selected');
        
        let fileName = emailId;
        if (emailId.includes('_')) {
            fileName = emailId.split('_').slice(1).join('_');
        }
        
        let tabData = {
            id: emailId,
            fileName: fileName,
            subject: '无主题',
            content: '邮件内容为空',
            fromInfo: { name: '未知发件人', email: '' },
            formattedTime: '未知时间',
            toInfo: [],
            ccInfo: [],
            bccInfo: [],
            attachments: []
        };
        
        if (emailData && typeof emailData === 'object') {
            const actualData = emailData.success ? emailData.data : emailData;
            
            tabData.subject = actualData.subject || (selectedItem ? selectedItem.dataset.subject : '无主题');
            
            if (actualData.from) {
                if (typeof actualData.from === 'object') {
                    tabData.fromInfo = {
                        name: actualData.from.name || '未知发件人',
                        email: actualData.from.address || actualData.from.email || ''
                    };
                } else {
                    tabData.fromInfo = window.receiveAPI ? window.receiveAPI.parseEmailAddress(actualData.from) : { name: actualData.from, email: '' };
                }
            } else if (selectedItem) {
                tabData.fromInfo = window.receiveAPI.parseEmailAddress(selectedItem.dataset.from);
            }
 
            if (actualData.to && Array.isArray(actualData.to)) {
                tabData.toInfo = actualData.to.map(recipient => {
                    if (typeof recipient === 'object') {
                        return {
                            name: recipient.name || '',
                            email: recipient.address || recipient.email || ''
                        };
                    }
                    return window.receiveAPI ? window.receiveAPI.parseEmailAddress(recipient) : { name: recipient, email: recipient };
                });
            }

            if (actualData.cc && Array.isArray(actualData.cc)) {
                tabData.ccInfo = actualData.cc.map(recipient => {
                    if (typeof recipient === 'object') {
                        return {
                            name: recipient.name || '',
                            email: recipient.address || recipient.email || ''
                        };
                    }
                    return window.receiveAPI ? window.receiveAPI.parseEmailAddress(recipient) : { name: recipient, email: recipient };
                });
            }

            if (actualData.bcc && Array.isArray(actualData.bcc)) {
                tabData.bccInfo = actualData.bcc.map(recipient => {
                    if (typeof recipient === 'object') {
                        return {
                            name: recipient.name || '',
                            email: recipient.address || recipient.email || ''
                        };
                    }
                    return window.receiveAPI ? window.receiveAPI.parseEmailAddress(recipient) : { name: recipient, email: recipient };
                });
            }

            if (actualData.attachments && Array.isArray(actualData.attachments)) {
                tabData.attachments = actualData.attachments.map(attachment => ({
                    filename: attachment.filename || attachment.name || '未知文件',
                    contentType: attachment.contentType || attachment.type || 'application/octet-stream',
                    size: attachment.size || 0,
                    cid: attachment.cid || null
                }));
            }
            
            tabData.content = actualData.html || actualData.text || actualData.content || actualData.body || '邮件内容为空';
            
            if (actualData.date) {
                if (typeof actualData.date === 'number') {
                    const date = new Date(actualData.date * 1000);
                    tabData.formattedTime = date.toLocaleString('zh-CN');
                } else {
                    const date = new Date(actualData.date);
                    tabData.formattedTime = date.toLocaleString('zh-CN');
                }
            } else if (actualData.timestamp) {
                tabData.formattedTime = window.receiveAPI ? window.receiveAPI.formatTimestamp(actualData.timestamp) : '未知时间';
            } else if (selectedItem) {
                tabData.formattedTime = window.receiveAPI.formatTimestamp(selectedItem.dataset.timestamp);
            }
        } else if (selectedItem) {
            tabData.subject = selectedItem.dataset.subject;
            tabData.fromInfo = window.receiveAPI.parseEmailAddress(selectedItem.dataset.from);
            tabData.formattedTime = window.receiveAPI.formatTimestamp(selectedItem.dataset.timestamp);
            tabData.content = '邮件详情加载失败，显示基本信息';
        }
        
        this.addEmailTab(tabData);
    }

    addEmailTab(tabData) {
        if (this.emailTabs.has(tabData.id)) {
            this.switchEmailTab(tabData.id);
            return;
        }

        this.emailTabs.set(tabData.id, tabData);
        this.activeTabId = tabData.id;
        
        this.updateEmailUrlParam(tabData.id);
        
        this.updateEmailListSelection(tabData.id);
        
        this.renderEmailTabs();
        this.renderActiveEmailContent();
    }

    switchEmailTab(tabId) {
        if (this.emailTabs.has(tabId)) {
            this.activeTabId = tabId;
            
            if (tabId === 'create') {
                const url = new URL(window.location);
                const folderParams = ['Inbox', 'litter', 'Send', 'draft', 'Delete', 'Job', 'individual', 'significant'];
                folderParams.forEach(param => {
                    url.searchParams.delete(param);
                });
                url.searchParams.delete('m');
                url.searchParams.set('create', '');
                window.history.replaceState({}, '', url);
            } else {
                this.updateEmailUrlParam(tabId);
            }
            
            this.updateEmailListSelection(tabId);
            this.renderEmailTabs();
            this.renderActiveEmailContent();
        }
    }

    closeEmailTab(tabId) {
        if (this.emailTabs.has(tabId)) {
            this.emailTabs.delete(tabId);
            
            if (this.activeTabId === tabId) {
                const remainingTabs = Array.from(this.emailTabs.keys());
                if (remainingTabs.length > 0) {
                    this.activeTabId = remainingTabs[remainingTabs.length - 1];
                    
                    if (this.activeTabId === 'create') {
                        const url = new URL(window.location);
                        const folderParams = ['Inbox', 'litter', 'Send', 'draft', 'Delete', 'Job', 'individual', 'significant'];
                        folderParams.forEach(param => {
                            url.searchParams.delete(param);
                        });
                        url.searchParams.delete('m');
                        url.searchParams.set('create', '');
                        window.history.replaceState({}, '', url);
                    } else {
                        this.updateEmailUrlParam(this.activeTabId);
                    }
                    
                    this.updateEmailListSelection(this.activeTabId);
                } else {
                    this.activeTabId = null;
                    this.clearEmailUrlParam();
                    document.querySelectorAll('.nav-email-item.selected').forEach(item => {
                        item.classList.remove('selected');
                    });
                }
            }
            
            this.renderEmailTabs();
            this.renderActiveEmailContent();
        }
    }

    clearAllEmailTabs() {
        this.emailTabs.clear();
        this.activeTabId = null;
        
        this.clearEmailUrlParam();
        document.querySelectorAll('.nav-email-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        const emailItems = document.getElementById('emailItems');
        if (emailItems) {
            emailItems.innerHTML = '';
        }
    }

    renderEmailTabs() {
        const emailItems = document.getElementById('emailItems');
        
        if (this.emailTabs.size === 0) {
            emailItems.innerHTML = `
            `;
            return;
        }

        let tabsHtml = '<div class="email-headers-container loaded">';
        
        for (const [tabId, tabData] of this.emailTabs) {
            const isActive = tabId === this.activeTabId;
            tabsHtml += `
                <div class="email-header-bar ${isActive ? 'active' : ''}" data-tab-id="${tabId}">
                    <span class="email-subject" title="${tabData.subject}">${tabData.subject}</span>
                    <div class="email-divider"></div>
                    <button class="email-close-btn" data-tab-id="${tabId}">
                        ${window.VectorIcons.down}
                    </button>
                </div>
            `;
        }
        
        tabsHtml += '</div>';
        
        if (this.activeTabId && this.emailTabs.has(this.activeTabId)) {
            const activeTab = this.emailTabs.get(this.activeTabId);
            
            if (this.activeTabId === 'create') {
                tabsHtml += `
                    <div class="email-detail loaded" id="compose-editor-container">
                    </div>
                `;
            } else {
                const emailData = {
                    from: activeTab.fromInfo,
                    to: activeTab.toInfo,
                    cc: activeTab.ccInfo,
                    bcc: activeTab.bccInfo,
                    content: activeTab.content,
                    attachments: activeTab.attachments
                };
                
                const emailContentHtml = EmailRenderer.renderEmailContent(emailData, activeTab.id, 'downloadAttachment', activeTab.formattedTime);
                
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
        }
        
        emailItems.innerHTML = tabsHtml;     

        if (this.activeTabId === 'create' && window.composeEmail) {
            const container = document.getElementById('compose-editor-container');
            if (container) {
                window.composeEmail.renderComposeEditorToContainer(container);
            }
        }
        
        this.bindTabEvents();
    }

    renderActiveEmailContent() {
    }

    bindTabEvents() {
        document.querySelectorAll('.email-header-bar').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (e.target === tab.querySelector('.email-close-btn') || 
                    tab.querySelector('.email-close-btn').contains(e.target)) {
                    return;
                }
                
                const tabId = tab.dataset.tabId;
                this.switchEmailTab(tabId);
            });
        });

        document.querySelectorAll('.email-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tabId = btn.dataset.tabId;
                this.closeEmailTab(tabId);
            });
        });
    }

    getFolderDisplayName() {
        const folderMap = {
            '收件箱': '收件箱',
            '星标邮件': '星标邮件',
            '已发送': '已发送',
            '草稿箱': '草稿箱',
            '已删除': '已删除',
            '工作': '工作邮件',
            '个人': '个人邮件',
            '重要': '重要邮件'
        };
        return folderMap[this.currentFolder] || this.currentFolder;
    }

    toggleDropdown() {
        const userProfile = document.getElementById('userProfile');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        if (userProfile && dropdownMenu) {
            const isActive = userProfile.classList.contains('active');
            
            if (isActive) {
                this.closeDropdown();
            } else {
                userProfile.classList.add('active');
                dropdownMenu.classList.add('show');
            }
        }
    }

    closeDropdown() {
        const userProfile = document.getElementById('userProfile');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        if (userProfile && dropdownMenu) {
            userProfile.classList.remove('active');
            dropdownMenu.classList.remove('show');
        }
    }

    handleDropdownClick(itemText) {
        this.closeDropdown();
    }

}

function downloadAttachment(emailId, attachmentName) {
    EmailRenderer.downloadAttachment(emailId, attachmentName);
}

document.addEventListener('DOMContentLoaded', () => {
    window.emailApp = new EmailApp();
});

window.addEventListener('beforeunload', () => {
    if (window.emailApp && window.receiveAPI) {
        window.receiveAPI.closeSSE();
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailApp;
}