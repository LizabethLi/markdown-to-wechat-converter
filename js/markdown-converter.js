// Markdown转换器核心模块
const MarkdownConverter = {
    // 创建微信渲染器
    createWechatRenderer: function(mode, themeColor) {
        const wechatStyles = WechatStyles.getStyles(mode, themeColor);
        const renderer = new marked.Renderer();

        // 标题渲染
        renderer.heading = (text, level, raw) => {
            if (level === 1) return wechatStyles.h1(raw, text);
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
            return `<${tag} style="${styles}">${body}</${tag}>`;
        };

        renderer.listitem = (text) => {
            const style = mode === 'compact'
                ? `margin: 5px 0; line-height: 1.6; font-size: 14px; color: #333;`
                : `margin: 8px 0; line-height: 1.6; font-size: 14px; color: #333;`;
            
            const parsedContent = marked.parseInline(text);

            // 使用 <span> 包裹内容，避免微信编辑器插入 <section> 块级元素导致换行
            return `<li style="${style}"><span>${parsedContent}</span></li>`;
        };

        // 引用
        renderer.blockquote = (quote) => {
            const unwrappedQuote = quote.replace(/^<p>([\s\S]*)<\/p>\n?$/, '$1');
            return wechatStyles.blockquote(null, unwrappedQuote);
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
            return WechatStyles.getStyles(mode, themeColor).codeBlock(null, lang, trimmedCode);
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
        const themeStyles = AppConfig.syntaxHighlighting.themeStyles[theme];
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
        const inlineStyles = this.generateInlineSyntaxStyles(themeStyles);

        return `${languageLabel}<pre style="${codeBlockStyle}"><code class="hljs">${inlineStyles}${code}</code></pre>`;
    },

    // 生成内联语法高亮样式
    generateInlineSyntaxStyles: function(themeStyles) {
        return `<style>
            .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-title, .hljs-section, .hljs-doctag, .hljs-type, .hljs-name { color: ${themeStyles.keyword} !important; }
            .hljs-string, .hljs-meta .hljs-meta-string { color: ${themeStyles.string} !important; }
            .hljs-comment, .hljs-quote { color: ${themeStyles.comment} !important; font-style: italic; }
            .hljs-number, .hljs-literal { color: ${themeStyles.number} !important; }
            .hljs-function, .hljs-title.function { color: ${themeStyles.function} !important; }
            .hljs-variable, .hljs-property, .hljs-attr { color: ${themeStyles.variable} !important; }
            .hljs-built_in, .hljs-class .hljs-title { color: ${themeStyles.keyword} !important; font-weight: 600; }
        </style>`;
    },

    // 主转换函数
    convertMarkdownToWechat: function(markdown, mode = 'compact', themeColor = null) {
        // 1. 保护数学公式
        const { markdown: protectedMarkdown, mathPlaceholders } = MathRenderer.protectMathExpressions(markdown);

        // 2. 使用 marked.js 进行转换
        const renderer = this.createWechatRenderer(mode, themeColor);
        marked.setOptions({ renderer });
        let html = marked(protectedMarkdown);

        // 3. 恢复数学公式
        html = MathRenderer.restoreMathExpressions(html, mathPlaceholders);
        
        // 4. 根据模式进行最终清理
        html = this.postProcessHtml(html, mode);

        // 5. 包装在微信样式容器中
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
        return `<div style="font-family: 'PingFang SC', system-ui, -apple-system, 'Helvetica Neue', 'Microsoft YaHei', Arial, sans-serif; color: rgba(0, 0, 0, 0.9); max-width: 100%; overflow-wrap: break-word;">${html}</div>`;
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