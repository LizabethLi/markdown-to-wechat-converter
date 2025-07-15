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

    // 语法高亮配置
    syntaxHighlighting: {
        enabled: true,
        
        // 主题特定的语法高亮配色
        themeStyles: {
            purple: {
                background: '#f8f9fa',
                border: '#e9ecef',
                text: '#333333',
                keyword: '#7E3AF2',
                string: '#0969da',
                comment: '#6a737d',
                number: '#e36209',
                function: '#8250df',
                variable: '#953800'
            },
            blue: {
                background: '#f6f8fa',
                border: '#d0d7de',
                text: '#24292f',
                keyword: '#2563EB',
                string: '#0969da',
                comment: '#6a737d',
                number: '#0550ae',
                function: '#8250df',
                variable: '#953800'
            },
            orange: {
                background: '#fff8f0',
                border: '#fdba74',
                text: '#333333',
                keyword: '#EA580C',
                string: '#0969da',
                comment: '#6a737d',
                number: '#dc2626',
                function: '#7c3aed',
                variable: '#059669'
            },
            green: {
                background: '#f0fdf4',
                border: '#86efac',
                text: '#333333',
                keyword: '#16A34A',
                string: '#0369a1',
                comment: '#6b7280',
                number: '#dc2626',
                function: '#7c3aed',
                variable: '#0891b2'
            },
            red: {
                background: '#fef2f2',
                border: '#fca5a5',
                text: '#333333',
                keyword: '#DC2626',
                string: '#0969da',
                comment: '#6a737d',
                number: '#ea580c',
                function: '#7c3aed',
                variable: '#059669'
            },
            cyan: {
                background: '#ecfeff',
                border: '#67e8f9',
                text: '#333333',
                keyword: '#0891B2',
                string: '#0969da',
                comment: '#6a737d',
                number: '#dc2626',
                function: '#7c3aed',
                variable: '#059669'
            }
        },

        // 常用语言映射
        languageMap: {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'rb': 'ruby',
            'go': 'go',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'sql': 'sql',
            'sh': 'bash',
            'bash': 'bash',
            'zsh': 'bash',
            'ps1': 'powershell'
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