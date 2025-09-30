// Markdown转换器核心模块
const MarkdownConverter = {
    mermaidInitialized: false,
    currentMermaidThemeColor: null,
    mermaidSupportWarningLogged: false,

    getWechatStyles: function(mode, themeColor) {
        return (typeof TemplateManager !== 'undefined'
            ? TemplateManager.getStyles(mode, themeColor)
            : WechatStyles.getStyles(mode, themeColor));
    },

    // 创建微信渲染器
    createWechatRenderer: function(mode, themeColor) {
        const wechatStyles = this.getWechatStyles(mode, themeColor);
        const renderer = new marked.Renderer();

        // 标题渲染
        let h1Counter = 0;
        renderer.heading = (text, level, raw) => {
            if (level === 1) return wechatStyles.h1(raw, text, ++h1Counter);
            if (level === 2) return wechatStyles.h2(raw, text);
            if (level === 3) {
                const sectionMatch = raw.match(/^###\s(\d+)/);
                if (sectionMatch && raw.trim().split(/\s+/).length === 2) {
                    return wechatStyles.sectionNumber(raw, sectionMatch[1]);
                }
                return wechatStyles.h3(raw, text);
            }
            return `<h${level} style="font-size: ${18 - level}px; font-weight: bold; margin: 15px 0;">${text}</h${level}>`;
        };

        // 段落渲染
        renderer.paragraph = (text) => {
            // 避免 marked.js 给已经有样式的块（如KaTeX渲染的块）再次套上 <p> 标签
            if (text.trim().startsWith('<section') && text.trim().endsWith('</section>')) {
                return text;
            }
            // 支持 [lead] 段首标记，将本段渲染为主题色强调段落
            const trimmed = text.trim();
            const leadPrefix = trimmed.match(/^\[\s*lead\s*\]\s*/i);
            if (leadPrefix) {
                const content = trimmed.replace(leadPrefix[0], '');
                return wechatStyles.leadParagraph(null, content);
            }
            return wechatStyles.paragraph(null, text);
        };

        // 文本格式
        renderer.strong = (text) => wechatStyles.bold(null, text);
        renderer.em = (text) => wechatStyles.italic(null, text);

        // 列表渲染
        renderer.list = (body, ordered, start) => {
            const tag = ordered ? 'ol' : 'ul';
            const styles = mode === 'compact' 
                ? `list-style-position: outside; padding-left: 30px; margin: 8px 0;`
                : `padding-left: 40px; margin: 15px 0;`;
            // Add WeChat-like padding class for better parity
            return `<${tag} style="${styles}" class="list-paddingleft-1">${body}</${tag}>`;
        };

        renderer.listitem = (text) => {
            const style = mode === 'compact'
                ? `margin: 5px 0; line-height: 1.6; font-size: 14px; color: #333;`
                : `margin: 8px 0; line-height: 1.6; font-size: 14px; color: #333;`;

            const content = (text || '').trim();
            // Avoid invalid nested <p> by detecting block-level content produced by marked
            const hasBlockLevel = /<(?:p|div|section|ul|ol|pre|blockquote|h[1-6]|table)\b/i.test(content);

            if (hasBlockLevel) {
                return `<li style="${style}">${content}</li>`;
            }

            return `<li style="${style}"><p style="display: inline;">${content}</p></li>`;
        };

        // 引用
        renderer.blockquote = (quote) => {
            const frame = wechatStyles.blockquote ? wechatStyles.blockquote(null, 'PLACEHOLDER_TEXT') : '';
            if (typeof frame !== 'string' || !frame) {
                return `<blockquote>${quote}</blockquote>`;
            }
            const cleanedQuote = quote.trim();
            const placeholderPattern = /<p[^>]*>\s*PLACEHOLDER_TEXT\s*<\/p>/i;
            if (placeholderPattern.test(frame)) {
                return frame.replace(placeholderPattern, cleanedQuote);
            }
            if (frame.includes('PLACEHOLDER_TEXT')) {
                return frame.replace(/PLACEHOLDER_TEXT/g, cleanedQuote);
            }
            const closingTagIndex = frame.lastIndexOf('</blockquote>');
            if (closingTagIndex !== -1) {
                return frame.slice(0, closingTagIndex) + cleanedQuote + frame.slice(closingTagIndex);
            }
            console.warn('Blockquote template missing placeholder, appending raw content.');
            return frame + cleanedQuote;
        };

        // 代码块
        renderer.code = (code, lang, escaped) => {
            // 使用语法高亮增强版本
            return this.renderCodeBlock(code, lang, mode, themeColor);
        };
        renderer.codespan = (code) => wechatStyles.inlineCode(null, code);

        // 图片和链接
        renderer.image = (href, title, text) => wechatStyles.image(null, text, href);
        renderer.link = (href, title, text) => wechatStyles.link(null, text, href);

        // 表格
        renderer.table = (header, body) => {
            return `<table style="border-collapse: collapse; margin: 15px 0; width: 100%; border: 1px solid #e2e8f0;"><thead>${header}</thead><tbody>${body}</tbody></table>`;
        };
        
        renderer.tablerow = (content) => {
            return `<tr style="border-bottom: 1px solid #e2e8f0;">${content}</tr>`;
        };

        renderer.tablecell = (content, flags) => {
            const tag = flags.header ? 'th' : 'td';
            const textAlign = flags.align ? `text-align: ${flags.align};` : '';
            const style = flags.header
                ? `background-color: #f8fafc; font-weight: 600; color: #334155; border: 1px solid #e2e8f0; padding: 10px 12px; ${textAlign}`
                : `border: 1px solid #e2e8f0; padding: 10px 12px; ${textAlign}`;
            return `<${tag} style="${style}">${content}</${tag}>`;
        };

        return renderer;
    },

    hasMermaidSupport: function() {
        return typeof mermaid !== 'undefined' && mermaid && typeof mermaid.render === 'function';
    },

    ensureMermaidReady: function(themeColor) {
        if (!this.hasMermaidSupport()) {
            if (!this.mermaidSupportWarningLogged) {
                console.warn('Mermaid library is not available; skipping diagram rendering.');
                this.mermaidSupportWarningLogged = true;
            }
            return false;
        }

        const fallbackColor = (AppConfig && AppConfig.themes && AppConfig.themes[AppConfig.defaults.theme])
            ? AppConfig.themes[AppConfig.defaults.theme].primary
            : (WechatStyles && WechatStyles.defaultThemeColor) ? WechatStyles.defaultThemeColor : '#7E3AF2';
        const activeColor = (themeColor && typeof themeColor === 'string' && themeColor.trim()) ? themeColor.trim() : fallbackColor;

        if (!this.mermaidInitialized || this.currentMermaidThemeColor !== activeColor) {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    securityLevel: 'strict',
                    theme: 'neutral',
                    themeVariables: {
                        primaryColor: activeColor,
                        primaryTextColor: '#0f172a',
                        primaryBorderColor: activeColor,
                        lineColor: activeColor,
                        edgeLabelBackground: '#ffffff'
                    }
                });
                this.mermaidInitialized = true;
                this.currentMermaidThemeColor = activeColor;
                this.mermaidSupportWarningLogged = false;
            } catch (error) {
                console.warn('Failed to initialize Mermaid renderer:', error);
                return false;
            }
        }
        return true;
    },

    prepareMermaidSvgMarkup: function(svg) {
        if (!svg || typeof svg !== 'string') return '';
        let processed = svg.trim();

        // Remove potential script tags for safety
        processed = processed.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

        const canUseDomParser = typeof window !== 'undefined'
            && typeof window.DOMParser !== 'undefined'
            && typeof document !== 'undefined'
            && !!document.body;

        if (canUseDomParser) {
            try {
                const parser = new DOMParser();
                const parsed = parser.parseFromString(processed, 'image/svg+xml');
                const svgElement = parsed && parsed.documentElement;

                if (svgElement && svgElement.tagName && svgElement.tagName.toLowerCase() === 'svg') {
                    const toStyleMap = (styleAttr) => {
                        const map = new Map();
                        if (!styleAttr || typeof styleAttr !== 'string') return map;
                        styleAttr.split(';').forEach(entry => {
                            const [prop, ...rest] = entry.split(':');
                            if (!prop || rest.length === 0) return;
                            const value = rest.join(':').trim();
                            if (!value) return;
                            map.set(prop.trim(), value);
                        });
                        return map;
                    };

                    const toStyleString = (map) => Array.from(map.entries())
                        .map(([prop, value]) => `${prop}: ${value}`)
                        .join('; ');

                    const ensureRootSvgSizing = () => {
                        const sizingRules = {
                            'max-width': '100%',
                            height: 'auto',
                            display: 'block',
                            margin: '0 auto'
                        };
                        const styleMap = toStyleMap(svgElement.getAttribute('style'));
                        Object.entries(sizingRules).forEach(([prop, value]) => {
                            if (!styleMap.has(prop)) {
                                styleMap.set(prop, value);
                            }
                        });
                        svgElement.setAttribute('style', toStyleString(styleMap));
                        svgElement.removeAttribute('width');
                        svgElement.removeAttribute('height');
                    };

                    const inlineComputedStyles = () => {
                        // WeChat 会剥离 <style> 内容，这里提前把关键样式写成内联
                        const scratch = document.createElement('div');
                        scratch.setAttribute('aria-hidden', 'true');
                        scratch.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;';
                        const workingSvg = svgElement.cloneNode(true);
                        scratch.appendChild(workingSvg);
                        document.body.appendChild(scratch);

                        try {
                            const properties = [
                                'fill',
                                'stroke',
                                'stroke-width',
                                'stroke-dasharray',
                                'stroke-linecap',
                                'stroke-linejoin',
                                'stroke-miterlimit',
                                'stroke-opacity',
                                'font-size',
                                'font-family',
                                'font-weight',
                                'font-style',
                                'text-anchor',
                                'white-space',
                                'line-height',
                                'word-break',
                                'word-wrap',
                                'overflow-wrap',
                                'opacity',
                                'color',
                                'background',
                                'background-color',
                                'stop-color',
                                'stop-opacity',
                                'paint-order',
                                'letter-spacing',
                                'dominant-baseline',
                                'alignment-baseline'
                            ];

                            const normalizeColorValue = (prop, value) => {
                                if (!value) return '';
                                const trimmed = value.trim();
                                if (!trimmed) return '';
                                if (trimmed === 'rgba(0, 0, 0, 0)' || trimmed === 'transparent') {
                                    return (prop === 'fill' || prop === 'stroke' || prop === 'background-color') ? 'none' : ''; // 透明填充改为 none，避免被微信默认成黑色
                                }
                                return trimmed;
                            };

                            const applyInlineStyles = (el) => {
                                const computed = window.getComputedStyle(el);
                                if (!computed) return;
                                const styleMap = toStyleMap(el.getAttribute('style'));
                                let changed = false;

                                properties.forEach(prop => {
                                    if (styleMap.has(prop) && styleMap.get(prop)) return;
                                    const rawValue = computed.getPropertyValue(prop);
                                    const normalized = normalizeColorValue(prop, rawValue);
                                    if (!normalized) return;
                                    styleMap.set(prop, normalized);
                                    changed = true;
                                });

                                if (changed) {
                                    el.setAttribute('style', toStyleString(styleMap));
                                }
                            };

                            applyInlineStyles(workingSvg);
                            workingSvg.querySelectorAll('*').forEach(applyInlineStyles);

                            // 移除 <style> 节点，避免被微信替换成无效标签
                            workingSvg.querySelectorAll('style').forEach(styleNode => styleNode.remove());

                            return new XMLSerializer().serializeToString(workingSvg);
                        } finally {
                            if (scratch.parentNode) {
                                scratch.parentNode.removeChild(scratch);
                            }
                        }
                    };

                    ensureRootSvgSizing();
                    processed = inlineComputedStyles();
                }
            } catch (error) {
                console.warn('Failed to inline Mermaid styles for WeChat compatibility:', error);
            }
        }

        const svgTagMatch = processed.match(/^<svg[^>]*>/i);
        if (svgTagMatch) {
            const originalSvgTag = svgTagMatch[0];
            let updatedTag = originalSvgTag.replace(/\s(width|height)="[^"]*"/gi, '');
            if (/style="[^"]*"/i.test(updatedTag)) {
                updatedTag = updatedTag.replace(/style="([^"]*)"/i, (match, styles) => {
                    const normalized = styles.replace(/\s+/g, ' ').trim();
                    const additions = ['max-width: 100%', 'height: auto', 'display: block', 'margin: 0 auto'];
                    const merged = additions.reduce((acc, rule) => acc.includes(rule) ? acc : `${acc}; ${rule}`, normalized);
                    return `style="${merged}"`;
                });
            } else {
                updatedTag = updatedTag.replace('<svg', '<svg style="max-width: 100%; height: auto; display: block; margin: 0 auto;"');
            }
            processed = processed.replace(originalSvgTag, updatedTag);
        }

        return processed;
    },

    buildMermaidContainer: function(svgMarkup, wechatStyles, originalCode) {
        if (wechatStyles && typeof wechatStyles.diagram === 'function') {
            try {
                return wechatStyles.diagram(null, svgMarkup, { code: originalCode });
            } catch (error) {
                console.warn('Diagram renderer in template failed, falling back to default container:', error);
            }
        }
        return this.defaultMermaidContainer(svgMarkup);
    },

    defaultMermaidContainer: function(svgMarkup) {
        return `<section style="margin: 24px 0; padding: 18px 16px; background: #ffffff; border-radius: 14px; border: 1px solid rgba(148, 163, 184, 0.4); box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08); overflow-x: auto;">
            <div style="min-width: 260px; max-width: 100%; margin: 0 auto; display: flex; justify-content: center;">
                ${svgMarkup}
            </div>
        </section>`;
    },

    replaceMermaidBlocks: async function(markdown, mode, themeColor) {
        if (typeof markdown !== 'string' || !markdown.includes('```mermaid')) {
            return markdown;
        }

        if (!this.ensureMermaidReady(themeColor)) {
            // Mermaid 不可用时直接返回原始 Markdown
            return markdown;
        }

        const regex = /```mermaid\s*([\s\S]*?)```/gi;
        let match;
        let cursor = 0;
        let output = '';
        let index = 0;
        const wechatStyles = this.getWechatStyles(mode, themeColor);

        while ((match = regex.exec(markdown)) !== null) {
            const preceding = markdown.slice(cursor, match.index);
            output += preceding;

            const rawCode = match[1] !== undefined ? match[1].trim() : '';
            if (!rawCode) {
                // 如果代码块为空，则跳过渲染，保持原样
                output += match[0];
                cursor = match.index + match[0].length;
                continue;
            }

            const renderId = `wechat-mermaid-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
            try {
                const renderResult = await mermaid.render(renderId, rawCode);
                const svgMarkup = this.prepareMermaidSvgMarkup(renderResult.svg);
                if (svgMarkup) {
                    output += this.buildMermaidContainer(svgMarkup, wechatStyles, rawCode);
                } else {
                    output += match[0];
                }
            } catch (error) {
                console.warn('Mermaid diagram rendering failed, falling back to code block:', error);
                output += match[0];
            }

            cursor = match.index + match[0].length;
            index += 1;
        }

        output += markdown.slice(cursor);
        return output;
    },

    // 渲染带语法高亮的代码块
    renderCodeBlock: function(code, lang, mode = 'compact', themeColor = null) {
        const trimmedCode = code.trim();
        console.log('=== CODE BLOCK DEBUG ===');
        console.log('原始代码:', JSON.stringify(code));
        console.log('修剪后代码:', JSON.stringify(trimmedCode));
        console.log('语言:', lang);
        
        const currentTheme = this.getCurrentTheme(themeColor);
        const syntaxConfig = AppConfig.syntaxHighlighting;
        
        if (!syntaxConfig.enabled || typeof hljs === 'undefined') {
            // 回退到普通样式
            console.log('使用回退样式');
            const styles = (typeof TemplateManager !== 'undefined'
                ? TemplateManager.getStyles(mode, themeColor)
                : WechatStyles.getStyles(mode, themeColor));
            return styles.codeBlock(null, lang, trimmedCode);
        }

        // 规范化语言名称
        const normalizedLang = this.normalizeLanguage(lang);
        let highlightedCode = trimmedCode;
        let detectedLang = normalizedLang || '';

        try {
            if (normalizedLang && hljs.getLanguage(normalizedLang)) {
                // 指定语言高亮
                const result = hljs.highlight(trimmedCode, { language: normalizedLang });
                highlightedCode = result.value;
                detectedLang = normalizedLang;
                console.log('使用指定语言高亮:', normalizedLang);
            } else {
                // 自动检测语言
                const result = hljs.highlightAuto(trimmedCode);
                if (result.language && result.relevance > 5) {
                    highlightedCode = result.value;
                    detectedLang = result.language;
                    console.log('自动检测语言:', result.language, '相关性:', result.relevance);
                } else {
                    console.log('未检测到语言或相关性低');
                }
            }
        } catch (error) {
            console.warn('Syntax highlighting failed:', error);
            // 使用原始代码
        }

        console.log('高亮后代码:', JSON.stringify(highlightedCode));
        
        // 生成样式化的代码块
        const result = this.generateStyledCodeBlock(highlightedCode, detectedLang, currentTheme, mode);
        console.log('最终HTML:', result);
        console.log('=== END DEBUG ===');
        return result;
    },

    // 规范化语言名称
    normalizeLanguage: function(lang) {
        if (!lang) return null;
        
        const normalized = lang.toLowerCase().trim();
        const languageMap = AppConfig.syntaxHighlighting.languageMap;
        
        return languageMap[normalized] || normalized;
    },

    // 获取当前主题
    getCurrentTheme: function(themeColor) {
        if (!themeColor) return 'purple';
        
        for (const [key, theme] of Object.entries(AppConfig.themes)) {
            if (theme.primary === themeColor) {
                return key;
            }
        }
        return 'purple';
    },

    // 生成样式化代码块
    generateStyledCodeBlock: function(code, language, theme, mode) {
        // 防御：若主题样式缺失，回退到默认主题（避免 marked 捕获的渲染错误）
        const themeStyles = 
            AppConfig.syntaxHighlighting.themeStyles[theme] ||
            AppConfig.syntaxHighlighting.themeStyles[AppConfig.defaults.theme] ||
            Object.values(AppConfig.syntaxHighlighting.themeStyles)[0];
        const isCompact = mode === 'compact';
        
        // 语言标签
        const languageLabel = language ? 
            `<div style="background: ${themeStyles.keyword}; color: white; padding: 4px 8px; border-radius: 4px 4px 0 0; font-size: 12px; font-weight: 500; display: inline-block; margin-bottom: -1px;">${language.toUpperCase()}</div>` : '';

        // 代码块样式
        const codeBlockStyle = `
            background: ${themeStyles.background};
            border: 1px solid ${themeStyles.border};
            border-radius: ${languageLabel ? '0 6px 6px 6px' : '6px'};
            padding: ${isCompact ? '14px' : '16px'};
            margin: ${isCompact ? '12px 0' : '16px 0'};
            overflow-x: auto;
            white-space: pre;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'Menlo', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            color: ${themeStyles.text};
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `.replace(/\s+/g, ' ').trim();

        // 生成内联CSS样式
        const inlineStyledCode = this.applyInlineSyntaxStyles(code, themeStyles);

        return `${languageLabel}<pre style="${codeBlockStyle}"><code class="hljs">${inlineStyledCode}</code></pre>`;
    },

    // 将语法高亮样式直接写入元素的 style 属性，避免被微信清理
    applyInlineSyntaxStyles: function(codeHtml, themeStyles) {
        const canInline = typeof window !== 'undefined'
            && typeof document !== 'undefined'
            && !!document.body;

        if (!canInline) {
            return codeHtml;
        }

        const parseStyle = (styleAttr) => {
            const map = new Map();
            if (!styleAttr || typeof styleAttr !== 'string') return map;
            styleAttr.split(';').forEach(entry => {
                const [prop, ...rest] = entry.split(':');
                if (!prop || rest.length === 0) return;
                const value = rest.join(':').trim();
                if (!value) return;
                map.set(prop.trim(), value);
            });
            return map;
        };

        const styleMapToString = (map) => Array.from(map.entries())
            .map(([prop, value]) => `${prop}: ${value}`)
            .join('; ');

        const highlightRules = this.getHighlightInlineRules(themeStyles);

        try {
            const container = document.createElement('div');
            container.innerHTML = codeHtml;

            const applyStyles = (element) => {
                if (!element || element.nodeType !== 1) return;
                const classList = Array.from(element.classList || []);
                if (!classList.length) return;

                const styleMap = parseStyle(element.getAttribute('style'));
                let changed = false;

                classList.forEach(className => {
                    const rules = highlightRules[className];
                    if (!rules) return;
                    Object.entries(rules).forEach(([prop, value]) => {
                        if (!styleMap.has(prop)) {
                            styleMap.set(prop, value);
                            changed = true;
                        }
                    });
                });

                if (!styleMap.has('color') && classList.includes('hljs-title') && element.parentElement && element.parentElement.classList.contains('hljs-class')) {
                    styleMap.set('color', highlightRules['hljs-keyword'].color);
                    if (!styleMap.has('font-weight')) {
                        styleMap.set('font-weight', '600');
                    }
                    changed = true;
                }

                if (changed) {
                    element.setAttribute('style', styleMapToString(styleMap));
                }
            };

            const allElements = container.querySelectorAll('*');
            allElements.forEach(applyStyles);
            applyStyles(container); // 处理根节点本身是 span 的情况

            this.preserveCodeLineBreaks(container);

            return container.innerHTML;
        } catch (error) {
            console.warn('Failed to inline syntax highlight styles for WeChat compatibility:', error);
            return codeHtml;
        }
    },

    preserveCodeLineBreaks: function(container) {
        if (!container || typeof container.childNodes === 'undefined') return;

        const TEXT_NODE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;
        const ELEMENT_NODE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;

        const textNodes = [];
        const collectTextNodes = (node) => {
            node.childNodes.forEach(child => {
                if (child.nodeType === TEXT_NODE) {
                    if (child.nodeValue && child.nodeValue.includes('\n')) {
                        textNodes.push(child);
                    }
                } else if (child.nodeType === ELEMENT_NODE) {
                    collectTextNodes(child);
                }
            });
        };

        collectTextNodes(container);

        textNodes.forEach(node => {
            const segments = node.nodeValue.split('\n');
            const fragment = document.createDocumentFragment();
            segments.forEach((segment, index) => {
                if (index > 0) {
                    fragment.appendChild(document.createElement('br'));
                }
                if (segment) {
                    fragment.appendChild(document.createTextNode(segment));
                }
            });
            node.parentNode.replaceChild(fragment, node);
        });
    },

    getHighlightInlineRules: function(themeStyles) {
        return {
            hljs: { color: themeStyles.text },
            'hljs-keyword': { color: themeStyles.keyword },
            'hljs-selector-tag': { color: themeStyles.keyword },
            'hljs-title': { color: themeStyles.keyword },
            'hljs-section': { color: themeStyles.keyword },
            'hljs-doctag': { color: themeStyles.keyword },
            'hljs-type': { color: themeStyles.keyword },
            'hljs-name': { color: themeStyles.keyword },
            'hljs-built_in': { color: themeStyles.keyword, 'font-weight': '600' },
            'hljs-string': { color: themeStyles.string },
            'hljs-meta': { color: themeStyles.keyword },
            'hljs-meta-string': { color: themeStyles.string },
            'hljs-comment': { color: themeStyles.comment, 'font-style': 'italic' },
            'hljs-quote': { color: themeStyles.comment, 'font-style': 'italic' },
            'hljs-number': { color: themeStyles.number },
            'hljs-literal': { color: themeStyles.number },
            'hljs-function': { color: themeStyles.function },
            'hljs-title-function_': { color: themeStyles.function },
            function_: { color: themeStyles.function },
            'hljs-variable': { color: themeStyles.variable },
            'hljs-property': { color: themeStyles.variable },
            'hljs-attr': { color: themeStyles.variable }
        };
    },

    // 主转换函数
    convertMarkdownToWechat: async function(markdown, mode = 'compact', themeColor = null) {
        // 1. 保护数学公式
        const { markdown: protectedMarkdown, mathPlaceholders } = MathRenderer.protectMathExpressions(markdown);

        // 2. 渲染 Mermaid 流程图（如果可用）
        const mermaidEnhancedMarkdown = await this.replaceMermaidBlocks(protectedMarkdown, mode, themeColor);

        // 3. 使用 marked.js 进行转换
        const renderer = this.createWechatRenderer(mode, themeColor);
        // 使用局部renderer，避免污染全局marked配置，影响GitHub预览
        let html = marked(mermaidEnhancedMarkdown, { renderer });

        // 4. 恢复数学公式
        html = MathRenderer.restoreMathExpressions(html, mathPlaceholders);
        
        // 5. 根据模式进行最终清理
        html = this.postProcessHtml(html, mode);

        // 6. 包装在微信样式容器中
        return this.wrapInWechatContainer(html);
    },

    // 后处理HTML
    postProcessHtml: function(html, mode) {
        if (mode === 'compact') {
            // 保护代码块内容
            const codeBlocks = [];
            html = html.replace(/(<pre[^>]*>[\s\S]*?<\/pre>)/g, (match, codeBlock) => {
                const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
                codeBlocks.push(codeBlock);
                return placeholder;
            });
            
            // 紧凑模式：去除多余换行和空格（但不影响代码块）
            html = html.replace(/\n\s*\n/g, '');
            html = html.replace(/\s{2,}/g, ' ');
            html = html.replace(/>\s+</g, '><');
            
            // 恢复代码块
            codeBlocks.forEach((codeBlock, index) => {
                html = html.replace(`__CODE_BLOCK_${index}__`, codeBlock);
            });
        } else {
            // 标准模式：保持适当格式
            html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
        }
        return html;
    },

    // 包装在微信样式容器中
    wrapInWechatContainer: function(html) {
        // Use <section> to mirror WeChat's outer container element
        return `<section style="font-family: 'PingFang SC', system-ui, -apple-system, 'Helvetica Neue', 'Microsoft YaHei', Arial, sans-serif; color: rgba(0, 0, 0, 0.9); max-width: 100%; overflow-wrap: break-word;">${html}</section>`;
    },

    // 获取支持的模式
    getSupportedModes: function() {
        return ['compact', 'standard'];
    },

    // 验证模式
    isValidMode: function(mode) {
        return this.getSupportedModes().includes(mode);
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownConverter;
}

// 浏览器环境下赋值给全局变量
if (typeof window !== 'undefined') {
    window.MarkdownConverter = MarkdownConverter;
} 
