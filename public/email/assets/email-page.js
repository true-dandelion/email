class EmailApp {
    constructor() {
        this.currentFolder = '收件箱'; // 默认选中收件箱
        this.emailTabs = new Map(); // 存储打开的邮件标签页
        this.activeTabId = null; // 当前激活的标签页ID
        this.emailStates = new Map(); // 存储邮件状态
        this.init();
        this.initSSE();
    }

    init() {
        this.bindEvents();
        this.updateEmailList();
        this.initializeIcons();
        this.initSidebarToggle();
        this.checkUrlParams();
        this.loadEmailStates();
    }

    // 检查URL参数并自动加载邮件
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 检查是否是新邮件
        if (urlParams.has('create')) {
            // 延迟执行，确保页面加载完成
            setTimeout(() => {
                // 直接调用handleCompose方法
                this.handleCompose();
            }, 500);
            return;
        }
        
        // 检查文件夹参数
        const folderParams = ['Inbox', 'litter', 'Send', 'draft', 'Delete', 'Job', 'individual', 'significant'];
        let currentFolder = null;
        let emailId = null;
        
        for (const folder of folderParams) {
            if (urlParams.has(folder)) {
                currentFolder = folder;
                emailId = urlParams.get('m');
                break;
            }
        }
        
        // 如果有文件夹参数，切换到对应文件夹
        if (currentFolder) {
            const folderMap = {
                'Inbox': '收件箱',
                'litter': '垃圾邮件',
                'Send': '已发送',
                'draft': '草稿箱',
                'Delete': '已删除',
                'Job': '工作',
                'individual': '个人',
                'significant': '重要'
            };
            
            const folderName = folderMap[currentFolder];
            if (folderName) {
                this.switchFolder(folderName);
            }
        }
        
        // 如果有邮件ID，加载邮件详情
        if (emailId) {
            // 检查是否已经有这个标签页存在
            if (this.emailTabs.has(emailId)) {
                // 如果标签页已存在，直接切换
                this.switchEmailTab(emailId);
                return;
            }
            
            // 延迟执行，确保邮件列表已加载
            setTimeout(() => {
                this.loadEmailFromUrl(emailId);
            }, 1000);
        }
    }

    // 清除URL中的邮件参数
    clearEmailUrlParam() {
        const url = new URL(window.location);
        url.searchParams.delete('m');
        url.searchParams.delete('create');
        window.history.replaceState({}, '', url);
    }

    // 更新URL中的邮件参数
    updateEmailUrlParam(emailId) {
        const url = new URL(window.location);
        
        // 清除create参数（如果存在）
        url.searchParams.delete('create');
        
        url.searchParams.set('m', emailId);
        
        // 确保有对应的文件夹参数
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
            // 清除其他文件夹参数
            Object.values(folderMap).forEach(param => {
                if (param !== folderParam) {
                    url.searchParams.delete(param);
                }
            });
            // 设置当前文件夹参数
            url.searchParams.set(folderParam, '');
        }
        
        window.history.replaceState({}, '', url);
    }

    // 更新邮件列表的选中状态
    updateEmailListSelection(emailId) {
        // 移除所有选中状态
        document.querySelectorAll('.nav-email-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 查找对应的邮件项并添加选中状态
        const navItems = document.querySelectorAll('.nav-email-item');
        for (const item of navItems) {
            const itemEmailId = `${item.dataset.timestamp}_${item.dataset.filename}`;
            if (itemEmailId === emailId) {
                item.classList.add('selected');
                break;
            }
        }
    }

    // 从URL参数加载邮件详情
    async loadEmailFromUrl(emailId) {
        try {
            // 构建API接口URL
            const apiUrl = `/amail/Receive/${emailId}`;
            
            // 尝试在导航中找到对应的邮件项并选中
            const navItems = document.querySelectorAll('.nav-email-item');
            for (const item of navItems) {
                const itemEmailId = `${item.dataset.timestamp}_${item.dataset.filename}`;
                if (itemEmailId === emailId) {
                    // 移除其他选中状态
                    document.querySelectorAll('.nav-email-item.selected').forEach(selectedItem => {
                        selectedItem.classList.remove('selected');
                    });
                    // 添加选中状态
                    item.classList.add('selected');
                    break;
                }
            }
            
            // 调用邮件详情接口
            // 从emailId中提取fileName（去掉时间戳前缀）
            const fileName = emailId.includes('_') ? emailId.split('_').slice(1).join('_') : emailId;
            await this.fetchEmailDetail(apiUrl, fileName);
        } catch (error) {
            console.error('从URL加载邮件失败:', error);
        }
    }

    // 初始化SSE连接
    initSSE() {
        if (window.receiveAPI) {
            // 设置新邮件回调
            window.receiveAPI.setOnNewMail((data) => {
                this.handleNewMail(data);
            });

            // 设置连接建立回调
            window.receiveAPI.setOnConnected((data) => {
            });

            // 设置心跳回调
            window.receiveAPI.setOnHeartbeat((data) => {
                // 心跳消息通常不需要特殊处理，保持连接活跃即可
            });

            // 建立SSE连接
            window.receiveAPI.connectSSE();
        }
    }

    // 处理新邮件推送
    handleNewMail(data) {
        
        // 如果当前在收件箱，刷新邮件列表
        if (this.currentFolder === '收件箱') {
            this.refreshEmails();
        }
        
        // 无论当前在哪个文件夹，都更新收件箱计数
        this.loadInboxCount();
        
        // 显示新邮件通知
        this.showNewMailNotification(data.data);
    }

    // 显示新邮件通知
    showNewMailNotification(mailData) {
        // 创建通知元素
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

        // 添加到页面
        document.body.appendChild(notification);

        // 添加关闭事件
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
        // 初始化图标管理器
        if (window.IconManager) {
            // 注入图标CSS
            window.IconManager.injectIconsToCSS();
            
            // 为导航项自动添加图标
            setTimeout(() => {
                window.IconManager.autoAddNavIcons();
            }, 100);
        }
        
        // 初始化新邮件按钮图标
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

    // 初始化sidebar折叠功能
    initSidebarToggle() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // 创建折叠按钮
        const toggleButton = document.createElement('div');
        toggleButton.className = 'sidebar-toggle';
        toggleButton.innerHTML = '◀';
        toggleButton.title = '折叠/展开侧边栏';
        
        // 添加点击事件
        toggleButton.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        sidebar.appendChild(toggleButton);
    }

    // 切换sidebar折叠状态
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
        // 导航项点击事件
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavClick(e);
            });
        });

        // 新建邮件按钮
        const composeBtn = document.querySelector('.compose-btn');
        if (composeBtn) {
            composeBtn.addEventListener('click', () => {
                this.handleCompose();
            });
        }

        // 标记按钮
        const markBtn = document.querySelector('.mark-btn');
        if (markBtn) {
            markBtn.addEventListener('click', () => {
                this.handleMarkEmail();
            });
        }

        // 置顶按钮
        const pinBtn = document.querySelector('.pin-btn');
        if (pinBtn) {
            pinBtn.addEventListener('click', () => {
                this.handlePinEmail();
            });
        }

        // 删除按钮
        const deleteBtn = document.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.handleDeleteEmail();
            });
        }

        // 用户配置文件下拉菜单
        const userProfile = document.getElementById('userProfile');
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (userProfile && dropdownMenu) {
            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });

            // 点击下拉菜单项
            dropdownMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.dropdown-item');
                if (item) {
                    this.handleDropdownClick(item.textContent);
                }
            });
        }

        // 点击其他地方关闭下拉菜单
        document.addEventListener('click', () => {
            this.closeDropdown();
        });
    }

    handleNavClick(e) {
        const navItem = e.currentTarget;

        // 移除所有活动状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // 添加活动状态到当前项
        navItem.classList.add('active');

        // 获取文件夹类型
        const navText = navItem.querySelector('.nav-text').textContent;
        this.switchFolder(navText);
    }

    switchFolder(folderName) {
        // 重置之前文件夹的显示
        this.resetNavItemText();
        this.currentFolder = folderName;
        
        // 更新URL参数
        const url = new URL(window.location);
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
        
        // 清除所有文件夹参数和邮件参数
        Object.values(folderMap).forEach(param => {
            url.searchParams.delete(param);
        });
        url.searchParams.delete('m');
        url.searchParams.delete('create');
        
        // 设置当前文件夹参数
        const folderParam = folderMap[folderName];
        if (folderParam) {
            url.searchParams.set(folderParam, '');
        }
        
        window.history.pushState({}, '', url);
        
        this.updateEmailList();
    }

    resetNavItemText() {
        // 重置所有导航项的文本显示
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
            
            // 只移除非收件箱的计数元素，保留收件箱的计数
            if (navCount && navText && !navText.textContent.includes('收件箱')) {
                navCount.remove();
            }
        });
    }



    handleCompose() {
        // 调用新邮件功能
        if (window.composeEmail) {
            window.composeEmail.openComposeWindow();
        } else {
            // 如果composeEmail还没有初始化，延迟调用
            setTimeout(() => {
                if (window.composeEmail) {
                    window.composeEmail.openComposeWindow();
                }
            }, 100);
        }
    }

    refreshEmails() {
        // 显示加载动画
        this.showLoadingAnimation();
        
        // 刷新邮件列表
        this.updateEmailList();
        this.loadEmailStates();
    }

    // 显示加载动画
    showLoadingAnimation() {
        const emailItems = document.getElementById('emailItems');
        const emailHeadersContainer = emailItems.querySelector('.email-headers-container');
        const emailDetail = emailItems.querySelector('.email-detail');
        
        // 为email-headers-container添加加载动画
        if (emailHeadersContainer) {
            emailHeadersContainer.classList.add('loading');
            emailHeadersContainer.classList.remove('loaded');
        }
        
        // 为email-detail添加加载动画
        if (emailDetail) {
            emailDetail.classList.add('loading');
            emailDetail.classList.remove('loaded');
        }
    }

    // 隐藏加载动画
    hideLoadingAnimation() {
        const emailItems = document.getElementById('emailItems');
        const emailHeadersContainer = emailItems.querySelector('.email-headers-container');
        const emailDetail = emailItems.querySelector('.email-detail');
        
        // 移除email-headers-container的加载动画
        if (emailHeadersContainer) {
            emailHeadersContainer.classList.remove('loading');
            emailHeadersContainer.classList.add('loaded');
        }
        
        // 移除email-detail的加载动画
        if (emailDetail) {
            emailDetail.classList.remove('loading');
            emailDetail.classList.add('loaded');
        }
    }

    // 加载邮件状态
    async loadEmailStates() {
        try {
            const response = await window.receiveAPI.getEmailStates();
            
            // 处理API响应格式 {success: true, data: {...}}
            if (response && response.success && response.data) {
                const states = response.data;
                
                // 遍历状态对象
                Object.keys(states).forEach(mailId => {
                    const state = { mailId, ...states[mailId] };
                    this.emailStates.set(mailId, state);
                });
                
                // 更新邮件列表显示
                this.updateEmailListDisplay();
            }
        } catch (error) {
            console.error('加载邮件状态失败:', error);
        }
    }

    // 处理标记邮件
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
            // 更新本地状态
            this.emailStates.set(mailId, { ...currentState, marked: newMarked });
            // 更新显示
            this.updateEmailItemDisplay(selectedEmail, mailId);
            // 更新按钮状态
            this.updateButtonStates(mailId);
        } catch (error) {
            console.error('更新邮件标记状态失败:', error);
            alert('操作失败，请重试');
        }
    }

    // 处理置顶邮件
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
            // 更新本地状态
            this.emailStates.set(mailId, { ...currentState, pinned: newPinned });
            // 更新显示
            this.updateEmailItemDisplay(selectedEmail, mailId);
            // 更新按钮状态
            this.updateButtonStates(mailId);
        } catch (error) {
            console.error('更新邮件置顶状态失败:', error);
            alert('操作失败，请重试');
        }
    }

    // 处理删除邮件
    async handleDeleteEmail() {
        const selectedEmail = this.getSelectedEmail();
        if (!selectedEmail) {
            alert('请先选择一封邮件');
            return;
        }

        const fileName = selectedEmail.dataset.filename;
        const timestamp = selectedEmail.dataset.timestamp;
        const mailId = `${timestamp}_${fileName}`;

        // 确认删除
        if (!confirm('确定要删除这封邮件吗？')) {
            return;
        }

        try {
            // 调用删除API
            await window.receiveAPI.deleteEmail(mailId);
            
            // 从本地状态中移除
            this.emailStates.delete(mailId);
            
            // 从DOM中移除邮件项
            selectedEmail.remove();
            
            // 关闭当前邮件标签页（如果有）
            if (this.activeTabId === mailId) {
                this.closeEmailTab(mailId);
            }
            
            // 刷新邮件列表
            this.refreshEmails();
            
            alert('邮件删除成功');
        } catch (error) {
            console.error('删除邮件失败:', error);
            alert('删除失败，请重试');
        }
    }

    // 获取当前选中的邮件
    getSelectedEmail() {
        return document.querySelector('.nav-email-item.selected');
    }

    // 更新邮件项显示
    updateEmailItemDisplay(emailItem, mailId) {
        const state = this.emailStates.get(mailId) || {};
        
        // 更新未读状态
        if (state.read === false) {
            emailItem.classList.add('unread');
        } else {
            emailItem.classList.remove('unread');
        }

        // 添加状态指示器
        this.updateEmailStateIndicators(emailItem, state);
    }

    // 更新邮件状态指示器
    updateEmailStateIndicators(emailItem, state) {
        // 移除现有的状态指示器
        const existingIndicators = emailItem.querySelectorAll('.email-state-indicator');
        existingIndicators.forEach(indicator => indicator.remove());

        // 添加新的状态指示器
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

    // 更新邮件列表显示
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

    // 更新按钮状态
    updateButtonStates(mailId) {
        const state = this.emailStates.get(mailId) || {};
        
        // 更新标记按钮状态
        const markBtn = document.querySelector('.mark-btn');
        if (markBtn) {
            if (state.marked) {
                markBtn.classList.add('active');
            } else {
                markBtn.classList.remove('active');
            }
        }
        
        // 更新置顶按钮状态
        const pinBtn = document.querySelector('.pin-btn');
        if (pinBtn) {
            if (state.pinned) {
                pinBtn.classList.add('active');
            } else {
                pinBtn.classList.remove('active');
            }
        }
    }

    async updateEmailList() {
        const emailItems = document.getElementById('emailItems');
        const emailNavigation = document.getElementById('emailNavigation');

        // 清空当前列表
        emailItems.innerHTML = '';
        emailNavigation.innerHTML = '';

        // 如果是收件箱，获取真实数据
        if (this.currentFolder === '收件箱') {
            try {
                await this.loadReceiveEmails();
                // 收件箱加载成功后隐藏加载动画
                setTimeout(() => {
                    this.hideLoadingAnimation();
                }, 100);
                // 收件箱加载成功，不需要调用updateNavigation
                return;
            } catch (error) {
                console.error('加载收件箱邮件失败:', error);
                this.showEmptyState();
                // 加载失败也要隐藏动画
                this.hideLoadingAnimation();
            }
        } else {
            // 其他文件夹显示空状态
            this.showEmptyState();
            // 隐藏加载动画
            this.hideLoadingAnimation();
        }
        
        // 只有非收件箱或收件箱加载失败时才更新navigation区域
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
        const emailItems = document.getElementById('emailItems');
        emailItems.innerHTML = `
        `;
    }

    showEmailItemsPlaceholder() {
        const emailItems = document.getElementById('emailItems');
        emailItems.innerHTML = `
        `;
    }

    async loadReceiveEmails() {
        if (!window.receiveAPI) {
            console.error('receiveAPI 未加载');
            return;
        }

        try {
            const response = await window.receiveAPI.getReceiveEmails();
            if (response.success && response.data && response.data.mails) {
                // 更新收件箱导航项的邮件数量
                this.updateInboxCount(response.data.mails.length);
                // 只在navigation区域显示邮件列表
                this.renderEmailNavigation(response.data.mails);
                // emailItems区域显示提示信息
                this.showEmailItemsPlaceholder();
            } else {
                this.updateInboxCount(0);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('获取收件箱邮件失败:', error);
            this.updateInboxCount(0);
            this.showEmptyState();
        }
    }

    // 在后台加载收件箱邮件数量
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
        // 直接查找收件箱导航项，不依赖当前选中状态
        const navItems = document.querySelectorAll('.nav-item');
        let inboxNavItem = null;
        let inboxNavText = null;
        
        // 查找收件箱导航项
        navItems.forEach(item => {
            const navText = item.querySelector('.nav-text');
            if (navText && navText.textContent.includes('收件箱')) {
                inboxNavItem = item;
                inboxNavText = navText;
            }
        });
        
        if (inboxNavItem && inboxNavText) {
            // 移除已存在的计数元素
            const existingCount = inboxNavItem.querySelector('.nav-count');
            if (existingCount) {
                existingCount.remove();
            }
            
            // 确保nav-text只显示"收件箱"
            inboxNavText.textContent = '收件箱';
            
            // 如果有邮件，添加计数元素
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

        const navigationHTML = `
            <div class="navigation-header">
                <h3 class="navigation-title">收件箱</h3>
            </div>
            <div class="navigation-content">
                ${mails.map(mail => {
                    const fromInfo = window.receiveAPI.parseEmailAddress(mail.from);
                    const formattedTime = window.receiveAPI.formatTimestamp(mail.timestamp);
                    
                    // 安全地转义HTML特殊字符
                    const escapeHtml = (text) => {
                        const div = document.createElement('div');
                        div.textContent = text;
                        return div.innerHTML;
                    };
                    
                    const safeSubject = escapeHtml(mail.subject || '无主题');
                    const safeFrom = escapeHtml(mail.from || '未知发件人');
                    const safeFileName = escapeHtml(mail.fileName || mail.id || '');
                    const safeTimestamp = escapeHtml(mail.timestamp || '');
                    
                    return `
                        <div class="nav-email-item" data-filename="${safeFileName}" data-subject="${safeSubject}" data-from="${safeFrom}" data-timestamp="${safeTimestamp}">
                            <div class="nav-email-from">${safeFrom}</div>
                            <div class="nav-email-subject">${safeSubject}</div>
                            <div class="nav-email-time">${formattedTime}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        emailNavigation.innerHTML = navigationHTML;
        
        // 添加点击事件
        emailNavigation.querySelectorAll('.nav-email-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectEmailFromNav(item);
            });
        });
        
        // 更新邮件状态显示
        setTimeout(() => {
            this.updateEmailListDisplay();
        }, 100);
    }



    async selectEmailFromNav(navItem) {
        // 移除其他选中状态
        document.querySelectorAll('.nav-email-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // 添加选中状态
        navItem.classList.add('selected');
        
        const fileName = navItem.dataset.filename;
        const timestamp = navItem.dataset.timestamp;
        const emailId = `${timestamp}_${fileName}`;
        
        // 向后端发送状态更新，将邮件标记为已读
        try {
            const currentState = this.emailStates.get(emailId) || {};
            if (currentState.read !== true) {
                await window.receiveAPI.updateEmailState(emailId, { read: true });
                // 更新本地状态
                this.emailStates.set(emailId, { ...currentState, read: true });
                // 更新显示
                this.updateEmailItemDisplay(navItem, emailId);
            }
        } catch (error) {
            console.error('更新邮件已读状态失败:', error);
        }
        
        // 更新按钮状态
        this.updateButtonStates(emailId);
        
        // 更新地址栏参数
        const url = new URL(window.location);
        url.searchParams.set('m', emailId);
        window.history.pushState({}, '', url);
        
        // 构建API接口URL
        const apiUrl = `/amail/Receive/${emailId}`;
        
        // 调用邮件详情接口
        this.fetchEmailDetail(apiUrl, fileName);
    }

    // 获取邮件详情的API调用
    async fetchEmailDetail(apiUrl, fileName) {
        const emailItems = document.getElementById('emailItems');
        
        // 显示加载状态和动画
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
            
            // 加载完成后隐藏动画
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

    showEmailDetails(emailData, fileName) {
        // 从选中的邮件项获取基本信息作为备用
        const selectedItem = document.querySelector('.nav-email-item.selected');
        
        // 构建完整的邮件ID（时间戳_文件名）
        let emailId = fileName || Date.now().toString();
        if (selectedItem && selectedItem.dataset.timestamp && selectedItem.dataset.filename) {
            emailId = `${selectedItem.dataset.timestamp}_${selectedItem.dataset.filename}`;
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
            // 检查是否有success字段，如果有则使用data字段
            const actualData = emailData.success ? emailData.data : emailData;
            
            // 使用API返回的数据
            tabData.subject = actualData.subject || (selectedItem ? selectedItem.dataset.subject : '无主题');
            
            // 处理发件人信息
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
            
            // 处理收件人信息
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
            
            // 处理抄送信息
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
            
            // 处理密送信息
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
            
            // 处理附件信息
            if (actualData.attachments && Array.isArray(actualData.attachments)) {
                tabData.attachments = actualData.attachments.map(attachment => ({
                    filename: attachment.filename || attachment.name || '未知文件',
                    contentType: attachment.contentType || attachment.type || 'application/octet-stream',
                    size: attachment.size || 0,
                    cid: attachment.cid || null
                }));
            }
            
            // 处理邮件内容
            tabData.content = actualData.html || actualData.text || actualData.content || actualData.body || '邮件内容为空';
            
            // 处理时间
            if (actualData.date) {
                // 检查是否为时间戳格式（数字）
                if (typeof actualData.date === 'number') {
                    const date = new Date(actualData.date * 1000); // 时间戳转换为毫秒
                    tabData.formattedTime = date.toLocaleString('zh-CN');
                } else {
                    // 处理ISO日期字符串格式
                    const date = new Date(actualData.date);
                    tabData.formattedTime = date.toLocaleString('zh-CN');
                }
            } else if (actualData.timestamp) {
                tabData.formattedTime = window.receiveAPI ? window.receiveAPI.formatTimestamp(actualData.timestamp) : '未知时间';
            } else if (selectedItem) {
                tabData.formattedTime = window.receiveAPI.formatTimestamp(selectedItem.dataset.timestamp);
            }
        } else if (selectedItem) {
            // 使用导航项的基本信息作为备用
            tabData.subject = selectedItem.dataset.subject;
            tabData.fromInfo = window.receiveAPI.parseEmailAddress(selectedItem.dataset.from);
            tabData.formattedTime = window.receiveAPI.formatTimestamp(selectedItem.dataset.timestamp);
            tabData.content = '邮件详情加载失败，显示基本信息';
        }
        
        // 添加或切换到邮件标签页
        this.addEmailTab(tabData);
    }

    // 添加邮件标签页
    addEmailTab(tabData) {
        // 如果标签页已存在，直接切换
        if (this.emailTabs.has(tabData.id)) {
            this.switchEmailTab(tabData.id);
            return;
        }

        // 添加新标签页
        this.emailTabs.set(tabData.id, tabData);
        this.activeTabId = tabData.id;
        
        // 更新URL参数
        this.updateEmailUrlParam(tabData.id);
        
        // 更新左侧邮件列表的选中状态
        this.updateEmailListSelection(tabData.id);
        
        // 重新渲染标签页和内容
        this.renderEmailTabs();
        this.renderActiveEmailContent();
    }

    // 切换邮件标签页
    switchEmailTab(tabId) {
        if (this.emailTabs.has(tabId)) {
            this.activeTabId = tabId;
            
            // 检查是否是新邮件标签页
            if (tabId === 'create') {
                // 新邮件标签页，设置create参数
                const url = new URL(window.location);
                // 清除所有其他参数
                const folderParams = ['Inbox', 'litter', 'Send', 'draft', 'Delete', 'Job', 'individual', 'significant'];
                folderParams.forEach(param => {
                    url.searchParams.delete(param);
                });
                url.searchParams.delete('m');
                url.searchParams.set('create', '');
                window.history.replaceState({}, '', url);
            } else {
                // 普通邮件标签页，更新邮件参数
                this.updateEmailUrlParam(tabId);
            }
            
            // 更新左侧邮件列表的选中状态
            this.updateEmailListSelection(tabId);
            this.renderEmailTabs();
            this.renderActiveEmailContent();
        }
    }

    // 关闭邮件标签页
    closeEmailTab(tabId) {
        if (this.emailTabs.has(tabId)) {
            this.emailTabs.delete(tabId);
            
            // 如果关闭的是当前激活的标签页
            if (this.activeTabId === tabId) {
                // 切换到其他标签页或显示空状态
                const remainingTabs = Array.from(this.emailTabs.keys());
                if (remainingTabs.length > 0) {
                    this.activeTabId = remainingTabs[remainingTabs.length - 1];
                    
                    // 根据标签页类型更新URL参数
                    if (this.activeTabId === 'create') {
                        // 新邮件标签页，设置create参数
                        const url = new URL(window.location);
                        // 清除所有其他参数
                        const folderParams = ['Inbox', 'litter', 'Send', 'draft', 'Delete', 'Job', 'individual', 'significant'];
                        folderParams.forEach(param => {
                            url.searchParams.delete(param);
                        });
                        url.searchParams.delete('m');
                        url.searchParams.set('create', '');
                        window.history.replaceState({}, '', url);
                    } else {
                        // 普通邮件标签页，更新邮件参数
                        this.updateEmailUrlParam(this.activeTabId);
                    }
                    
                    this.updateEmailListSelection(this.activeTabId);
                } else {
                    this.activeTabId = null;
                    // 如果没有剩余标签页，清除URL中的m参数和邮件列表选中状态
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

    // 渲染邮件标签页
    renderEmailTabs() {
        const emailItems = document.getElementById('emailItems');
        
        if (this.emailTabs.size === 0) {
            emailItems.innerHTML = `
            `;
            return;
        }

        // 创建标签页容器
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
        
        // 添加当前激活标签页的内容
        if (this.activeTabId && this.emailTabs.has(this.activeTabId)) {
            const activeTab = this.emailTabs.get(this.activeTabId);
            
            // 检查是否是新邮件标签页
            if (this.activeTabId === 'create') {
                // 新邮件标签页，添加编辑器容器
                tabsHtml += `
                    <div class="email-detail loaded" id="compose-editor-container">
                        <!-- 新邮件编辑器将在这里渲染 -->
                    </div>
                `;
            } else {
                // 准备邮件数据给EmailRenderer
                const emailData = {
                    from: activeTab.fromInfo,
                    to: activeTab.toInfo,
                    cc: activeTab.ccInfo,
                    bcc: activeTab.bccInfo,
                    content: activeTab.content,
                    attachments: activeTab.attachments
                };
                
                // 使用EmailRenderer渲染完整邮件内容
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

        
        // 如果是新邮件标签页，渲染编辑器到指定容器
        if (this.activeTabId === 'create' && window.composeEmail) {
            const container = document.getElementById('compose-editor-container');
            if (container) {
                window.composeEmail.renderComposeEditorToContainer(container);
            }
        }
        
        // 绑定标签页点击事件
        this.bindTabEvents();
    }

    // 渲染当前激活的邮件内容
    renderActiveEmailContent() {
        // 这个方法在renderEmailTabs中已经处理了
        // 保留这个方法以备将来扩展使用
    }

    // 绑定标签页事件
    bindTabEvents() {
        // 绑定标签页点击事件
        document.querySelectorAll('.email-header-bar').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (!e.target.classList.contains('email-close-btn')) {
                    const tabId = tab.dataset.tabId;
                    this.switchEmailTab(tabId);
                }
            });
        });

        // 绑定关闭按钮事件
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

// 下载附件函数
function downloadAttachment(emailId, attachmentName) {
    EmailRenderer.downloadAttachment(emailId, attachmentName);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.emailApp = new EmailApp();
});

// 页面卸载时清理SSE连接
window.addEventListener('beforeunload', () => {
    if (window.emailApp && window.receiveAPI) {
        window.receiveAPI.closeSSE();
    }
});

// 导出供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailApp;
}