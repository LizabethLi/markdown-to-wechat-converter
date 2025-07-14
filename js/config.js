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

    // 主题色配置
    themes: {
        purple: {
            name: '经典紫色',
            primary: '#7E3AF2',
            description: '优雅专业'
        },
        blue: {
            name: '商务蓝色', 
            primary: '#2563EB',
            description: '商务正式'
        },
        orange: {
            name: '活力橙色',
            primary: '#EA580C', 
            description: '活泼创新'
        },
        green: {
            name: '自然绿色',
            primary: '#16A34A',
            description: '清新自然'
        },
        red: {
            name: '激情红色',
            primary: '#DC2626',
            description: '热情活力'
        },
        cyan: {
            name: '深海蓝',
            primary: '#0891B2',
            description: '稳重深沉'
        }
    },

    // 应用默认配置
    defaults: {
        mode: 'compact', // 默认模式：compact 或 standard
        theme: 'purple', // 默认主题
        mathJaxRetryDelay: 200, // MathJax 加载重试延迟
        autoScrollToTop: true // 自动滚动到顶部
    },

    // UI 配置
    ui: {
        copySuccessDisplayTime: 2000, // 复制成功提示显示时间
        tabSwitchDuration: 200, // 标签切换动画时间
        themeTransitionDuration: 300 // 主题切换动画时间
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