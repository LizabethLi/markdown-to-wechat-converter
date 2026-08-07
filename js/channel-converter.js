// Channel-specific output adapters focused on copy/paste-ready formats.
const stripLeadMarkers = (text) =>
    text.replace(/(^|\n)[ \t]*\[\s*lead\s*\][ \t]*/gi, '$1');

const ChannelConverter = {
    channels: {
        wechat: {
            id: 'wechat',
            name: 'WeChat',
            outputLabel: 'HTML代码',
            outputTitle: '📋 HTML 代码 (可滚动查看)',
            copyPreviewLabel: '复制样式',
            copyOutputLabel: '复制代码',
            previewHostClass: 'wechat-preview',
            reminder: null,
            render: async function(markdown, context = {}) {
                const themeColor = context.themeColor;
                const mode = context.mode || 'compact';
                const html = await MarkdownConverter.convertMarkdownToWechat(markdown, mode, themeColor);
                return {
                    output: html,
                    previewHtml: html,
                    previewMode: 'wechat',
                    needsMathTypeset: false
                };
            }
        },
        substack: {
            id: 'substack',
            name: 'Substack / GitHub (Markdown)',
            outputLabel: 'Markdown',
            outputTitle: '📋 Markdown 文案 (可滚动查看)',
            copyPreviewLabel: '复制文案',
            copyOutputLabel: '复制文案',
            previewHostClass: 'markdown-preview',
            reminder: {
                requiresTranslation: true,
                text: '当前渠道建议配置 OpenRouter API Key + System Prompt。未配置时会直接复用原文。'
            },
            render: async function(markdown) {
                const output = await ChannelConverter.buildBilingualMarkdown(markdown);
                return {
                    output,
                    previewHtml: marked(output),
                    previewMode: 'markdown',
                    needsMathTypeset: true
                };
            }
        },
        linkedin: {
            id: 'linkedin',
            name: 'LinkedIn',
            outputLabel: 'Copy',
            outputTitle: '📋 LinkedIn 文案 (可滚动查看)',
            copyPreviewLabel: '复制文案',
            copyOutputLabel: '复制文案',
            previewHostClass: 'plain-text-preview-host',
            reminder: {
                requiresTranslation: true,
                text: '当前渠道建议配置 OpenRouter API Key + System Prompt。未配置时会直接复用原文。'
            },
            render: async function(markdown) {
                const output = await ChannelConverter.buildLinkedInPost(markdown);
                return {
                    output,
                    previewHtml: ChannelConverter.renderPlainTextPreview(output, 'linkedin'),
                    previewMode: 'plain',
                    needsMathTypeset: false
                };
            }
        },
        x: {
            id: 'x',
            name: 'X Article + Thread',
            outputLabel: 'Article + Thread',
            outputTitle: '📋 X Article + Thread 发布包',
            copyPreviewLabel: '复制发布包',
            copyOutputLabel: '复制发布包',
            previewHostClass: 'x-publishing-preview-host',
            reminder: {
                requiresAI: true,
                missingText: '配置 OpenRouter API Key 后，点击“生成 X Article + Thread”，AI 会写推荐语并提取 3–6 个要点。',
                text: '点击“生成 X Article + Thread”，AI 会生成首条推荐、要点总览和逐条展开的 Thread。'
            },
            render: async function(markdown, context = {}) {
                const bundle = await ChannelConverter.buildXPublishingBundle(markdown, {
                    useAI: !!context.useAI
                });
                return {
                    output: ChannelConverter.formatXPublishingBundle(bundle),
                    previewHtml: ChannelConverter.renderXPublishingPreview(bundle),
                    previewMode: 'x-publishing',
                    needsMathTypeset: false,
                    data: bundle
                };
            }
        }
    },

    getChannel(channelId) {
        return this.channels[channelId] || this.channels.wechat;
    },

    listChannels() {
        return Object.values(this.channels).map(({ id, name }) => ({ id, name }));
    },

    async renderForChannel(channelId, markdown, context = {}) {
        const channel = this.getChannel(channelId);
        const result = await channel.render(markdown || '', context);
        return {
            channel,
            output: result.output || '',
            previewHtml: result.previewHtml || '',
            previewMode: result.previewMode || 'plain',
            needsMathTypeset: !!result.needsMathTypeset,
            data: result.data || null
        };
    },

    async buildBilingualMarkdown(markdown) {
        const sanitized = this.prepareSourceMarkdown(markdown);
        if (!sanitized.trim()) {
            return '';
        }

        const enMd = await Translator.translateMarkdownToEnglish(sanitized);
        const translated = stripLeadMarkers(enMd || '').trim();
        const original = sanitized.trim();

        if (!translated || this.isSameContent(translated, original)) {
            return original;
        }

        return `${translated}\n\n---\n\n${original}`;
    },

    async buildLinkedInPost(markdown) {
        const sanitized = this.prepareSourceMarkdown(markdown);
        if (!sanitized.trim()) {
            return '';
        }

        const enMd = await Translator.translateMarkdownToEnglish(sanitized);
        const enText = this.markdownToPlainText(enMd);
        const zhText = this.markdownToPlainText(sanitized);

        if (!enText || this.isSameContent(enText, zhText)) {
            return zhText;
        }

        return [enText, '——', zhText].filter(Boolean).join('\n\n').trim();
    },

    async buildXThread(markdown) {
        const sanitized = this.prepareSourceMarkdown(markdown);
        if (!sanitized.trim()) {
            return '';
        }

        const enMd = await Translator.translateMarkdownToEnglish(sanitized);
        const enText = this.markdownToPlainText(enMd);
        const posts = this.splitIntoXThread(enText);
        return posts.map((post, index) => `${index + 1}/${posts.length}\n${post}`).join('\n\n---\n\n');
    },

    async buildXPublishingBundle(markdown, options = {}) {
        const sanitized = this.prepareSourceMarkdown(markdown).trim();
        if (!sanitized) {
            return {
                articleMarkdown: '',
                recommendation: '',
                bulletPoints: [],
                threadPosts: [],
                usedAI: false,
                aiError: ''
            };
        }

        let articleMarkdown = sanitized;
        let plan = null;
        let usedAI = false;
        let aiError = '';

        if (options.useAI && typeof Translator.generateXPublishingPlan === 'function') {
            try {
                const translated = await Translator.translateMarkdownToEnglish(sanitized);
                articleMarkdown = stripLeadMarkers(translated || sanitized).trim() || sanitized;
                plan = await Translator.generateXPublishingPlan(articleMarkdown);
                usedAI = !!plan;
            } catch (error) {
                aiError = error && error.message ? error.message : String(error || 'AI generation failed');
                console.warn('X publishing AI generation failed, using local fallback:', error);
            }
        }

        if (!plan) {
            plan = this.buildFallbackXPlan(articleMarkdown);
        }

        const bulletPoints = (plan.bulletPoints || [])
            .filter(point => point && point.title)
            .slice(0, 6)
            .map(point => ({
                title: this.clipText(point.title, 70),
                detail: this.clipText(point.detail || '', 190)
            }));
        const recommendation = this.clipText(plan.recommendation || '', 180);
        const threadPosts = this.buildXThreadFromPlan(recommendation, bulletPoints);

        return {
            articleMarkdown,
            recommendation,
            bulletPoints,
            threadPosts,
            usedAI,
            aiError
        };
    },

    buildFallbackXPlan(markdown) {
        const bulletPoints = this.extractXBulletPoints(markdown);
        const plain = this.markdownToPlainText(markdown);
        const titleMatch = String(markdown || '').match(/^\s*#\s+(.+)$/m);
        const title = titleMatch ? this.markdownToPlainText(titleMatch[1]) : '';
        const firstParagraph = plain
            .split(/\n\n+/)
            .map(part => part.trim())
            .find(part => part && part !== title) || '';
        const isChinese = /[\u3400-\u9fff]/.test(title || firstParagraph);
        const prefix = isChinese ? '推荐阅读' : 'Recommended read';
        const recommendation = [title, firstParagraph]
            .filter(Boolean)
            .join(' — ');

        return {
            recommendation: `${prefix}${recommendation ? `${isChinese ? '：' : ': '}${recommendation}` : ''}`,
            bulletPoints
        };
    },

    extractXBulletPoints(markdown, maxPoints = 5) {
        const source = String(markdown || '').replace(/\r/g, '');
        const lines = source.split('\n');
        const points = [];

        for (let index = 0; index < lines.length && points.length < maxPoints; index += 1) {
            const heading = lines[index].match(/^\s*#{2,4}\s+(.+)$/);
            if (!heading) continue;

            let detail = '';
            for (let next = index + 1; next < lines.length; next += 1) {
                const candidate = lines[next].trim();
                if (/^#{1,6}\s+/.test(candidate)) break;
                if (candidate) {
                    detail = this.markdownToPlainText(candidate);
                    break;
                }
            }
            points.push({
                title: this.markdownToPlainText(heading[1]),
                detail
            });
        }

        if (points.length === 0) {
            const listItems = lines
                .map(line => line.match(/^\s*(?:[-*+]\s+|\d+\.\s+)(.+)$/))
                .filter(Boolean)
                .slice(0, maxPoints);
            listItems.forEach(match => points.push({
                title: this.markdownToPlainText(match[1]),
                detail: ''
            }));
        }

        if (points.length === 0) {
            this.markdownToPlainText(source)
                .split(/\n\n+/)
                .map(part => part.trim())
                .filter(Boolean)
                .slice(0, maxPoints)
                .forEach((part) => points.push({
                    title: this.clipText(part, 70),
                    detail: this.clipText(part, 190)
                }));
        }

        return points;
    },

    buildXThreadFromPlan(recommendation, bulletPoints) {
        if (!recommendation && bulletPoints.length === 0) {
            return [];
        }

        const overview = bulletPoints
            .map(point => `• ${point.title}`)
            .join('\n');
        const mainPost = this.clipText(
            [recommendation, overview].filter(Boolean).join('\n\n'),
            250
        );
        const rawPosts = [mainPost];

        bulletPoints.forEach((point, index) => {
            rawPosts.push(this.clipText(
                [`${index + 1}. ${point.title}`, point.detail].filter(Boolean).join('\n\n'),
                250
            ));
        });

        return rawPosts.map((post, index) => `${index + 1}/${rawPosts.length}\n${post}`);
    },

    clipText(text, maxLength) {
        const source = String(text || '').trim();
        if (!maxLength || source.length <= maxLength) {
            return source;
        }

        let clipped = '';
        for (const character of source) {
            if (`${clipped}${character}…`.length > maxLength) break;
            clipped += character;
        }
        const lastBreak = Math.max(clipped.lastIndexOf(' '), clipped.lastIndexOf('\n'));
        if (lastBreak > Math.floor(maxLength * 0.6)) {
            clipped = clipped.slice(0, lastBreak);
        }
        return `${clipped.trim()}…`;
    },

    formatXPublishingBundle(bundle) {
        if (!bundle || (!bundle.articleMarkdown && !bundle.threadPosts.length)) {
            return '';
        }
        const article = `# X ARTICLE\n\n${bundle.articleMarkdown}`;
        const thread = bundle.threadPosts.length
            ? `# X THREAD\n\n${bundle.threadPosts.join('\n\n---\n\n')}`
            : '';
        return [article, thread].filter(Boolean).join('\n\n==========\n\n');
    },

    prepareSourceMarkdown(markdown) {
        return stripLeadMarkers(markdown || '');
    },

    isSameContent(first, second) {
        const normalize = (value) => String(value || '')
            .replace(/\r\n?/g, '\n')
            .trim();
        return normalize(first) === normalize(second);
    },

    markdownToPlainText(markdown) {
        let text = String(markdown || '');

        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
            const languageLabel = lang ? `${lang.toUpperCase()}\n` : '';
            return `\n${languageLabel}${code.trim()}\n`;
        });

        text = text.replace(/`([^`]+)`/g, '$1');
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => alt ? `${alt} (${url})` : url);
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
        text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
        text = text.replace(/^\s{0,3}>\s?/gm, '');
        text = text.replace(/^\s*[-*+]\s+/gm, '• ');
        text = text.replace(/^\s*\d+\.\s+/gm, '• ');
        text = text.replace(/\*\*(.*?)\*\*/g, '$1');
        text = text.replace(/__(.*?)__/g, '$1');
        text = text.replace(/\*(.*?)\*/g, '$1');
        text = text.replace(/_(.*?)_/g, '$1');
        text = text.replace(/^\|/gm, '');
        text = text.replace(/\|$/gm, '');
        text = text.replace(/\|/g, ' | ');
        text = text.replace(/^\s*[-: ]{3,}\s*$/gm, '');
        text = text.replace(/\n{3,}/g, '\n\n');

        return text
            .split('\n')
            .map(line => line.replace(/[ \t]+$/g, ''))
            .join('\n')
            .trim();
    },

    splitIntoXThread(text, maxLength = 260) {
        const normalized = String(text || '')
            .replace(/\r/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!normalized) {
            return [];
        }

        const paragraphs = normalized.split(/\n\n+/).map(part => part.trim()).filter(Boolean);
        const posts = [];
        let current = '';

        const pushCurrent = () => {
            if (current.trim()) {
                posts.push(current.trim());
                current = '';
            }
        };

        const appendChunk = (chunk) => {
            if (!chunk) return;
            if (!current) {
                current = chunk;
                return;
            }
            const candidate = `${current}\n\n${chunk}`;
            if (candidate.length <= maxLength) {
                current = candidate;
                return;
            }
            pushCurrent();
            current = chunk;
        };

        const splitLongParagraph = (paragraph) => {
            const words = paragraph.split(/\s+/).filter(Boolean);
            const chunks = [];
            let buffer = '';

            const splitLongWord = (word) => {
                const parts = [];
                let part = '';

                for (const character of word) {
                    if (part && `${part}${character}`.length > maxLength) {
                        parts.push(part);
                        part = character;
                    } else {
                        part += character;
                    }
                }

                if (part) {
                    parts.push(part);
                }
                return parts;
            };

            words.forEach(word => {
                if (!buffer) {
                    if (word.length <= maxLength) {
                        buffer = word;
                    } else {
                        chunks.push(...splitLongWord(word));
                    }
                    return;
                }

                const candidate = `${buffer} ${word}`;
                if (candidate.length <= maxLength) {
                    buffer = candidate;
                } else {
                    chunks.push(buffer);
                    if (word.length <= maxLength) {
                        buffer = word;
                    } else {
                        chunks.push(...splitLongWord(word));
                        buffer = '';
                    }
                }
            });

            if (buffer) {
                chunks.push(buffer);
            }
            return chunks;
        };

        paragraphs.forEach(paragraph => {
            if (paragraph.length <= maxLength) {
                appendChunk(paragraph);
                return;
            }
            pushCurrent();
            splitLongParagraph(paragraph).forEach(chunk => appendChunk(chunk));
        });

        pushCurrent();
        return posts;
    },

    escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    renderPlainTextPreview(text, variant = 'plain') {
        const escaped = this.escapeHtml(text).replace(/\n/g, '<br>');
        return `<div class="plain-text-preview ${variant}-preview">${escaped}</div>`;
    },

    renderXThreadPreview(threadText) {
        const posts = String(threadText || '')
            .split(/\n\n---\n\n/)
            .map(item => item.trim())
            .filter(Boolean);

        const cards = posts.map((post) => {
            const [header, ...bodyLines] = post.split('\n');
            const body = this.escapeHtml(bodyLines.join('\n')).replace(/\n/g, '<br>');
            return `
<div class="thread-card">
  <div class="thread-card-header">${this.escapeHtml(header)}</div>
  <div class="thread-card-body">${body}</div>
</div>`;
        }).join('');

        return `<div class="thread-preview">${cards}</div>`;
    },

    renderXPublishingPreview(bundle) {
        if (!bundle || !bundle.articleMarkdown) {
            return '<div class="x-empty-state">输入 Markdown 后即可预览 X Article 和 Thread。</div>';
        }

        const statusLabel = bundle.usedAI ? 'AI 已生成推荐与要点' : '本地预览，点击按钮启用 AI';
        const statusClass = bundle.usedAI ? 'is-ai' : 'is-fallback';
        const articleHtml = marked(bundle.articleMarkdown);
        const threadCards = bundle.threadPosts.map((post, index) => {
            const [header, ...bodyLines] = post.split('\n');
            const body = this.escapeHtml(bodyLines.join('\n')).replace(/\n/g, '<br>');
            return `
<div class="thread-card">
  <div class="thread-card-toolbar">
    <div class="thread-card-header">${this.escapeHtml(header)}</div>
    <button type="button" class="x-copy-part-btn" data-x-copy="thread" data-thread-index="${index}">复制这条</button>
  </div>
  <div class="thread-card-body">${body}</div>
</div>`;
        }).join('');

        return `
<div class="x-publishing-preview">
  <div class="x-generation-status ${statusClass}">${this.escapeHtml(statusLabel)}</div>
  ${bundle.aiError ? `<div class="x-ai-error">AI 生成失败，已使用本地预览：${this.escapeHtml(bundle.aiError)}</div>` : ''}
  <section class="x-article-card">
    <div class="x-section-toolbar">
      <div>
        <div class="x-section-kicker">X ARTICLE</div>
        <h2>X 长文章</h2>
      </div>
      <button type="button" class="x-copy-part-btn" data-x-copy="article">复制 Article 富文本</button>
    </div>
    <div class="x-article-content markdown-preview">${articleHtml}</div>
  </section>
  <section class="x-thread-section">
    <div class="x-section-toolbar">
      <div>
        <div class="x-section-kicker">X THREAD</div>
        <h2>推荐 + 要点 Thread</h2>
      </div>
      <button type="button" class="x-copy-part-btn" data-x-copy="thread-all">复制全部 Thread</button>
    </div>
    <div class="thread-preview">${threadCards}</div>
  </section>
</div>`;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChannelConverter;
}
if (typeof window !== 'undefined') {
    window.ChannelConverter = ChannelConverter;
}
