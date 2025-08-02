// 新邮件功能实现 - 核心类和HTML生成
class ComposeEmail {
    constructor() {
        this.composeTabId = null;
        this.isComposing = false;
        // 初始化当前样式状态
        this.currentStyles = {
            fontFamily: 'default',
            fontSize: 'default',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'left',
            color: '#000000',
            backgroundColor: 'transparent',
            lineHeight: '1'
        };
        this.init();
    }

    init() {
        // 监听新邮件按钮点击事件
        this.bindComposeEvents();
    }

    bindComposeEvents() {
        if (window.emailApp) {
            window.emailApp.handleCompose = () => {
                this.openComposeWindow();
            };
        }
    }

    openComposeWindow() {
        if (this.composeTabId && window.emailApp.emailTabs.has(this.composeTabId)) {
            window.emailApp.switchEmailTab(this.composeTabId);
            return;
        }

        // 使用固定的新邮件标识符
        this.composeTabId = 'create';
        this.isComposing = true;

        // 更新URL参数为新邮件
        const url = new URL(window.location);
        url.searchParams.set('create', '');
        url.searchParams.delete('m');
        url.searchParams.delete('Inbox');
        url.searchParams.delete('litter');
        url.searchParams.delete('Send');
        url.searchParams.delete('draft');
        url.searchParams.delete('Delete');
        url.searchParams.delete('Job');
        url.searchParams.delete('individual');
        url.searchParams.delete('significant');
        window.history.pushState({}, '', url);

        // 创建新邮件标签页数据
        const tabData = {
            id: this.composeTabId,
            subject: '新邮件',
            isCompose: true,
            data: {
                to: '',
                cc: '',
                bcc: '',
                subject: '',
                content: ''
            }
        };

        // 添加到标签页系统
        window.emailApp.addEmailTab(tabData);
        window.emailApp.switchEmailTab(this.composeTabId);

    }

    // 渲染新邮件编辑器界面
    renderComposeEditor() {
        const emailItems = document.getElementById('emailItems');
        if (!emailItems) return;

        // 创建编辑器HTML
        const editorHtml = this.getComposeEditorHtml();
        emailItems.innerHTML = editorHtml;

        // 绑定编辑器事件
        this.bindEditorEvents();
    }

    // 渲染新邮件编辑器到指定容器
    renderComposeEditorToContainer(container) {
        if (!container) return;

        // 创建编辑器HTML
        const editorHtml = this.getComposeEditorHtml();
        container.innerHTML = editorHtml;

        // 绑定编辑器事件
        this.bindEditorEvents();
    }

