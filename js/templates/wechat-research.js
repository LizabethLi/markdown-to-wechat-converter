// Research reading-list typography. Color comes from the existing theme selector.
(function() {
    if (typeof TemplateManager === 'undefined') return;

    const INK = '#2c2c2c';
    const FONT = "-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif";
    const escapeAttribute = (value) => String(value || '')
        .replace(/&(?!#\d+;|#x[\da-f]+;|[a-z][\da-z]+;)/gi, '&amp;')
        .replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    function palette(themeColor) {
        const fallback = typeof AppConfig !== 'undefined'
            ? AppConfig.themes[AppConfig.defaults.theme].primary : '#7E3AF2';
        let hex = /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(themeColor || '')
            ? themeColor.toLowerCase() : fallback.toLowerCase();
        if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
        const rgb = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
        const alpha = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
        const rgba = (values, opacity) => `rgba(${values.join(',')},${Number((opacity * alpha).toFixed(3))})`;
        const scaled = (ratio) => rgb.map(c => Math.round(c * ratio));
        const luminance = (values) => values.map(c => {
            const s = c / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
        // Keep colored text readable even when the selected accent is very light.
        let textRatio = 0.59;
        while (luminance(scaled(textRatio)) > 0.183) textRatio *= 0.9;
        return {
            accent: hex,
            tint: (opacity) => rgba(rgb, opacity),
            border: (opacity = 1) => rgba(scaled(0.86), opacity),
            text: `rgb(${scaled(textRatio).join(',')})`,
            highlightText: luminance(rgb) > 0.179 ? '#111111' : '#ffffff'
        };
    }

    const ResearchTemplate = {
        id: 'wechat-research',
        name: '科研精选',
        exampleKey: 'research',
        // No defaultTheme: selecting this template preserves the user's color.
        getStyles(mode, themeColor) {
            const color = palette(themeColor);
            const spacious = mode === 'standard';
            const gap = spacious ? 24 : 21;
            const lineHeight = spacious ? '1.95' : '1.8228';
            const body = `font-family:${FONT};font-size:15px;line-height:${lineHeight};font-weight:400;color:${INK};text-align:left;overflow-wrap:break-word;`;
            const heading = `color:${INK};font-family:${FONT};text-align:left;overflow-wrap:anywhere;`;
            const quote = (content) => {
                const paragraphs = (String(content).match(/<p\b/gi) || []).length;
                let index = 0;
                const normalized = String(content).replace(/<p\b[^>]*>/gi, () =>
                    `<p style="${body}margin:0 0 ${++index === paragraphs ? 0 : 12}px;">`);
                return `<blockquote style="margin:8px 0 ${gap}px;padding:12px 16px;background:#f8f9fa;border-left:4px solid ${color.accent};border-radius:4px;${body}">${normalized}</blockquote>`;
            };

            return {
                container: (_m, html) => `<section data-wechat-template="research" style="width:100%;max-width:720px;box-sizing:border-box;margin:0 auto;padding:19px 18px;${body}word-wrap:break-word;">${html}</section>`,
                sectionNumber: (_m, number) => `<p style="margin:26px 0 12px;font-family:${FONT};font-size:14px;font-weight:700;color:${color.text};">${String(number).padStart(2, '0')}</p>`,
                h1: (_m, text) => `<h1 style="margin:41px 0 26px;${heading}font-size:23px;line-height:1.24;font-weight:800;letter-spacing:-0.015em;background:${color.tint(0.1)};border-left:6px solid ${color.border()};padding:8px 10px;">${text}</h1>`,
                h2: (_m, text) => `<h2 style="margin:32px 0 22px;${heading}font-size:19px;line-height:1.35;font-weight:700;border-left:3px solid ${color.border()};padding:4px 9px;background:${color.tint(0.06)};">${text}</h2>`,
                h3: (_m, text) => `<h3 style="margin:26px 0 19px;${heading}font-size:15px;line-height:1.42;font-weight:600;letter-spacing:0.045em;"><span style="display:inline-block;max-width:100%;box-sizing:border-box;background:${color.tint(0.08)};border-left:2px solid ${color.border(0.62)};padding:2px 6px;word-break:break-word;">${text}</span></h3>`,
                paragraph: (_m, text) => String(text || '').trim()
                    ? `<p style="margin:0 0 ${gap}px;${body}">${text}</p>` : '',
                bold: (_m, text) => `<strong style="font-weight:700;color:${color.text};">${text}</strong>`,
                italic: (_m, text) => `<em style="font-style:italic;">${text}</em>`,
                leadParagraph: (_m, text) => {
                    const highlighted = String(text).replace(/<strong\b[^>]*>/gi,
                        `<strong style="font-weight:700;background:${color.accent};color:${color.highlightText};">`);
                    return `<section style="margin:8px 0 ${gap}px;padding:18px 20px;background:#f8f9fa;border-left:4px solid ${color.accent};border-radius:4px;"><p style="margin:0;${body}font-size:12px;line-height:1.75;">${highlighted}</p></section>`;
                },
                blockquoteContent: (_m, content) => quote(content),
                blockquote: (_m, text) => quote(`<p>${text}</p>`),
                // Alt remains accessible; captions are explicit Markdown paragraphs below the image.
                image: (_m, alt, src) => `<section style="margin:23px 0;width:100%;max-width:100%;"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" style="display:block;border-radius:4px;width:100%;max-width:100%;height:auto;margin:0 auto;"></section>`,
                link: (_m, text, url) => `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" style="color:${color.text};text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere;">${text}</a>`,
                inlineCode: (_m, code) => `<code style="background:${color.tint(0.1)};color:${color.text};padding:2px 5px;border-radius:3px;font-family:'SF Mono','Menlo',monospace;font-size:13px;">${code}</code>`,
                hr: () => `<hr style="margin:28px 0;border:0;border-top:1px solid ${color.border(0.35)};">`,
                list: (_m, content, ordered, start) => {
                    if (/data-wechat-task-item="true"/.test(content || '')) {
                        return `<section data-wechat-task-list="true" style="margin:0 0 ${gap}px;">${content}</section>`;
                    }
                    const tag = ordered ? 'ol' : 'ul';
                    const startAttr = ordered && Number.isInteger(start) ? ` start="${start}"` : '';
                    return `<${tag}${startAttr} class="list-paddingleft-1" style="margin:0 0 ${gap}px;padding-left:26px;${body}list-style-position:outside;">${content}</${tag}>`;
                },
                listItem: (_m, text, task = false, checked = false) => {
                    const content = String(text || '').replace(/^<input\b[^>]*type="checkbox"[^>]*>\s*/i, '').trim();
                    if (task) {
                        return `<section data-wechat-task-item="true" style="margin:8px 0;${body}"><span style="color:${color.text};font-weight:700;">${checked ? '☑' : '☐'}&nbsp;</span>${content}</section>`;
                    }
                    return `<li style="margin:8px 0;${body}">${content}</li>`;
                },
                table: (_m, header, content) => `<section style="max-width:100%;overflow-x:auto;margin:23px 0;"><table style="width:100%;border-collapse:collapse;${body}"><thead>${header}</thead><tbody>${content}</tbody></table></section>`,
                tableRow: (_m, content) => `<tr>${content}</tr>`,
                tableCell: (_m, content, flags = {}) => {
                    const tag = flags.header ? 'th' : 'td';
                    const align = ['left', 'center', 'right'].includes(flags.align) ? flags.align : 'left';
                    return `<${tag} style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;line-height:1.7;color:${INK};text-align:${align};vertical-align:top;${flags.header ? `background:${color.tint(0.1)};font-weight:700;` : ''}">${content}</${tag}>`;
                },
                diagram: (_m, svg) => `<section style="margin:23px 0;max-width:100%;overflow-x:auto;text-align:center;">${svg}</section>`
            };
        }
    };

    TemplateManager.register(ResearchTemplate);
})();
