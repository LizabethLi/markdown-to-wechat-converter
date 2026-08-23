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
    xArticlePackage: null,
    xArticlePackagePromise: null,
    xArticlePackagePreview: null,
    xAssetQueueIndex: 0,
    xCopiedAssetIndexes: new Set(),
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
                this.updateStyleSummary();
                this.updateOutput();
            });
        }

        // 移除模式选择事件（已删除）

        // 点击外部关闭主题面板
        document.addEventListener('click', (e) => {
            const themePanel = document.getElementById('themePanel');
            const themeButton = document.getElementById('themeButton');
            if (
                themePanel
                && !themePanel.contains(e.target)
                && !(themeButton && themeButton.contains(e.target))
            ) {
                themePanel.style.display = 'none';
            }
            const translatorPanel = document.getElementById('translatorPanel');
            const translatorButton = document.getElementById('translatorButton');
            const generateXButton = document.getElementById('generateXButton');
            const languageButton = e.target.closest && e.target.closest('[data-output-language]');
            if (
                translatorPanel
                && !translatorPanel.contains(e.target)
                && !(translatorButton && translatorButton.contains(e.target))
                && e.target !== generateXButton
                && !languageButton
            ) {
                translatorPanel.style.display = 'none';
            }
        });

        // 绑定全局函数到window对象，以便HTML中的onclick可以调用
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
        this.updateChannelControlsVisibility();
        this.updateStyleSummary();
        this.updateOutputLanguageUI();
        this.updateXGeneratorVisibility();
        this.updateCopyButtonLabels();
        const markdownInput = document.getElementById('markdownInput');
        this.updateLocalImageReferenceStatus(markdownInput ? markdownInput.value : '');
    },

    handleChannelChange: function(channel) {
        this.currentChannel = channel || 'wechat';
        this.updateChannelReminder(this.currentChannel);
        this.updateChannelControlsVisibility();
        this.updateXGeneratorVisibility();
        this.updateCopyButtonLabels();
        this.updateOutput();
    },

    handleMarkdownImagePaste: async function(event) {
        if (typeof ImageHandler === 'undefined') return;

        const markdownInput = event && event.currentTarget;
        const clipboardData = event && event.clipboardData;
        const files = ImageHandler.getClipboardImageFiles(clipboardData);
        if (!markdownInput) return;

        if (files.length) {
            event.preventDefault();
            await this.handleMarkdownImageFiles(files, markdownInput);
            return;
        }

        const embeddedImages = ImageHandler.getClipboardEmbeddedImageMarkdown(clipboardData);
        if (!embeddedImages) return;

        event.preventDefault();
        ImageHandler.insertMarkdownAtSelection(markdownInput, embeddedImages.markdown);
        this.showCopyNotice(
            `已从剪贴板加载 ${embeddedImages.count} 张图片，编辑区只显示短引用。`,
            false
        );
        this.updateOutput();
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
                valueBeforeRead,
                imageFiles
            );
            if (resolution.resolvedCount > 0) {
                if (resolution.unusedFiles.length > 0) {
                    const unusedMarkdown = await ImageHandler.filesToMarkdown(resolution.unusedFiles);
                    if (markdownInput.value === valueBeforeRead) {
                        markdownInput.selectionStart = start;
                        markdownInput.selectionEnd = end;
                    }
                    ImageHandler.insertMarkdownAtSelection(markdownInput, unusedMarkdown);
                } else {
                    markdownInput.focus();
                }

                const remainingCount = resolution.unresolvedReferences.length;
                const remainingText = remainingCount
                    ? `，还有 ${remainingCount} 张同名文件未选择`
                    : '';
                this.showCopyNotice(
                    `已加载 ${resolution.resolvedCount} 张 Obsidian 本地图片${remainingText}，编辑区继续保留短引用。`,
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
            this.showCopyNotice(`已加载 ${imageFiles.length} 张本地图片，编辑区只显示短引用。`, false);
            this.updateOutput();
            return true;
        } catch (error) {
            console.error('Failed to paste image into Markdown:', error);
            this.showCopyNotice(error && error.message ? error.message : '图片粘贴失败', true);
            return false;
        }
    },

    updateLocalImageReferenceStatus: function(markdown) {
        if (typeof ImageHandler === 'undefined') {
            return { references: [], unresolvedReferences: [], total: 0, loaded: 0 };
        }

        const referenceStatus = ImageHandler.getLocalImageReferenceStatus(markdown);
        const status = document.getElementById('localImageStatus');
        const button = document.getElementById('imageFileButton');
        const missingCount = referenceStatus.unresolvedReferences.length;

        if (status) {
            if (missingCount > 0) {
                status.textContent = `本地图片已加载 ${referenceStatus.loaded}/${referenceStatus.total}，请补充 ${missingCount} 张同名文件`;
            } else if (referenceStatus.total > 0) {
                status.textContent = `本地图片已加载 ${referenceStatus.loaded}/${referenceStatus.total}，编辑区保留短引用`;
            } else {
                status.textContent = '';
            }
            status.classList.toggle('warning', missingCount > 0);
        }
        if (button) {
            button.textContent = missingCount > 0 ? `＋ 补充图片（缺 ${missingCount} 张）` : '＋ 添加图片';
            button.classList.toggle('needs-attention', missingCount > 0);
        }
        return referenceStatus;
    },

    updateChannelControlsVisibility: function() {
        const styleControls = document.getElementById('wechatStyleControls');
        if (styleControls) {
            styleControls.hidden = this.currentChannel !== 'wechat';
        }
    },

    updateStyleSummary: function() {
        const summary = document.getElementById('styleSummary');
        if (!summary) return;

        const templateSelect = document.getElementById('templateSelect');
        const selectedTemplate = templateSelect
            && templateSelect.options
            && templateSelect.selectedIndex >= 0
            ? templateSelect.options[templateSelect.selectedIndex].textContent
            : '默认模板';
        const configuredTheme = AppConfig.themes && AppConfig.themes[this.currentTheme];
        const themeName = this.currentTheme === 'custom'
            ? `自定义 ${this.customColor || ''}`.trim()
            : (configuredTheme && configuredTheme.name) || '经典紫色';
        summary.textContent = `${selectedTemplate} · ${themeName}`;
    },

    ensureLocalImageReferencesResolved: function(markdown) {
        const referenceStatus = this.updateLocalImageReferenceStatus(markdown);
        const unresolvedReferences = referenceStatus.unresolvedReferences;
        if (!unresolvedReferences.length) return true;

        this.showCopyNotice(
            `还有 ${unresolvedReferences.length} 张本地图片未加载。请选择或拖入同名图片后再复制图文。`,
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

    renderChannelReminder: function(channel, reminder, message) {
        const reminderEl = document.getElementById('channelReminder');
        if (!reminderEl) return;

        reminderEl.replaceChildren();
        reminderEl.classList.toggle('x-workflow-reminder', channel === 'x');

        if (reminder && reminder.title) {
            const title = document.createElement('strong');
            title.className = 'channel-reminder-title';
            title.textContent = reminder.title;
            reminderEl.appendChild(title);
        }

        const description = document.createElement('span');
        description.className = 'channel-reminder-description';
        description.textContent = message || '';
        reminderEl.appendChild(description);

        if (reminder && Array.isArray(reminder.steps) && reminder.steps.length) {
            const steps = document.createElement('span');
            steps.className = 'channel-reminder-steps';
            reminder.steps.forEach((step, index) => {
                const item = document.createElement('span');
                item.className = 'channel-reminder-step';
                item.textContent = `${index + 1} ${step}`;
                steps.appendChild(item);
                if (index < reminder.steps.length - 1) {
                    const arrow = document.createElement('i');
                    arrow.setAttribute('aria-hidden', 'true');
                    arrow.textContent = '→';
                    steps.appendChild(arrow);
                }
            });
            reminderEl.appendChild(steps);
        }

        reminderEl.classList.add('show');
    },

    updateChannelReminder: function(channel) {
        const reminderEl = document.getElementById('channelReminder');
        if (!reminderEl) return;

        reminderEl.classList.remove('x-workflow-reminder');

        if (this.outputLanguage === 'en' && !this.hasTranslatorConfiguration()) {
            const activeChannel = (typeof ChannelConverter !== 'undefined' && typeof ChannelConverter.getChannel === 'function')
                ? ChannelConverter.getChannel(channel)
                : null;
            const xReminder = channel === 'x' && activeChannel ? activeChannel.reminder : null;
            const message = channel === 'x'
                ? 'English 输出需要 OpenRouter API Key；X Article 的文字可直接复制，图片、Mermaid、公式和代码块仍需按编号上传。'
                : 'English 输出需要 OpenRouter API Key；请在 ⚙️ 中配置后重新生成。';
            this.renderChannelReminder(channel, xReminder, message);
            return;
        }

        const activeChannel = (typeof ChannelConverter !== 'undefined' && typeof ChannelConverter.getChannel === 'function')
            ? ChannelConverter.getChannel(channel)
            : null;
        const reminder = activeChannel && activeChannel.reminder;

        if (!reminder) {
            reminderEl.replaceChildren();
            reminderEl.classList.remove('show');
            return;
        }

        if (reminder.requiresAI) {
            const hasAI = typeof Translator !== 'undefined'
                && typeof Translator.hasAIConfiguration === 'function'
                && Translator.hasAIConfiguration();
            this.renderChannelReminder(channel, reminder, hasAI ? reminder.text : reminder.missingText);
            return;
        }

        if (reminder.requiresTranslation && !this.hasTranslatorConfiguration()) {
            this.renderChannelReminder(channel, reminder, reminder.text);
            return;
        }

        if (!reminder.requiresTranslation) {
            this.renderChannelReminder(channel, reminder, reminder.text);
            return;
        }

        if (channel === 'x') {
            this.renderChannelReminder(channel, reminder, reminder.text);
            return;
        }

        reminderEl.replaceChildren();
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
        this.updateStyleSummary();
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
            // 重新渲染当前渠道
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
        if (themeButton) {
            themeButton.style.borderColor = this.getCurrentThemeColor();
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
        this.updateStyleSummary();
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

        if (rendered.needsMathTypeset) {
            this.typesetMath(preview);
        }

        this.preparePreviewImages(preview);
        if (rendered.channel && rendered.channel.id === 'x') {
            this.prepareXArticlePackage(preview);
        } else {
            this.xArticlePackage = null;
            this.xArticlePackagePromise = null;
            this.xArticlePackagePreview = null;
            this.xAssetQueueIndex = 0;
            this.xCopiedAssetIndexes = new Set();
        }
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

    prepareXArticlePackage: function(preview) {
        const articleContent = preview && preview.querySelector('.x-article-content');
        if (!articleContent) {
            return Promise.resolve(null);
        }

        this.xArticlePackage = null;
        this.xArticlePackagePreview = preview;
        this.xAssetQueueIndex = 0;
        this.xCopiedAssetIndexes = new Set();

        let packagePromise;
        packagePromise = (async () => {
            await this.ensurePreviewImagesReady(preview);
            const publishingPackage = await this.buildXArticlePackage(articleContent);
            if (this.xArticlePackagePromise === packagePromise
                && this.xArticlePackagePreview === preview
                && preview.isConnected) {
                this.xArticlePackage = publishingPackage;
                this.renderXArticleAssets(preview, publishingPackage);
            }
            return publishingPackage;
        })().catch((error) => {
            console.error('Failed to prepare X Article assets:', error);
            if (this.xArticlePackagePromise === packagePromise) {
                const section = preview.querySelector('[data-x-asset-section]');
                const summary = section && section.querySelector('[data-x-asset-summary]');
                if (section) section.classList.add('has-error');
                if (summary) summary.textContent = '图片素材整理失败，请重新生成预览后再试。';
            }
            throw error;
        });

        this.xArticlePackagePromise = packagePromise;
        return packagePromise;
    },

    ensureXArticlePackageReady: async function() {
        const preview = document.getElementById('preview');
        if (this.xArticlePackage && this.xArticlePackagePreview === preview) {
            return this.xArticlePackage;
        }
        if (this.xArticlePackagePromise && this.xArticlePackagePreview === preview) {
            return this.xArticlePackagePromise;
        }
        return this.prepareXArticlePackage(preview);
    },

    buildXArticlePackage: async function(articleContent) {
        const clone = articleContent.cloneNode(true);
        const collectVisuals = (root) => Array.from(root.querySelectorAll('svg, img, pre'))
            .filter(element => element.tagName.toLowerCase() !== 'svg'
                || !element.parentElement
                || !element.parentElement.closest('svg'));
        const sourceVisuals = collectVisuals(articleContent);
        const cloneVisuals = collectVisuals(clone);

        if (sourceVisuals.length !== cloneVisuals.length) {
            throw new Error('X Article visual clone count mismatch');
        }

        const assets = await Promise.all(sourceVisuals.map(async (visual, index) => {
            const tagName = visual.tagName.toLowerCase();
            const isSvg = tagName === 'svg';
            const isCode = tagName === 'pre';
            const kind = isCode
                ? 'code'
                : isSvg
                ? (visual.querySelector('[data-mml-node="math"]') ? 'math' : 'mermaid')
                : 'image';
            const imageNumber = index + 1;
            const alt = kind === 'image' ? (visual.getAttribute('alt') || '').trim() : '';
            const codeElement = kind === 'code' ? visual.querySelector('code') : null;
            const languageClass = codeElement
                ? Array.from(codeElement.classList).find(className => className.startsWith('language-'))
                : '';
            const language = languageClass ? languageClass.slice('language-'.length) : '';
            const typeLabel = kind === 'math'
                ? '数学公式'
                : kind === 'mermaid'
                    ? 'Mermaid 图表'
                    : kind === 'code'
                        ? (language ? `代码块 · ${language}` : '代码块')
                        : (alt ? `原文图片：${alt.slice(0, 36)}` : '原文图片');
            const placeholder = `【图片 ${imageNumber} · ${typeLabel}】`;
            const filename = `x-article-${String(imageNumber).padStart(2, '0')}-${kind}.png`;

            try {
                const raster = kind === 'code'
                    ? await this.rasterizeCodeBlockToPng(visual, language)
                    : isSvg
                    ? await this.rasterizeSvgToPng(visual)
                    : await this.rasterizeImageToPng(visual);
                return {
                    index,
                    number: imageNumber,
                    kind,
                    typeLabel,
                    placeholder,
                    filename,
                    dataUrl: raster.dataUrl,
                    displayWidth: raster.displayWidth,
                    displayHeight: raster.displayHeight,
                    error: ''
                };
            } catch (error) {
                return {
                    index,
                    number: imageNumber,
                    kind,
                    typeLabel,
                    placeholder,
                    filename,
                    dataUrl: '',
                    displayWidth: 0,
                    displayHeight: 0,
                    error: error && error.message ? error.message : '图片转换失败'
                };
            }
        }));

        cloneVisuals.forEach((visual, index) => {
            const asset = assets[index];
            const containedSection = visual.closest('section');
            const isBlockVisual = asset.kind === 'mermaid'
                || asset.kind === 'code'
                || (asset.kind === 'math' && containedSection && clone.contains(containedSection));
            let replacementTarget = visual;

            if (isBlockVisual && containedSection && clone.contains(containedSection)) {
                replacementTarget = containedSection;
            } else if (asset.kind === 'image') {
                const paragraph = visual.closest('p');
                if (paragraph
                    && clone.contains(paragraph)
                    && paragraph.querySelectorAll('img').length === 1
                    && !(paragraph.textContent || '').trim()) {
                    replacementTarget = paragraph;
                }
            }

            const placeholder = document.createElement(isBlockVisual || replacementTarget !== visual ? 'p' : 'span');
            placeholder.className = isBlockVisual || replacementTarget !== visual
                ? 'x-block-asset-placeholder'
                : 'x-inline-asset-placeholder';
            placeholder.setAttribute('data-x-asset-placeholder', String(asset.number));
            placeholder.textContent = asset.placeholder;
            replacementTarget.replaceWith(placeholder);
        });

        clone.querySelectorAll('code').forEach((codeElement) => {
            const inlineCode = document.createTextNode(`\`${codeElement.textContent || ''}\``);
            codeElement.replaceWith(inlineCode);
        });

        return {
            html: clone.innerHTML,
            text: (clone.innerText || clone.textContent || '').trim(),
            assets,
            failedAssets: assets.filter(asset => !asset.dataUrl)
        };
    },

    rasterizeImageToPng: async function(imageElement) {
        if (!imageElement) throw new Error('Missing image source');
        const source = imageElement.getAttribute('src') || '';
        if (!source) throw new Error('图片地址为空');

        const rasterSource = await new Promise((resolve, reject) => {
            const image = new Image();
            const timeoutId = setTimeout(() => {
                image.onload = null;
                image.onerror = null;
                reject(new Error('图片读取超时'));
            }, 5000);
            image.onload = () => {
                clearTimeout(timeoutId);
                resolve(image);
            };
            image.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error('浏览器无法读取图片'));
            };
            image.src = source;
        });

        const rect = imageElement.getBoundingClientRect();
        const naturalWidth = rasterSource.naturalWidth || rasterSource.width || 0;
        const naturalHeight = rasterSource.naturalHeight || rasterSource.height || 0;
        const displayWidth = rect.width || naturalWidth;
        const displayHeight = rect.height || naturalHeight;
        if (!displayWidth || !displayHeight) throw new Error('图片尺寸无效');

        const maxDimension = 4096;
        const maxPixels = 12000000;
        const scale = Math.min(
            1,
            maxDimension / naturalWidth,
            maxDimension / naturalHeight,
            Math.sqrt(maxPixels / (naturalWidth * naturalHeight))
        );
        const canvasWidth = Math.max(1, Math.round(naturalWidth * scale));
        const canvasHeight = Math.max(1, Math.round(naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context is unavailable');
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(rasterSource, 0, 0, canvasWidth, canvasHeight);

        return {
            dataUrl: canvas.toDataURL('image/png'),
            displayWidth,
            displayHeight
        };
    },

    rasterizeCodeBlockToPng: async function(preElement, language = '') {
        if (!preElement) throw new Error('Missing code block');
        const codeElement = preElement.querySelector('code') || preElement;
        const source = (codeElement.textContent || '').replace(/\n$/, '').replace(/\t/g, '    ');
        const fontSize = 16;
        const lineHeight = 25;
        const horizontalPadding = 28;
        const verticalPadding = 22;
        const headerHeight = 42;
        const minWidth = 560;
        const maxWidth = 1400;
        const measurementCanvas = document.createElement('canvas');
        const measurementContext = measurementCanvas.getContext('2d');
        if (!measurementContext) throw new Error('Canvas 2D context is unavailable');
        measurementContext.font = `${fontSize}px Menlo, Monaco, Consolas, monospace`;

        const rawLines = source.split('\n');
        const longestLineWidth = rawLines.reduce(
            (maximum, line) => Math.max(maximum, measurementContext.measureText(line || ' ').width),
            0
        );
        const displayWidth = Math.round(Math.min(
            maxWidth,
            Math.max(minWidth, longestLineWidth + horizontalPadding * 2)
        ));
        const availableWidth = displayWidth - horizontalPadding * 2;
        const wrappedLines = [];

        rawLines.forEach((rawLine) => {
            if (!rawLine) {
                wrappedLines.push('');
                return;
            }
            let currentLine = '';
            Array.from(rawLine).forEach((character) => {
                const candidate = currentLine + character;
                if (currentLine && measurementContext.measureText(candidate).width > availableWidth) {
                    wrappedLines.push(currentLine);
                    currentLine = `  ${character}`;
                } else {
                    currentLine = candidate;
                }
            });
            wrappedLines.push(currentLine);
        });
        if (!wrappedLines.length) wrappedLines.push('');

        const displayHeight = headerHeight + verticalPadding * 2 + wrappedLines.length * lineHeight;
        const maxDimension = 4096;
        const maxPixels = 12000000;
        const qualityScale = 2;
        const scale = Math.max(0.25, Math.min(
            qualityScale,
            maxDimension / displayWidth,
            maxDimension / displayHeight,
            Math.sqrt(maxPixels / (displayWidth * displayHeight))
        ));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(displayWidth * scale));
        canvas.height = Math.max(1, Math.round(displayHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context is unavailable');
        context.scale(scale, scale);

        context.fillStyle = '#0f172a';
        context.fillRect(0, 0, displayWidth, displayHeight);
        context.fillStyle = '#111827';
        context.fillRect(0, 0, displayWidth, headerHeight);
        ['#fb7185', '#fbbf24', '#4ade80'].forEach((color, index) => {
            context.beginPath();
            context.arc(20 + index * 18, headerHeight / 2, 5, 0, Math.PI * 2);
            context.fillStyle = color;
            context.fill();
        });

        context.fillStyle = '#94a3b8';
        context.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        context.textAlign = 'right';
        context.textBaseline = 'middle';
        context.fillText(language || 'code', displayWidth - horizontalPadding, headerHeight / 2);

        context.fillStyle = '#e2e8f0';
        context.font = `${fontSize}px Menlo, Monaco, Consolas, monospace`;
        context.textAlign = 'left';
        context.textBaseline = 'alphabetic';
        wrappedLines.forEach((line, index) => {
            const y = headerHeight + verticalPadding + fontSize + index * lineHeight;
            context.fillText(line || ' ', horizontalPadding, y);
        });

        return {
            dataUrl: canvas.toDataURL('image/png'),
            displayWidth,
            displayHeight
        };
    },

    renderXArticleAssets: function(preview, publishingPackage) {
        const section = preview && preview.querySelector('[data-x-asset-section]');
        const list = section && section.querySelector('[data-x-asset-list]');
        const header = section && section.querySelector('.x-asset-section-header');
        if (!section || !list || !header) return;

        section.classList.remove('is-loading', 'has-error');
        const assets = publishingPackage.assets || [];
        if (!assets.length) {
            section.hidden = true;
            return;
        }
        section.hidden = false;

        const headingGroup = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'x-asset-title';
        title.textContent = `X 图片素材 · ${assets.length} 张`;
        const summary = document.createElement('p');
        summary.setAttribute('data-x-asset-summary', '');
        summary.textContent = '文中的占位标记与素材编号一一对应。切回 X 后，在对应位置粘贴或上传。';
        headingGroup.append(title, summary);

        const actions = document.createElement('div');
        actions.className = 'x-asset-header-actions';
        const copyNext = document.createElement('button');
        copyNext.type = 'button';
        copyNext.className = 'x-copy-part-btn x-copy-next-btn';
        copyNext.setAttribute('data-x-asset-action', 'copy-next');
        const downloadAll = document.createElement('button');
        downloadAll.type = 'button';
        downloadAll.className = 'x-copy-part-btn x-download-all-btn';
        downloadAll.setAttribute('data-x-asset-action', 'download-all');
        downloadAll.textContent = '下载全部 ZIP';
        actions.append(copyNext, downloadAll);
        header.replaceChildren(headingGroup, actions);

        list.replaceChildren();
        assets.forEach((asset) => {
            const card = document.createElement('article');
            card.className = 'x-asset-card';
            card.setAttribute('data-x-asset-index', String(asset.index));
            if (!asset.dataUrl) card.classList.add('has-error');

            const thumbnail = document.createElement('div');
            thumbnail.className = 'x-asset-thumbnail';
            if (asset.dataUrl) {
                const image = document.createElement('img');
                image.src = asset.dataUrl;
                image.alt = asset.typeLabel;
                thumbnail.appendChild(image);
            } else {
                thumbnail.textContent = '转换失败';
            }

            const details = document.createElement('div');
            details.className = 'x-asset-details';
            const assetTitle = document.createElement('strong');
            assetTitle.textContent = `图片 ${asset.number} · ${asset.typeLabel}`;
            const marker = document.createElement('code');
            marker.textContent = asset.placeholder;
            details.append(assetTitle, marker);
            if (asset.error) {
                const error = document.createElement('small');
                error.textContent = asset.error;
                details.appendChild(error);
            }

            const cardActions = document.createElement('div');
            cardActions.className = 'x-asset-card-actions';
            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.className = 'x-asset-action-btn';
            copyButton.setAttribute('data-x-asset-action', 'copy');
            copyButton.setAttribute('data-x-asset-index', String(asset.index));
            copyButton.textContent = '复制图片';
            const downloadButton = document.createElement('button');
            downloadButton.type = 'button';
            downloadButton.className = 'x-asset-action-btn is-secondary';
            downloadButton.setAttribute('data-x-asset-action', 'download');
            downloadButton.setAttribute('data-x-asset-index', String(asset.index));
            downloadButton.textContent = '下载 PNG';
            copyButton.disabled = !asset.dataUrl;
            downloadButton.disabled = !asset.dataUrl;
            cardActions.append(copyButton, downloadButton);

            card.append(thumbnail, details, cardActions);
            list.appendChild(card);
        });

        this.updateXAssetQueueUI(section);
        if (publishingPackage.failedAssets.length) {
            this.showCopyNotice(
                `${publishingPackage.failedAssets.length} 张 X 素材转换失败，请检查原图后重新生成。`,
                true
            );
        }
    },

    updateXAssetQueueUI: function(section) {
        const root = section || document.querySelector('[data-x-asset-section]');
        if (!root || !this.xArticlePackage) return;
        const assets = this.xArticlePackage.assets || [];
        const nextIndex = assets.findIndex(asset => asset.dataUrl && !this.xCopiedAssetIndexes.has(asset.index));
        this.xAssetQueueIndex = nextIndex;

        root.querySelectorAll('[data-x-asset-index]').forEach((element) => {
            const index = Number(element.getAttribute('data-x-asset-index'));
            if (element.classList.contains('x-asset-card')) {
                element.classList.toggle('is-copied', this.xCopiedAssetIndexes.has(index));
            }
        });

        const copyNext = root.querySelector('[data-x-asset-action="copy-next"]');
        if (copyNext) {
            if (nextIndex < 0) {
                copyNext.textContent = '✅ 素材已复制完';
                copyNext.disabled = true;
            } else {
                copyNext.textContent = `复制下一张（${nextIndex + 1}/${assets.length}）`;
                copyNext.disabled = false;
            }
        }
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

        const sourceMarkdown = markdownInput.value;
        const markdown = typeof ImageHandler !== 'undefined'
            ? ImageHandler.hydrateLocalImageReferences(sourceMarkdown)
            : sourceMarkdown;
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
        const copyButton = target && typeof target.closest === 'function'
            ? target.closest('[data-x-copy]')
            : null;
        if (copyButton) {
            this.copyXPublishingPart(copyButton);
            return;
        }

        const assetButton = target && typeof target.closest === 'function'
            ? target.closest('[data-x-asset-action]')
            : null;
        if (!assetButton) return;
        const action = assetButton.getAttribute('data-x-asset-action');
        const index = Number(assetButton.getAttribute('data-x-asset-index'));
        if (action === 'copy') {
            this.copyXArticleAsset(index, assetButton);
        } else if (action === 'copy-next') {
            this.copyNextXArticleAsset(assetButton);
        } else if (action === 'download') {
            this.downloadXArticleAsset(index, assetButton);
        } else if (action === 'download-all') {
            this.downloadAllXArticleAssets(assetButton);
        }
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
        let publishingPackage = null;
        if (kind === 'article') {
            button.textContent = '正在整理文字和素材...';
            try {
                publishingPackage = await this.ensureXArticlePackageReady();
            } catch (error) {
                button.textContent = originalLabel;
                this.showCopyNotice('X 图片素材整理失败，请重新生成预览后再试。', true);
                return;
            }
            if (publishingPackage) {
                success = await this.copyHtmlToClipboard(publishingPackage.html, publishingPackage.text);
                const articleContent = button.closest('.x-article-card')
                    ? button.closest('.x-article-card').querySelector('.x-article-content')
                    : document.querySelector('#preview .x-article-content');
                if (!success && articleContent) {
                    success = this.copyRenderedPreviewToClipboard(articleContent, publishingPackage.html);
                }
            }
        }
        if (!success) {
            success = await this.copyToClipboard(
                kind === 'article' && publishingPackage ? publishingPackage.text : content
            );
        }
        if (success) {
            if (kind === 'article') {
                const assetCount = publishingPackage ? publishingPackage.assets.length : 0;
                const failedCount = publishingPackage ? publishingPackage.failedAssets.length : 0;
                this.showCopySuccess(button, originalLabel, '✅ 文字已复制');
                if (assetCount) {
                    const failureText = failedCount ? `，其中 ${failedCount} 张转换失败` : '';
                    this.showCopyNotice(
                        `Article 文字已复制。请在 X 中按编号上传下方 ${assetCount} 张图片素材${failureText}。`,
                        failedCount > 0
                    );
                } else {
                    this.showCopyNotice('Article 文字已复制，这篇文章没有需要单独上传的图片。', false);
                }
            } else {
                this.showCopySuccess(button, originalLabel);
            }
        } else {
            alert('复制失败，请手动复制');
        }
    },

    dataUrlToBlob: function(dataUrl) {
        const match = String(dataUrl || '').match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
        if (!match) throw new Error('Invalid image data URL');
        const mimeType = match[1] || 'application/octet-stream';
        const binary = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return new Blob([bytes], { type: mimeType });
    },

    copyXArticleAsset: async function(index, button) {
        let publishingPackage;
        try {
            publishingPackage = await this.ensureXArticlePackageReady();
        } catch (_) {
            this.showCopyNotice('X 图片素材尚未准备好，请重新生成预览。', true);
            return false;
        }
        const asset = publishingPackage && publishingPackage.assets
            ? publishingPackage.assets[index]
            : null;
        if (!asset || !asset.dataUrl) {
            this.showCopyNotice('这张素材转换失败，暂时无法复制。', true);
            return false;
        }

        const originalLabel = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = '正在复制...';
        }

        try {
            if (!navigator.clipboard
                || typeof navigator.clipboard.write !== 'function'
                || typeof window.ClipboardItem === 'undefined') {
                throw new Error('当前浏览器不支持复制图片');
            }
            const pngBlob = this.dataUrlToBlob(asset.dataUrl);
            const clipboardItem = new ClipboardItem({ 'image/png': pngBlob });
            await navigator.clipboard.write([clipboardItem]);
            this.xCopiedAssetIndexes.add(asset.index);
            this.updateXAssetQueueUI();

            if (button && button.getAttribute('data-x-asset-action') === 'copy') {
                this.showCopySuccess(button, originalLabel, '✅ 图片已复制');
            }
            this.showCopyNotice(
                `图片 ${asset.number} 已复制。切回 X，在 ${asset.placeholder} 的位置粘贴。`,
                false
            );
            return true;
        } catch (error) {
            console.warn('Failed to copy X Article image asset:', error);
            if (button) {
                button.disabled = false;
                button.textContent = originalLabel;
            }
            this.showCopyNotice('图片复制失败，可先点击“下载 PNG”再上传到 X。', true);
            return false;
        }
    },

    copyNextXArticleAsset: async function(button) {
        const publishingPackage = await this.ensureXArticlePackageReady();
        const assets = publishingPackage ? publishingPackage.assets || [] : [];
        const nextAsset = assets.find(asset => asset.dataUrl && !this.xCopiedAssetIndexes.has(asset.index));
        if (!nextAsset) {
            this.updateXAssetQueueUI();
            return false;
        }
        return this.copyXArticleAsset(nextAsset.index, button);
    },

    triggerBlobDownload: function(blobOrUrl, filename) {
        const isBlob = typeof Blob !== 'undefined' && blobOrUrl instanceof Blob;
        const url = isBlob ? URL.createObjectURL(blobOrUrl) : blobOrUrl;
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        if (isBlob) {
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    },

    downloadXArticleAsset: async function(index, button) {
        const publishingPackage = await this.ensureXArticlePackageReady();
        const asset = publishingPackage && publishingPackage.assets
            ? publishingPackage.assets[index]
            : null;
        if (!asset || !asset.dataUrl) {
            this.showCopyNotice('这张素材转换失败，暂时无法下载。', true);
            return;
        }
        this.triggerBlobDownload(asset.dataUrl, asset.filename);
        if (button) this.showCopySuccess(button, button.textContent, '✅ 已下载');
    },

    createStoredZipBlob: async function(assets) {
        const encoder = new TextEncoder();
        const entries = await Promise.all(assets.filter(asset => asset.dataUrl).map(async (asset) => {
            const blob = this.dataUrlToBlob(asset.dataUrl);
            return {
                name: encoder.encode(asset.filename),
                bytes: new Uint8Array(await blob.arrayBuffer())
            };
        }));
        if (!entries.length) throw new Error('No image assets to archive');

        const crcTable = new Uint32Array(256);
        for (let index = 0; index < 256; index += 1) {
            let value = index;
            for (let bit = 0; bit < 8; bit += 1) {
                value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
            }
            crcTable[index] = value >>> 0;
        }
        const crc32 = (bytes) => {
            let crc = 0xffffffff;
            bytes.forEach(byte => {
                crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
            });
            return (crc ^ 0xffffffff) >>> 0;
        };
        const joinBytes = (parts) => {
            const total = parts.reduce((sum, part) => sum + part.length, 0);
            const output = new Uint8Array(total);
            let offset = 0;
            parts.forEach((part) => {
                output.set(part, offset);
                offset += part.length;
            });
            return output;
        };

        const localParts = [];
        const centralParts = [];
        let localOffset = 0;
        entries.forEach((entry) => {
            const crc = crc32(entry.bytes);
            const localHeader = new Uint8Array(30 + entry.name.length);
            const localView = new DataView(localHeader.buffer);
            localView.setUint32(0, 0x04034b50, true);
            localView.setUint16(4, 20, true);
            localView.setUint16(6, 0, true);
            localView.setUint16(8, 0, true);
            localView.setUint32(10, 0, true);
            localView.setUint32(14, crc, true);
            localView.setUint32(18, entry.bytes.length, true);
            localView.setUint32(22, entry.bytes.length, true);
            localView.setUint16(26, entry.name.length, true);
            localView.setUint16(28, 0, true);
            localHeader.set(entry.name, 30);
            localParts.push(localHeader, entry.bytes);

            const centralHeader = new Uint8Array(46 + entry.name.length);
            const centralView = new DataView(centralHeader.buffer);
            centralView.setUint32(0, 0x02014b50, true);
            centralView.setUint16(4, 20, true);
            centralView.setUint16(6, 20, true);
            centralView.setUint16(8, 0, true);
            centralView.setUint16(10, 0, true);
            centralView.setUint32(12, 0, true);
            centralView.setUint32(16, crc, true);
            centralView.setUint32(20, entry.bytes.length, true);
            centralView.setUint32(24, entry.bytes.length, true);
            centralView.setUint16(28, entry.name.length, true);
            centralView.setUint16(30, 0, true);
            centralView.setUint16(32, 0, true);
            centralView.setUint16(34, 0, true);
            centralView.setUint16(36, 0, true);
            centralView.setUint32(38, 0, true);
            centralView.setUint32(42, localOffset, true);
            centralHeader.set(entry.name, 46);
            centralParts.push(centralHeader);
            localOffset += localHeader.length + entry.bytes.length;
        });

        const localData = joinBytes(localParts);
        const centralData = joinBytes(centralParts);
        const end = new Uint8Array(22);
        const endView = new DataView(end.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(4, 0, true);
        endView.setUint16(6, 0, true);
        endView.setUint16(8, entries.length, true);
        endView.setUint16(10, entries.length, true);
        endView.setUint32(12, centralData.length, true);
        endView.setUint32(16, localData.length, true);
        endView.setUint16(20, 0, true);
        return new Blob([localData, centralData, end], { type: 'application/zip' });
    },

    downloadAllXArticleAssets: async function(button) {
        const originalLabel = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = '正在打包...';
        }
        try {
            const publishingPackage = await this.ensureXArticlePackageReady();
            const zip = await this.createStoredZipBlob(publishingPackage.assets || []);
            this.triggerBlobDownload(zip, 'x-article-images.zip');
            if (button) this.showCopySuccess(button, originalLabel, '✅ ZIP 已下载');
            this.showCopyNotice('全部 X 图片素材已下载，可按文件编号上传。', false);
        } catch (error) {
            console.warn('Failed to download X Article asset archive:', error);
            if (button) {
                button.disabled = false;
                button.textContent = originalLabel;
            }
            this.showCopyNotice('图片素材打包失败，请改为逐张下载。', true);
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

        let markdown = markdownInput.value;
        if (typeof ImageHandler !== 'undefined') {
            const selectionStart = markdownInput.selectionStart;
            const selectionEnd = markdownInput.selectionEnd;
            const wasAtEnd = selectionStart === markdown.length && selectionEnd === markdown.length;
            const compacted = ImageHandler.compactEmbeddedImages(markdown);
            if (compacted.compactedCount > 0) {
                markdown = compacted.markdown;
                markdownInput.value = markdown;
                const nextStart = wasAtEnd ? markdown.length : Math.min(selectionStart, markdown.length);
                const nextEnd = wasAtEnd ? markdown.length : Math.min(selectionEnd, markdown.length);
                markdownInput.setSelectionRange(nextStart, nextEnd);
                this.showCopyNotice(`已把 ${compacted.compactedCount} 张内嵌图片收起为短引用。`, false);
            }
        }
        this.updateLocalImageReferenceStatus(markdown);
        const renderMarkdown = typeof ImageHandler !== 'undefined'
            ? ImageHandler.hydrateLocalImageReferences(markdown)
            : markdown;
        const channel = channelSelect ? channelSelect.value : 'wechat';
        const themeColor = this.getCurrentThemeColor();
        this.currentChannel = channel;
        this.updateChannelReminder(channel);
        const taskToken = ++this.renderTaskToken;

        if (!markdown.trim()) {
            this.currentRenderedResult = null;
            if (typeof App !== 'undefined' && typeof App.clearPreview === 'function') {
                App.clearPreview();
            } else {
                htmlOutput.value = '';
                preview.innerHTML = '';
            }
            this.updateCopyButtonLabels();
            return;
        }

        try {
            const shouldShowWechatLoading = channel === 'wechat'
                && renderMarkdown.includes('```mermaid')
                && typeof MarkdownConverter.hasMermaidSupport === 'function'
                && MarkdownConverter.hasMermaidSupport();

            if (shouldShowWechatLoading || channel !== 'wechat') {
                this.showLoading();
            }

            const rendered = await ChannelConverter.renderForChannel(channel, renderMarkdown, {
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

    updateCopyButtonLabels: function() {
        const previewButton = document.getElementById('copyPreviewBtn');

        if (previewButton && !previewButton.classList.contains('success')) {
            previewButton.textContent = this.getCopyPreviewButtonLabel();
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

    addRasterizedImagesToReport: function(report, converted) {
        const count = Number(converted) || 0;
        if (!count) return report;
        const current = report || {};
        return {
            ...current,
            total: (Number(current.total) || 0) + count,
            embedded: (Number(current.embedded) || 0) + count,
            external: Number(current.external) || 0,
            failures: Array.isArray(current.failures) ? current.failures : []
        };
    },

    preparePortableRichClipboard: async function(sourceElement) {
        if (!sourceElement) {
            throw new Error('Missing rich clipboard source');
        }

        const clone = sourceElement.cloneNode(true);
        const sourceSvgs = Array.from(sourceElement.querySelectorAll('svg'))
            .filter(svg => !svg.parentElement || !svg.parentElement.closest('svg'));
        const cloneSvgs = Array.from(clone.querySelectorAll('svg'))
            .filter(svg => !svg.parentElement || !svg.parentElement.closest('svg'));

        if (sourceSvgs.length !== cloneSvgs.length) {
            throw new Error('SVG clone count mismatch');
        }

        for (let index = 0; index < sourceSvgs.length; index += 1) {
            const sourceSvg = sourceSvgs[index];
            const cloneSvg = cloneSvgs[index];
            const raster = await this.rasterizeSvgToPng(sourceSvg);
            const image = document.createElement('img');
            const isMath = !!sourceSvg.querySelector('[data-mml-node="math"]');
            const isBlock = !isMath || !!sourceSvg.closest('section');

            image.src = raster.dataUrl;
            image.alt = isMath ? '数学公式' : 'Mermaid 图表';
            image.width = Math.max(1, Math.round(raster.displayWidth));
            image.height = Math.max(1, Math.round(raster.displayHeight));
            image.setAttribute('data-rasterized-svg', isMath ? 'math' : 'mermaid');
            image.style.maxWidth = '100%';
            image.style.height = 'auto';
            image.style.verticalAlign = 'middle';
            image.style.display = isBlock ? 'block' : 'inline-block';
            image.style.margin = isBlock ? '12px auto' : '0 0.15em';
            cloneSvg.replaceWith(image);
        }

        return {
            html: clone.innerHTML,
            text: sourceElement.innerText || '',
            converted: sourceSvgs.length
        };
    },

    rasterizeSvgToPng: async function(svgElement) {
        if (!svgElement || typeof XMLSerializer === 'undefined') {
            throw new Error('SVG serialization is unavailable');
        }

        const rect = svgElement.getBoundingClientRect();
        const viewBox = svgElement.viewBox && svgElement.viewBox.baseVal;
        const attributeWidth = parseFloat(svgElement.getAttribute('width')) || 0;
        const attributeHeight = parseFloat(svgElement.getAttribute('height')) || 0;
        const displayWidth = rect.width || attributeWidth || (viewBox && viewBox.width) || 640;
        const displayHeight = rect.height || attributeHeight || (viewBox && viewBox.height) || 360;

        if (!Number.isFinite(displayWidth) || !Number.isFinite(displayHeight)
            || displayWidth <= 0 || displayHeight <= 0) {
            throw new Error('SVG has invalid dimensions');
        }

        const maxDimension = 4096;
        const maxPixels = 12000000;
        const qualityScale = 2;
        const scale = Math.max(1, Math.min(
            qualityScale,
            maxDimension / displayWidth,
            maxDimension / displayHeight,
            Math.sqrt(maxPixels / (displayWidth * displayHeight))
        ));
        const canvasWidth = Math.max(1, Math.round(displayWidth * scale));
        const canvasHeight = Math.max(1, Math.round(displayHeight * scale));

        const svgClone = svgElement.cloneNode(true);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svgClone.setAttribute('width', String(displayWidth));
        svgClone.setAttribute('height', String(displayHeight));
        svgClone.style.maxWidth = 'none';
        svgClone.style.width = `${displayWidth}px`;
        svgClone.style.height = `${displayHeight}px`;

        const serialized = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(svgBlob);

        try {
            const rasterSource = await new Promise((resolve, reject) => {
                const image = new Image();
                const timeoutId = setTimeout(() => {
                    image.onload = null;
                    image.onerror = null;
                    reject(new Error('SVG decoding timed out'));
                }, 5000);
                image.onload = () => {
                    clearTimeout(timeoutId);
                    resolve(image);
                };
                image.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(new Error('Browser could not decode SVG'));
                };
                image.src = objectUrl;
            });
            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Canvas 2D context is unavailable');
            }
            context.clearRect(0, 0, canvasWidth, canvasHeight);
            context.drawImage(rasterSource, 0, 0, canvasWidth, canvasHeight);
            return {
                dataUrl: canvas.toDataURL('image/png'),
                displayWidth,
                displayHeight
            };
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    },

    copyRenderedPreviewToClipboard: function(previewElement, htmlOverride = '') {
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
        sandbox.innerHTML = htmlOverride || previewElement.innerHTML;
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

        if (channel === 'x') {
            button.setAttribute('data-x-copy', 'article');
            await this.copyXPublishingPart(button);
            button.removeAttribute('data-x-copy');
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
            let previewHtml = preview ? preview.innerHTML : '';
            const previewText = preview ? preview.innerText : '';
            const needsPortableImages = !!(activeChannel && activeChannel.portableRichCopy)
                && preview
                && preview.querySelector('svg');
            if (needsPortableImages) {
                button.textContent = '正在转换图表...';
                try {
                    const portable = await this.preparePortableRichClipboard(preview);
                    previewHtml = portable.html;
                    imageReport = this.addRasterizedImagesToReport(imageReport, portable.converted);
                } catch (error) {
                    console.error(`Failed to prepare portable ${channel} clipboard content:`, error);
                    button.textContent = originalLabel;
                    this.showCopyNotice('Mermaid 或公式转图片失败，请重试。', true);
                    return;
                }
            }
            success = await this.copyHtmlToClipboard(previewHtml, previewText);
            if (!success) {
                success = this.copyRenderedPreviewToClipboard(preview, previewHtml);
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
