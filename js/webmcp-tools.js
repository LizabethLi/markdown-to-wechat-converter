// WebMCP integration: expose converter capabilities to in-browser AI agents.
(function () {
    const WebMCPTools = {
        controller: null,
        registered: false,
        registrationAttempted: false,

        init() {
            if (this.registrationAttempted) return;
            this.registrationAttempted = true;

            const modelContext = document && document.modelContext;
            if (!modelContext || typeof modelContext.registerTool !== 'function') {
                console.log('WebMCP not available in this browser; skipping tool registration.');
                return;
            }

            try {
                this.controller = new AbortController();
                const signal = this.controller.signal;

                modelContext.registerTool({
                    name: 'convert_markdown',
                    description: 'Convert source markdown into a channel-specific publishing format using this page built-in formatters.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            markdown: {
                                type: 'string',
                                description: 'The source markdown content to convert.'
                            },
                            channel: {
                                type: 'string',
                                enum: ['wechat', 'substack', 'linkedin', 'x'],
                                description: 'Target output channel.'
                            },
                            theme: {
                                type: 'string',
                                description: 'Optional WeChat theme id or custom hex color.'
                            },
                            template: {
                                type: 'string',
                                description: 'Optional WeChat template id.'
                            }
                        },
                        required: ['markdown', 'channel']
                    },
                    execute: async (input) => this.convertMarkdown(input)
                }, { signal });

                modelContext.registerTool({
                    name: 'list_supported_channels',
                    description: 'List supported publishing channels and their output formats.',
                    inputSchema: { type: 'object', properties: {} },
                    execute: async () => this.listSupportedChannels()
                }, { signal });

                modelContext.registerTool({
                    name: 'list_wechat_templates',
                    description: 'List available WeChat rendering templates.',
                    inputSchema: { type: 'object', properties: {} },
                    execute: async () => this.listWechatTemplates()
                }, { signal });

                this.registered = true;
                console.log('WebMCP tools registered successfully.');
            } catch (error) {
                console.warn('Failed to register WebMCP tools:', error);
            }
        },

        outputFormat(channel) {
            return {
                wechat: 'html',
                substack: 'markdown',
                linkedin: 'text',
                x: 'thread_text'
            }[channel] || 'text';
        },

        normalizeTheme(theme) {
            if (!theme || typeof theme !== 'string') return null;
            const value = theme.trim();
            if (!value) return null;
            if (AppConfig.themes && AppConfig.themes[value]) {
                return { id: value, color: AppConfig.themes[value].primary };
            }
            if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
                return { id: 'custom', color: value };
            }
            return { id: null, color: value };
        },

        async convertMarkdown(input = {}) {
            try {
                if (typeof ChannelConverter === 'undefined') {
                    throw new Error('ChannelConverter is not available');
                }

                const markdown = typeof input.markdown === 'string' ? input.markdown : '';
                const channel = typeof input.channel === 'string' ? input.channel.trim() : '';
                if (!markdown.trim()) throw new Error('markdown is required');
                if (!channel) throw new Error('channel is required');

                const supported = ChannelConverter.listChannels().map((item) => item.id);
                if (!supported.includes(channel)) {
                    throw new Error(`Unsupported channel: ${channel}`);
                }

                let templateUsed = null;
                if (channel === 'wechat') {
                    if (input.template) {
                        if (!TemplateManager.setActive(input.template)) {
                            throw new Error(`Unknown template id: ${input.template}`);
                        }
                        templateUsed = input.template;
                    } else {
                        templateUsed = TemplateManager.activeId || null;
                    }
                }

                const theme = this.normalizeTheme(input.theme);
                const result = await ChannelConverter.renderForChannel(channel, markdown, {
                    themeColor: theme && theme.color,
                    mode: (AppConfig.defaults && AppConfig.defaults.mode) || 'compact'
                });

                return {
                    ok: true,
                    tool: 'convert_markdown',
                    result: {
                        channel,
                        output_format: this.outputFormat(channel),
                        output: result.output || '',
                        preview_mode: result.previewMode || 'plain',
                        template_used: channel === 'wechat' ? templateUsed : null,
                        theme_used: channel === 'wechat' ? ((theme && theme.id) || AppConfig.defaults.theme) : null,
                        theme_color_used: channel === 'wechat' ? ((theme && theme.color) || null) : null,
                        needs_math_typeset: !!result.needsMathTypeset
                    }
                };
            } catch (error) {
                return {
                    ok: false,
                    tool: 'convert_markdown',
                    error: error && error.message ? error.message : String(error)
                };
            }
        },

        async listSupportedChannels() {
            try {
                const channels = ChannelConverter.listChannels().map((channel) => ({
                    id: channel.id,
                    name: channel.name,
                    output_format: this.outputFormat(channel.id),
                    supports_template: channel.id === 'wechat',
                    supports_theme: channel.id === 'wechat'
                }));
                return {
                    ok: true,
                    tool: 'list_supported_channels',
                    result: { channels }
                };
            } catch (error) {
                return {
                    ok: false,
                    tool: 'list_supported_channels',
                    error: error && error.message ? error.message : String(error)
                };
            }
        },

        async listWechatTemplates() {
            try {
                return {
                    ok: true,
                    tool: 'list_wechat_templates',
                    result: {
                        templates: TemplateManager.list(),
                        active_template: TemplateManager.activeId || null
                    }
                };
            } catch (error) {
                return {
                    ok: false,
                    tool: 'list_wechat_templates',
                    error: error && error.message ? error.message : String(error)
                };
            }
        },

        destroy() {
            if (this.controller) this.controller.abort();
            this.controller = null;
            this.registered = false;
            this.registrationAttempted = false;
        }
    };

    window.WebMCPTools = WebMCPTools;
})();
