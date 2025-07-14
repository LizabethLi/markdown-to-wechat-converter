// 应用配置文件
const AppConfig = {
    // MathJax 配置
    mathJax: {
        tex: {
            inlineMath: [['$', '$']],
            displayMath: [['$$', '$$']],
            processEscapes: true,
            processEnvironments: true
        },
        svg: {
            fontCache: 'none',
            scale: 1.2,
            minScale: 0.5
        },
        startup: {
            ready: () => {
                MathJax.startup.defaultReady();
                console.log('MathJax loaded and ready');
            }
        }
    },

    // 应用默认配置
    defaults: {
        mode: 'compact', // 默认模式：compact 或 standard
        mathJaxRetryDelay: 200, // MathJax 加载重试延迟
        autoScrollToTop: true // 自动滚动到顶部
    },

    // UI 配置
    ui: {
        copySuccessDisplayTime: 2000, // 复制成功提示显示时间
        tabSwitchDuration: 200 // 标签切换动画时间
    }
};

// 设置 MathJax 全局配置
if (typeof window !== 'undefined') {
    window.MathJax = AppConfig.mathJax;
}

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}

// 浏览器环境下赋值给全局变量
if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;
} 