    // 获取编辑器HTML内容
    getComposeEditorHtml() {
        return `
            <div class="email-detail-header">
                <h3>写新邮件</h3>
            </div>
            <div class="email-detail-content">
                    <div class="compose-form">
                        <div class="compose-field compose-to-field">
                                <label class="compose-label">收件人:</label>
                            <div class="compose-input-container">
                                <input type="email" class="compose-input" id="compose-to" placeholder="请输入收件人邮箱地址" multiple>
                            <div class="compose-actions-inline">
                                <button type="button" class="compose-action-btn" id="show-cc-btn">抄送</button>
                                <span class="compose-divider">|</span>
                                <button type="button" class="compose-action-btn" id="show-bcc-btn">密送</button>
                                <span class="compose-divider">|</span>
                                <button type="button" class="compose-action-btn" id="separate-send-btn">分别发送</button>
                            </div>
                        </div>
                    </div>

                        
                        <div class="compose-field compose-cc-field" id="cc-field" style="display: none;">
                            <label class="compose-label">抄送:</label>
                            <div class="compose-input-container">
                                <input type="email" class="compose-input" id="compose-cc" placeholder="请输入抄送邮箱地址" multiple>
                                <button type="button" class="compose-remove-btn" id="remove-cc-btn" title="移除抄送">${window.VectorIcons.down}</button>
                            </div>
                        </div>
                        
                        <div class="compose-field compose-bcc-field" id="bcc-field" style="display: none;">
                            <label class="compose-label">密送:</label>
                            <div class="compose-input-container">
                                <input type="email" class="compose-input" id="compose-bcc" placeholder="请输入密送邮箱地址" multiple>
                                <button type="button" class="compose-remove-btn" id="remove-bcc-btn" title="移除密送">${window.VectorIcons.down}</button>
                            </div>
                        </div>
                        
                        <div class="compose-field">
                            <label class="compose-label">主题:</label>
                            <input type="text" class="compose-input" id="compose-subject" placeholder="请输入邮件主题">
                        </div>
                        
                        <div class="compose-field compose-content-field">
                            <div class="compose-editor-container">
                                <div class="compose-toolbar">
                                    <!-- 字体设置 -->
                                    <div class="toolbar-dropdown">
                                        <button type="button" class="toolbar-btn dropdown-btn" title="字体">
                                            <span>默认字体</span> ${window.VectorIcons.pulldoen}
                                        </button>
                                        <div class="dropdown-menu" id="font-family-menu">
                                            <div class="dropdown-item" data-font="default">默认字体</div>
                                            <div class="dropdown-item" data-font="Arial">Arial</div>
                                            <div class="dropdown-item" data-font="SimSun">宋体</div>
                                            <div class="dropdown-item" data-font="Microsoft YaHei">微软雅黑</div>
                                            <div class="dropdown-item" data-font="SimHei">黑体</div>
                                        </div>
                                    </div>
                                    
                                    <!-- 字号设置 -->
                                    <div class="toolbar-dropdown">
                                        <button type="button" class="toolbar-btn dropdown-btn" title="字号">
                                            <span>默认字号</span> ${window.VectorIcons.pulldoen}
                                        </button>
                                        <div class="dropdown-menu" id="font-size-menu">
                                            <div class="dropdown-item" data-size="default">默认字号</div>
                                            <div class="dropdown-item" data-size="8px">八号 (8px)</div>
                                            <div class="dropdown-item" data-size="9px">七号 (9px)</div>
                                            <div class="dropdown-item" data-size="10px">小六 (10px)</div>
                                            <div class="dropdown-item" data-size="12px">六号 (12px)</div>
                                            <div class="dropdown-item" data-size="14px">小五 (14px)</div>
                                            <div class="dropdown-item" data-size="16px">五号 (16px)</div>
                                            <div class="dropdown-item" data-size="18px">小四 (18px)</div>
                                            <div class="dropdown-item" data-size="24px">四号 (24px)</div>
                                            <div class="dropdown-item" data-size="28px">小三 (28px)</div>
                                            <div class="dropdown-item" data-size="32px">三号 (32px)</div>
                                            <div class="dropdown-item" data-size="40px">二号 (40px)</div>
                                            <div class="dropdown-item" data-size="48px">一号 (48px)</div>
                                            <div class="dropdown-item" data-size="64px">小初 (64px)</div>
                                            <div class="dropdown-item" data-size="72px">初号 (72px)</div>
                                            <div class="dropdown-item" data-size="6pt">6pt (≈8px)</div>
                                            <div class="dropdown-item" data-size="7pt">7pt (≈9px)</div>
                                            <div class="dropdown-item" data-size="8pt">8pt (≈11px)</div>
                                            <div class="dropdown-item" data-size="9pt">9pt (≈12px)</div>
                                            <div class="dropdown-item" data-size="10pt">10pt (≈13px)</div>
                                            <div class="dropdown-item" data-size="11pt">11pt (≈15px)</div>
                                            <div class="dropdown-item" data-size="12pt">12pt (≈16px)</div>
                                            <div class="dropdown-item" data-size="14pt">14pt (≈19px)</div>
                                            <div class="dropdown-item" data-size="16pt">16pt (≈21px)</div>
                                            <div class="dropdown-item" data-size="18pt">18pt (≈24px)</div>
                                            <div class="dropdown-item" data-size="24pt">24pt (≈32px)</div>
                                            <div class="dropdown-item" data-size="36pt">36pt (≈48px)</div>
                                            <div class="dropdown-item" data-size="48pt">48pt (≈64px)</div>
                                            <div class="dropdown-item" data-size="72pt">72pt (≈96px)</div>
                                        </div>
                                    </div>
                                    
                                    <div class="toolbar-divider"></div>
                                    
                                    <!-- 基础格式 -->
                                      <button type="button" class="toolbar-btn" data-action="bold" title="粗体">
                                          ${window.VectorIcons.Bold}
                                      </button>
                                      <button type="button" class="toolbar-btn" data-action="italic" title="斜体">
                                          ${window.VectorIcons.italic}
                                      </button>
                                      <button type="button" class="toolbar-btn" data-action="underline" title="下划线">
                                          ${window.VectorIcons.underline}
                                      </button>
                                    
                                    <div class="toolbar-divider"></div>
                                    
                                    <!-- 字体颜色 -->
                                    <div class="toolbar-dropdown">
                                        <button type="button" class="toolbar-btn dropdown-btn" title="字体颜色">
                                            <div class="icon-with-color">
                                                ${window.VectorIcons.font}
                                                <div class="color-indicator" id="font-color-indicator" style="background-color: #000000;"></div>
                                            </div>
                                            <span class="dropdown-arrow">${window.VectorIcons.pulldoen}</span>
                                        </button>
                                        <div class="dropdown-menu color-grid-menu" id="font-color-menu">
                                            <div class="color-grid">
                                                <div class="color-item" data-color="#000000" style="background-color: #000000" title="黑色"></div>
                                                <div class="color-item" data-color="#ff0000" style="background-color: #ff0000" title="红色"></div>
                                                <div class="color-item" data-color="#ff8000" style="background-color: #ff8000" title="橙色"></div>
                                                <div class="color-item" data-color="#ffff00" style="background-color: #ffff00" title="黄色"></div>
                                                <div class="color-item" data-color="#00ff00" style="background-color: #00ff00" title="绿色"></div>
                                                <div class="color-item" data-color="#00ffff" style="background-color: #00ffff" title="青色"></div>
                                                <div class="color-item" data-color="#0000ff" style="background-color: #0000ff" title="蓝色"></div>
                                                <div class="color-item" data-color="#8000ff" style="background-color: #8000ff" title="紫色"></div>
                                                <div class="color-item" data-color="#808080" style="background-color: #808080" title="浅黑"></div>
                                                <div class="color-item" data-color="#ff8080" style="background-color: #ff8080" title="浅红"></div>
                                                <div class="color-item" data-color="#ffbf80" style="background-color: #ffbf80" title="浅橙"></div>
                                                <div class="color-item" data-color="#ffff80" style="background-color: #ffff80" title="浅黄"></div>
                                                <div class="color-item" data-color="#80ff80" style="background-color: #80ff80" title="浅绿"></div>
                                                <div class="color-item" data-color="#80ffff" style="background-color: #80ffff" title="浅青"></div>
                                                <div class="color-item" data-color="#8080ff" style="background-color: #8080ff" title="浅蓝"></div>
                                                <div class="color-item" data-color="#bf80ff" style="background-color: #bf80ff" title="浅紫"></div>
                                                <div class="color-item" data-color="#404040" style="background-color: #404040" title="深灰"></div>
                                                <div class="color-item" data-color="#804040" style="background-color: #804040" title="灰红"></div>
                                                <div class="color-item" data-color="#806040" style="background-color: #806040" title="灰橙"></div>
                                                <div class="color-item" data-color="#808040" style="background-color: #808040" title="灰黄"></div>
                                                <div class="color-item" data-color="#408040" style="background-color: #408040" title="灰绿"></div>
                                                <div class="color-item" data-color="#408080" style="background-color: #408080" title="灰青"></div>
                                                <div class="color-item" data-color="#404080" style="background-color: #404080" title="灰蓝"></div>
                                                <div class="color-item" data-color="#604080" style="background-color: #604080" title="灰紫"></div>
                                                <div class="color-item" data-color="#c0c0c0" style="background-color: #c0c0c0" title="浅灰"></div>
                                                <div class="color-item" data-color="#ffc0c0" style="background-color: #ffc0c0" title="浅灰红"></div>
                                                <div class="color-item" data-color="#ffdfc0" style="background-color: #ffdfc0" title="浅灰橙"></div>
                                                <div class="color-item" data-color="#ffffc0" style="background-color: #ffffc0" title="浅灰黄"></div>
                                                <div class="color-item" data-color="#c0ffc0" style="background-color: #c0ffc0" title="浅灰绿"></div>
                                                <div class="color-item" data-color="#c0ffff" style="background-color: #c0ffff" title="浅灰青"></div>
                                                <div class="color-item" data-color="#c0c0ff" style="background-color: #c0c0ff" title="浅灰蓝"></div>
                                                <div class="color-item" data-color="#dfc0ff" style="background-color: #dfc0ff" title="浅灰紫"></div>
                                                <div class="color-item" data-color="#202020" style="background-color: #202020" title="暗黑"></div>
                                                <div class="color-item" data-color="#800000" style="background-color: #800000" title="暗红"></div>
                                                <div class="color-item" data-color="#804000" style="background-color: #804000" title="暗橙"></div>
                                                <div class="color-item" data-color="#808000" style="background-color: #808000" title="暗黄"></div>
                                                <div class="color-item" data-color="#008000" style="background-color: #008000" title="暗绿"></div>
                                                <div class="color-item" data-color="#008080" style="background-color: #008080" title="暗青"></div>
                                                <div class="color-item" data-color="#000080" style="background-color: #000080" title="暗蓝"></div>
                                                <div class="color-item" data-color="#400080" style="background-color: #400080" title="暗紫"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- 背景颜色 -->
                                    <div class="toolbar-dropdown">
                                        <button type="button" class="toolbar-btn dropdown-btn" title="背景颜色">
                                            <div class="icon-with-color">
                                                ${window.VectorIcons.background}
                                                <div class="color-indicator" id="bg-color-indicator" style="background-color: transparent;"></div>
                                            </div>
                                            <span class="dropdown-arrow">${window.VectorIcons.pulldoen}</span>
                                        </button>
                                        <div class="dropdown-menu color-grid-menu" id="bg-color-menu">
                                            <div class="color-grid">
                                                <div class="bg-color-item" data-bgcolor="#000000" style="background-color: #000000" title="黑色"></div>
                                                <div class="bg-color-item" data-bgcolor="#ff0000" style="background-color: #ff0000" title="红色"></div>
                                                <div class="bg-color-item" data-bgcolor="#ff8000" style="background-color: #ff8000" title="橙色"></div>
                                                <div class="bg-color-item" data-bgcolor="#ffff00" style="background-color: #ffff00" title="黄色"></div>
                                                <div class="bg-color-item" data-bgcolor="#00ff00" style="background-color: #00ff00" title="绿色"></div>
                                                <div class="bg-color-item" data-bgcolor="#00ffff" style="background-color: #00ffff" title="青色"></div>
                                                <div class="bg-color-item" data-bgcolor="#0000ff" style="background-color: #0000ff" title="蓝色"></div>
                                                <div class="bg-color-item" data-bgcolor="#8000ff" style="background-color: #8000ff" title="紫色"></div>
                                                <div class="bg-color-item" data-bgcolor="#808080" style="background-color: #808080" title="浅黑"></div>
                                                <div class="bg-color-item" data-bgcolor="#ff8080" style="background-color: #ff8080" title="浅红"></div>
                                                <div class="bg-color-item" data-bgcolor="#ffbf80" style="background-color: #ffbf80" title="浅橙"></div>
                                                <div class="bg-color-item" data-bgcolor="#ffff80" style="background-color: #ffff80" title="浅黄"></div>
                                                <div class="bg-color-item" data-bgcolor="#80ff80" style="background-color: #80ff80" title="浅绿"></div>
                                                <div class="bg-color-item" data-bgcolor="#80ffff" style="background-color: #80ffff" title="浅青"></div>
                                                <div class="bg-color-item" data-bgcolor="#8080ff" style="background-color: #8080ff" title="浅蓝"></div>
                                                <div class="bg-color-item" data-bgcolor="#bf80ff" style="background-color: #bf80ff" title="浅紫"></div>
                                                <div class="bg-color-item" data-bgcolor="#404040" style="background-color: #404040" title="深灰"></div>
                                                <div class="bg-color-item" data-bgcolor="#804040" style="background-color: #804040" title="灰红"></div>
                                                <div class="bg-color-item" data-bgcolor="#806040" style="background-color: #806040" title="灰橙"></div>
                                                <div class="bg-color-item" data-bgcolor="#808040" style="background-color: #808040" title="灰黄"></div>
                                                <div class="bg-color-item" data-bgcolor="#408040" style="background-color: #408040" title="灰绿"></div>
                                                <div class="bg-color-item" data-bgcolor="#408080" style="background-color: #408080" title="灰青"></div>
                                                <div class="bg-color-item" data-bgcolor="#404080" style="background-color: #404080" title="灰蓝"></div>
                                                <div class="bg-color-item" data-bgcolor="#604080" style="background-color: #604080" title="灰紫"></div>
                                                <div class="bg-color-item" data-bgcolor="#c0c0c0" style="background-color: #c0c0c0" title="浅灰"></div>
                                                <div class="bg-color-item" data-bgcolor="#ffc0c0" style="background-color: #ffc0c0" title="浅灰红"></div>
                                                <div class="bg-color-item" data-bgcolor="#ffdfc0" style="background-color: #ffdfc0" title="浅灰橙"></div>
                                                <div class="bg-color-item" data-bgcolor="#ffffc0" style="background-color: #ffffc0" title="浅灰黄"></div>
                                                <div class="bg-color-item" data-bgcolor="#c0ffc0" style="background-color: #c0ffc0" title="浅灰绿"></div>
                                                <div class="bg-color-item" data-bgcolor="#c0ffff" style="background-color: #c0ffff" title="浅灰青"></div>
                                                <div class="bg-color-item" data-bgcolor="#c0c0ff" style="background-color: #c0c0ff" title="浅灰蓝"></div>
                                                <div class="bg-color-item" data-bgcolor="#dfc0ff" style="background-color: #dfc0ff" title="浅灰紫"></div>
                                                <div class="bg-color-item" data-bgcolor="#202020" style="background-color: #202020" title="暗黑"></div>
                                                <div class="bg-color-item" data-bgcolor="#800000" style="background-color: #800000" title="暗红"></div>
                                                <div class="bg-color-item" data-bgcolor="#804000" style="background-color: #804000" title="暗橙"></div>
                                                <div class="bg-color-item" data-bgcolor="#808000" style="background-color: #808000" title="暗黄"></div>
                                                <div class="bg-color-item" data-bgcolor="#008000" style="background-color: #008000" title="暗绿"></div>
                                                <div class="bg-color-item" data-bgcolor="#008080" style="background-color: #008080" title="暗青"></div>
                                                <div class="bg-color-item" data-bgcolor="#000080" style="background-color: #000080" title="暗蓝"></div>
                                                <div class="bg-color-item" data-bgcolor="#400080" style="background-color: #400080" title="暗紫"></div>
                                            </div>
                                            <div class="bg-no-color-section">
                                                <div class="bg-no-color-item" data-bgcolor="transparent" title="无背景色">无背景色</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="toolbar-divider"></div>
                                    
                                    <!-- 对齐方式 -->
                                    <div class="toolbar-dropdown">
                                        <button type="button" class="toolbar-btn dropdown-btn" title="对齐方式">
                                            ${window.VectorIcons.Alignment} ${window.VectorIcons.pulldoen}
                                        </button>
                                        <div class="dropdown-menu" id="align-menu">
                                            <div class="dropdown-item" data-action="justifyLeft">
                                                ${window.VectorIcons.Leftalignment} 左对齐
                                            </div>
                                            <div class="dropdown-item" data-action="justifyCenter">
                                                ${window.VectorIcons.Centeralignment} 居中对齐
                                            </div>
                                            <div class="dropdown-item" data-action="justifyRight">
                                                ${window.VectorIcons.Rightalignment} 右对齐
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- 列表 -->
                                    <button type="button" class="toolbar-btn" data-action="insertUnorderedList" title="项目编号">
                                        ${window.VectorIcons.UnorderedList}
                                    </button>
                                    <button type="button" class="toolbar-btn" data-action="insertOrderedList" title="数字编号">
                                        ${window.VectorIcons.ThereIsAnOrderList}
                                    </button>
                                    
                                    <!-- 缩进 -->
                                    <button type="button" class="toolbar-btn" data-action="indent" title="增加缩进">
                                        ${window.VectorIcons.indent}
                                    </button>
                                    <button type="button" class="toolbar-btn" data-action="outdent" title="减少缩进">
                                        ${window.VectorIcons.decrease}
                                    </button>
                                    
                                    <div class="toolbar-divider"></div>
                                    
                                    <!-- 行间距 -->
                                    <div class="toolbar-dropdown">
                                        <button type="button" class="toolbar-btn dropdown-btn" title="行间距">
                                            ${window.VectorIcons.lineSpacing} ${window.VectorIcons.pulldoen}
                                        </button>
                                        <div class="dropdown-menu" id="line-height-menu">
                                            <div class="dropdown-item" data-height="1">单倍行距</div>
                                            <div class="dropdown-item" data-height="1.15">1.15倍行距</div>
                                            <div class="dropdown-item" data-height="1.5">1.5倍行距</div>
                                            <div class="dropdown-item" data-height="2">2倍行距</div>
                                            <div class="dropdown-item" data-height="2.5">2.5倍行距</div>
                                            <div class="dropdown-item" data-height="3">3倍行距</div>
                                        </div>
                                    </div>
                                    
                                    <div class="toolbar-divider"></div>
                                    
                                    <!-- 插入分割线 -->
                                    <button type="button" class="toolbar-btn" id="insert-hr-btn" title="插入分割线">
                                        ${window.VectorIcons.Dividingline}
                                    </button>
                                    
                                    <!-- 插入图片 -->
                                    <button type="button" class="toolbar-btn" id="insert-image-btn" title="插入图片">
                                        ${window.VectorIcons.insertimag}
                                    </button>
                                    
                                    <!-- 插入链接 -->
                                    <button type="button" class="toolbar-btn" id="insert-link-btn" title="插入链接">
                                        ${window.VectorIcons.insertlink}
                                    </button>
                                     
                                     <!-- 附件 -->
                                     <button type="button" class="toolbar-btn" id="attach-file-btn" title="添加附件">
                                         ${window.VectorIcons.annex}
                                     </button>
                                     
                                     <!-- 隐藏的文件输入 -->
                                     <input type="file" id="image-file-input" accept="image/*" style="display: none;">
                                     <input type="file" id="attachment-file-input" multiple style="display: none;">
                                </div>
                                <div class="compose-editor" id="compose-content" contenteditable="true" placeholder="请输入邮件内容..."></div>
                            </div>
                        </div>
                        
                        <div class="compose-actions">
                            <button type="button" class="compose-btn-primary" id="send-email">发送</button>
                            <button type="button" class="compose-btn-secondary" id="save-draft">保存草稿</button>
                            <button type="button" class="compose-btn-secondary" id="discard-email">丢弃</button>
                        </div>
                    </div>
                </div>
        `;
    }
}

// 导出到全局作用域
window.ComposeEmail = ComposeEmail;