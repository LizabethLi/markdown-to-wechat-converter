// Channel-specific output adapters focused on copy/paste-ready formats.
const stripLeadMarkers = (text) =>
    text.replace(/(^|\n)[ \t]*\[\s*lead\s*\][ \t]*/gi, '$1');

const stripStrikethroughFormatting = (text) => {
    let fence = null;

    return String(text || '')
        .split('\n')
        .map((line) => {
            if (fence) {
                const closingFence = new RegExp(
                    `^[ \\t]{0,3}${fence.character}{${fence.length},}[ \\t]*$`
                );
                if (closingFence.test(line)) {
                    fence = null;
                }
                return line;
            }

            const openingFence = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
            if (openingFence) {
                fence = {
                    character: openingFence[1][0],
                    length: openingFence[1].length
                };
                return line;
            }

            const codeSpans = [];
            const protectedLine = line.replace(/(`+)(.*?)\1/g, (codeSpan) => {
                const placeholder = `\u0000INLINE_CODE_${codeSpans.length}\u0000`;
                codeSpans.push({ placeholder, codeSpan });
                return placeholder;
            });
            const plainLine = protectedLine
                .replace(/(^|[^\\])~~(?=\S)(.*?\S)~~/g, '$1$2')
                .replace(/<\/?(?:del|s|strike)\b[^>]*>/gi, '');

            return codeSpans.reduce(
                (restored, item) => restored.split(item.placeholder).join(item.codeSpan),
                plainLine
            );
        })
        .join('\n');
};

const ChannelConverter = {
    channelAliases: {
        'x-article-thread': 'x'
    },

    localizationCache: {
        source: '',
        value: '',
        promise: null
    },

    channels: {
        wechat: {
            id: 'wechat',
            name: 'WeChat',
            copyPreviewLabel: '复制样式',
            previewCopyMode: 'rich',
            previewHostClass: 'wechat-preview',
            reminder: null,
            render: async function(markdown, context = {}) {
                const themeColor = context.themeColor;
                const mode = context.mode || 'compact';
                const html = await MarkdownConverter.convertMarkdownToWechat(
                    markdown,
                    mode,
                    themeColor,
                    context.templateId || null
                );
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
            name: 'Substack',
            copyPreviewLabel: '复制图文',
            previewCopyMode: 'rich',
            portableRichCopy: true,
            previewHostClass: 'markdown-preview substack-preview',
            reminder: null,
            render: async function(markdown, context = {}) {
                const output = ChannelConverter.buildSingleLanguageMarkdown(markdown);
                const preview = await ChannelConverter.renderRichMarkdownPreview(output, context);
                return {
                    output,
                    previewHtml: preview.html,
                    previewMode: 'markdown',
                    needsMathTypeset: preview.needsMathTypeset
                };
            }
        },
        linkedin: {
            id: 'linkedin',
            name: 'LinkedIn',
            copyPreviewLabel: '复制图文',
            previewCopyMode: 'rich',
            portableRichCopy: true,
            previewHostClass: 'markdown-preview linkedin-preview',
            reminder: null,
            render: async function(markdown, context = {}) {
                const output = ChannelConverter.buildSingleLanguageMarkdown(markdown);
                const preview = await ChannelConverter.renderRichMarkdownPreview(output, context);
                return {
                    output,
                    previewHtml: preview.html,
                    previewMode: 'markdown',
                    needsMathTypeset: preview.needsMathTypeset
                };
            }
        },
        x: {
            id: 'x',
            name: 'X Article + Thread',
            copyPreviewLabel: '复制 Article 文字',
            previewHostClass: 'x-publishing-preview-host',
            reminder: {
                requiresAI: true,
                title: 'X 的图片需要单独上传',
                missingText: 'X Article 会忽略剪贴板中的内嵌图片，也不支持表格和代码块。先配置 OpenRouter 生成 Thread；Article 文字可以直接复制，图片、表格、Mermaid、公式和代码块请按编号上传。',
                text: 'X Article 会忽略剪贴板中的内嵌图片，也不支持表格和代码块。Article 文字可以直接复制，图片、表格、Mermaid、公式和代码块会整理为下方素材，请按编号上传。',
                steps: ['复制 Article 文字', '按编号上传图片素材']
            },
            render: async function(markdown, context = {}) {
                const bundle = await ChannelConverter.buildXPublishingBundle(markdown, {
                    useAI: !!context.useAI
                });
                const articlePreview = await ChannelConverter.renderRichMarkdownPreview(
                    bundle.articleMarkdown,
                    context
                );
                return {
                    output: ChannelConverter.formatXPublishingBundle(bundle),
                    previewHtml: ChannelConverter.renderXPublishingPreview(bundle, articlePreview.html),
                    previewMode: 'x-publishing',
                    needsMathTypeset: articlePreview.needsMathTypeset,
                    data: bundle
                };
            }
        }
    },

    getChannel(channelId) {
        const resolvedId = this.resolveChannelId(channelId);
        return this.channels[resolvedId] || this.channels.wechat;
    },

    resolveChannelId(channelId) {
        const normalized = String(channelId || '').trim().toLowerCase();
        const resolvedId = this.channelAliases[normalized] || normalized;
        return this.channels[resolvedId] ? resolvedId : null;
    },

    listChannels() {
        return Object.values(this.channels).map(({ id, name }) => ({ id, name }));
    },

    async renderForChannel(channelId, markdown, context = {}) {
        const channel = this.getChannel(channelId);
        const outputLanguage = context.outputLanguage === 'en' ? 'en' : 'zh';
        const localizedMarkdown = stripStrikethroughFormatting(
            await this.buildLocalizedMarkdown(markdown || '', outputLanguage)
        );
        const originalMarkdown = this.prepareSourceMarkdown(markdown || '').trim();
        if (outputLanguage === 'en'
            && localizedMarkdown.trim() !== originalMarkdown
            && typeof SiteAnalytics !== 'undefined'
            && typeof SiteAnalytics.trackThrottled === 'function') {
            SiteAnalytics.trackThrottled('translation_completed', channel.id, {
                channel: channel.id,
                language: outputLanguage
            });
        }
        if (typeof DependencyLoader !== 'undefined'
            && typeof DependencyLoader.ensureForMarkdown === 'function') {
            await DependencyLoader.ensureForMarkdown(localizedMarkdown);
        }
        const result = await channel.render(localizedMarkdown, {
            ...context,
            outputLanguage,
            sourceMarkdown: markdown || ''
        });
        return {
            channel,
            output: result.output || '',
            previewHtml: result.previewHtml || '',
            previewMode: result.previewMode || 'plain',
            needsMathTypeset: !!result.needsMathTypeset,
            data: result.data || null
        };
    },

    async renderRichMarkdownPreview(markdown, context = {}) {
        const source = String(markdown || '');
        const containsMath = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/.test(source);
        const canRenderMath = containsMath
            && typeof MathRenderer !== 'undefined'
            && typeof MathRenderer.isMathJaxReady === 'function'
            && MathRenderer.isMathJaxReady()
            && typeof MathRenderer.protectMathExpressions === 'function'
            && typeof MathRenderer.restoreMathExpressions === 'function';
        const math = canRenderMath
            ? MathRenderer.protectMathExpressions(source)
            : { markdown: source, mathPlaceholders: {} };

        let enhancedMarkdown = math.markdown;
        if (typeof MarkdownConverter !== 'undefined'
            && typeof MarkdownConverter.replaceMermaidBlocks === 'function') {
            enhancedMarkdown = await MarkdownConverter.replaceMermaidBlocks(
                enhancedMarkdown,
                context.mode || 'compact',
                context.themeColor || null
            );
        }

        let html = marked(enhancedMarkdown);
        if (canRenderMath) {
            html = MathRenderer.restoreMathExpressions(html, math.mathPlaceholders);
        }

        return {
            html,
            needsMathTypeset: containsMath && !canRenderMath
        };
    },

    async buildLocalizedMarkdown(markdown, outputLanguage = 'zh') {
        const sourceMarkdown = String(markdown || '');
        if (!sourceMarkdown.trim()) {
            return '';
        }

        if (outputLanguage !== 'en' || !/[\u3400-\u9fff]/.test(sourceMarkdown)) {
            return sourceMarkdown.trim();
        }

        const source = sourceMarkdown.trim();
        if (this.localizationCache.source === source) {
            if (this.localizationCache.value) {
                return this.localizationCache.value;
            }
            if (this.localizationCache.promise) {
                return this.localizationCache.promise;
            }
        }

        const protectedImages = this.protectInlineImageData(sourceMarkdown);
        const translationPromise = Translator.translateMarkdownToEnglish(protectedImages.markdown)
            .then((translated) => {
                const restored = this.restoreInlineImageData(translated || protectedImages.markdown, protectedImages.images);
                return String(restored || sourceMarkdown).trim() || source;
            });
        this.localizationCache = {
            source,
            value: '',
            promise: translationPromise
        };

        try {
            const value = await translationPromise;
            if (this.localizationCache.promise === translationPromise) {
                this.localizationCache = { source, value, promise: null };
            }
            return value;
        } catch (error) {
            if (this.localizationCache.promise === translationPromise) {
                this.clearLocalizationCache();
            }
            throw error;
        }
    },

    clearLocalizationCache() {
        this.localizationCache = { source: '', value: '', promise: null };
    },

    buildSingleLanguageMarkdown(markdown) {
        const sanitized = this.prepareSourceMarkdown(markdown);
        return sanitized.trim();
    },

    protectInlineImageData(markdown) {
        const images = [];
        let protectedMarkdown = String(markdown || '').replace(
            /data:image\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*;base64,[a-z0-9+/_=-]+/gi,
            (dataUrl) => {
                const token = `__INLINE_IMAGE_DATA_${images.length}__`;
                images.push({ token, dataUrl });
                return token;
            }
        );
        protectedMarkdown = protectedMarkdown.replace(/!\[\[[^\]\n]+\]\]/g, (reference) => {
            const token = `__OBSIDIAN_IMAGE_REFERENCE_${images.length}__`;
            images.push({ token, dataUrl: reference });
            return token;
        });
        protectedMarkdown = protectedMarkdown.replace(
            /!\[[^\]\n]*\]\(local-image:\/\/[a-z0-9-]+\)/gi,
            (reference) => {
                const token = `__LOCAL_IMAGE_REFERENCE_${images.length}__`;
                images.push({ token, dataUrl: reference });
                return token;
            }
        );
        return { markdown: protectedMarkdown, images };
    },

    restoreInlineImageData(markdown, images) {
        return (images || []).reduce(
            (value, image) => String(value || '').split(image.token).join(image.dataUrl),
            String(markdown || '')
        );
    },

    prepareMarkdownForAI(markdown) {
        const protectedImages = this.protectInlineImageData(markdown);
        return protectedImages.images.reduce(
            (value, image) => value.split(image.token).join('embedded-image://omitted'),
            protectedImages.markdown
        );
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
                plan = await Translator.generateXPublishingPlan(this.prepareMarkdownForAI(articleMarkdown));
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
                title: String(point.title || '').trim(),
                detail: String(point.detail || '').trim()
            }));
        const recommendation = String(plan.recommendation || '').trim();
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
                    title: part,
                    detail: part
                }));
        }

        return points;
    },

    buildXThreadFromPlan(recommendation, bulletPoints) {
        const summary = String(recommendation || '').trim();
        const points = Array.isArray(bulletPoints)
            ? bulletPoints.filter(point => point && String(point.title || '').trim())
            : [];
        if (!summary && points.length === 0) {
            return [];
        }

        // 预留编号空间，正文超长时拆成下一条，绝不把省略号写入复制数据。
        const maxBodyLength = 270;
        const rawPosts = [];
        const recommendationChunks = this.splitIntoXThread(summary, maxBodyLength);
        let overviewPost = recommendationChunks.pop() || '';
        rawPosts.push(...recommendationChunks);
        let hasOverviewBullet = false;

        points.forEach((point) => {
            const bulletLine = `• ${String(point.title || '').trim()}`;
            const separator = overviewPost ? (hasOverviewBullet ? '\n' : '\n\n') : '';
            const candidate = `${overviewPost}${separator}${bulletLine}`;

            if (candidate.length <= maxBodyLength) {
                overviewPost = candidate;
            } else {
                if (overviewPost) rawPosts.push(overviewPost);
                const chunks = this.splitIntoXThread(bulletLine, maxBodyLength);
                overviewPost = chunks.pop() || '';
                rawPosts.push(...chunks);
            }
            hasOverviewBullet = true;
        });

        if (overviewPost) rawPosts.push(overviewPost);

        points.forEach((point, index) => {
            const pointText = [
                `${index + 1}. ${String(point.title || '').trim()}`,
                String(point.detail || '').trim()
            ].filter(Boolean).join('\n\n');
            rawPosts.push(...this.splitIntoXThread(pointText, maxBodyLength));
        });

        return rawPosts.map((post, index) => `${index + 1}/${rawPosts.length}\n${post}`);
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
        return stripLeadMarkers(stripStrikethroughFormatting(markdown || ''));
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
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
            if (/^(?:data:image\/|local-image:\/\/)/i.test(url.trim())) {
                return alt ? `[图片：${alt}]` : '[内嵌图片]';
            }
            return alt ? `${alt} (${url})` : url;
        });
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

    renderXPublishingPreview(bundle, articlePreviewHtml = '') {
        if (!bundle || !bundle.articleMarkdown) {
            return '<div class="x-empty-state">输入 Markdown 后即可预览 X Article 和 Thread。</div>';
        }

        const statusLabel = bundle.usedAI ? 'AI 已生成推荐与要点' : '本地预览，点击按钮启用 AI';
        const statusClass = bundle.usedAI ? 'is-ai' : 'is-fallback';
        const articleHtml = articlePreviewHtml || marked(bundle.articleMarkdown);
        const threadCards = bundle.threadPosts.map((post, index) => {
            const [header, ...bodyLines] = post.split('\n');
            const bodyText = bodyLines.join('\n');
            const body = this.escapeHtml(bodyText).replace(/\n/g, '<br>');
            const shouldCollapse = bodyText.length > 220 || bodyLines.length > 5;
            return `
<div class="thread-card">
  <div class="thread-card-toolbar">
    <div class="thread-card-header">${this.escapeHtml(header)}</div>
    <button type="button" class="x-copy-part-btn" data-x-copy="thread" data-thread-index="${index}">复制这条</button>
  </div>
  <div class="thread-card-body${shouldCollapse ? ' is-collapsed' : ''}" data-x-thread-body>${body}</div>
  ${shouldCollapse ? '<button type="button" class="x-thread-expand-btn" data-x-thread-expand aria-expanded="false">... 展开全部</button>' : ''}
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
      <button type="button" class="x-copy-part-btn" data-x-copy="article">复制 Article 文字</button>
    </div>
    <div class="x-publishing-guide" role="note">
      <span><b>1</b> 复制文字</span>
      <i aria-hidden="true">→</i>
      <span><b>2</b> 在 X 中按编号上传图片</span>
    </div>
    <div class="x-article-content markdown-preview">${articleHtml}</div>
    <section class="x-asset-section is-loading" data-x-asset-section aria-live="polite">
      <div class="x-asset-section-header">
        <div>
          <div class="x-asset-title">X 图片素材</div>
          <p data-x-asset-summary>正在整理正文中的图片、表格、Mermaid、公式和代码块…</p>
        </div>
      </div>
      <div class="x-asset-list" data-x-asset-list></div>
    </section>
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
