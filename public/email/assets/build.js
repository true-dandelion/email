document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.emailApp && window.ComposeEmail) {
            window.composeEmail = new ComposeEmail();
        } else {
            console.error('初始化失败：缺少必要的依赖模块');
        }
    }, 100);
});

// 导出全局变量以保持兼容性
if (typeof window !== 'undefined') {
    window.ComposeEmail = window.ComposeEmail || null;
    window.composeEmail = window.composeEmail || null;
    window.createCustomModal = window.createCustomModal || null;
}