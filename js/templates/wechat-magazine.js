// A magazine-style WeChat template: bold titles, separators, and polished blocks
(function() {
    if (typeof TemplateManager === 'undefined') return;

    const MagazineTemplate = {
        id: 'wechat-magazine',
        name: '杂志风',

        compact: {
            sectionNumber: (_m, number) => `
                <section style="text-align:center;margin:22px 0 14px;">
                    <div style="display:inline-block;padding:6px 10px;border:1px solid {{THEME_COLOR}};border-radius:999px;color:{{THEME_COLOR}};font-weight:700;letter-spacing:1px;">${number.padStart(2,'0')}</div>
                </section>`,

            h1: (_m, text) => `
                <section style="margin:22px 0 12px;">
                  <div style="text-align:center;font-size:22px;line-height:1.35;color:#111;font-weight:800;letter-spacing:0.5px;">${text}</div>
                  <div style="height:6px;width:84px;background:{{THEME_COLOR}};border-radius:3px;margin:8px auto 0;"></div>
                </section>`,

            h2: (_m, text) => `
                <h2 style="font-size:18px;margin:18px 0 10px;color:#111;line-height:1.35;font-weight:700;">
                  <span style="background:linear-gradient(90deg, {{THEME_TINT_BG}}, transparent);padding:0 6px 0 10px;border-left:4px solid {{THEME_COLOR}};">${text}</span>
                </h2>`,

            h3: (_m, text) => `
                <h3 style="font-size:16px;margin:14px 0 8px;color:#222;line-height:1.4;font-weight:700;">${text}</h3>`,

            bold: (_m, text) => `<strong style="font-weight:700;color:#111;">${text}</strong>`,
            italic: (_m, text) => `<em style="font-style:italic;opacity:.95;">${text}</em>`,

            blockquote: (_m, text) => `
                <blockquote style="margin:14px 0;padding:14px 16px;background:#fff;border:1px solid #eee;border-left:4px solid {{THEME_COLOR}};border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.04);">
                  <p style="margin:0;color:#444;line-height:1.7;font-size:14px;">${text}</p>
                </blockquote>`,

            codeBlock: (_m, _lang, code) => `
                <section style="margin:14px 0;">
                  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.05);">
                    <div style="height:8px;background:{{THEME_TINT_BG}};border-radius:8px 8px 0 0;"></div>
                    <pre style="margin:0;padding:14px;overflow-x:auto;white-space:pre;font-family:'SF Mono','Monaco','Menlo',monospace;font-size:14px;color:#111;">${(code||'').trim()}</pre>
                  </div>
                </section>`,

            inlineCode: (_m, code) => `
                <code style="background:#fff0f0;color:#b91c1c;padding:2px 6px;border-radius:4px;border:1px solid #ffe0e0;font-family:'Monaco','Menlo','Ubuntu Mono',monospace;font-size:13px;">${code}</code>`,

            image: (_m, alt, src) => {
                const caption = alt ? `<p style=\"font-size:12px;color:#888;margin:6px 0 0;text-align:center;\">${alt}</p>` : '';
                return `
                <figure style="margin:18px 0;text-align:center;">
                  <img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,.06);">
                  ${caption}
                </figure>`;
            },

            link: (_m, text, url) => `<a href="${url}" style="color:{{THEME_COLOR}};text-decoration:none;border-bottom:1px solid {{THEME_COLOR}};" target="_blank">${text}</a>`,

            paragraph: (_m, text) => {
                if ((text||'').trim() === '') return '';
                return `<p style="margin:12px 0;line-height:1.75;color:#222;font-size:15px;">${text}</p>`;
            },

            leadParagraph: (_m, text) => `
                <section style="margin:18px 0;padding:16px;border-radius:10px;background:{{THEME_TINT_BG}};border:1px solid rgba(0,0,0,.05);">
                  <p style="margin:0;line-height:1.75;color:#222;font-size:15px;">${text}</p>
                </section>`
        },

        standard: {},

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

        getStyles(mode, themeColor) {
            if (!this.standard || !this.standard.h1) {
                // derive standard with more generous spacing and accent lines
                const c = this.compact;
                this.standard = {
                    sectionNumber: c.sectionNumber,
                    h1: (_m, text) => `
                        <section style=\"margin:26px 0 14px;\">
                          <div style=\"text-align:center;font-size:24px;line-height:1.35;color:#111;font-weight:800;letter-spacing:0.6px;\">${text}</div>
                          <div style=\"height:7px;width:96px;background:{{THEME_COLOR}};border-radius:4px;margin:10px auto 0;\"></div>
                        </section>`,
                    h2: (_m, text) => `<h2 style=\"font-size:20px;margin:20px 0 12px;color:#111;line-height:1.4;font-weight:700;\"><span style=\"background:linear-gradient(90deg, {{THEME_TINT_BG}}, transparent);padding:0 8px 0 12px;border-left:5px solid {{THEME_COLOR}};\">${text}</span></h2>`,
                    h3: (_m, text) => `<h3 style=\"font-size:18px;margin:16px 0 10px;color:#222;line-height:1.45;font-weight:700;\">${text}</h3>`,
                    bold: c.bold,
                    italic: c.italic,
                    blockquote: (_m, text) => `
                        <blockquote style=\"margin:16px 0;padding:16px 18px;background:#fff;border:1px solid #eee;border-left:5px solid {{THEME_COLOR}};border-radius:8px;box-shadow:0 3px 8px rgba(0,0,0,.06);\"><p style=\"margin:0;color:#444;line-height:1.8;font-size:15px;\">${text}</p></blockquote>`,
                    codeBlock: c.codeBlock,
                    inlineCode: c.inlineCode,
                    image: c.image,
                    link: c.link,
                    paragraph: (_m, text) => text.trim() ? `<p style=\"margin:14px 0;line-height:1.8;color:#222;font-size:15px;\">${text}</p>` : '',
                    leadParagraph: (_m, text) => `
                        <section style=\"margin:20px 0;padding:18px;border-radius:12px;background:{{THEME_TINT_BG}};border:1px solid rgba(0,0,0,.06);\"><p style=\"margin:0;line-height:1.8;color:#222;font-size:15px;\">${text}</p></section>`
                };
            }
            const base = (mode === 'standard') ? this.standard : this.compact;
            return this.applyTheme(base, themeColor);
        }
    };

    TemplateManager.register(MagazineTemplate);
})();

