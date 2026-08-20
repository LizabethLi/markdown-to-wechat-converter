// UI控制器模块
const UIController = {
    currentTheme: null,
    customColor: null, // 新增：自定义颜色
    currentChannel: 'wechat',
    outputLanguage: 'zh',
    renderTaskToken: 0,
    currentRenderedResult: null,
    inputRenderTimer: null,
    previewImagePreparation: null,
    copyNoticeTimer: null,

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
            markdownInput.addEventListener('input', () => {
                if (this.inputRenderTimer) {
                    clearTimeout(this.inputRenderTimer);
                }
                if (this.outputLanguage === 'en') {
                    this.inputRenderTimer = setTimeout(() => this.updateOutput(), 500);
                } else {
                    this.updateOutput();
                }
            });
            markdownInput.addEventListener('paste', (event) => this.handleMarkdownImagePaste(event));
            markdownInput.addEventListener('dragenter', (event) => this.handleMarkdownImageDrag(event));
            markdownInput.addEventListener('dragover', (event) => this.handleMarkdownImageDrag(event));
            markdownInput.addEventListener('dragleave', () => markdownInput.classList.remove('is-image-dragover'));
            markdownInput.addEventListener('drop', (event) => this.handleMarkdownImageDrop(event));
        }

        const imageFileButton = document.getElementById('imageFileButton');
        const imageFileInput = document.getElementById('imageFileInput');
        if (imageFileButton && imageFileInput) {
            imageFileButton.addEventListener('click', () => imageFileInput.click());
            imageFileInput.addEventListener('change', async () => {
                await this.handleMarkdownImageFiles(imageFileInput.files, markdownInput);
                imageFileInput.value = '';
            });
        }

        const preview = document.getElementById('preview');
        if (preview) {
            preview.addEventListener('click', (event) => this.handlePreviewAction(event));
        }

        // 渠道选择事件
        const channelSelect = document.getElementById('channelSelect');
        if (channelSelect) {
            channelSelect.addEventListener('change', (e) => {
                this.handleChannelChange(e.target.value);
            });
        }

        const outputLanguageToggle = document.getElementById('outputLanguageToggle');
        if (outputLanguageToggle) {
            outputLanguageToggle.addEventListener('click', (event) => {
                const button = event.target.closest('[data-output-language]');
                if (button) {
                    this.handleOutputLanguageChange(button.getAttribute('data-output-language'));
                }
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
            const generateXButton = document.getElementById('generateXButton');
            const languageButton = e.target.closest && e.target.closest('[data-output-language]');
            if (
                translatorPanel
                && !translatorPanel.contains(e.target)
                && e.target !== translatorButton
                && e.target !== generateXButton
                && !languageButton
            ) {
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
        window.generateXPublishingContent = this.generateXPublishingContent.bind(this);
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
        this.loadOutputLanguageFromStorage();
        // 加载模板列表
        this.populateTemplateOptions();
        // 更新渠道提醒状态
        this.updateChannelReminder(this.currentChannel);
        this.updateOutputLanguageUI();
        this.updateXGeneratorVisibility();
        this.updateCopyButtonLabels();
        const markdownInput = document.getElementById('markdownInput');
        this.updateLocalImageReferenceStatus(markdownInput ? markdownInput.value : '');
    },

    handleChannelChange: function(channel) {
        this.currentChannel = channel || 'wechat';
        this.updateChannelReminder(this.currentChannel);
        this.updateXGeneratorVisibility();
        this.updateCopyButtonLabels();
        this.updateOutput();
    },

    handleMarkdownImagePaste: async function(event) {
        if (typeof ImageHandler === 'undefined') return;

        const markdownInput = event && event.currentTarget;
        const files = ImageHandler.getClipboardImageFiles(event && event.clipboardData);
        if (!markdownInput || !files.length) return;

        event.preventDefault();
        await this.handleMarkdownImageFiles(files, markdownInput);
    },

    handleMarkdownImageDrag: function(event) {
        if (typeof ImageHandler === 'undefined' || !event || !event.dataTransfer) return;

        const files = Array.from(event.dataTransfer.files || []);
        const hasImage = files.some(file => ImageHandler.isImageFile(file))
            || Array.from(event.dataTransfer.items || []).some(item => /^image\//i.test(item.type || ''));
        if (!hasImage) return;

        event.preventDefault();
        event.currentTarget.classList.add('is-image-dragover');
        event.dataTransfer.dropEffect = 'copy';
    },

    handleMarkdownImageDrop: async function(event) {
        const markdownInput = event && event.currentTarget;
        if (markdownInput) markdownInput.classList.remove('is-image-dragover');
        if (typeof ImageHandler === 'undefined' || !event || !event.dataTransfer) return;

        const files = Array.from(event.dataTransfer.files || [])
            .filter(file => ImageHandler.isImageFile(file));
        if (!files.length) return;

        event.preventDefault();
        await this.handleMarkdownImageFiles(files, markdownInput);
    },

    handleMarkdownImageFiles: async function(files, markdownInput) {
        const imageFiles = Array.from(files || [])
            .filter(file => typeof ImageHandler !== 'undefined' && ImageHandler.isImageFile(file));
        if (!markdownInput || !imageFiles.length) return false;

        const start = markdownInput.selectionStart;
        const end = markdownInput.selectionEnd;
        const valueBeforeRead = markdownInput.value;

        try {
            const resolution = await ImageHandler.resolveObsidianImageReferences(
                markdownInput.value,
                imageFiles
            );
            if (resolution.resolvedCount > 0) {
                markdownInput.value = resolution.markdown;
                markdownInput.selectionStart = markdownInput.value.length;
                markdownInput.selectionEnd = markdownInput.value.length;

                if (resolution.unusedFiles.length > 0) {
                    const unusedMarkdown = await ImageHandler.filesToMarkdown(resolution.unusedFiles);
                    ImageHandler.insertMarkdownAtSelection(markdownInput, unusedMarkdown);
                } else {
                    markdownInput.focus();
                }

                const remainingCount = resolution.unresolvedReferences.length;
                const remainingText = remainingCount
                    ? `，还有 ${remainingCount} 张同名文件未选择`
                    : '';
                this.showCopyNotice(
                    `已匹配并内嵌 ${resolution.resolvedCount} 张 Obsidian 本地图片${remainingText}。`,
                    remainingCount > 0
                );
                this.updateOutput();
                return true;
            }

            const imageMarkdown = await ImageHandler.filesToMarkdown(imageFiles);
            if (markdownInput.value === valueBeforeRead) {
                markdownInput.selectionStart = start;
                markdownInput.selectionEnd = end;
            }
            ImageHandler.insertMarkdownAtSelection(markdownInput, imageMarkdown);
            this.showCopyNotice(`已插入 ${imageFiles.length} 张本地图片，图片数据会随 Markdown 保留。`, false);
            this.updateOutput();
            return true;
        } catch (error) {
            console.error('Failed to paste image into Markdown:', error);
            this.showCopyNotice(error && error.message ? error.message : '图片粘贴失败', true);
            return false;
        }
    },

    updateLocalImageReferenceStatus: function(markdown) {
        if (typeof ImageHandler === 'undefined') return [];

        const references = ImageHandler.getObsidianImageReferences(markdown);
        const status = document.getElementById('localImageStatus');
        const button = document.getElementById('imageFileButton');
        const count = references.length;

        if (status) {
            status.textContent = count
                ? `检测到 ${count} 张 Obsidian 本地图片，请选择或拖入同名文件`
                : '也可以把图片粘贴或拖到下方编辑框';
            status.classList.toggle('warning', count > 0);
        }
        if (button) {
            button.textContent = count ? `选择本地图片（缺 ${count} 张）` : '选择本地图片';
            button.classList.toggle('needs-attention', count > 0);
        }
        return references;
    },

    ensureLocalImageReferencesResolved: function(markdown) {
        const references = this.updateLocalImageReferenceStatus(markdown);
        if (!references.length) return true;

        this.showCopyNotice(
            `还有 ${references.length} 张 Obsidian 本地图片未导入。请选择或拖入同名图片后再复制图文。`,
            true
        );
        const button = document.getElementById('imageFileButton');
        if (button) button.focus();
        return false;
    },

    handleOutputLanguageChange: function(language) {
        const nextLanguage = language === 'en' ? 'en' : 'zh';
        if (nextLanguage === this.outputLanguage) return;

        this.outputLanguage = nextLanguage;
        try {
            localStorage.setItem('publishing_output_language', nextLanguage);
        } catch (error) {
            console.warn('Failed to save output language:', error);
        }
        this.updateOutputLanguageUI();
        this.updateChannelReminder(this.currentChannel);

        if (nextLanguage === 'en' && !this.hasTranslatorConfiguration()) {
            const panel = document.getElementById('translatorPanel');
            const keyInput = document.getElementById('translatorApiKey');
            if (panel) panel.style.display = 'block';
            if (keyInput) keyInput.focus();
        }
        this.updateOutput();
    },

    loadOutputLanguageFromStorage: function() {
        const stored = this.safeReadLocalStorage('publishing_output_language');
        this.outputLanguage = stored === 'en' ? 'en' : 'zh';
    },

    updateOutputLanguageUI: function() {
        document.querySelectorAll('[data-output-language]').forEach((button) => {
            const isActive = button.getAttribute('data-output-language') === this.outputLanguage;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    },

    updateChannelReminder: function(channel) {
        const reminderEl = document.getElementById('channelReminder');
        if (!reminderEl) return;

        if (this.outputLanguage === 'en' && !this.hasTranslatorConfiguration()) {
            reminderEl.textContent = 'English 输出需要 OpenRouter API Key；请在 ⚙️ 中配置后重新生成。';
            reminderEl.classList.add('show');
            return;
        }

        const activeChannel = (typeof ChannelConverter !== 'undefined' && typeof ChannelConverter.getChannel === 'function')
            ? ChannelConverter.getChannel(channel)
            : null;
        const reminder = activeChannel && activeChannel.reminder;

        if (!reminder) {
            reminderEl.classList.remove('show');
            return;
        }

        if (reminder.requiresAI) {
            const hasAI = typeof Translator !== 'undefined'
                && typeof Translator.hasAIConfiguration === 'function'
                && Translator.hasAIConfiguration();
            reminderEl.textContent = hasAI ? reminder.text : reminder.missingText;
            reminderEl.classList.add('show');
            return;
        }

        if (reminder.requiresTranslation && !this.hasTranslatorConfiguration()) {
            reminderEl.textContent = reminder.text;
            reminderEl.classList.add('show');
            return;
        }

        if (!reminder.requiresTranslation) {
            reminderEl.textContent = reminder.text;
            reminderEl.classList.add('show');
            return;
        }

        if (channel === 'x') {
            reminderEl.textContent = reminder.text;
            reminderEl.classList.add('show');
            return;
        }

        reminderEl.classList.remove('show');
    },

    hasTranslatorConfiguration: function() {
        const cfg = AppConfig.translation || {};
        const key = (cfg.openrouter && cfg.openrouter.apiKey && cfg.openrouter.apiKey.trim()) || this.safeReadLocalStorage('openrouter_api_key');
        return !!key;
    },

    updateXGeneratorVisibility: function() {
        const button = document.getElementById('generateXButton');
        if (!button) return;
        button.style.display = this.currentChannel === 'x' ? 'inline-flex' : 'none';
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
        'google/gemini-3.5-flash',
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
            let storedModel = this.safeReadLocalStorage('openrouter_model');
            if (storedModel === 'google/gemini-1.5-flash-latest') {
                storedModel = 'google/gemini-3.5-flash';
                localStorage.setItem('openrouter_model', storedModel);
            }
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
            if (typeof ChannelConverter !== 'undefined' && typeof ChannelConverter.clearLocalizationCache === 'function') {
                ChannelConverter.clearLocalizationCache();
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

    applyRenderedChannelResult: function(rendered, htmlOutput, preview) {
        if (!rendered || !htmlOutput || !preview) {
            return;
        }

        htmlOutput.value = rendered.output || '';
        preview.innerHTML = rendered.previewHtml || '';
        this.currentRenderedResult = rendered;

        preview.classList.remove('wechat-preview', 'markdown-preview', 'plain-text-preview-host', 'thread-preview-host', 'x-publishing-preview-host');
        if (rendered.channel && rendered.channel.previewHostClass) {
            preview.classList.add(rendered.channel.previewHostClass);
        }

        const codeBtn = document.getElementById('codeTabButton');
        const codeTitle = document.getElementById('codeTabTitle');
        if (codeBtn) codeBtn.textContent = `📄 ${rendered.channel.outputLabel}`;
        if (codeTitle) codeTitle.textContent = rendered.channel.outputTitle;

        if (rendered.needsMathTypeset) {
            this.typesetMath(preview);
        }

        this.preparePreviewImages(preview);
    },

    preparePreviewImages: function(preview) {
        if (typeof ImageHandler === 'undefined' || !preview) {
            this.previewImagePreparation = null;
            return Promise.resolve({ total: 0, embedded: 0, alreadyEmbedded: 0, external: 0, failures: [] });
        }

        const promise = ImageHandler.embedImagesInElement(preview);
        this.previewImagePreparation = { preview, promise, report: null };
        promise.then((report) => {
            if (this.previewImagePreparation && this.previewImagePreparation.promise === promise) {
                this.previewImagePreparation.report = report;
            }
        }).catch((error) => {
            console.warn('Failed to prepare preview images:', error);
        });
        return promise;
    },

    ensurePreviewImagesReady: async function(preview) {
        const current = this.previewImagePreparation;
        if (current && current.preview === preview) {
            try {
                return current.report || await current.promise;
            } catch (_) {
                return { total: 0, embedded: 0, alreadyEmbedded: 0, external: 0, failures: [] };
            }
        }
        return this.preparePreviewImages(preview);
    },

    generateXPublishingContent: async function() {
        if (this.getCurrentChannel() !== 'x') return;

        const hasAI = typeof Translator !== 'undefined'
            && typeof Translator.hasAIConfiguration === 'function'
            && Translator.hasAIConfiguration();
        if (!hasAI) {
            const panel = document.getElementById('translatorPanel');
            if (panel) panel.style.display = 'block';
            const keyInput = document.getElementById('translatorApiKey');
            if (keyInput) keyInput.focus();
            this.updateChannelReminder('x');
            return;
        }

        const markdownInput = document.getElementById('markdownInput');
        const htmlOutput = document.getElementById('htmlOutput');
        const preview = document.getElementById('preview');
        const button = document.getElementById('generateXButton');
        if (!markdownInput || !htmlOutput || !preview) return;

        const markdown = markdownInput.value;
        if (!markdown.trim()) {
            this.showError('请先输入一篇 Markdown 文章');
            return;
        }

        const taskToken = ++this.renderTaskToken;
        const originalLabel = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = '✨ AI 生成中...';
        }
        this.showLoading();

        try {
            const rendered = await ChannelConverter.renderForChannel('x', markdown, {
                useAI: true,
                outputLanguage: this.outputLanguage
            });
            if (taskToken !== this.renderTaskToken) return;
            this.applyRenderedChannelResult(rendered, htmlOutput, preview);
            this.updateCopyButtonLabels();
            this.updateChannelReminder('x');
        } catch (error) {
            console.error('Failed to generate X publishing content:', error);
            htmlOutput.value = 'AI generation error: ' + error.message;
            preview.innerHTML = '<p style="color: red;">AI 生成失败：' + ChannelConverter.escapeHtml(error.message) + '</p>';
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalLabel || '✨ 生成 X Article + Thread';
            }
        }
    },

    handlePreviewAction: function(event) {
        const target = event && event.target;
        const button = target && typeof target.closest === 'function'
            ? target.closest('[data-x-copy]')
            : null;
        if (!button) return;
        this.copyXPublishingPart(button);
    },

    copyXPublishingPart: async function(button) {
        const bundle = this.currentRenderedResult && this.currentRenderedResult.data;
        if (!bundle) return;

        const kind = button.getAttribute('data-x-copy');
        let content = '';
        if (kind === 'article') {
            content = bundle.articleMarkdown || '';
        } else if (kind === 'thread-all') {
            content = (bundle.threadPosts || []).join('\n\n---\n\n');
        } else if (kind === 'thread') {
            const index = Number(button.getAttribute('data-thread-index'));
            content = (bundle.threadPosts || [])[index] || '';
        }

        if (!content) return;
        if (kind === 'article') {
            const markdownInput = document.getElementById('markdownInput');
            if (!this.ensureLocalImageReferencesResolved(markdownInput ? markdownInput.value : '')) {
                return;
            }
        }
        const originalLabel = button.textContent;
        let success = false;
        let imageReport = null;
        if (kind === 'article' && typeof marked === 'function') {
            const preview = document.getElementById('preview');
            imageReport = await this.ensurePreviewImagesReady(preview);
            const articleContent = button.closest('.x-article-card')
                && button.closest('.x-article-card').querySelector('.x-article-content');
            const articleHtml = articleContent ? articleContent.innerHTML : marked(content);
            const articleText = articleContent ? articleContent.innerText : ChannelConverter.markdownToPlainText(content);
            success = await this.copyHtmlToClipboard(articleHtml, articleText);
        }
        if (!success) {
            success = await this.copyToClipboard(content);
        }
        if (success) {
            this.showCopySuccess(button, originalLabel, this.getRichCopySuccessText(imageReport));
            this.showImageCopyReport(imageReport);
        } else {
            alert('复制失败，请手动复制');
        }
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
        this.updateLocalImageReferenceStatus(markdown);
        const channel = channelSelect ? channelSelect.value : 'wechat';
        const themeColor = this.getCurrentThemeColor();
        this.currentChannel = channel;
        this.updateChannelReminder(channel);
        const taskToken = ++this.renderTaskToken;

        try {
            const shouldShowWechatLoading = channel === 'wechat'
                && markdown.includes('```mermaid')
                && typeof MarkdownConverter.hasMermaidSupport === 'function'
                && MarkdownConverter.hasMermaidSupport();

            if (shouldShowWechatLoading || channel !== 'wechat') {
                this.showLoading();
            }

            const rendered = await ChannelConverter.renderForChannel(channel, markdown, {
                themeColor,
                mode: AppConfig.defaults.mode,
                outputLanguage: this.outputLanguage
            });

            if (taskToken !== this.renderTaskToken) {
                return;
            }

            this.applyRenderedChannelResult(rendered, htmlOutput, preview);
            this.updateCopyButtonLabels();
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

    getActiveChannelConfig: function() {
        if (typeof ChannelConverter !== 'undefined' && typeof ChannelConverter.getChannel === 'function') {
            return ChannelConverter.getChannel(this.getCurrentChannel());
        }
        return null;
    },

    getCopyPreviewButtonLabel: function() {
        const activeChannel = this.getActiveChannelConfig();
        return (activeChannel && activeChannel.copyPreviewLabel) || '复制文案';
    },

    getCopyHtmlButtonLabel: function() {
        const activeChannel = this.getActiveChannelConfig();
        return (activeChannel && activeChannel.copyOutputLabel) || '复制文案';
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

    showCopyNotice: function(message, warning = false) {
        const notice = document.getElementById('copyNotice');
        if (!notice) return;

        if (this.copyNoticeTimer) clearTimeout(this.copyNoticeTimer);
        notice.textContent = message || '';
        notice.classList.toggle('show', !!message);
        notice.classList.toggle('warning', !!warning);
        if (message) {
            this.copyNoticeTimer = setTimeout(() => {
                notice.classList.remove('show', 'warning');
                notice.textContent = '';
            }, 7000);
        }
    },

    getRichCopySuccessText: function(report) {
        if (!report || !report.total) return '✅ 已复制';
        if (!report.external) return '✅ 图文已复制';
        return `⚠️ 已复制（${report.external} 张外链图）`;
    },

    showImageCopyReport: function(report) {
        if (!report || !report.total) return;
        if (report.external) {
            this.showCopyNotice(
                `正文已复制；${report.external} 张图片因图片服务器限制未能内嵌，仍保留原地址，目标平台可能需要手动上传。`,
                true
            );
            return;
        }
        this.showCopyNotice(`正文和 ${report.total} 张图片已一起写入剪贴板。`, false);
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
        let imageReport = null;
        const activeChannel = this.getActiveChannelConfig();
        const useRichCopy = activeChannel && activeChannel.previewCopyMode === 'rich';

        if (useRichCopy) {
            const markdownInput = document.getElementById('markdownInput');
            if (!this.ensureLocalImageReferencesResolved(markdownInput ? markdownInput.value : '')) {
                return;
            }
            const originalLabel = button.textContent;
            if (preview && preview.querySelector('img')) {
                button.textContent = '正在准备图片...';
            }
            imageReport = await this.ensurePreviewImagesReady(preview);
            const previewHtml = preview ? preview.innerHTML : '';
            const previewText = preview ? preview.innerText : '';
            success = await this.copyHtmlToClipboard(previewHtml, previewText);
            if (!success) {
                success = this.copyRenderedPreviewToClipboard(preview);
            }
            if (!success) {
                success = await this.copyToClipboard(previewText);
            }
            if (!success) button.textContent = originalLabel;
        } else {
            const markdown = htmlOutput.value;
            success = await this.copyToClipboard(markdown);
        }
        
        if (success) {
            this.showCopySuccess(button, this.getCopyPreviewButtonLabel(), this.getRichCopySuccessText(imageReport));
            this.showImageCopyReport(imageReport);
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
$$
\\begin{aligned}
\\mathcal{L}(\\theta,\\phi,\\lambda)
&=
\\underbrace{
\\mathbb{E}_{x \\sim p_{\\mathrm{data}}}
\\left[
\\log
\\frac{
\\exp\\!\\bigl(f_\\theta(x)\\bigr)
}{
\\int_{\\Omega}
\\exp\\!\\bigl(f_\\theta(\\xi)\\bigr)\\,d\\xi
}
\\right]
}_{\\text{energy normalization}}
+\\lambda
\\sum_{k=1}^{K}
\\left\\|
\\frac{\\partial u_k}{\\partial t}
+\\nabla \\cdot \\bigl(u_k \\mathbf{v}_\\phi\\bigr)
-\\varepsilon \\Delta u_k
-\\sigma\\!\\left(\\sum_{j=1}^{K} A_{kj}u_j\\right)
\\right\\|_{L^2(\\Omega_T)}^2
\\\\[6pt]
&\\quad
+\\frac{1}{2}\\log\\det\\!\\left(
I_n+\\frac{1}{\\tau}X^\\top X
\\right)
-\\inf_{q \\in \\mathcal{Q}}
\\left\\{
\\mathrm{KL}\\!\\bigl(q(z)\\,\\|\\,p_\\phi(z\\mid x)\\bigr)
-\\mathbb{E}_{q(z)}
\\bigl[\\log p_\\theta(x\\mid z)\\bigr]
\\right\\}
\\\\[6pt]
&\\quad
+\\sum_{m=1}^{M}
\\oint_{\\gamma_m}
\\left(
\\frac{\\partial^2 \\psi}{\\partial n^2}
+\\alpha\\,\\frac{\\partial \\psi}{\\partial n}
+\\beta\\,\\psi
\\right)\\,ds
+\\prod_{r=1}^{R}
\\left(
1+\\frac{\\mu_r^2}{1+\\nu_r^2}
\\right)^{\\frac{(-1)^r}{r}}
\\\\[6pt]
&\\quad
+\\lim_{N\\to\\infty}
\\sum_{i=1}^{N}
\\sum_{j=1}^{N}
\\frac{
(-1)^{i+j}
}{
(i+j)^s
}
\\exp\\!\\left(
-\\frac{\\|x_i-x_j\\|_2^2}{2\\sigma^2}
\\right)
\\cos\\!\\left(
\\omega^\\top(x_i-x_j)+\\varphi
\\right).
\\end{aligned}
$$

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
