// 图标管理系统
// 从ico.js导入所有图标

// 创建图标注入函数
function injectIconsToCSS() {
    // 检查VectorIcons是否已加载
    if (typeof window.VectorIcons === 'undefined') {
        console.warn('VectorIcons not loaded yet');
        return;
    }

    const icons = window.VectorIcons;
    const style = document.createElement('style');
    style.id = 'vector-icons-css';
    
    let cssContent = `
        /* 图标基础样式 */
        .icon-base {
            display: inline-block;
            width: 16px;
            height: 16px;
            vertical-align: middle;
        }
        
        .icon-base svg {
            width: 100%;
            height: 100%;
            fill: currentColor;
        }
        
        /* 导航项图标样式 */
        .nav-item-icon {
            width: 18px;
            height: 18px;
            margin-right: 8px;
            flex-shrink: 0;
        }
        
        .nav-item-icon svg {
            width: 100%;
            height: 100%;
            fill: currentColor;
        }
        
        /* 通过CSS变量定义图标 */
        :root {
    `;
    
    // 为每个图标创建CSS变量
    Object.keys(icons).forEach(iconName => {
        const encodedSvg = encodeURIComponent(icons[iconName])
            .replace(/'/g, "%27")
            .replace(/"/g, "%22");
        cssContent += `
            --icon-${iconName}: url("data:image/svg+xml,${encodedSvg}");`;
    });
    
    cssContent += `
        }
        
        /* 图标类 */
    `;
    
    // 为每个图标创建CSS类
    Object.keys(icons).forEach(iconName => {
        cssContent += `
        .icon-${iconName}::before {
            content: "";
            display: inline-block;
            width: 16px;
            height: 16px;
            background-image: var(--icon-${iconName});
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            vertical-align: middle;
            margin-right: 4px;
        }
        
        .nav-icon-${iconName}::before {
            content: "";
            display: inline-block;
            width: 18px;
            height: 18px;
            background-image: var(--icon-${iconName});
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            vertical-align: middle;
            margin-right: 8px;
            flex-shrink: 0;
        }`;
    });
    
    cssContent += `
        
        /* 特殊尺寸图标 */
        .icon-small::before {
            width: 12px !important;
            height: 12px !important;
        }
        
        .icon-medium::before {
            width: 20px !important;
            height: 20px !important;
        }
        
        .icon-large::before {
            width: 24px !important;
            height: 24px !important;
        }
        
        /* 图标颜色变体 */
        .icon-primary::before {
            filter: hue-rotate(210deg) saturate(1.5);
        }
        
        .icon-success::before {
            filter: hue-rotate(120deg) saturate(1.2);
        }
        
        .icon-warning::before {
            filter: hue-rotate(45deg) saturate(1.3);
        }
        
        .icon-danger::before {
            filter: hue-rotate(0deg) saturate(1.4);
        }
        
        .icon-muted::before {
            opacity: 0.6;
            filter: grayscale(0.5);
        }
    `;
    
    style.textContent = cssContent;
    
    // 移除旧的样式（如果存在）
    const existingStyle = document.getElementById('vector-icons-css');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // 添加新样式到head
    document.head.appendChild(style);
}

// 创建图标元素的辅助函数
function createIconElement(iconName, className = '') {
    if (typeof window.VectorIcons === 'undefined' || !window.VectorIcons[iconName]) {
        console.warn(`Icon '${iconName}' not found`);
        return null;
    }
    
    const iconContainer = document.createElement('span');
    iconContainer.className = `icon-base ${className}`;
    iconContainer.innerHTML = window.VectorIcons[iconName];
    
    return iconContainer;
}

// 为导航项添加图标的辅助函数
function addNavIcon(element, iconName) {
    if (typeof window.VectorIcons === 'undefined' || !window.VectorIcons[iconName]) {
        console.warn(`Icon '${iconName}' not found`);
        return;
    }
    
    const iconContainer = document.createElement('span');
    iconContainer.className = 'nav-item-icon';
    iconContainer.innerHTML = window.VectorIcons[iconName];
    
    // 插入到元素的开头
    element.insertBefore(iconContainer, element.firstChild);
}

// 图标映射配置
const ICON_MAPPING = {
    '收件箱': 'Receive',
    '垃圾邮件': 'litter',
    '已发送': 'send',
    '草稿箱': 'draft',
    '已删除': 'dele',
    '工作': 'work',
    '个人': 'personal',
    '重要': 'important',
    '新邮件': 'newly',
    '标记': 'mark',
    '固定': 'fixed',
    '删除': 'deleteIcon',
    '设置': 'set'
};

// 根据文本获取对应图标
function getIconByText(text) {
    return ICON_MAPPING[text] || null;
}

// 自动为导航项添加图标
function autoAddNavIcons() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const textElement = item.querySelector('.nav-text');
        if (textElement) {
            const text = textElement.textContent.trim();
            const iconName = getIconByText(text);
            
            if (iconName && !item.querySelector('.nav-item-icon')) {
                addNavIcon(item, iconName);
            }
        }
    });
}

// 导出函数到全局
window.IconManager = {
    injectIconsToCSS,
    createIconElement,
    addNavIcon,
    autoAddNavIcons,
    getIconByText,
    ICON_MAPPING
};

// 页面加载完成后自动注入CSS
document.addEventListener('DOMContentLoaded', () => {
    // 等待ico.js加载完成
    setTimeout(() => {
        injectIconsToCSS();
        autoAddNavIcons();
    }, 100);
});

// 如果VectorIcons已经存在，立即注入
if (typeof window.VectorIcons !== 'undefined') {
    injectIconsToCSS();
}