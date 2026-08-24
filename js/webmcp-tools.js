// WebMCP integration: expose converter capabilities to in-browser AI agents.
(function () {
    const WebMCPTools = {
        controller: null,
        registered: false,
        registrationPromise: null,

        getModelContext() {
            if (typeof document === 'undefined') return null;
            return document.modelContext || null;
        },

        getToolDefinitions() {
            return [
                {
                    name: 'convert_markdown',
                    title: '转换 Markdown 发布内容',
                    description: 'Convert source Markdown into the publishing formats produced by this page for WeChat, Substack / LinkedIn, or X.',
                    inputSchema: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            markdown: {
                                type: 'string',
                                description: 'The source Markdown content to convert.'
                            },
                            channel: {
                                type: 'string',
                                enum: ['wechat', 'substack', 'linkedin', 'x'],
                                description: 'Target channel. linkedin is an alias of the shared Substack / LinkedIn formatter.'
                            },
                            output_language: {
                                type: 'string',
                                enum: ['zh', 'en'],
                                default: 'zh',
                                description: 'Output language. English output uses the configured translator when Chinese text is present.'
                            },
                            theme: {
                                type: 'string',
                                description: 'Optional WeChat theme id or a #RGB / #RRGGBB color.'
                            },
                            template: {
                                type: 'string',
                                description: 'Optional WeChat template id returned by list_wechat_templates.'
                            },
                            mode: {
                                type: 'string',
                                enum: ['compact', 'standard'],
                                default: 'compact',
                                description: 'Optional WeChat spacing mode.'
                            },
                            use_ai: {
                                type: 'boolean',
                                default: false,
                                description: 'For X only. Generate the recommendation and Thread with the configured OpenRouter connection.'
                            }
                        },
                        required: ['markdown', 'channel']
                    },
                    annotations: {
                        readOnlyHint: true,
                        untrustedContentHint: true
                    },
                    execute: async (input) => this.convertMarkdown(input)
                },
                {
                    name: 'list_supported_channels',
                    title: '列出发布渠道',
                    description: 'List supported publishing channels, aliases, and output formats.',
                    inputSchema: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {}
                    },
                    annotations: { readOnlyHint: true },
                    execute: async () => this.listSupportedChannels()
                },
                {
                    name: 'list_wechat_templates',
                    title: '列出微信模板',
                    description: 'List available WeChat rendering templates without changing the active template.',
                    inputSchema: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {}
                    },
                    annotations: { readOnlyHint: true },
                    execute: async () => this.listWechatTemplates()
                }
            ];
        },

        async init() {
            if (this.registered) return true;
            if (this.registrationPromise) return this.registrationPromise;

            const modelContext = this.getModelContext();
            if (!modelContext || typeof modelContext.registerTool !== 'function') {
                console.log('WebMCP not available in this browser; skipping tool registration.');
                return false;
            }

            const controller = new AbortController();
            this.controller = controller;
            const registrations = this.getToolDefinitions().map((tool) => (
                Promise.resolve(modelContext.registerTool(tool, { signal: controller.signal }))
            ));

            const registrationPromise = Promise.all(registrations)
                .then(() => {
                    if (controller.signal.aborted) return false;
                    this.registered = true;
                    console.log('WebMCP tools registered successfully.');
                    return true;
                })
                .catch((error) => {
                    if (!controller.signal.aborted) {
                        console.warn('Failed to register WebMCP tools:', error);
                    }
                    controller.abort();
                    if (this.controller === controller) this.controller = null;
                    this.registered = false;
                    return false;
                })
                .finally(() => {
                    if (this.registrationPromise === registrationPromise) {
                        this.registrationPromise = null;
                    }
                });

            this.registrationPromise = registrationPromise;
            return registrationPromise;
        },

        outputFormat(channel) {
            return {
                wechat: 'html',
                substack: 'markdown_and_html',
                x: 'publishing_bundle'
            }[channel] || 'text';
        },

        normalizeChannel(channel) {
            const requested = typeof channel === 'string' ? channel.trim().toLowerCase() : '';
            if (!requested) throw new Error('channel is required');

            const aliases = (typeof ChannelConverter !== 'undefined' && ChannelConverter.channelAliases) || {};
            const canonical = aliases[requested] || requested;
            const supported = ChannelConverter.listChannels().map((item) => item.id);
            if (!supported.includes(canonical)) {
                throw new Error(`Unsupported channel: ${requested}`);
            }
            return { requested, canonical };
        },

        normalizeTheme(theme) {
            if (theme === undefined || theme === null || theme === '') return null;
            if (typeof theme !== 'string') throw new Error('theme must be a string');

            const value = theme.trim();
            if (!value) return null;
            if (AppConfig.themes && AppConfig.themes[value]) {
                return { id: value, color: AppConfig.themes[value].primary };
            }
            if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
                return { id: 'custom', color: value };
            }
            throw new Error(`Unknown theme id or invalid hex color: ${value}`);
        },

        resolveTheme(theme) {
            const explicitTheme = this.normalizeTheme(theme);
            if (explicitTheme) return explicitTheme;

            if (typeof UIController !== 'undefined') {
                if (UIController.currentTheme === 'custom' && UIController.customColor) {
                    const customTheme = this.normalizeTheme(UIController.customColor);
                    if (customTheme) return customTheme;
                }
                if (UIController.currentTheme && AppConfig.themes[UIController.currentTheme]) {
                    return {
                        id: UIController.currentTheme,
                        color: AppConfig.themes[UIController.currentTheme].primary
                    };
                }
            }

            const defaultId = AppConfig.defaults.theme;
            return {
                id: defaultId,
                color: AppConfig.themes[defaultId].primary
            };
        },

        resolveTemplate(template) {
            if (typeof TemplateManager === 'undefined' || typeof TemplateManager.list !== 'function') {
                throw new Error('TemplateManager is not available');
            }

            const requested = typeof template === 'string' ? template.trim() : '';
            const templateId = requested || TemplateManager.activeId || '';
            const exists = TemplateManager.list().some((item) => item.id === templateId);
            if (!exists) throw new Error(`Unknown template id: ${templateId || requested}`);
            return templateId;
        },

        normalizeLanguage(language) {
            const value = typeof language === 'string' && language.trim()
                ? language.trim().toLowerCase()
                : 'zh';
            if (!['zh', 'en'].includes(value)) {
                throw new Error(`Unsupported output language: ${value}`);
            }
            return value;
        },

        normalizeMode(mode) {
            const value = typeof mode === 'string' && mode.trim()
                ? mode.trim().toLowerCase()
                : ((AppConfig.defaults && AppConfig.defaults.mode) || 'compact');
            if (!['compact', 'standard'].includes(value)) {
                throw new Error(`Unsupported mode: ${value}`);
            }
            return value;
        },

        hydrateLocalImages(markdown) {
            if (typeof ImageHandler === 'undefined') return markdown;

            if (typeof ImageHandler.getLocalImageReferenceStatus === 'function') {
                const status = ImageHandler.getLocalImageReferenceStatus(markdown);
                if (status && Array.isArray(status.unresolvedReferences) && status.unresolvedReferences.length) {
                    throw new Error(
                        `${status.unresolvedReferences.length} local image reference(s) are unresolved; add the matching images in the page first.`
                    );
                }
            }
            if (typeof ImageHandler.hydrateLocalImageReferences === 'function') {
                return ImageHandler.hydrateLocalImageReferences(markdown);
            }
            return markdown;
        },

        successResponse(tool, result) {
            return {
                ok: true,
                tool,
                result,
                content: [{ type: 'text', text: JSON.stringify(result) }],
                structuredContent: result
            };
        },

        errorResponse(tool, error) {
            const message = error && error.message ? error.message : String(error);
            return {
                ok: false,
                tool,
                error: message,
                isError: true,
                content: [{ type: 'text', text: message }]
            };
        },

        async convertMarkdown(input = {}) {
            try {
                if (typeof ChannelConverter === 'undefined') {
                    throw new Error('ChannelConverter is not available');
                }

                const markdown = typeof input.markdown === 'string' ? input.markdown : '';
                if (!markdown.trim()) throw new Error('markdown is required');

                const channel = this.normalizeChannel(input.channel);
                const outputLanguage = this.normalizeLanguage(input.output_language);
                const mode = this.normalizeMode(input.mode);
                const useAI = input.use_ai === undefined ? false : input.use_ai;
                if (typeof useAI !== 'boolean') throw new Error('use_ai must be a boolean');
                if (useAI && channel.canonical !== 'x') {
                    throw new Error('use_ai is only supported for the X channel');
                }
                if (channel.canonical !== 'wechat' && (input.theme || input.template)) {
                    throw new Error('theme and template are only supported for the WeChat channel');
                }

                const theme = channel.canonical === 'wechat' ? this.resolveTheme(input.theme) : null;
                const templateId = channel.canonical === 'wechat'
                    ? this.resolveTemplate(input.template)
                    : null;
                const hydratedMarkdown = this.hydrateLocalImages(markdown);
                const result = await ChannelConverter.renderForChannel(
                    channel.canonical,
                    hydratedMarkdown,
                    {
                        themeColor: theme && theme.color,
                        templateId,
                        mode,
                        outputLanguage,
                        useAI
                    }
                );

                return this.successResponse('convert_markdown', {
                    requested_channel: channel.requested,
                    channel: result.channel && result.channel.id
                        ? result.channel.id
                        : channel.canonical,
                    output_language: outputLanguage,
                    output_format: this.outputFormat(channel.canonical),
                    output: result.output || '',
                    preview_html: result.previewHtml || '',
                    preview_mode: result.previewMode || 'plain',
                    template_used: channel.canonical === 'wechat' ? templateId : null,
                    theme_used: channel.canonical === 'wechat' ? theme.id : null,
                    theme_color_used: channel.canonical === 'wechat' ? theme.color : null,
                    needs_math_typeset: !!result.needsMathTypeset,
                    data: result.data || null
                });
            } catch (error) {
                return this.errorResponse('convert_markdown', error);
            }
        },

        async listSupportedChannels() {
            try {
                const aliases = (typeof ChannelConverter !== 'undefined' && ChannelConverter.channelAliases) || {};
                const channels = ChannelConverter.listChannels().map((channel) => ({
                    id: channel.id,
                    name: channel.name,
                    aliases: Object.keys(aliases).filter((alias) => aliases[alias] === channel.id),
                    output_format: this.outputFormat(channel.id),
                    supports_language: true,
                    supports_template: channel.id === 'wechat',
                    supports_theme: channel.id === 'wechat',
                    supports_ai: channel.id === 'x'
                }));
                return this.successResponse('list_supported_channels', { channels });
            } catch (error) {
                return this.errorResponse('list_supported_channels', error);
            }
        },

        async listWechatTemplates() {
            try {
                return this.successResponse('list_wechat_templates', {
                    templates: TemplateManager.list(),
                    active_template: TemplateManager.activeId || null
                });
            } catch (error) {
                return this.errorResponse('list_wechat_templates', error);
            }
        },

        destroy() {
            if (this.controller) this.controller.abort();
            this.controller = null;
            this.registered = false;
            this.registrationPromise = null;
        }
    };

    if (typeof window !== 'undefined') {
        window.WebMCPTools = WebMCPTools;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WebMCPTools;
    }
})();
