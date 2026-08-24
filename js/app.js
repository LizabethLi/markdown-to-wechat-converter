// 主应用入口模块
const App = {
    // 应用状态
    isInitialized: false,
    modules: {
        mathRenderer: null,
        markdownConverter: null,
        uiController: null
    },

    // 初始化应用
    init: function() {
        console.log('Starting Markdown to WeChat Converter...');
        
        // 检查依赖
        if (!this.checkDependencies()) {
            console.error('Missing required dependencies');
            this.showError('缺少必要的依赖库');
            return;
        }

        // 初始化模块
        this.initializeModules();
        
        // 等待MathJax加载完成后启动应用
        this.waitForMathJaxAndStart();
    },

    // 检查依赖
    checkDependencies: function() {
        const required = [
            { name: 'marked', obj: window.marked },
            { name: 'WechatStyles', obj: window.WechatStyles },
            { name: 'MathRenderer', obj: window.MathRenderer },
            { name: 'MarkdownConverter', obj: window.MarkdownConverter },
            { name: 'UIController', obj: window.UIController },
            { name: 'AppConfig', obj: window.AppConfig }
        ];

        const missing = required.filter(dep => !dep.obj);
        if (missing.length > 0) {
            console.error('Missing dependencies:', missing.map(dep => dep.name));
            return false;
        }

        return true;
    },

    // 初始化模块
    initializeModules: function() {
        try {
            // 保存模块引用
            this.modules.mathRenderer = MathRenderer;
            this.modules.markdownConverter = MarkdownConverter;
            this.modules.uiController = UIController;

            console.log('Modules initialized successfully');
        } catch (error) {
            console.error('Error initializing modules:', error);
            this.showError('模块初始化失败');
        }
    },

    // 等待MathJax加载并启动应用
    waitForMathJaxAndStart: function() {
        // 显示加载状态
        this.showLoading();

        // 等待MathJax准备就绪
        MathRenderer.waitForMathJax(() => {
            this.startApplication();
        });
    },

    // 启动应用
    startApplication: function() {
        try {
            // 初始化UI控制器
            UIController.init();

            // 在页面基础能力准备好后注册 WebMCP tools（如果浏览器支持）
            if (typeof window !== 'undefined' && window.WebMCPTools && typeof window.WebMCPTools.init === 'function') {
                window.WebMCPTools.init();
            }
            
            // 标记应用已初始化
            this.isInitialized = true;
            
            // 执行初始渲染
            this.performInitialRender();
            
            console.log('Application started successfully');
        } catch (error) {
            console.error('Error starting application:', error);
            this.showError('应用启动失败');
        }
    },

    // 执行初始渲染
    performInitialRender: function() {
        // 如果输入框有内容，进行渲染
        const markdownInput = document.getElementById('markdownInput');
        if (markdownInput && markdownInput.value.trim()) {
            UIController.updateOutput();
        } else {
            // 否则清空预览区域
            this.clearPreview();
        }
    },

    // 清空预览
    clearPreview: function() {
        const preview = document.getElementById('preview');
        const htmlOutput = document.getElementById('htmlOutput');
        
        if (preview) {
            preview.innerHTML = `
                <div class="preview-empty-state">
                    <div class="preview-empty-content">
                        <p class="preview-empty-title">从一篇 Markdown 开始</p>
                        <p class="preview-empty-text">在左侧粘贴或输入内容，右侧会立即生成当前渠道的发布预览。</p>
                        <div class="preview-empty-actions">
                            <button type="button" class="preview-empty-example" onclick="loadExample()">加载示例</button>
                        </div>
                        <div class="preview-capabilities" aria-label="支持能力">
                            <span class="preview-capability">复杂公式</span>
                            <span class="preview-capability">Mermaid 图表</span>
                            <span class="preview-capability">图文复制</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (htmlOutput) {
            htmlOutput.value = '';
        }
    },

    // 显示加载状态
    showLoading: function() {
        const preview = document.getElementById('preview');
        if (preview) {
            preview.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <p style="font-size: 16px;">🔄 正在加载数学公式渲染器...</p>
                    <p style="font-size: 14px; margin-top: 10px;">请稍候片刻</p>
                </div>
            `;
        }
    },

    // 显示错误
    showError: function(message) {
        const preview = document.getElementById('preview');
        if (preview) {
            preview.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <p style="font-size: 16px;">❌ ${message}</p>
                    <p style="font-size: 14px; margin-top: 10px;">请刷新页面重试</p>
                </div>
            `;
        }
    },

    // 获取应用状态
    getStatus: function() {
        return {
            initialized: this.isInitialized,
            mathJaxReady: MathRenderer.isMathJaxReady(),
            modules: Object.keys(this.modules).reduce((status, key) => {
                status[key] = this.modules[key] !== null;
                return status;
            }, {})
        };
    },

    // 重新初始化应用
    reinitialize: function() {
        console.log('Reinitializing application...');
        this.isInitialized = false;
        this.init();
    },

    // 应用销毁清理
    destroy: function() {
        console.log('Destroying application...');
        
        // 清理事件监听器
        const markdownInput = document.getElementById('markdownInput');
        if (markdownInput) {
            markdownInput.removeEventListener('input', UIController.updateOutput);
        }

        const modeSelect = document.getElementById('modeSelect');
        if (modeSelect) {
            modeSelect.removeEventListener('change', UIController.updateOutput);
        }

        // 清理全局函数
        if (typeof window !== 'undefined') {
            delete window.copyPreview;
            delete window.loadExample;
            delete window.updateOutput;
        }

        // 清理 WebMCP tools
        if (typeof window !== 'undefined' && window.WebMCPTools && typeof window.WebMCPTools.destroy === 'function') {
            window.WebMCPTools.destroy();
        }

        // 重置状态
        this.isInitialized = false;
        this.modules = {
            mathRenderer: null,
            markdownConverter: null,
            uiController: null
        };

        console.log('Application destroyed');
    }
};

// 文档加载完成后初始化应用
function initializeApp() {
    if (typeof MathJax !== 'undefined' && MathJax.tex2svg) {
        console.log('MathJax is already ready, starting app immediately');
        App.init();
    } else {
        // 如果 MathJax 还没加载，等待一下再试
        setTimeout(() => {
            App.init();
        }, 100);
    }
}

// 启动应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// 导出应用对象（用于调试和扩展）
if (typeof window !== 'undefined') {
    window.App = App;
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
