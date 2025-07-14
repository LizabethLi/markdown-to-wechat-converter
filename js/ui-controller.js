// UI控制器模块
const UIController = {
    // 初始化UI控制器
    init: function() {
        this.bindEvents();
        this.initializeElements();
    },

    // 绑定事件监听器
    bindEvents: function() {
        // 输入框变化事件
        const markdownInput = document.getElementById('markdownInput');
        if (markdownInput) {
            markdownInput.addEventListener('input', () => this.updateOutput());
        }

        // 模式选择事件
        const modeSelect = document.getElementById('modeSelect');
        if (modeSelect) {
            modeSelect.addEventListener('change', () => this.updateOutput());
        }

        // 绑定全局函数到window对象，以便HTML中的onclick可以调用
        window.showTab = this.showTab.bind(this);
        window.copyHtml = this.copyHtml.bind(this);
        window.copyPreview = this.copyPreview.bind(this);
        window.loadExample = this.loadExample.bind(this);
        window.updateOutput = this.updateOutput.bind(this);
    },

    // 初始化元素
    initializeElements: function() {
        // 设置默认模式
        const modeSelect = document.getElementById('modeSelect');
        if (modeSelect && !modeSelect.value) {
            modeSelect.value = AppConfig.defaults.mode;
        }
    },

    // 更新输出
    updateOutput: function() {
        const markdownInput = document.getElementById('markdownInput');
        const modeSelect = document.getElementById('modeSelect');
        const htmlOutput = document.getElementById('htmlOutput');
        const preview = document.getElementById('preview');

        if (!markdownInput || !modeSelect || !htmlOutput || !preview) {
            console.error('Required elements not found');
            return;
        }

        const markdown = markdownInput.value;
        const mode = modeSelect.value;

        try {
            const html = MarkdownConverter.convertMarkdownToWechat(markdown, mode);
            
            htmlOutput.value = html;
            preview.innerHTML = html;
            
            // 自动滚动到预览顶部
            if (AppConfig.defaults.autoScrollToTop) {
                preview.scrollTop = 0;
            }
        } catch (error) {
            console.error('Error converting markdown:', error);
            htmlOutput.value = 'Conversion error: ' + error.message;
            preview.innerHTML = '<p style="color: red;">转换出错：' + error.message + '</p>';
        }
    },

    // 标签切换
    showTab: function(tabName) {
        // 移除所有活动状态
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // 激活选中的标签页
        const clickedTab = event.target;
        clickedTab.classList.add('active');
        
        const targetContent = document.getElementById(tabName + 'Tab');
        if (targetContent) {
            targetContent.classList.add('active');
        }
    },

    // 复制到剪贴板
    copyToClipboard: async function(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    },

    // 显示复制成功状态
    showCopySuccess: function(button, originalText, successText = '✅ 已复制') {
        if (!button) return;
        
        button.textContent = successText;
        button.classList.add('success');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('success');
        }, AppConfig.ui.copySuccessDisplayTime);
    },

    // 复制HTML代码
    copyHtml: async function() {
        const htmlOutput = document.getElementById('htmlOutput');
        const button = document.getElementById('copyHtmlBtn');
        
        if (!htmlOutput || !button) {
            console.error('HTML output or button not found');
            return;
        }

        const html = htmlOutput.value;
        const success = await this.copyToClipboard(html);
        
        if (success) {
            this.showCopySuccess(button, '复制代码');
        } else {
            alert('复制失败，请手动复制');
        }
    },

    // 复制预览样式
    copyPreview: async function() {
        const htmlOutput = document.getElementById('htmlOutput');
        const button = document.getElementById('copyPreviewBtn');
        
        if (!htmlOutput || !button) {
            console.error('HTML output or button not found');
            return;
        }

        const html = htmlOutput.value;
        const success = await this.copyToClipboard(html);
        
        if (success) {
            this.showCopySuccess(button, '复制样式代码');
        } else {
            alert('复制失败，请手动复制');
        }
    },

    // 加载示例
    loadExample: function() {
        const markdownInput = document.getElementById('markdownInput');
        if (!markdownInput) {
            console.error('Markdown input not found');
            return;
        }

        // 从示例数据中获取示例内容
        const exampleContent = typeof ExampleData !== 'undefined' 
            ? ExampleData.getExampleMarkdown() 
            : this.getDefaultExample();

        markdownInput.value = exampleContent;
        this.updateOutput();
        
        // 滚动到输入区域顶部
        markdownInput.scrollTop = 0;
    },

    // 默认示例（如果示例数据模块未加载）
    getDefaultExample: function() {
        return `# AI视觉领域的"铁三角"

## 他们是谁？

**Lucas Beyer、Alexander Kolesnikov 和 Xiaohua Zhai** 被业界称为 AI 视觉领域的"铁三角"。

### Vision Transformer (ViT)：给AI换了副"眼镜"

**原来VS现在**：

- **原来（CNN方式）**：像一个靠放大镜局部查看图像的人
    - CNN 像一个人拿着放大镜在图片上**从左到右、从上到下地滑动观察**
    - 每次只关注图片的**局部区域（小方块）**，从中提取纹理、边缘等信息
    - 多层叠加后，它逐渐构建出对整体图像的理解
- **现在（ViT方式）**：像一个人把整张图切成拼图块，然后"阅读"这些拼图块的关系

> 如果说 AI 是个不断学习的学生，那三位就是陪它从"看不懂图片"到"能看图说话"的老师。

### 数学公式示例

行内公式：$E = mc^2$

块级公式：
$$ x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} $$

\`\`\`javascript
console.log('Hello, WeChat!');
\`\`\`

| 特性 | 传统CNN | ViT |
|---|---|---|
| 核心操作 | 局部卷积 | 全局自注意力 |
| 感受野 | 逐步扩大 | 一开始即全局 |`;
    },

    // 获取当前选择的模式
    getCurrentMode: function() {
        const modeSelect = document.getElementById('modeSelect');
        return modeSelect ? modeSelect.value : AppConfig.defaults.mode;
    },

    // 设置模式
    setMode: function(mode) {
        const modeSelect = document.getElementById('modeSelect');
        if (modeSelect && MarkdownConverter.isValidMode(mode)) {
            modeSelect.value = mode;
            this.updateOutput();
        }
    },

    // 显示错误消息
    showError: function(message) {
        const preview = document.getElementById('preview');
        if (preview) {
            preview.innerHTML = `<p style="color: red; padding: 20px; text-align: center;">错误: ${message}</p>`;
        }
    },

    // 显示加载状态
    showLoading: function() {
        const preview = document.getElementById('preview');
        if (preview) {
            preview.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">正在加载...</p>';
        }
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}

// 浏览器环境下赋值给全局变量
if (typeof window !== 'undefined') {
    window.UIController = UIController;
} 