// A minimal WeChat template with clean typography
(function() {
    if (typeof TemplateManager === 'undefined') return;

    const MinimalTemplate = {
        id: 'wechat-minimal',
        name: '极简风格',

        compact: {
            sectionNumber: (_match, number) =>
                `<section style="text-align:center;margin:18px 0 10px;"><p style="font-size:24px;color:#111;font-weight:700;margin:0;letter-spacing:1px;">${number.padStart(2, '0')}</p></section>`,

            h1: (_m, text) =>
                `<h1 style="font-size:22px;margin:18px 0 10px;line-height:1.3;color:#111;border-left:4px solid {{THEME_COLOR}};padding-left:10px;">${text}</h1>`,

            h2: (_m, text) =>
                `<h2 style="font-size:18px;margin:16px 0 8px;line-height:1.35;color:#111;border-left:3px solid {{THEME_COLOR}};padding-left:10px;">${text}</h2>`,

            h3: (_m, text) =>
                `<h3 style="font-size:16px;margin:14px 0 6px;line-height:1.4;color:#222;font-weight:600;">${text}</h3>`,

            bold: (_m, text) => `<strong style="font-weight:600;color:#111;">${text}</strong>`,
            italic: (_m, text) => `<em style="font-style:italic;">${text}</em>`,

            blockquote: (_m, text) =>
                `<blockquote style="margin:10px 0;padding:10px 12px;border-left:3px solid {{THEME_COLOR}};background:#fafafa;border-radius:4px;">
                    <p style="margin:0;line-height:1.6;color:#444;">${text}</p>
                </blockquote>`,

            codeBlock: (_m, _lang, code) =>
                `<pre style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:14px;overflow-x:auto;margin:12px 0;white-space:pre;font-family:'SF Mono','Monaco','Menlo',monospace;font-size:14px;color:#111;">${(code||'').trim()}</pre>`,

            inlineCode: (_m, code) =>
                `<code style="background:#f3f4f6;color:#be123c;padding:2px 6px;border-radius:3px;font-family:'Monaco','Menlo','Ubuntu Mono',monospace;font-size:13px;">${code}</code>`,

            image: (_m, alt, src) => {
                const altText = alt ? `<p style=\"font-size:12px;color:#888;margin:6px 0 0;text-align:center;\">${alt}</p>` : '';
                return `<section style="text-align:center;margin:16px 0;"><img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:6px;">${altText}</section>`;
            },

            link: (_m, text, url) =>
                `<a href="${url}" style="color:{{THEME_COLOR}};text-decoration:none;border-bottom:1px solid {{THEME_COLOR}};" target="_blank">${text}</a>`,

            paragraph: (_m, text) => {
                if ((text||'').trim() === '') return '';
                return `<p style="margin:10px 0;line-height:1.65;color:#222;font-size:14px;">${text}</p>`;
            },

            leadParagraph: (_m, text) =>
                `<section style="margin:14px 0;padding:14px;border-radius:6px;background:{{THEME_TINT_BG}};">
                    <p style="margin:0;line-height:1.65;color:#222;font-size:14px;">${text}</p>
                </section>`
        },

        standard: {}, // will be derived by tweaking compact values

        // Theming helpers
        applyTheme(styles, themeColor) {
            const color = themeColor || '#7E3AF2';
            const tint = this.generateTintColor(color, 0.12);
            const themed = {};
            for (const key in styles) {
                if (typeof styles[key] === 'function') {
                    themed[key] = (...args) => String(styles[key](...args))
                        .replace(/\{\{THEME_COLOR\}\}/g, color)
                        .replace(/\{\{THEME_TINT_BG\}\}/g, tint);
                }
            }
            return themed;
        },

        generateTintColor(hex, ratio = 0.12) {
            const rgb = this.hexToRgb(hex);
            if (!rgb) return hex;
            const mix = (c) => Math.round(255 - (255 - c) * ratio);
            return this.rgbToHex(mix(rgb.r), mix(rgb.g), mix(rgb.b));
        },
        hexToRgb(hex) {
            if (!hex) return null;
            let h = hex.replace('#','').trim();
            if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
            if (h.length !== 6) return null;
            const n = parseInt(h,16);
            return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
        },
        rgbToHex(r,g,b) {
            const to = (n)=> n.toString(16).padStart(2,'0');
            return `#${to(r)}${to(g)}${to(b)}`;
        },

        // Expose the styles for a given mode
        getStyles(mode, themeColor) {
            // If standard not initialized, derive from compact with slightly looser spacing
            if (!this.standard || !this.standard.h1) {
                const c = this.compact;
                this.standard = {
                    sectionNumber: c.sectionNumber,
                    h1: (_m, t) => `<h1 style="font-size:24px;margin:22px 0 12px;line-height:1.35;color:#111;border-left:5px solid {{THEME_COLOR}};padding-left:12px;">${t}</h1>`,
                    h2: (_m, t) => `<h2 style="font-size:20px;margin:18px 0 10px;line-height:1.4;color:#111;border-left:4px solid {{THEME_COLOR}};padding-left:12px;">${t}</h2>`,
                    h3: (_m, t) => `<h3 style="font-size:17px;margin:16px 0 8px;line-height:1.45;color:#222;font-weight:600;">${t}</h3>`,
                    bold: c.bold,
                    italic: c.italic,
                    blockquote: (_m, text) =>
                        `<blockquote style=\"margin:12px 0;padding:12px 14px;border-left:4px solid {{THEME_COLOR}};background:#f7f7f7;border-radius:6px;\"><p style=\"margin:0;line-height:1.7;color:#444;\">${text}</p></blockquote>`,
                    codeBlock: c.codeBlock,
                    inlineCode: c.inlineCode,
                    image: c.image,
                    link: c.link,
                    paragraph: (_m, text) => text.trim() ? `<p style="margin:12px 0;line-height:1.75;color:#222;font-size:15px;">${text}</p>` : '',
                    leadParagraph: (_m, text) =>
                        `<section style="margin:18px 0;padding:16px;border-radius:8px;background:{{THEME_TINT_BG}};"><p style="margin:0;line-height:1.75;color:#222;font-size:15px;">${text}</p></section>`
                };
            }
            const base = (mode === 'standard') ? this.standard : this.compact;
            return this.applyTheme(base, themeColor);
        }
    };

    TemplateManager.register(MinimalTemplate);
})();

