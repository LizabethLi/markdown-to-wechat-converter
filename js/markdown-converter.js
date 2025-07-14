// Markdown转换器核心模块
const MarkdownConverter = {
    // 创建微信渲染器
    createWechatRenderer: function(mode) {
        const wechatStyles = WechatStyles.getStyles(mode);
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
            
            // 改进的文本清理逻辑
            let cleanedText = this.cleanListItemText(text);
            
            return `<li style="${style}">${cleanedText}</li>`;
        };

        // 引用
        renderer.blockquote = (quote) => {
            const unwrappedQuote = quote.replace(/^<p>([\s\S]*)<\/p>\n?$/, '$1');
            return wechatStyles.blockquote(null, unwrappedQuote);
        };

        // 代码块
        renderer.code = (code, lang, escaped) => wechatStyles.codeBlock(null, lang, code);
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

    // 清理列表项文本
    cleanListItemText: function(text) {
        // 保护嵌套的子列表
        const nestedLists = [];
        let cleanedText = text.replace(/(<[uo]l[^>]*>[\s\S]*?<\/[uo]l>)/g, (match, listContent) => {
            const placeholder = `__NESTED_LIST_${nestedLists.length}__`;
            nestedLists.push(listContent);
            return placeholder;
        });
        
        // 处理段落标签，智能合并文本内容
        cleanedText = cleanedText.replace(/<p>([\s\S]*?)<\/p>/g, (match, content) => {
            return content.trim();
        });
        
        // 清理多余的空白字符，但保持单个空格
        cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
        
        // 恢复嵌套列表
        nestedLists.forEach((listContent, index) => {
            cleanedText = cleanedText.replace(`__NESTED_LIST_${index}__`, listContent);
        });
        
        return cleanedText;
    },

    // 主转换函数
    convertMarkdownToWechat: function(markdown, mode = 'compact') {
        // 1. 保护数学公式
        const { markdown: protectedMarkdown, mathPlaceholders } = MathRenderer.protectMathExpressions(markdown);

        // 2. 使用 marked.js 进行转换
        const renderer = this.createWechatRenderer(mode);
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
            // 紧凑模式：去除多余换行和空格
            html = html.replace(/\n\s*\n/g, '');
            html = html.replace(/\s{2,}/g, ' ');
            html = html.replace(/>\s+</g, '><');
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