if (window.ComposeEmail) {
    window.ComposeEmail.prototype.initCurrentStyles = function() {
        this.currentStyles = {};
    };
    
    window.ComposeEmail.prototype.bindEditorEvents = function() {
        this.initCurrentStyles();
        document.querySelectorAll('.toolbar-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                
                if (action === 'quote') {
                    this.toggleQuote();
                } else if (['bold', 'italic', 'underline'].includes(action)) {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const styleProperty = action === 'bold' ? 'fontWeight' : 
                                              action === 'italic' ? 'fontStyle' : 'textDecoration';
                        const currentValue = this.getSelectionStyle(styleProperty);
                        const styleValue = currentValue === (action === 'bold' ? 'bold' : action) ? '' : 
                                           (action === 'bold' ? 'bold' : action);
                        this.applyStyleToSelection(range, styleProperty, styleValue);
                    }
                } else if (action === 'fontFamily' || action === 'fontSize' || action === 'fontColor' || action === 'bgColor') {
                    // 这些样式由对应的下拉菜单处理
                } else {
                      document.execCommand(action, false, null);
                  }
            });
        });

        this.bindDropdownEvents();        
        this.bindFileEvents();        
        // 确保在DOM加载完成后绑定链接事件
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindLinkEvents();
            });
        } else {
            this.bindLinkEvents();
        }
        this.bindHrEvent();

        
        const sendBtn = document.getElementById('send-email');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendEmail();
            });
        }

        const saveDraftBtn = document.getElementById('save-draft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => {
                this.saveDraft();
            });
        }

        const discardBtn = document.getElementById('discard-email');
        if (discardBtn) {
            discardBtn.addEventListener('click', () => {
                this.discardEmail();
            });
        }

        const subjectInput = document.getElementById('compose-subject');
        if (subjectInput) {
            subjectInput.addEventListener('input', (e) => {
                const title = e.target.value || '新邮件';
                this.updateTabTitle(title);
            });
        }

        const showCcBtn = document.getElementById('show-cc-btn');
        if (showCcBtn) {
            showCcBtn.addEventListener('click', () => {
                const ccField = document.getElementById('cc-field');
                if (ccField) {
                    ccField.style.display = 'flex';
                }
            });
        }

        const showBccBtn = document.getElementById('show-bcc-btn');
        if (showBccBtn) {
            showBccBtn.addEventListener('click', () => {
                const bccField = document.getElementById('bcc-field');
                if (bccField) {
                    bccField.style.display = 'flex';
                }
            });
        }

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
        
        const separateSendBtn = document.getElementById('separate-send-btn');
        if (separateSendBtn) {
            separateSendBtn.addEventListener('click', () => {
                alert('分别发送功能暂未实现');
            });
        }
        
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
            
            this.bindInputEvents(contentEditor);
        }

        this.bindSelectionEvents();

        this.initContentBlockSystem();
    };

    window.ComposeEmail.prototype.bindInputEvents = function(contentEditor) {
        contentEditor.addEventListener('input', (e) => {
            this.handleInputEvent(e);
        });

        contentEditor.addEventListener('keydown', (e) => {
            this.handleKeydownEvent(e);
        });

        contentEditor.addEventListener('paste', (e) => {
            this.handlePasteEvent(e);
        });
        
        contentEditor.addEventListener('compositionstart', (e) => {
            this.isComposing = true;
        });
        
        contentEditor.addEventListener('compositionend', (e) => {
            this.isComposing = false;
            this.handleInputEvent(e);
        });
    };
    window.ComposeEmail.prototype.handleInputEvent = function(e) {
        if (this.isComposing) return; 
    };
    
    window.ComposeEmail.prototype.handleKeydownEvent = function(e) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        if (e.key === 'Backspace' || e.key === 'Delete') {
            this.handleDeleteKey(e);
        }

        if (e.key === 'Enter') {
            this.handleEnterKey(e);
        }
    };
    
    window.ComposeEmail.prototype.handleDeleteKey = function(e) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        if (!range.collapsed) return;
        
        const container = range.startContainer;
        const offset = range.startOffset;
        
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
            if (container.nodeType === Node.TEXT_NODE && 
                ((e.key === 'Backspace' && offset === 0) || 
                 (e.key === 'Delete' && offset === container.textContent.length))) {
                
                if (container.textContent.length === 1) {
                    e.preventDefault();
                    container.textContent = '';
                    return;
                }
            }
        }
    };
    
    window.ComposeEmail.prototype.handleEnterKey = function(e) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        
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
            e.preventDefault();
            
            const br = document.createElement('br');
            range.insertNode(br);
       
            range.setStartAfter(br);
            range.setEndAfter(br);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    };

    window.ComposeEmail.prototype.handlePasteEvent = function(e) {
        e.preventDefault();
        
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        
        // 获取粘贴内容
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('text/plain');
        
        // 统一处理粘贴
        range.deleteContents();
        range.insertNode(document.createTextNode(pastedText));
        range.collapse(false);
    };
    
    window.ComposeEmail.prototype.maintainBlockStyles = function(contentBlock, blockStyles) {
        if (!contentBlock || !blockStyles) return;

        blockStyles.forEach((value, property) => {
            contentBlock.style[property] = value;
        });
        
        if (!contentBlock.classList.contains('content-block')) {
            contentBlock.classList.add('content-block');
        }
    };



    window.ComposeEmail.prototype.bindSelectionEvents = function() {
        const contentEditor = document.getElementById('compose-content');
        if (!contentEditor) return;
        
        this.isMouseInside = false;
        this.savedSelection = null;
    
        contentEditor.addEventListener('mouseenter', () => {
            this.isMouseInside = true;
            if (this.savedSelection) {
                this.restoreSelection(this.savedSelection);
                this.savedSelection = null;
            }
        });
        
        contentEditor.addEventListener('mouseleave', () => {
            this.isMouseInside = false;
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

        document.addEventListener('mousemove', (e) => {
            if (!this.isMouseInside) {
                const rect = contentEditor.getBoundingClientRect();
                const isInBounds = e.clientX >= rect.left && e.clientX <= rect.right &&
                                 e.clientY >= rect.top && e.clientY <= rect.bottom;

                if (isInBounds) {
                    this.isMouseInside = true;
                    if (this.savedSelection) {
                        this.restoreSelection(this.savedSelection);
                        this.savedSelection = null;
                    }
                }
            }
        });

        contentEditor.addEventListener('mouseup', () => this.updateDropdownDisplay());
        contentEditor.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
                e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
                e.key === 'Shift' || e.shiftKey) {
                this.updateDropdownDisplay();
            }
        });
        
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const isInEditor = contentEditor.contains(range.commonAncestorContainer) || 
                                 contentEditor === range.commonAncestorContainer;
                
                if (isInEditor) {
                    this.updateDropdownDisplay();
                    
                    this.savedSelection = {
                        startContainer: range.startContainer,
                        startOffset: range.startOffset,
                        endContainer: range.endContainer,
                        endOffset: range.endOffset
                    };
                }
            }
        });
        
        contentEditor.addEventListener('mousedown', (e) => {
            this.isMouseInside = true;
        });
    };

    window.ComposeEmail.prototype.updateDropdownDisplay = function() {
    };

    window.ComposeEmail.prototype.saveCurrentSelection = function() {
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
    };

    window.ComposeEmail.prototype.bindDropdownEvents = function() {        
        const alignItems = document.querySelectorAll('#align-menu .dropdown-item');
        alignItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.applyAlignment(action);
                const menu = document.getElementById('align-menu');
                if (menu) menu.classList.remove('show');
            });
        });

        const lineHeightItems = document.querySelectorAll('#line-height-menu .dropdown-item');
        lineHeightItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const height = e.target.getAttribute('data-height');
                this.applyLineHeight(height);
                const menu = document.getElementById('line-height-menu');
                if (menu) menu.classList.remove('show');
            });
        });

        // 字体选择
        const fontItems = document.querySelectorAll('#font-family-menu .dropdown-item');
        fontItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const font = e.target.getAttribute('data-font');
                this.applyFontFamily(font);
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
                const menu = document.getElementById('font-size-menu');
                if (menu) menu.classList.remove('show');
            });
        });

        // 字体颜色
        const fontColorItems = document.querySelectorAll('#font-color-menu .color-item');
        fontColorItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const color = e.target.getAttribute('data-color');
                this.applyFontColor(color);
                const menu = document.getElementById('font-color-menu');
                if (menu) menu.classList.remove('show');
                
                // 更新颜色指示器
                const indicator = document.getElementById('font-color-indicator');
                if (indicator) {
                    indicator.style.backgroundColor = color;
                }
            });
        });

        // 背景颜色
        const bgColorItems = document.querySelectorAll('#bg-color-menu .bg-color-item, #bg-color-menu .bg-no-color-item');
        bgColorItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const color = e.target.getAttribute('data-bgcolor') || e.target.getAttribute('data-color');
                this.applyBackgroundColor(color);
                const menu = document.getElementById('bg-color-menu');
                if (menu) menu.classList.remove('show');
                
                // 更新颜色指示器
                const indicator = document.getElementById('bg-color-indicator');
                if (indicator) {
                    indicator.style.backgroundColor = color;
                }
            });
        });
        
        document.querySelectorAll('.dropdown-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 在打开下拉菜单前保存当前选区
                this.saveCurrentSelection();
                
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    if (menu !== btn.nextElementSibling) {
                        menu.classList.remove('show');
                    }
                });
                
                const menu = btn.nextElementSibling;
                if (menu) {
                    menu.classList.toggle('show');
                }
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.toolbar-dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    };


    window.ComposeEmail.prototype.applyLineHeight = function(lineHeight) {
        const editor = document.getElementById('compose-content');
        if (editor) {
            editor.style.lineHeight = lineHeight;
        }
    };

    window.ComposeEmail.prototype.applyFontFamily = function(fontFamily) {
        const selection = window.getSelection();
        if (this.savedSelection) {
            const range = document.createRange();
            range.setStart(this.savedSelection.startContainer, this.savedSelection.startOffset);
            range.setEnd(this.savedSelection.endContainer, this.savedSelection.endOffset);
            this.applyStyleToSelection(range, 'fontFamily', fontFamily);
        } else if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            this.applyStyleToSelection(range, 'fontFamily', fontFamily);
        }
    };

    window.ComposeEmail.prototype.applyFontSize = function(fontSize) {
        const selection = window.getSelection();
        let fontSizeValue = fontSize;
        if (!fontSize.endsWith('px') && !fontSize.endsWith('pt')) {
            fontSizeValue = fontSize + 'px';
        }
        if (this.savedSelection) {
            const range = document.createRange();
            range.setStart(this.savedSelection.startContainer, this.savedSelection.startOffset);
            range.setEnd(this.savedSelection.endContainer, this.savedSelection.endOffset);
            this.applyStyleToSelection(range, 'fontSize', fontSizeValue);
        } else if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            this.applyStyleToSelection(range, 'fontSize', fontSizeValue);
        }
    };

    window.ComposeEmail.prototype.applyFontColor = function(color) {
        const selection = window.getSelection();
        let range = null;
        
        if (this.savedSelection) {
            range = document.createRange();
            range.setStart(this.savedSelection.startContainer, this.savedSelection.startOffset);
            range.setEnd(this.savedSelection.endContainer, this.savedSelection.endOffset);
        } else if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        }
        
        if (range && range.toString().trim()) {
            this.applyStyleToSelection(range, 'color', color);
        } else {
            alert('请先选中文本后再设置字体颜色');
        }
    };

    window.ComposeEmail.prototype.applyBackgroundColor = function(color) {
        const selection = window.getSelection();
        let range = null;
        
        if (this.savedSelection) {
            range = document.createRange();
            range.setStart(this.savedSelection.startContainer, this.savedSelection.startOffset);
            range.setEnd(this.savedSelection.endContainer, this.savedSelection.endOffset);
        } else if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        }
        
        if (range && range.toString().trim()) {
            this.applyStyleToSelection(range, 'backgroundColor', color);
        } else {
            alert('请先选中文本后再设置背景颜色');
        }
    };
    window.ComposeEmail.prototype.contentBlockManager = {
        blockCounter: 0,
        
        styleRules: new Map(),
        
        generateBlockId: function() {
            return `content-block-${++this.blockCounter}`;
        },
        
        registerStyleRule: function(blockId, styleProperty, styleValue) {
            if (!this.styleRules.has(blockId)) {
                this.styleRules.set(blockId, new Map());
            }
            this.styleRules.get(blockId).set(styleProperty, styleValue);
        },
        
        getBlockStyles: function(blockId) {
            return this.styleRules.get(blockId) || new Map();
        },
        
        applyStylesToElement: function(element, blockId) {
            const styles = this.getBlockStyles(blockId);
            styles.forEach((value, property) => {
                element.style[property] = value;
            });
        }
    };
    
    window.ComposeEmail.prototype.applyStyleToSelection = function(range, styleProperty, styleValue) {
        
        const commonAncestor = range.commonAncestorContainer;
        let container = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentElement : commonAncestor;

        let existingSpan = null;
        let currentNode = range.startContainer;
        while (currentNode && currentNode !== container.parentElement) {
            if (currentNode.nodeType === Node.ELEMENT_NODE && 
                currentNode.tagName === 'SPAN' && 
                currentNode.hasAttribute('data-content-block')) {
                existingSpan = currentNode;
                break;
            }
            currentNode = currentNode.parentElement;
        }
        
        if (!existingSpan) {
            // 检查选区内的所有内容块
            const spans = [];
            const walker = document.createTreeWalker(
                range.commonAncestorContainer,
                NodeFilter.SHOW_ELEMENT,
                { acceptNode: function(node) {
                    if (node.tagName === 'SPAN' && node.hasAttribute('data-content-block')) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }},
                false
            );
            
            let node;
            while (node = walker.nextNode()) {
                if (range.intersectsNode(node)) {
                    spans.push(node);
                }
            }
            
            if (spans.length > 0) {
                existingSpan = spans[0];
            }
        }
        
        if (existingSpan) {
            // 在现有内容块上追加样式
            const blockId = existingSpan.getAttribute('data-content-block');
            this.contentBlockManager.registerStyleRule(blockId, styleProperty, styleValue);
            existingSpan.style[styleProperty] = styleValue;
            return;
        }
        
        // 如果没有现有内容块，创建新的
        const fragment = range.extractContents();
        const textContent = fragment.textContent;
        
        if (textContent.trim()) {
            const blockId = this.contentBlockManager.generateBlockId();
            const span = document.createElement('span');
            
            span.setAttribute('data-content-block', blockId);
            span.setAttribute('wude', Date.now().toString());
            span.className = 'content-block';
            
            this.contentBlockManager.registerStyleRule(blockId, styleProperty, styleValue);
            span.style[styleProperty] = styleValue;
            span.style.display = 'inline-block';
            span.appendChild(document.createTextNode(textContent));
            
            range.insertNode(span);
        }
    };
    
    window.ComposeEmail.prototype.getContentBlockStyle = function(blockId, styleProperty) {
        return this.contentBlockManager.getBlockStyles(blockId).get(styleProperty);
    };
    
    window.ComposeEmail.prototype.updateContentBlockStyle = function(blockId, styleProperty, styleValue) {
        this.contentBlockManager.registerStyleRule(blockId, styleProperty, styleValue);
        
        const element = document.querySelector(`[data-content-block="${blockId}"]`);
        if (element) {
            element.style[styleProperty] = styleValue;
        }
    };
    
     window.ComposeEmail.prototype.handleResponsiveStyles = function() {
         const contentBlocks = document.querySelectorAll('.content-block[data-content-block]');
         
         contentBlocks.forEach(block => {
             const blockId = block.getAttribute('data-content-block');
             const parentBlockId = block.getAttribute('data-parent-block');
             
             if (parentBlockId) {
                 const parentStyles = this.contentBlockManager.getBlockStyles(parentBlockId);
                 const currentStyles = this.contentBlockManager.getBlockStyles(blockId);
                 
                 parentStyles.forEach((value, property) => {
                     if (!currentStyles.has(property)) {
                         this.updateContentBlockStyle(blockId, property, value);
                     }
                 });
             }
         });
     };
     
     window.ComposeEmail.prototype.initContentBlockSystem = function() {
         document.addEventListener('keydown', (e) => {
             if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                 e.preventDefault();
                 this.toggleDebugMode();
             }
         });
         
         setInterval(() => {
             this.detectStyleConflicts();
         }, 5000);
         
         document.addEventListener('click', (e) => {
             if (e.target.classList.contains('content-block')) {
                 this.selectContentBlock(e.target);
             }
         });
     };
     
     window.ComposeEmail.prototype.toggleDebugMode = function() {
         const container = document.querySelector('.compose-container');
         if (container) {
             container.classList.toggle('debug-mode');
             const isDebugMode = container.classList.contains('debug-mode');
             
             if (isDebugMode) {
                 this.logContentBlockInfo();
             }
         }
     };
     
     window.ComposeEmail.prototype.selectContentBlock = function(blockElement) {
         document.querySelectorAll('.content-block.selected').forEach(block => {
             block.classList.remove('selected');
         });
         
         blockElement.classList.add('selected');
         
         const blockId = blockElement.getAttribute('data-content-block');
         const styles = this.contentBlockManager.getBlockStyles(blockId);
     };
     
     window.ComposeEmail.prototype.detectStyleConflicts = function() {
         const contentBlocks = document.querySelectorAll('.content-block[data-content-block]');
         
         contentBlocks.forEach(block => {
             const blockId = block.getAttribute('data-content-block');
             const registeredStyles = this.contentBlockManager.getBlockStyles(blockId);
             const computedStyles = window.getComputedStyle(block);
             
             let hasConflict = false;
             
            const keyProperties = ['color', 'backgroundColor', 'textAlign'];
            keyProperties.forEach(prop => {
                const registeredValue = registeredStyles.get(prop);
                const computedValue = computedStyles[prop];
                
                // 标准化颜色值进行比较
                const normalizedRegistered = this.normalizeColorValue(registeredValue);
                const normalizedComputed = this.normalizeColorValue(computedValue);
                
                if (registeredValue && normalizedRegistered !== normalizedComputed) {
                    hasConflict = true;
                    console.warn(`样式冲突检测 - 块${blockId}的${prop}: 注册值=${registeredValue}, 计算值=${computedValue}`);
                }
            });
             
             if (hasConflict) {
                 block.classList.add('style-conflict');
             } else {
                 block.classList.remove('style-conflict');
             }
         });
     };
     
     window.ComposeEmail.prototype.normalizeColorValue = function(colorValue) {
         if (!colorValue || colorValue === 'transparent') {
             return colorValue;
         }
         
         // 如果是rgb格式，转换为hex格式
         if (colorValue.startsWith('rgb')) {
             const rgb = colorValue.match(/\d+/g);
             if (rgb && rgb.length >= 3) {
                 const hex = '#' + rgb.slice(0, 3).map(x => {
                     const hex = parseInt(x).toString(16);
                     return hex.length === 1 ? '0' + hex : hex;
                 }).join('');
                 return hex.toLowerCase();
             }
         }
         
         // 如果是hex格式，转为小写
         if (colorValue.startsWith('#')) {
             return colorValue.toLowerCase();
         }
         
         return colorValue;
     };
     
     window.ComposeEmail.prototype.logContentBlockInfo = function() {
         const contentBlocks = document.querySelectorAll('.content-block[data-content-block]');
         
         contentBlocks.forEach(block => {
             const blockId = block.getAttribute('data-content-block');
             const parentBlockId = block.getAttribute('data-parent-block');
             const styles = this.contentBlockManager.getBlockStyles(blockId);
         });
         console.groupEnd();
     };
     
 

    window.ComposeEmail.prototype.restoreSelection = function(rangeInfo) {
        try {
            const selection = window.getSelection();
            const range = document.createRange();
            
            const startNode = this.findCorrespondingNode(rangeInfo.startContainer, rangeInfo.startOffset);
            const endNode = this.findCorrespondingNode(rangeInfo.endContainer, rangeInfo.endOffset);
            
            if (startNode && endNode) {
                const validStartOffset = this.validateOffset(startNode.node, startNode.offset);
                const validEndOffset = this.validateOffset(endNode.node, endNode.offset);
                
                range.setStart(startNode.node, validStartOffset);
                range.setEnd(endNode.node, validEndOffset);
                
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } catch (e) {
            console.warn('无法恢复选区:', e);
            this.setFallbackSelection();
        }
    };

    window.ComposeEmail.prototype.findCorrespondingNode = function(originalNode, originalOffset) {
        const editor = document.getElementById('compose-content');
        if (!editor) return null;
        
        if (originalNode && editor.contains(originalNode)) {
            const validOffset = this.validateOffset(originalNode, originalOffset);
            return { node: originalNode, offset: validOffset };
        }
        
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
    
    window.ComposeEmail.prototype.setFallbackSelection = function() {
        try {
            const editor = document.getElementById('compose-content');
            if (!editor) return;
            
            const selection = window.getSelection();
            const range = document.createRange();
            
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
                range.setStart(editor, 0);
                range.setEnd(editor, 0);
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            console.warn('设置默认选区失败:', e);
        }
    };

    window.ComposeEmail.prototype.getSelectionStyle = function(styleProperty) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
            return '';
        }
        
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }
        
        while (node && node !== document.getElementById('compose-content')) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const computedStyle = window.getComputedStyle(node);
                const styleValue = node.style[styleProperty] || computedStyle[styleProperty];
                
                if (styleValue && styleValue !== 'inherit' && styleValue !== 'initial') {
                    return styleValue;
                }
            }
            
            node = node.parentElement;
        }
        
        return '';
    };

    // 在光标位置插入链接 - 已移动到buildsan.js
    window.ComposeEmail.prototype.insertLinkAtCursor = function(url, text) {
        // 功能已移至buildsan.js，此处保留空方法避免错误
    };

    // 在光标位置插入图片 - 已移动到buildsan.js
    window.ComposeEmail.prototype.insertImageAtCursor = function(src, alt) {
        // 功能已移至buildsan.js，此处保留空方法避免错误
    };

    // 使图片可拖拽调整
    window.ComposeEmail.prototype.makeImageDraggable = function(img) {
        let isDragging = false;
        let startX, startY, startWidth, startHeight;
        
        // 创建拖拽手柄
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: #007bff;
            border: 1px solid #fff;
            cursor: se-resize;
            display: none;
            z-index: 1000;
        `;
        
        if (img.parentNode) {
            img.parentNode.style.position = 'relative';
            img.parentNode.appendChild(resizeHandle);
        } else {
            // 如果图片还没有父节点，添加到编辑器中
            const editor = document.getElementById('compose-content');
            if (editor) {
                editor.style.position = 'relative';
                editor.appendChild(resizeHandle);
            }
        }

        img.addEventListener('mouseenter', () => {
            const rect = img.getBoundingClientRect();
            const parentRect = img.parentNode ? img.parentNode.getBoundingClientRect() : rect;
            resizeHandle.style.display = 'block';
            resizeHandle.style.left = (rect.right - parentRect.left - 5) + 'px';
            resizeHandle.style.top = (rect.bottom - parentRect.top - 5) + 'px';
        });
        
        img.addEventListener('mouseleave', (e) => {
            if (!isDragging && !resizeHandle.contains(e.relatedTarget)) {
                resizeHandle.style.display = 'none';
            }
        });
        
        // 拖拽开始
        resizeHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = img.offsetWidth;
            startHeight = img.offsetHeight;
            
            e.preventDefault();
        });
        
        // 拖拽中
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newWidth = Math.max(50, startWidth + deltaX);
            const newHeight = Math.max(50, startHeight + deltaY);
            
            img.style.width = newWidth + 'px';
            img.style.height = newHeight + 'px';
            
            // 更新拖拽手柄位置
            const rect = img.getBoundingClientRect();
            const parentRect = img.parentNode ? img.parentNode.getBoundingClientRect() : rect;
            resizeHandle.style.left = (rect.right - parentRect.left - 5) + 'px';
            resizeHandle.style.top = (rect.bottom - parentRect.top - 5) + 'px';
        });
        
        // 拖拽结束
        document.addEventListener('mouseup', () => {
            isDragging = false;
            resizeHandle.style.display = 'none';
        });
    };

    // 绑定插入链接和图片的事件 - 已移动到buildsan.js
    window.ComposeEmail.prototype.bindInsertEvents = function() {
        // 功能已移至buildsan.js，此处保留空方法避免错误
    };

    // 显示链接对话框 - 已移动到buildsan.js
    window.ComposeEmail.prototype.showLinkDialog = function() {
        // 功能已移至buildsan.js，此处保留空方法避免错误
    };

    // 初始化插入事件
    if (window.ComposeEmail && window.ComposeEmail.prototype.bindEditorEvents) {
        const originalBindEditorEvents = window.ComposeEmail.prototype.bindEditorEvents;
        window.ComposeEmail.prototype.bindEditorEvents = function() {
            originalBindEditorEvents.call(this);
            this.bindInsertEvents();
        };
    }
    
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
            const range = selection.getRangeAt(0);
            const commonAncestor = range.commonAncestorContainer;
            
            let container = commonAncestor.nodeType === Node.TEXT_NODE ? 
                           commonAncestor.parentElement : commonAncestor;
            
            const paragraphs = [];
            
            if (container.tagName === 'DIV' && container.id === 'compose-content') {
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
                while (container && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(container.tagName)) {
                    container = container.parentElement;
                }
                if (container) {
                    paragraphs.push(container);
                }
            }
            
            paragraphs.forEach(p => {
                p.style.textAlign = textAlign;
            });
            
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
            editor.style.textAlign = textAlign;
        }
    };

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

