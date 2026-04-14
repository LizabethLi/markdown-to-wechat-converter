// UI控制器模块
const UIController = {
    currentTheme: null,
    customColor: null, // 新增：自定义颜色
    currentChannel: 'wechat',
    renderTaskToken: 0,

    // 初始化应用
    init: function() {
        this.bindEvents();
        this.initializeElements();
        this.loadThemeFromStorage();
        this.initSyntaxHighlighting();
    },

    // 初始化语法高亮
    initSyntaxHighlighting: function() {
        // 检查 highlight.js 是否可用
        if (typeof hljs !== 'undefined') {
            // 配置 highlight.js
            hljs.configure({
                languages: ['javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby', 'go', 'typescript', 'html', 'css', 'sql', 'bash', 'json', 'xml', 'yaml'],
                ignoreUnescapedHTML: true
            });
            console.log('Syntax highlighting initialized with highlight.js');
        } else {
            console.warn('highlight.js not found, syntax highlighting disabled');
        }
    },

    // 绑定事件监听器
    bindEvents: function() {
        // 输入框变化事件
        const markdownInput = document.getElementById('markdownInput');
        if (markdownInput) {
            markdownInput.addEventListener('input', () => this.updateOutput());
        }

        // 渠道选择事件
        const channelSelect = document.getElementById('channelSelect');
        if (channelSelect) {
            channelSelect.addEventListener('change', (e) => {
                this.handleChannelChange(e.target.value);
            });
        }

        // 模板选择事件
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                if (typeof TemplateManager !== 'undefined') {
                    TemplateManager.setActive(e.target.value);
                }
                this.updateOutput();
            });
        }

        // 移除模式选择事件（已删除）

        // 点击外部关闭主题面板
        document.addEventListener('click', (e) => {
            const themePanel = document.getElementById('themePanel');
            const themeButton = document.getElementById('themeButton');
            if (themePanel && !themePanel.contains(e.target) && e.target !== themeButton) {
                themePanel.style.display = 'none';
            }
            const translatorPanel = document.getElementById('translatorPanel');
            const translatorButton = document.getElementById('translatorButton');
            if (translatorPanel && !translatorPanel.contains(e.target) && e.target !== translatorButton) {
                translatorPanel.style.display = 'none';
            }
        });

        // 绑定全局函数到window对象，以便HTML中的onclick可以调用
        window.showTab = this.showTab.bind(this);
        window.copyHtml = this.copyHtml.bind(this);
        window.copyPreview = this.copyPreview.bind(this);
        window.loadExample = this.loadExample.bind(this);
        window.updateOutput = this.updateOutput.bind(this);
        window.toggleThemePanel = this.toggleThemePanel.bind(this);
        window.selectTheme = this.selectTheme.bind(this);
        // 翻译设置
        window.toggleTranslatorPanel = this.toggleTranslatorPanel.bind(this);
        window.saveTranslatorSettings = this.saveTranslatorSettings.bind(this);
    },

    // 初始化元素
    initializeElements: function() {
        // 已移除模式选择器

        // 设置默认渠道
        const channelSelect = document.getElementById('channelSelect');
        if (channelSelect) {
            if (!channelSelect.value) {
                channelSelect.value = 'wechat';
            }
            this.currentChannel = channelSelect.value;
        } else {
            this.currentChannel = 'wechat';
        }

        // 设置默认主题
        if (!this.currentTheme) {
            this.currentTheme = AppConfig.defaults.theme;
        }
        this.updateThemeUI();
        // 加载翻译设置
        this.loadTranslatorSettingsFromStorage();
        // 加载模板列表
        this.populateTemplateOptions();
        // 更新渠道提醒状态
        this.updateChannelReminder(this.currentChannel);
        this.updateCopyButtonLabels();
    },

    handleChannelChange: function(channel) {
        this.currentChannel = channel || 'wechat';
        this.updateChannelReminder(this.currentChannel);
        this.updateCopyButtonLabels();
        this.updateOutput();
    },

    updateChannelReminder: function(channel) {
        const reminderEl = document.getElementById('channelReminder');
        if (!reminderEl) return;
        const shouldShowReminder = channel === 'github' && !this.hasTranslatorConfiguration();
        if (shouldShowReminder) {
            reminderEl.textContent = 'Github channel可以进行翻译，请在设置中填写 OpenRouter API Key 和 System Prompt，否则 Github 输出会出现中文重复。';
            reminderEl.classList.add('show');
        } else {
            reminderEl.classList.remove('show');
        }
    },

    hasTranslatorConfiguration: function() {
        const cfg = AppConfig.translation || {};
        const key = (cfg.openrouter && cfg.openrouter.apiKey && cfg.openrouter.apiKey.trim()) || this.safeReadLocalStorage('openrouter_api_key');
        const prompt = this.safeReadLocalStorage('translation_system_prompt') || (cfg.systemPrompt && cfg.systemPrompt.trim()) || '';
        return !!(key && prompt);
    },

    safeReadLocalStorage: function(key) {
        try {
            const value = localStorage.getItem(key);
            return value && value.trim() ? value.trim() : '';
        } catch (_) {
            return '';
        }
    },

    modelPresets: [
        'openai/gpt-4o-mini',
        'google/gemini-1.5-flash-latest',
        'deepseek/deepseek-chat'
    ],

    onTranslatorModelChange: function() {
        const select = document.getElementById('translatorModelSelect');
        const customInput = document.getElementById('translatorModelCustom');
        const hint = document.getElementById('translatorModelCustomHint');
        if (!select || !customInput) return;
        if (select.value === 'custom') {
            customInput.style.display = 'block';
            customInput.focus();
            if (hint) {
                hint.style.display = 'block';
            }
        } else {
            customInput.style.display = 'none';
            if (hint) {
                hint.style.display = 'none';
            }
        }
    },

    applyModelSelection: function(modelId) {
        const select = document.getElementById('translatorModelSelect');
        const customInput = document.getElementById('translatorModelCustom');
        const hint = document.getElementById('translatorModelCustomHint');
        if (!select || !customInput) return;
        const presets = this.modelPresets;
        if (presets.includes(modelId)) {
            select.value = modelId;
            customInput.style.display = 'none';
            if (hint) {
                hint.style.display = 'none';
            }
        } else {
            select.value = 'custom';
            customInput.style.display = 'block';
            customInput.value = modelId || '';
            if (hint) {
                hint.style.display = 'block';
            }
        }
    },

    // 填充模板选择器
    populateTemplateOptions: function() {
        const select = document.getElementById('templateSelect');
        if (!select || typeof TemplateManager === 'undefined') return;
        // Ensure we respect any stored active template after all templates are registered
        try { TemplateManager.loadFromStorage(); } catch (_) {}
        // 清空现有
        select.innerHTML = '';
        const list = TemplateManager.list();
        if (!list.length) {
            // 至少提供默认项（后备）
            const opt = document.createElement('option');
            opt.value = 'wechat-default';
            opt.textContent = '默认模板';
            select.appendChild(opt);
            select.value = 'wechat-default';
            return;
        }
        list.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name || t.id;
            select.appendChild(opt);
        });
        // 选中当前激活模板
        select.value = TemplateManager.activeId;
    },

    // 从本地存储加载主题
    loadThemeFromStorage: function() {
        try {
            var savedTheme = localStorage.getItem('wechat-converter-theme');
            if (savedTheme === 'custom') {
                var customColor = localStorage.getItem('wechat-converter-custom-color');
                if (UIController.isValidColor(customColor)) {
                    this.currentTheme = 'custom';
                    this.customColor = customColor;
                } else {
                    this.currentTheme = AppConfig.defaults.theme;
                }
            } else if (savedTheme && AppConfig.themes[savedTheme]) {
                this.currentTheme = savedTheme;
            }
        } catch (e) {
            console.warn('Failed to load theme from localStorage:', e);
        }
    },

    // 翻译设置：显示/隐藏
    toggleTranslatorPanel: function() {
        const panel = document.getElementById('translatorPanel');
        if (!panel) return;
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
    },

    // 翻译设置：加载
    loadTranslatorSettingsFromStorage: function() {
        try {
            const keyInput = document.getElementById('translatorApiKey');
            const promptInput = document.getElementById('translatorSystemPrompt');

            const cfg = AppConfig.translation || {};
            const openCfg = cfg.openrouter || {};
            const configKey = openCfg.apiKey && openCfg.apiKey.trim();
            const storedKey = this.safeReadLocalStorage('openrouter_api_key');
            const key = storedKey || configKey || '';
            if (keyInput) keyInput.value = key;
            if (key) {
                AppConfig.translation.mode = 'direct';
                if (!AppConfig.translation.openrouter) AppConfig.translation.openrouter = {};
                AppConfig.translation.openrouter.apiKey = key;
            }

            const configModel = (openCfg.model && openCfg.model.trim()) || '';
            const storedModel = this.safeReadLocalStorage('openrouter_model');
            const defaultModel = this.modelPresets[0] || 'openrouter/auto';
            const model = storedModel || configModel || defaultModel;
            if (!AppConfig.translation.openrouter) AppConfig.translation.openrouter = {};
            AppConfig.translation.openrouter.model = model;
            this.applyModelSelection(model);

            const storedPrompt = this.safeReadLocalStorage('translation_system_prompt');
            const configPrompt = cfg.systemPrompt && cfg.systemPrompt.trim();
            const prompt = storedPrompt || configPrompt || '';
            if (promptInput) promptInput.value = prompt;
            if (prompt) {
                AppConfig.translation.systemPrompt = prompt;
            }
            this.updateChannelReminder(this.currentChannel);
        } catch (e) {
            console.warn('Failed to load translator settings:', e);
        }
    },

    // 翻译设置：保存
    saveTranslatorSettings: function() {
        try {
            const keyInput = document.getElementById('translatorApiKey');
            const promptInput = document.getElementById('translatorSystemPrompt');
            const modelSelect = document.getElementById('translatorModelSelect');
            const modelCustomInput = document.getElementById('translatorModelCustom');

            const key = keyInput ? keyInput.value.trim() : '';
            const prompt = promptInput ? promptInput.value.trim() : '';

            let model = '';
            if (modelSelect) {
                const selected = modelSelect.value;
                if (selected === 'custom') {
                    model = modelCustomInput ? modelCustomInput.value.trim() : '';
                } else {
                    model = selected.trim();
                }
            }
            if (!model) {
                model = this.modelPresets[0] || 'openrouter/auto';
            }

            // 保存到本地
            localStorage.setItem('openrouter_api_key', key);
            localStorage.setItem('translation_system_prompt', prompt);
            localStorage.setItem('openrouter_model', model);

            // 应用配置
            if (!AppConfig.translation) AppConfig.translation = {};
            if (!AppConfig.translation.openrouter) AppConfig.translation.openrouter = {};
            AppConfig.translation.openrouter.apiKey = key;
            AppConfig.translation.openrouter.model = model;
            AppConfig.translation.systemPrompt = prompt;
            if (key) {
                AppConfig.translation.mode = 'direct';
            } else if (AppConfig.translation.mode === 'direct') {
                AppConfig.translation.mode = 'disabled';
            }
            this.updateChannelReminder(this.currentChannel);
            // 关闭面板
            const panel = document.getElementById('translatorPanel');
            if (panel) panel.style.display = 'none';
            // 重新渲染（可能在 Substack/GitHub）
            this.updateOutput();
        } catch (e) {
            console.error('Failed to save translator settings:', e);
            alert('保存失败，请重试');
        }
    },

    // 保存主题到本地存储
    saveThemeToStorage: function() {
        try {
            localStorage.setItem('wechat-converter-theme', this.currentTheme);
            if (this.currentTheme === 'custom' && this.customColor) {
                localStorage.setItem('wechat-converter-custom-color', this.customColor);
            }
        } catch (e) {
            console.warn('Failed to save theme to localStorage:', e);
        }
    },

    // 切换主题面板显示/隐藏
    toggleThemePanel: function() {
        const themePanel = document.getElementById('themePanel');
        if (themePanel) {
            const isVisible = themePanel.style.display !== 'none';
            themePanel.style.display = isVisible ? 'none' : 'block';
        }
    },

    // 选择主题
    selectTheme: function(themeKey) {
        if (!AppConfig.themes[themeKey]) {
            console.error('Unknown theme:', themeKey);
            return;
        }

        this.currentTheme = themeKey;
        this.saveThemeToStorage();
        this.updateThemeUI();
        this.updateOutput();
        
        // 关闭主题面板
        const themePanel = document.getElementById('themePanel');
        if (themePanel) {
            themePanel.style.display = 'none';
        }
    },

    // 更新主题UI显示
    updateThemeUI: function() {
        // 更新所有主题选项的激活状态
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            const themeKey = option.getAttribute('data-theme');
            if (themeKey === this.currentTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        // 更新主题按钮的颜色提示
        const themeButton = document.getElementById('themeButton');
        if (themeButton && AppConfig.themes[this.currentTheme]) {
            const themeColor = AppConfig.themes[this.currentTheme].primary;
            themeButton.style.borderColor = themeColor;
        }

        // 高亮自定义颜色
        var input = document.getElementById('customColorInput');
        var preview = document.getElementById('customColorPreview');
        if (input && preview) {
            if (this.currentTheme === 'custom' && this.customColor) {
                input.value = this.customColor;
                preview.style.background = this.customColor;
                preview.style.borderColor = this.customColor;
            } else {
                input.value = '';
                preview.style.background = '#fff';
                preview.style.borderColor = '#ddd';
            }
        }
    },

    // 获取当前主题色，支持自定义
    getCurrentThemeColor: function() {
        if (this.currentTheme === 'custom' && this.customColor) {
            return this.customColor;
        }
        if (this.currentTheme && AppConfig.themes[this.currentTheme]) {
            return AppConfig.themes[this.currentTheme].primary;
        }
        return AppConfig.themes[AppConfig.defaults.theme].primary;
    },

    // 更新输出
    updateOutput: async function() {
        const markdownInput = document.getElementById('markdownInput');
        const channelSelect = document.getElementById('channelSelect');
        const htmlOutput = document.getElementById('htmlOutput');
        const preview = document.getElementById('preview');

        if (!markdownInput || !htmlOutput || !preview) {
            console.error('Required elements not found');
            return;
        }

        const markdown = markdownInput.value;
        const channel = channelSelect ? channelSelect.value : 'wechat';
        const themeColor = this.getCurrentThemeColor();
        this.currentChannel = channel;
        this.updateChannelReminder(channel);
        const taskToken = ++this.renderTaskToken;

        try {
            if (channel === 'wechat') {
                if (markdown.includes('```mermaid') && typeof MarkdownConverter.hasMermaidSupport === 'function' && MarkdownConverter.hasMermaidSupport()) {
                    this.showLoading();
                }
                const html = await MarkdownConverter.convertMarkdownToWechat(markdown, AppConfig.defaults.mode, themeColor);
                if (taskToken !== this.renderTaskToken) {
                    return;
                }
                htmlOutput.value = html;
                preview.innerHTML = html;
                // 预览样式切换
                preview.classList.add('wechat-preview');
                preview.classList.remove('markdown-preview');
                // 切换代码标签标题为 HTML
                const codeBtn = document.getElementById('codeTabButton');
                const codeTitle = document.getElementById('codeTabTitle');
                if (codeBtn) codeBtn.textContent = '📄 HTML代码';
                if (codeTitle) codeTitle.textContent = '📋 HTML 代码 (可滚动查看)';
            } else if (channel === 'github') {
                this.showLoading();
                const combinedMd = await ChannelConverter.convertToGithub(markdown);
                if (taskToken !== this.renderTaskToken) {
                    return;
                }
                htmlOutput.value = combinedMd; // For GitHub channel, textarea holds Markdown
                // Render preview as HTML using marked
                preview.innerHTML = marked(combinedMd);
                this.typesetMath(preview);
                // 预览样式切换
                preview.classList.add('markdown-preview');
                preview.classList.remove('wechat-preview');
                // 切换代码标签标题为 Markdown
                const codeBtn = document.getElementById('codeTabButton');
                const codeTitle = document.getElementById('codeTabTitle');
                if (codeBtn) codeBtn.textContent = '📄 Markdown';
                if (codeTitle) codeTitle.textContent = '📋 Markdown 代码 (可滚动查看)';
            }
            this.updateCopyButtonLabels();
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

    typesetMath: function(container) {
        if (!container) return;
        if (typeof MathRenderer !== 'undefined' && typeof MathRenderer.isMathJaxReady === 'function') {
            if (!MathRenderer.isMathJaxReady()) return;
        }
        if (typeof MathJax === 'undefined') return;

        const clear = typeof MathJax.typesetClear === 'function'
            ? () => MathJax.typesetClear([container])
            : null;

        try {
            if (clear) clear();
            if (typeof MathJax.typesetPromise === 'function') {
                MathJax.typesetPromise([container]).catch(err => console.error('MathJax typeset error:', err));
            } else if (typeof MathJax.typeset === 'function') {
                MathJax.typeset([container]);
            }
        } catch (error) {
            console.error('Failed to typeset math in preview:', error);
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

        this.updateCopyButtonLabels();
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

    getCopyPreviewButtonLabel: function() {
        const channel = this.getCurrentChannel();
        if (channel === 'wechat') {
            return '复制样式';
        }
        return '复制 Markdown';
    },

    getCopyHtmlButtonLabel: function() {
        const channel = this.getCurrentChannel();
        if (channel === 'github') {
            return '复制 Markdown';
        }
        return '复制代码';
    },

    updateCopyButtonLabels: function() {
        const previewButton = document.getElementById('copyPreviewBtn');
        const htmlButton = document.getElementById('copyHtmlBtn');

        if (previewButton && !previewButton.classList.contains('success')) {
            previewButton.textContent = this.getCopyPreviewButtonLabel();
        }
        if (htmlButton && !htmlButton.classList.contains('success')) {
            htmlButton.textContent = this.getCopyHtmlButtonLabel();
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
            this.showCopySuccess(button, this.getCopyHtmlButtonLabel());
        } else {
            alert('复制失败，请手动复制');
        }
    },

    copyHtmlToClipboard: async function(html, plainText = '') {
        if (!html || typeof html !== 'string') {
            return false;
        }

        const safePlainText = typeof plainText === 'string' ? plainText : '';

        try {
            if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined' && typeof navigator.clipboard.write === 'function') {
                const item = new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([safePlainText], { type: 'text/plain' })
                });
                await navigator.clipboard.write([item]);
                return true;
            }
        } catch (error) {
            console.warn('Rich HTML clipboard write failed, falling back to DOM copy:', error);
        }

        return false;
    },

    copyRenderedPreviewToClipboard: function(previewElement) {
        if (!previewElement) {
            return false;
        }

        const selection = window.getSelection ? window.getSelection() : null;
        const savedRanges = [];
        if (selection && selection.rangeCount) {
            for (let i = 0; i < selection.rangeCount; i += 1) {
                savedRanges.push(selection.getRangeAt(i).cloneRange());
            }
        }

        const sandbox = document.createElement('div');
        sandbox.setAttribute('aria-hidden', 'true');
        sandbox.contentEditable = 'true';
        sandbox.style.cssText = 'position: fixed; left: -99999px; top: 0; opacity: 0; pointer-events: none; user-select: text; -webkit-user-select: text;';
        sandbox.innerHTML = previewElement.innerHTML;
        document.body.appendChild(sandbox);

        try {
            const range = document.createRange();
            range.selectNodeContents(sandbox);

            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }

            const success = document.execCommand('copy');
            return !!success;
        } catch (error) {
            console.warn('DOM rich copy failed:', error);
            return false;
        } finally {
            if (selection) {
                selection.removeAllRanges();
                savedRanges.forEach(range => selection.addRange(range));
            }
            if (sandbox.parentNode) {
                sandbox.parentNode.removeChild(sandbox);
            }
        }
    },

    // 复制预览样式
    copyPreview: async function() {
        const htmlOutput = document.getElementById('htmlOutput');
        const preview = document.getElementById('preview');
        const button = document.getElementById('copyPreviewBtn');
        const channel = this.getCurrentChannel();
        
        if (!htmlOutput || !button) {
            console.error('HTML output or button not found');
            return;
        }

        let success = false;

        if (channel === 'wechat') {
            const previewHtml = preview ? preview.innerHTML : '';
            const previewText = preview ? preview.innerText : '';
            success = await this.copyHtmlToClipboard(previewHtml, previewText);
            if (!success) {
                success = this.copyRenderedPreviewToClipboard(preview);
            }
            if (!success) {
                success = await this.copyToClipboard(previewText);
            }
        } else {
            const markdown = htmlOutput.value;
            success = await this.copyToClipboard(markdown);
        }
        
        if (success) {
            this.showCopySuccess(button, this.getCopyPreviewButtonLabel());
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

[lead] 在段落开头加入 [lead]，可生成一个浅色的“破题/引导”提示块，适合关键提示或摘要（背景随主题色自动变浅）。

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

    // 获取当前渠道
    getCurrentChannel: function() {
        const channelSelect = document.getElementById('channelSelect');
        return channelSelect ? channelSelect.value : 'wechat';
    },

    // 已移除模式设置

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
    },

    // 新增：自定义颜色预览
    previewCustomColor: function() {
        var input = document.getElementById('customColorInput');
        var preview = document.getElementById('customColorPreview');
        if (!input || !preview) return;
        var color = input.value.trim();
        if (UIController.isValidColor(color)) {
            preview.style.background = color;
            preview.style.borderColor = color;
        } else {
            preview.style.background = '#fff';
            preview.style.borderColor = '#ddd';
        }
    },

    // 新增：应用自定义颜色
    applyCustomColor: function() {
        var input = document.getElementById('customColorInput');
        var color = input ? input.value.trim() : '';
        if (!UIController.isValidColor(color)) {
            alert('请输入有效的十六进制色号，如 #FF5733');
            return;
        }
        // 标记为自定义主题
        this.currentTheme = 'custom';
        this.customColor = color;
        this.saveThemeToStorage();
        this.updateThemeUI();
        this.updateOutput();
        // 关闭主题面板
        var themePanel = document.getElementById('themePanel');
        if (themePanel) themePanel.style.display = 'none';
    },

    // 新增：颜色格式校验
    isValidColor: function(color) {
        // 支持 #RGB, #RRGGBB, #RRGGBBAA
        return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color);
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
