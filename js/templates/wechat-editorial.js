// Editorial paper template inspired by long-form observation and roundtable articles.
(function() {
    if (typeof TemplateManager === 'undefined') return;

    const PAPER = '#faf8f3';
    const CARD = '#fffdf8';
    const INK = '#292620';
    const INK_SOFT = '#6b655a';
    const LINE = '#e6e1d3';
    const LINE_STRONG = '#d8d2c0';
    const DEFAULT_ACCENT = '#2f6e5c';
    const SERIF = "'Songti SC','STSong','SimSun',serif";
    const SANS = "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif";

    const EditorialTemplate = {
        id: 'wechat-editorial',
        name: '纸页观察',
        defaultTheme: 'paper',

        normalizeColor(color) {
            return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color.trim())
                ? color.trim()
                : DEFAULT_ACCENT;
        },

        mixWithWhite(color, ratio) {
            const value = parseInt(color.slice(1), 16);
            const mix = (component) => Math.round(255 - (255 - component) * ratio);
            const r = mix((value >> 16) & 255);
            const g = mix((value >> 8) & 255);
            const b = mix(value & 255);
            return `#${[r, g, b].map(item => item.toString(16).padStart(2, '0')).join('')}`;
        },

        darken(color, ratio) {
            const value = parseInt(color.slice(1), 16);
            const scale = (component) => Math.max(0, Math.round(component * ratio));
            const r = scale((value >> 16) & 255);
            const g = scale((value >> 8) & 255);
            const b = scale(value & 255);
            return `#${[r, g, b].map(item => item.toString(16).padStart(2, '0')).join('')}`;
        },

        buildStyles(mode, themeColor) {
            const accent = this.normalizeColor(themeColor);
            const accentInk = this.darken(accent, 0.76);
            const accentSoft = this.mixWithWhite(accent, 0.10);
            const isCompact = mode !== 'standard';
            const bodySize = isCompact ? '15px' : '16px';
            const bodyLineHeight = isCompact ? '1.85' : '1.95';

            return {
                container: (_match, html) =>
                    `<section data-wechat-template="editorial" style="max-width:100%;padding:${isCompact ? '24px 18px 40px' : '30px 22px 48px'};background:${PAPER};color:${INK};font-family:${SANS};font-size:${bodySize};line-height:${bodyLineHeight};overflow-wrap:break-word;word-break:break-word;box-sizing:border-box;">${html}</section>`,

                sectionNumber: (_match, number) =>
                    `<section style="margin:${isCompact ? '34px 0 14px' : '42px 0 18px'};padding-top:18px;border-top:1px solid ${LINE_STRONG};"><p style="margin:0;color:${accent};font-family:${SERIF};font-size:14px;line-height:1.4;font-weight:700;letter-spacing:2px;">${String(number).padStart(2, '0')}</p></section>`,

                h1: (_match, text) =>
                    `<section style="margin:0 0 ${isCompact ? '28px' : '34px'};padding-top:${isCompact ? '8px' : '12px'};"><span style="display:block;width:42px;border-top:3px solid ${accent};margin:0 0 18px;"></span><h1 style="margin:0;color:${INK};font-family:${SERIF};font-size:${isCompact ? '25px' : '28px'};line-height:1.4;font-weight:700;letter-spacing:0.5px;">${text}</h1></section>`,

                h2: (_match, text) =>
                    `<section style="margin:${isCompact ? '42px 0 20px' : '52px 0 24px'};padding-top:${isCompact ? '18px' : '22px'};border-top:1px solid ${LINE_STRONG};"><h2 style="margin:0;color:${INK};font-family:${SERIF};font-size:${isCompact ? '21px' : '23px'};line-height:1.45;font-weight:700;letter-spacing:0.2px;">${text}</h2></section>`,

                h3: (_match, text) =>
                    `<h3 style="margin:${isCompact ? '24px 0 10px' : '28px 0 12px'};color:${accentInk};font-family:${SERIF};font-size:${isCompact ? '17px' : '18px'};line-height:1.5;font-weight:700;">${text}</h3>`,

                bold: (_match, text) =>
                    `<strong style="color:${INK};font-weight:700;">${text}</strong>`,

                // In this template, Markdown emphasis doubles as the soft-green term treatment.
                italic: (_match, text) =>
                    `<em style="padding:1px 5px;background:${accentSoft};border-radius:3px;color:${accentInk};font-style:normal;font-weight:600;white-space:normal;">${text}</em>`,

                paragraph: (_match, text) => {
                    if (!String(text || '').trim()) return '';
                    return `<p style="margin:${isCompact ? '13px 0' : '15px 0'};color:${INK};font-family:${SANS};font-size:${bodySize};line-height:${bodyLineHeight};text-align:left;">${text}</p>`;
                },

                leadParagraph: (_match, text) =>
                    `<section style="margin:${isCompact ? '20px 0 28px' : '24px 0 32px'};padding:${isCompact ? '17px 18px' : '20px 22px'};background:${CARD};border:1px solid ${LINE};border-top:3px solid ${accent};border-radius:4px;"><p style="margin:0;color:${INK};font-family:${SERIF};font-size:${isCompact ? '16px' : '17px'};line-height:1.85;font-weight:600;">${text}</p></section>`,

                blockquoteContent: (_match, quote) => {
                    const normalizedQuote = String(quote || '')
                        .replace(/<p\b[^>]*>/gi, `<p style="margin:0;color:${INK};font-family:${SERIF};font-size:${isCompact ? '19px' : '21px'};line-height:1.65;font-weight:600;text-align:center;">`);
                    return `<blockquote style="margin:${isCompact ? '28px 0' : '34px 0'};padding:0;text-align:center;border:0;"><span style="display:block;width:42px;border-top:3px solid ${accent};margin:0 auto 18px;"></span>${normalizedQuote}</blockquote>`;
                },

                blockquote: (_match, text) =>
                    `<blockquote style="margin:${isCompact ? '28px 0' : '34px 0'};padding:0;text-align:center;border:0;"><span style="display:block;width:42px;border-top:3px solid ${accent};margin:0 auto 18px;"></span><p style="margin:0;color:${INK};font-family:${SERIF};font-size:${isCompact ? '19px' : '21px'};line-height:1.65;font-weight:600;text-align:center;">${text}</p></blockquote>`,

                hr: () =>
                    `<hr style="height:0;margin:${isCompact ? '28px 0' : '34px 0'};border:0;border-top:1px solid ${LINE_STRONG};">`,

                list: (_match, body, ordered) => {
                    if (/data-wechat-task-item="true"/.test(body || '')) {
                        return `<section data-wechat-task-list="true" style="margin:${isCompact ? '16px 0' : '20px 0'};">${body}</section>`;
                    }
                    const tag = ordered ? 'ol' : 'ul';
                    return `<${tag} class="list-paddingleft-1" style="margin:${isCompact ? '16px 0' : '20px 0'};padding-left:28px;color:${accent};list-style-position:outside;">${body}</${tag}>`;
                },

                listItem: (_match, text, task = false, checked = false) => {
                    const content = String(text || '')
                        .replace(/^<input\b[^>]*type="checkbox"[^>]*>\s*/i, '')
                        .trim();
                    const hasBlockLevel = /<(?:p|div|section|ul|ol|pre|blockquote|h[1-6]|table)\b/i.test(content);
                    if (task) {
                        const markerColor = checked ? accent : INK_SOFT;
                        return `<section data-wechat-task-item="true" style="margin:8px 0;padding:12px 14px;background:${CARD};border:1px solid ${LINE};border-radius:4px;color:${INK};font-size:${bodySize};line-height:1.75;"><span style="color:${markerColor};font-weight:700;">${checked ? '☑' : '☐'}&nbsp;</span>${content}</section>`;
                    }
                    if (hasBlockLevel) {
                        return `<li style="margin:9px 0;color:${accent};font-size:${bodySize};line-height:1.75;">${content}</li>`;
                    }
                    return `<li style="margin:9px 0;color:${accent};font-size:${bodySize};line-height:1.75;"><p style="display:inline;margin:0;color:${INK};font-size:${bodySize};line-height:1.75;">${content}</p></li>`;
                },

                table: (_match, header, body) =>
                    `<section style="max-width:100%;margin:${isCompact ? '22px 0' : '28px 0'};overflow-x:auto;background:${CARD};border:1px solid ${LINE};border-radius:4px;"><table style="width:100%;border-collapse:collapse;table-layout:auto;background:${CARD};"><thead>${header}</thead><tbody>${body}</tbody></table></section>`,

                tableRow: (_match, content) =>
                    `<tr style="border-top:1px solid ${LINE};">${content}</tr>`,

                tableCell: (_match, content, flags) => {
                    const isHeader = !!(flags && flags.header);
                    const tag = isHeader ? 'th' : 'td';
                    const align = flags && flags.align ? flags.align : 'left';
                    const style = isHeader
                        ? `padding:${isCompact ? '10px 9px' : '12px 11px'};background:#f2efe5;border:1px solid ${LINE};border-bottom:2px solid ${accent};color:${INK};font-size:${isCompact ? '13px' : '14px'};line-height:1.6;font-weight:700;text-align:${align};vertical-align:bottom;`
                        : `padding:${isCompact ? '10px 9px' : '12px 11px'};border:1px solid ${LINE};color:${INK};font-size:${isCompact ? '13px' : '14px'};line-height:1.7;text-align:${align};vertical-align:top;`;
                    return `<${tag} style="${style}">${content}</${tag}>`;
                },

                inlineCode: (_match, code) =>
                    `<code style="padding:2px 5px;background:${accentSoft};border-radius:3px;color:${accentInk};font-family:'SF Mono','Menlo','Monaco',monospace;font-size:13px;">${code}</code>`,

                image: (_match, alt, src) => {
                    const caption = alt
                        ? `<p style="margin:7px 0 0;color:${INK_SOFT};font-size:12px;line-height:1.6;text-align:center;">${alt}</p>`
                        : '';
                    return `<section style="margin:${isCompact ? '22px 0' : '28px 0'};text-align:center;"><img src="${src}" alt="${alt || ''}" style="display:block;max-width:100%;height:auto;margin:0 auto;border-radius:4px;">${caption}</section>`;
                },

                link: (_match, text, url) =>
                    `<a href="${url}" target="_blank" style="color:${accentInk};text-decoration:none;border-bottom:1px solid ${accent};">${text}</a>`,

                diagram: (_match, svg) =>
                    `<section style="margin:${isCompact ? '22px 0' : '28px 0'};padding:${isCompact ? '14px 12px' : '17px 15px'};background:${CARD};border:1px solid ${LINE};border-top:3px solid ${accent};border-radius:4px;overflow-x:auto;"><div style="min-width:260px;max-width:100%;margin:0 auto;text-align:center;">${svg}</div></section>`
            };
        },

        getStyles(mode, themeColor) {
            return this.buildStyles(mode, themeColor);
        }
    };

    TemplateManager.register(EditorialTemplate);
})();
