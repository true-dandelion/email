if (window.ComposeEmail) {
    // 初始化当前样式状态
    window.ComposeEmail.prototype.initCurrentStyles = function() {
        // 存储当前用户设置的样式状态
        this.currentStyles = {
            fontFamily: 'default',
            fontSize: 'default'
        };
    };
    
    // 绑定编辑器事件
    window.ComposeEmail.prototype.bindEditorEvents = function() {
        // 初始化样式状态
        this.initCurrentStyles();
        // 基础工具栏按钮事件
        document.querySelectorAll('.toolbar-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                
                if (action === 'quote') {
                    this.toggleQuote();
                } else {
                    document.execCommand(action, false, null);
                }
            });
        });

        // 绑定下拉菜单事件
        this.bindDropdownEvents();
        
        // 绑定文件上传事件
        this.bindFileEvents();
        
        // 绑定链接插入事件
        this.bindLinkEvents();
        
        // 绑定分割线插入事件
        this.bindHrEvent();
        
        // 发送邮件按钮
        const sendBtn = document.getElementById('send-email');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendEmail();
            });
        }
        
        // 保存草稿按钮
        const saveDraftBtn = document.getElementById('save-draft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => {
                this.saveDraft();
            });
        }
        
        // 丢弃邮件按钮
        const discardBtn = document.getElementById('discard-email');
        if (discardBtn) {
            discardBtn.addEventListener('click', () => {
                this.discardEmail();
            });
        }
        
        // 主题输入框事件
        const subjectInput = document.getElementById('compose-subject');
        if (subjectInput) {
            subjectInput.addEventListener('input', (e) => {
                const title = e.target.value || '新邮件';
                this.updateTabTitle(title);
            });
        }
        
        // 抄送按钮
        const showCcBtn = document.getElementById('show-cc-btn');
        if (showCcBtn) {
            showCcBtn.addEventListener('click', () => {
                const ccField = document.getElementById('cc-field');
                if (ccField) {
                    ccField.style.display = 'flex';
                }
            });
        }
        
        // 密送按钮
        const showBccBtn = document.getElementById('show-bcc-btn');
        if (showBccBtn) {
            showBccBtn.addEventListener('click', () => {
                const bccField = document.getElementById('bcc-field');
                if (bccField) {
                    bccField.style.display = 'flex';
                }
            });
        }
        
        // 移除抄送按钮
        const removeCcBtn = document.getElementById('remove-cc-btn');
        if (removeCcBtn) {
            removeCcBtn.addEventListener('click', () => {
                const ccField = document.getElementById('cc-field');
                if (ccField) {
                    ccField.style.display = 'none';
                    document.getElementById('compose-cc').value = '';
                }
            });
        }
        
        // 移除密送按钮
        const removeBccBtn = document.getElementById('remove-bcc-btn');
        if (removeBccBtn) {
            removeBccBtn.addEventListener('click', () => {
                const bccField = document.getElementById('bcc-field');
                if (bccField) {
                    bccField.style.display = 'none';
                    document.getElementById('compose-bcc').value = '';
                }
            });
        }
        
        // 分别发送按钮
        const separateSendBtn = document.getElementById('separate-send-btn');
        if (separateSendBtn) {
            separateSendBtn.addEventListener('click', () => {
                alert('分别发送功能暂未实现');
            });
        }
        
        // 内容编辑器placeholder处理和输入事件绑定
        const contentEditor = document.getElementById('compose-content');
        if (contentEditor) {
            contentEditor.addEventListener('focus', () => {
                if (contentEditor.textContent.trim() === '') {
                    contentEditor.innerHTML = '';
                }
            });
            
            contentEditor.addEventListener('blur', () => {
                if (contentEditor.textContent.trim() === '') {
                    contentEditor.innerHTML = '';
                }
            });
            
            // 绑定输入事件处理
            this.bindInputEvents(contentEditor);
        }
        
        // 绑定选区变化事件
        this.bindSelectionEvents();
        
        // 初始化内容块管理系统
        this.initContentBlockSystem();
    };

    // 绑定输入事件处理 - 处理光标在文字中间的输入情况
    window.ComposeEmail.prototype.bindInputEvents = function(contentEditor) {
        // 输入事件处理
        contentEditor.addEventListener('input', (e) => {
            this.handleInputEvent(e);
        });
        
        // 键盘事件处理
        contentEditor.addEventListener('keydown', (e) => {
            this.handleKeydownEvent(e);
        });
        
        // 粘贴事件处理
        contentEditor.addEventListener('paste', (e) => {
            this.handlePasteEvent(e);
        });
        
        // 组合输入事件处理（中文输入法等）
        contentEditor.addEventListener('compositionstart', (e) => {
            this.isComposing = true;
        });
        
        contentEditor.addEventListener('compositionend', (e) => {
            this.isComposing = false;
            this.handleInputEvent(e);
        });
    };
    
    // 处理输入事件
    window.ComposeEmail.prototype.handleInputEvent = function(e) {
        if (this.isComposing) return; // 跳过组合输入过程中的事件
        
        // 简化输入处理，避免干扰光标位置
        // 只在必要时进行样式维护，不强制操作选区
    };
    
    // 处理键盘事件
    window.ComposeEmail.prototype.handleKeydownEvent = function(e) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        // 处理删除键和退格键
        if (e.key === 'Backspace' || e.key === 'Delete') {
            this.handleDeleteKey(e);
        }
        
        // 处理回车键
        if (e.key === 'Enter') {
            this.handleEnterKey(e);
        }
    };
    
    // 处理删除键事件
    window.ComposeEmail.prototype.handleDeleteKey = function(e) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // 如果有选中内容，让浏览器默认处理
        if (!range.collapsed) return;
        
        const container = range.startContainer;
        const offset = range.startOffset;
        
        // 检查是否在内容块边界
        let contentBlock = container.nodeType === Node.TEXT_NODE ? 
                          container.parentElement : container;
        
        while (contentBlock && !contentBlock.hasAttribute('data-content-block')) {
            if (contentBlock.id === 'compose-content') {
                contentBlock = null;
                break;
            }
            contentBlock = contentBlock.parentElement;
        }
        
        if (contentBlock) {
            // 在内容块中删除，检查是否会删除整个块
            if (container.nodeType === Node.TEXT_NODE && 
                ((e.key === 'Backspace' && offset === 0) || 
                 (e.key === 'Delete' && offset === container.textContent.length))) {
                
                // 如果删除会清空内容块，保留块结构但清空内容
                if (container.textContent.length === 1) {
                    e.preventDefault();
                    container.textContent = '';
                    return;
                }
            }
        }
    };
    
    // 处理回车键事件
    window.ComposeEmail.prototype.handleEnterKey = function(e) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        
        // 检查是否在内容块中
        let contentBlock = container.nodeType === Node.TEXT_NODE ? 
                          container.parentElement : container;
        
        while (contentBlock && !contentBlock.hasAttribute('data-content-block')) {
            if (contentBlock.id === 'compose-content') {
                contentBlock = null;
                break;
            }
            contentBlock = contentBlock.parentElement;
        }
        
        if (contentBlock) {
            // 在内容块中按回车，创建新行但保持在同一个块中
            e.preventDefault();
            
            const br = document.createElement('br');
            range.insertNode(br);
            
            // 移动光标到换行后
            range.setStartAfter(br);
            range.setEndAfter(br);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };
    
    // 处理粘贴事件
    window.ComposeEmail.prototype.handlePasteEvent = function(e) {
        e.preventDefault();
        
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        
        // 获取粘贴的文本内容
        const pastedText = (e.clipboardData || window.clipboardData).getData('text/plain');
        
        // 检查是否在内容块中粘贴
        let contentBlock = container.nodeType === Node.TEXT_NODE ? 
                          container.parentElement : container;
        
        while (contentBlock && !contentBlock.hasAttribute('data-content-block')) {
            if (contentBlock.id === 'compose-content') {
                contentBlock = null;
                break;
            }
            contentBlock = contentBlock.parentElement;
        }
        
        if (contentBlock) {
            // 在内容块中粘贴，保持块的样式
            const textNode = document.createTextNode(pastedText);
            range.insertNode(textNode);
            
            // 移动光标到粘贴内容后
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // 在普通区域粘贴，直接插入文本
            const textNode = document.createTextNode(pastedText);
            range.insertNode(textNode);
            
            // 移动光标到粘贴内容后
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };
    
    // 维护内容块样式
    window.ComposeEmail.prototype.maintainBlockStyles = function(contentBlock, blockStyles) {
        if (!contentBlock || !blockStyles) return;
        
        // 重新应用所有样式
        blockStyles.forEach((value, property) => {
            contentBlock.style[property] = value;
        });
        
        // 确保内容块类名和属性正确
        if (!contentBlock.classList.contains('content-block')) {
            contentBlock.classList.add('content-block');
        }
    };

    // 绑定选区变化事件
    window.ComposeEmail.prototype.bindSelectionEvents = function() {
        const contentEditor = document.getElementById('compose-content');
        if (!contentEditor) return;
        
        // 鼠标位置检测状态
        this.isMouseInside = false;
        this.savedSelection = null;
        
        // 监听选区变化
        const updateDropdownDisplay = () => {
            const selection = window.getSelection();
            
            // 只有在有选中文本时才检测选区样式，否则保持当前设置
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                const styles = this.getSelectionStyles();
                this.updateDropdownDisplay(styles.fontFamily, styles.fontSize);
            } else {
                // 没有选中文本时，显示当前全局设置
                if (!this.currentStyles) this.initCurrentStyles();
                this.updateDropdownDisplay(
                    this.currentStyles.fontFamily,
                    this.currentStyles.fontSize
                );
            }
        };
        
        // 鼠标进入编辑区域
        contentEditor.addEventListener('mouseenter', () => {
            this.isMouseInside = true;
            // 如果有保存的选区，恢复它
            if (this.savedSelection) {
                this.restoreSelection(this.savedSelection);
                this.savedSelection = null;
            }
        });
        
        // 鼠标离开编辑区域
        contentEditor.addEventListener('mouseleave', () => {
            this.isMouseInside = false;
            // 保存当前选区状态
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                this.savedSelection = {
                    startContainer: range.startContainer,
                    startOffset: range.startOffset,
                    endContainer: range.endContainer,
                    endOffset: range.endOffset
                };
            }
        });
        
        // 监听鼠标移动（辅助验证）
        document.addEventListener('mousemove', (e) => {
            if (!this.isMouseInside) {
                const rect = contentEditor.getBoundingClientRect();
                const isInBounds = e.clientX >= rect.left && e.clientX <= rect.right &&
                                 e.clientY >= rect.top && e.clientY <= rect.bottom;
                
                // 如果鼠标实际在区域内但状态为false，更新状态
                if (isInBounds) {
                    this.isMouseInside = true;
                    if (this.savedSelection) {
                        this.restoreSelection(this.savedSelection);
                        this.savedSelection = null;
                    }
                }
            }
        });
        
        // 监听鼠标选择
        contentEditor.addEventListener('mouseup', updateDropdownDisplay);
        
        // 监听键盘选择
        contentEditor.addEventListener('keyup', (e) => {
            // 只在方向键、Shift等选择相关按键时更新
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
                e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
                e.key === 'Shift' || e.shiftKey) {
                updateDropdownDisplay();
            }
        });
        
        // 监听选区变化事件（现代浏览器）
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            
            // 检查选区是否在编辑器内
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const isInEditor = contentEditor.contains(range.commonAncestorContainer) || 
                                 contentEditor === range.commonAncestorContainer;
                
                if (isInEditor) {
                    updateDropdownDisplay();
                    
                    // 更新保存的选区（无论鼠标是否在区域内）
                    this.savedSelection = {
                        startContainer: range.startContainer,
                        startOffset: range.startOffset,
                        endContainer: range.endContainer,
                        endOffset: range.endOffset
                    };
                }
            }
        });
        
        // 监听编辑器内的点击事件，确保选区正确更新
        contentEditor.addEventListener('mousedown', (e) => {
            // 清除可能存在的延迟恢复选区操作
            this.isMouseInside = true;
        });
    };

    // 更新下拉菜单显示
    window.ComposeEmail.prototype.updateDropdownDisplay = function(fontFamily, fontSize) {
        // 更新字体下拉菜单显示
        const fontButton = document.querySelector('.toolbar-dropdown .dropdown-btn[title="字体"] span');
        if (fontButton) {
            if (fontFamily && fontFamily !== 'default') {
                // 查找对应的字体名称
                const fontMap = {
                    'SimSun': '宋体',
                    'Microsoft YaHei': '微软雅黑',
                    'SimHei': '黑体',
                    'Arial': 'Arial'
                };
                const displayName = fontMap[fontFamily] || fontFamily;
                fontButton.textContent = displayName;
            } else {
                fontButton.textContent = '默认字体';
            }
        }
        
        // 更新字号下拉菜单显示
        const sizeButton = document.querySelector('.toolbar-dropdown .dropdown-btn[title="字号"] span');
        if (sizeButton) {
            if (fontSize && fontSize !== 'default') {
                // 优化字号显示格式
                if (fontSize.includes('pt')) {
                    sizeButton.textContent = fontSize;
                } else if (fontSize.includes('px')) {
                    sizeButton.textContent = fontSize;
                } else {
                    sizeButton.textContent = fontSize;
                }
            } else {
                sizeButton.textContent = '默认字号';
            }
        }
    };

    // 绑定下拉菜单事件
    window.ComposeEmail.prototype.bindDropdownEvents = function() {
        // 字体选择
        const fontFamilyItems = document.querySelectorAll('#font-family-menu .dropdown-item');
        fontFamilyItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const font = e.target.getAttribute('data-font');
                this.applyFontFamily(font);
                // 隐藏下拉菜单
                const menu = document.getElementById('font-family-menu');
                if (menu) menu.classList.remove('show');
            });
        });
        
        // 字号选择
        const fontSizeItems = document.querySelectorAll('#font-size-menu .dropdown-item');
        fontSizeItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const size = e.target.getAttribute('data-size');
                this.applyFontSize(size);
                // 隐藏下拉菜单
                const menu = document.getElementById('font-size-menu');
                if (menu) menu.classList.remove('show');
            });
        });
        
        // 字体颜色选择
        const fontColorItems = document.querySelectorAll('#font-color-menu .color-item');
        fontColorItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const color = e.target.getAttribute('data-color');
                this.applyFontColor(color);
                // 隐藏下拉菜单
                const menu = document.getElementById('font-color-menu');
                if (menu) menu.classList.remove('show');
            });
        });
        
        // 背景颜色选择
        const bgColorItems = document.querySelectorAll('#bg-color-menu .bg-color-item');
        bgColorItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const bgcolor = e.target.getAttribute('data-bgcolor');
                this.applyBackgroundColor(bgcolor);
                // 隐藏下拉菜单
                const menu = document.getElementById('bg-color-menu');
                if (menu) menu.classList.remove('show');
            });
        });
        
        // 对齐方式选择
        const alignItems = document.querySelectorAll('#align-menu .dropdown-item');
        alignItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.applyAlignment(action);
                // 隐藏下拉菜单
                const menu = document.getElementById('align-menu');
                if (menu) menu.classList.remove('show');
            });
        });
        
        // 行间距选择
        const lineHeightItems = document.querySelectorAll('#line-height-menu .dropdown-item');
        lineHeightItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const height = e.target.getAttribute('data-height');
                this.applyLineHeight(height);
                // 隐藏下拉菜单
                const menu = document.getElementById('line-height-menu');
                if (menu) menu.classList.remove('show');
            });
        });
        
        // 下拉菜单显示/隐藏控制
        document.querySelectorAll('.dropdown-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 隐藏所有其他下拉菜单
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    if (menu !== btn.nextElementSibling) {
                        menu.classList.remove('show');
                    }
                });
                
                // 切换当前下拉菜单
                const menu = btn.nextElementSibling;
                if (menu) {
                    menu.classList.toggle('show');
                }
            });
        });
        
        // 点击其他地方隐藏下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.toolbar-dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    };

    // 应用字体
    window.ComposeEmail.prototype.applyFontFamily = function(fontFamily) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            // 保存选区信息
            const range = selection.getRangeAt(0);
            const rangeInfo = {
                startContainer: range.startContainer,
                startOffset: range.startOffset,
                endContainer: range.endContainer,
                endOffset: range.endOffset
            };
            
            // 应用字体样式
            this.applyStyleToSelection(range, 'fontFamily', fontFamily === 'default' ? '' : fontFamily);
            
            // 恢复选区
            this.restoreSelection(rangeInfo);
        } else {
            // 没有选中文本，设置编辑器默认字体
            const editor = document.getElementById('compose-content');
            if (editor) {
                if (fontFamily === 'default') {
                    editor.style.fontFamily = '';
                } else {
                    editor.style.fontFamily = fontFamily;
                }
            }
        }
        
        // 更新当前字体状态
        if (!this.currentStyles) this.initCurrentStyles();
        this.currentStyles.fontFamily = fontFamily;
        
        // 更新下拉菜单显示 - 保持当前字号设置
        this.updateDropdownDisplay(
            fontFamily === 'default' ? 'default' : fontFamily, 
            this.currentStyles.fontSize
        );
    };

    // 应用字号
    window.ComposeEmail.prototype.applyFontSize = function(fontSize) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            // 保存选区信息
            const range = selection.getRangeAt(0);
            const rangeInfo = {
                startContainer: range.startContainer,
                startOffset: range.startOffset,
                endContainer: range.endContainer,
                endOffset: range.endOffset
            };
            
            // 应用字号样式
            this.applyStyleToSelection(range, 'fontSize', fontSize === 'default' ? '' : fontSize);
            
            // 恢复选区
            this.restoreSelection(rangeInfo);
        } else {
            // 没有选中文本，设置编辑器默认字号
            const editor = document.getElementById('compose-content');
            if (editor) {
                if (fontSize === 'default') {
                    editor.style.fontSize = '';
                } else {
                    editor.style.fontSize = fontSize;
                }
            }
        }
        
        // 更新当前字号状态
        if (!this.currentStyles) this.initCurrentStyles();
        this.currentStyles.fontSize = fontSize;
        
        // 更新下拉菜单显示 - 保持当前字体设置
        this.updateDropdownDisplay(
            this.currentStyles.fontFamily,
            fontSize === 'default' ? 'default' : fontSize
        );
    };

    // 应用字体颜色
    window.ComposeEmail.prototype.applyFontColor = function(color) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            // 有选中文本，只对选中文本应用颜色
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.style.color = color;
            
            try {
                range.surroundContents(span);
            } catch (e) {
                // 如果选中内容包含部分元素，使用不同的方法
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
            }
            
            selection.removeAllRanges();
        } else {
            // 没有选中文本，设置编辑器默认颜色
            const editor = document.getElementById('compose-content');
            if (editor) {
                editor.style.color = color;
            }
        }
    };

    // 应用背景颜色
    window.ComposeEmail.prototype.applyBackgroundColor = function(bgcolor) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            // 有选中文本，只对选中文本应用背景颜色
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.style.backgroundColor = bgcolor === 'transparent' ? '' : bgcolor;
            
            try {
                range.surroundContents(span);
            } catch (e) {
                // 如果选中内容包含部分元素，使用不同的方法
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
            }
            
            selection.removeAllRanges();
        } else {
            // 没有选中文本，设置编辑器默认背景颜色
            const editor = document.getElementById('compose-content');
            if (editor) {
                editor.style.backgroundColor = bgcolor === 'transparent' ? '' : bgcolor;
            }
        }
    };

    // 应用行间距
    window.ComposeEmail.prototype.applyLineHeight = function(lineHeight) {
        const editor = document.getElementById('compose-content');
        if (editor) {
            editor.style.lineHeight = lineHeight;
        }
    };

    // 内容块样式管理器 - 实现"内容块-样式规则"一一对应关系
    window.ComposeEmail.prototype.contentBlockManager = {
        // 内容块计数器，用于生成唯一ID
        blockCounter: 0,
        
        // 样式规则映射表
        styleRules: new Map(),
        
        // 生成内容块唯一标识
        generateBlockId: function() {
            return `content-block-${++this.blockCounter}`;
        },
        
        // 注册样式规则
        registerStyleRule: function(blockId, styleProperty, styleValue) {
            if (!this.styleRules.has(blockId)) {
                this.styleRules.set(blockId, new Map());
            }
            this.styleRules.get(blockId).set(styleProperty, styleValue);
        },
        
        // 获取内容块的所有样式
        getBlockStyles: function(blockId) {
            return this.styleRules.get(blockId) || new Map();
        },
        
        // 应用样式规则到元素
        applyStylesToElement: function(element, blockId) {
            const styles = this.getBlockStyles(blockId);
            styles.forEach((value, property) => {
                element.style[property] = value;
            });
        }
    };
    
    // 通用样式应用方法 - 基于内容块标识的精准样式控制
    window.ComposeEmail.prototype.applyStyleToSelection = function(range, styleProperty, styleValue) {
        const fragment = range.extractContents();
        const walker = document.createTreeWalker(
            fragment,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null,
            false
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                textNodes.push(node);
            }
        }
        
        // 如果没有文本节点，直接包装整个片段
        if (textNodes.length === 0) {
            const blockId = this.contentBlockManager.generateBlockId();
            const span = document.createElement('span');
            
            // 设置内容块标识
            span.setAttribute('data-content-block', blockId);
            span.className = 'content-block';
            
            // 注册样式规则
            this.contentBlockManager.registerStyleRule(blockId, styleProperty, styleValue);
            
            // 应用样式
            span.style[styleProperty] = styleValue;
            span.appendChild(fragment);
            range.insertNode(span);
            return;
        }
        
        // 为每个文本节点创建独立的内容块
        textNodes.forEach((textNode, index) => {
            const blockId = this.contentBlockManager.generateBlockId();
            const span = document.createElement('span');
            
            // 设置内容块标识和类名
            span.setAttribute('data-content-block', blockId);
            span.className = 'content-block';
            
            // 继承父元素样式并注册到样式规则映射表
            const parent = textNode.parentNode;
            if (parent && parent.style) {
                const inheritedStyles = ['fontFamily', 'fontSize', 'color', 'backgroundColor', 'textAlign', 'lineHeight'];
                inheritedStyles.forEach(prop => {
                    if (prop !== styleProperty && parent.style[prop]) {
                        this.contentBlockManager.registerStyleRule(blockId, prop, parent.style[prop]);
                        span.style[prop] = parent.style[prop];
                    }
                });
            }
            
            // 注册新的样式规则
            this.contentBlockManager.registerStyleRule(blockId, styleProperty, styleValue);
            span.style[styleProperty] = styleValue;
            
            // 处理嵌套场景：如果父元素也是内容块，建立关联
            let parentBlock = parent;
            while (parentBlock && parentBlock !== document.getElementById('compose-content')) {
                if (parentBlock.hasAttribute('data-content-block')) {
                    span.setAttribute('data-parent-block', parentBlock.getAttribute('data-content-block'));
                    break;
                }
                parentBlock = parentBlock.parentElement;
            }
            
            span.appendChild(textNode.cloneNode(true));
            textNode.parentNode.replaceChild(span, textNode);
        });
        
        range.insertNode(fragment);
    };
    
    // 内容块样式查询方法
    window.ComposeEmail.prototype.getContentBlockStyle = function(blockId, styleProperty) {
        return this.contentBlockManager.getBlockStyles(blockId).get(styleProperty);
    };
    
    // 更新内容块样式
    window.ComposeEmail.prototype.updateContentBlockStyle = function(blockId, styleProperty, styleValue) {
        this.contentBlockManager.registerStyleRule(blockId, styleProperty, styleValue);
        
        // 查找对应的DOM元素并更新样式
        const element = document.querySelector(`[data-content-block="${blockId}"]`);
        if (element) {
            element.style[styleProperty] = styleValue;
        }
    };
    
    // 响应式样式处理 - 处理特殊场景
     window.ComposeEmail.prototype.handleResponsiveStyles = function() {
         const contentBlocks = document.querySelectorAll('.content-block[data-content-block]');
         
         contentBlocks.forEach(block => {
             const blockId = block.getAttribute('data-content-block');
             const parentBlockId = block.getAttribute('data-parent-block');
             
             // 处理嵌套内容块的样式继承
             if (parentBlockId) {
                 const parentStyles = this.contentBlockManager.getBlockStyles(parentBlockId);
                 const currentStyles = this.contentBlockManager.getBlockStyles(blockId);
                 
                 // 合并样式，子块样式优先
                 parentStyles.forEach((value, property) => {
                     if (!currentStyles.has(property)) {
                         this.updateContentBlockStyle(blockId, property, value);
                     }
                 });
             }
         });
     };
     
     // 初始化内容块管理系统
     window.ComposeEmail.prototype.initContentBlockSystem = function() {
         // 添加调试模式切换快捷键 (Ctrl+Shift+D)
         document.addEventListener('keydown', (e) => {
             if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                 e.preventDefault();
                 this.toggleDebugMode();
             }
         });
         
         // 定期检查样式冲突
         setInterval(() => {
             this.detectStyleConflicts();
         }, 5000);
         
         // 监听内容块点击事件
         document.addEventListener('click', (e) => {
             if (e.target.classList.contains('content-block')) {
                 this.selectContentBlock(e.target);
             }
         });
     };
     
     // 切换调试模式
     window.ComposeEmail.prototype.toggleDebugMode = function() {
         const container = document.querySelector('.compose-container');
         if (container) {
             container.classList.toggle('debug-mode');
             const isDebugMode = container.classList.contains('debug-mode');
             console.log(`内容块调试模式: ${isDebugMode ? '开启' : '关闭'}`);
             
             if (isDebugMode) {
                 this.logContentBlockInfo();
             }
         }
     };
     
     // 选中内容块
     window.ComposeEmail.prototype.selectContentBlock = function(blockElement) {
         // 清除其他选中状态
         document.querySelectorAll('.content-block.selected').forEach(block => {
             block.classList.remove('selected');
         });
         
         // 选中当前块
         blockElement.classList.add('selected');
         
         // 输出块信息
         const blockId = blockElement.getAttribute('data-content-block');
         const styles = this.contentBlockManager.getBlockStyles(blockId);
         console.log(`选中内容块: ${blockId}`, Object.fromEntries(styles));
     };
     
     // 检测样式冲突
     window.ComposeEmail.prototype.detectStyleConflicts = function() {
         const contentBlocks = document.querySelectorAll('.content-block[data-content-block]');
         
         contentBlocks.forEach(block => {
             const blockId = block.getAttribute('data-content-block');
             const registeredStyles = this.contentBlockManager.getBlockStyles(blockId);
             const computedStyles = window.getComputedStyle(block);
             
             let hasConflict = false;
             
             // 检查关键样式属性是否一致
             const keyProperties = ['fontFamily', 'fontSize', 'color', 'backgroundColor', 'textAlign'];
             keyProperties.forEach(prop => {
                 const registeredValue = registeredStyles.get(prop);
                 const computedValue = computedStyles[prop];
                 
                 if (registeredValue && registeredValue !== computedValue) {
                     hasConflict = true;
                     console.warn(`样式冲突检测 - 块${blockId}的${prop}: 注册值=${registeredValue}, 计算值=${computedValue}`);
                 }
             });
             
             // 标记冲突状态
             if (hasConflict) {
                 block.classList.add('style-conflict');
             } else {
                 block.classList.remove('style-conflict');
             }
         });
     };
     
     // 输出内容块信息
     window.ComposeEmail.prototype.logContentBlockInfo = function() {
         const contentBlocks = document.querySelectorAll('.content-block[data-content-block]');
         console.group('内容块管理系统信息');
         console.log(`总内容块数量: ${contentBlocks.length}`);
         console.log(`样式规则映射表:`, Object.fromEntries(this.contentBlockManager.styleRules));
         
         contentBlocks.forEach(block => {
             const blockId = block.getAttribute('data-content-block');
             const parentBlockId = block.getAttribute('data-parent-block');
             const styles = this.contentBlockManager.getBlockStyles(blockId);
             
             console.log(`块${blockId}:`, {
                 text: block.textContent.substring(0, 20) + '...',
                 parentBlock: parentBlockId || 'none',
                 styles: Object.fromEntries(styles),
                 element: block
             });
         });
         console.groupEnd();
     };
     
     // 清理无效的内容块
     window.ComposeEmail.prototype.cleanupContentBlocks = function() {
         const registeredBlocks = Array.from(this.contentBlockManager.styleRules.keys());
         const domBlocks = Array.from(document.querySelectorAll('.content-block[data-content-block]'))
             .map(el => el.getAttribute('data-content-block'));
         
         // 清理DOM中不存在的注册块
         registeredBlocks.forEach(blockId => {
             if (!domBlocks.includes(blockId)) {
                 this.contentBlockManager.styleRules.delete(blockId);
                 console.log(`清理无效内容块: ${blockId}`);
             }
         });
     };
     
     // 导出内容块样式配置
     window.ComposeEmail.prototype.exportContentBlockStyles = function() {
         const config = {
             version: '1.0',
             timestamp: new Date().toISOString(),
             blocks: Object.fromEntries(this.contentBlockManager.styleRules)
         };
         
         console.log('内容块样式配置:', JSON.stringify(config, null, 2));
         return config;
     };
     
     // 导入内容块样式配置
     window.ComposeEmail.prototype.importContentBlockStyles = function(config) {
         if (config.version === '1.0' && config.blocks) {
             this.contentBlockManager.styleRules = new Map(Object.entries(config.blocks));
             this.handleResponsiveStyles();
             console.log('内容块样式配置导入成功');
         } else {
             console.error('无效的内容块样式配置格式');
         }
     };

    // 恢复选区
    window.ComposeEmail.prototype.restoreSelection = function(rangeInfo) {
        try {
            const selection = window.getSelection();
            const range = document.createRange();
            
            // 查找对应的节点（可能因为DOM变化而需要重新定位）
            const startNode = this.findCorrespondingNode(rangeInfo.startContainer, rangeInfo.startOffset);
            const endNode = this.findCorrespondingNode(rangeInfo.endContainer, rangeInfo.endOffset);
            
            if (startNode && endNode) {
                // 验证偏移量是否有效
                const validStartOffset = this.validateOffset(startNode.node, startNode.offset);
                const validEndOffset = this.validateOffset(endNode.node, endNode.offset);
                
                range.setStart(startNode.node, validStartOffset);
                range.setEnd(endNode.node, validEndOffset);
                
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } catch (e) {
            console.warn('无法恢复选区:', e);
            // 如果恢复失败，尝试设置一个安全的默认选区
            this.setFallbackSelection();
        }
    };

    // 查找对应的节点
    window.ComposeEmail.prototype.findCorrespondingNode = function(originalNode, originalOffset) {
        const editor = document.getElementById('compose-content');
        if (!editor) return null;
        
        // 如果原节点仍然存在且在编辑器中，验证偏移量后使用
        if (originalNode && editor.contains(originalNode)) {
            const validOffset = this.validateOffset(originalNode, originalOffset);
            return { node: originalNode, offset: validOffset };
        }
        
        // 否则尝试找到第一个文本节点作为fallback
        const walker = document.createTreeWalker(
            editor,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const firstTextNode = walker.nextNode();
        if (firstTextNode) {
            const validOffset = this.validateOffset(firstTextNode, originalOffset);
            return { node: firstTextNode, offset: validOffset };
        }
        
        return { node: editor, offset: 0 };
    };
    
    // 验证偏移量是否有效
    window.ComposeEmail.prototype.validateOffset = function(node, offset) {
        if (!node) return 0;
        
        let maxOffset = 0;
        if (node.nodeType === Node.TEXT_NODE) {
            maxOffset = node.textContent.length;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            maxOffset = node.childNodes.length;
        }
        
        return Math.max(0, Math.min(offset, maxOffset));
    };
    
    // 设置安全的默认选区
    window.ComposeEmail.prototype.setFallbackSelection = function() {
        try {
            const editor = document.getElementById('compose-content');
            if (!editor) return;
            
            const selection = window.getSelection();
            const range = document.createRange();
            
            // 尝试找到第一个文本节点
            const walker = document.createTreeWalker(
                editor,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const firstTextNode = walker.nextNode();
            if (firstTextNode) {
                range.setStart(firstTextNode, 0);
                range.setEnd(firstTextNode, 0);
            } else {
                // 如果没有文本节点，设置到编辑器开始位置
                range.setStart(editor, 0);
                range.setEnd(editor, 0);
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            console.warn('设置默认选区失败:', e);
        }
    };

    // 获取选中内容的样式状态
    window.ComposeEmail.prototype.getSelectionStyles = function() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
            return { fontFamily: '', fontSize: '' };
        }
        
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        // 如果是文本节点，获取其父元素
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }
        
        let foundFontFamily = null;
        let foundFontSize = null;
        
        // 向上查找直到找到有样式的元素或到达编辑器根节点
        while (node && node !== document.getElementById('compose-content')) {
            const computedStyle = window.getComputedStyle(node);
            const fontFamily = node.style.fontFamily || computedStyle.fontFamily;
            const fontSize = node.style.fontSize || computedStyle.fontSize;
            
            // 收集字体信息
            if (!foundFontFamily && fontFamily && fontFamily !== 'inherit' && fontFamily !== 'initial') {
                foundFontFamily = this.normalizeFontFamily(fontFamily);
            }
            
            // 收集字号信息
            if (!foundFontSize && fontSize && fontSize !== 'inherit' && fontSize !== 'initial') {
                foundFontSize = this.normalizeFontSize(fontSize);
            }
            
            // 如果两个都找到了，可以提前返回
            if (foundFontFamily && foundFontSize) {
                return {
                    fontFamily: foundFontFamily,
                    fontSize: foundFontSize
                };
            }
            
            node = node.parentElement;
        }
        
        // 返回找到的样式，如果没找到则使用当前设置的样式
        if (!this.currentStyles) this.initCurrentStyles();
        return {
            fontFamily: foundFontFamily || this.currentStyles.fontFamily,
            fontSize: foundFontSize || this.currentStyles.fontSize
        };
    };

    // 标准化字体名称
    window.ComposeEmail.prototype.normalizeFontFamily = function(fontFamily) {
        if (!fontFamily) return '';
        
        // 移除引号并取第一个字体
        const cleaned = fontFamily.replace(/["']/g, '').split(',')[0].trim();
        
        // 映射常见字体名称
        const fontMap = {
            'SimSun': 'SimSun',
            '宋体': 'SimSun',
            'Microsoft YaHei': 'Microsoft YaHei',
            '微软雅黑': 'Microsoft YaHei',
            'SimHei': 'SimHei',
            '黑体': 'SimHei',
            'Arial': 'Arial'
        };
        
        return fontMap[cleaned] || cleaned;
    };

    // 标准化字号
    window.ComposeEmail.prototype.normalizeFontSize = function(fontSize) {
        if (!fontSize) return '';
        
        // 如果是px单位，直接返回
        if (fontSize.endsWith('px')) {
            return fontSize;
        }
        
        // 如果是pt单位，转换为px（近似）
        if (fontSize.endsWith('pt')) {
            const ptValue = parseFloat(fontSize);
            const pxValue = Math.round(ptValue * 1.33); // 1pt ≈ 1.33px
            return pxValue + 'px';
        }
        
        return fontSize;
    };

    // 应用对齐方式
    window.ComposeEmail.prototype.applyAlignment = function(alignment) {
        const selection = window.getSelection();
        const editor = document.getElementById('compose-content');
        
        if (!editor) return;
        
        let textAlign;
        switch(alignment) {
            case 'justifyLeft':
                textAlign = 'left';
                break;
            case 'justifyCenter':
                textAlign = 'center';
                break;
            case 'justifyRight':
                textAlign = 'right';
                break;
            case 'justifyFull':
                textAlign = 'justify';
                break;
            default:
                textAlign = 'left';
        }
        
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            // 有选中文本，对选中的段落应用对齐
            const range = selection.getRangeAt(0);
            const commonAncestor = range.commonAncestorContainer;
            
            // 找到包含选中内容的所有段落元素
            let container = commonAncestor.nodeType === Node.TEXT_NODE ? 
                           commonAncestor.parentElement : commonAncestor;
            
            // 如果选中内容跨越多个段落，需要处理每个段落
            const paragraphs = [];
            
            if (container.tagName === 'DIV' && container.id === 'compose-content') {
                // 选中内容在编辑器根节点，查找所有相关段落
                const walker = document.createTreeWalker(
                    range.cloneContents(),
                    NodeFilter.SHOW_ELEMENT,
                    {
                        acceptNode: function(node) {
                            return ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName) ?
                                   NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                        }
                    }
                );
                
                let node;
                while (node = walker.nextNode()) {
                    paragraphs.push(node);
                }
            } else {
                // 找到最近的块级元素
                while (container && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(container.tagName)) {
                    container = container.parentElement;
                }
                if (container) {
                    paragraphs.push(container);
                }
            }
            
            // 应用对齐样式到找到的段落
            paragraphs.forEach(p => {
                p.style.textAlign = textAlign;
            });
            
            // 如果没有找到段落，创建一个div包装选中内容
            if (paragraphs.length === 0) {
                const div = document.createElement('div');
                div.style.textAlign = textAlign;
                
                try {
                    range.surroundContents(div);
                } catch (e) {
                    const contents = range.extractContents();
                    div.appendChild(contents);
                    range.insertNode(div);
                }
            }
        } else {
            // 没有选中文本，设置编辑器默认对齐方式
            editor.style.textAlign = textAlign;
        }
    };

    // 切换引用格式
    window.ComposeEmail.prototype.toggleQuote = function() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const blockquote = document.createElement('blockquote');
            blockquote.style.borderLeft = '4px solid #ccc';
            blockquote.style.marginLeft = '0';
            blockquote.style.paddingLeft = '16px';
            blockquote.style.color = '#666';
            
            try {
                range.surroundContents(blockquote);
            } catch (e) {
                const contents = range.extractContents();
                blockquote.appendChild(contents);
                range.insertNode(blockquote);
            }
            
            selection.removeAllRanges();
        }
    };
}