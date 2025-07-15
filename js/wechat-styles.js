// 微信公众号样式定义模块
const WechatStyles = {
    // 默认主题色
    defaultThemeColor: '#7E3AF2',
    // 紧凑模式样式（去除换行，适合微信公众号）
    compact: {
        sectionNumber: (match, number) => 
            `<section style="text-align: center; margin: 20px 0 15px 0;"><p style="font-size: 28px; color: rgb(0, 0, 0); line-height: 1.2; font-weight: bold; margin: 0;">${number.padStart(2, '0')}</p></section>`,
        
        h1: (match, text) => 
            `<section style="text-align: center; margin: 25px 0 15px 0;"><p style="min-height: 1em; color: rgb(51, 51, 51); line-height: 1.4; margin: 0;"><strong><span style="background: {{THEME_COLOR}}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 16px;">${text}</span></strong></p></section>`,
        
        h2: (match, text) => 
            `<p style="font-size: 20px; font-weight: bold; margin: 25px 0 15px 0; padding-left: 12px; border-left: 4px solid {{THEME_COLOR}}; line-height: 1.3;"><span style="font-weight: bold; color: #333;">${text}</span></p>`,
        
        h3: (match, text) => 
            `<h3 style="line-height: 1.4; font-size: 16px; margin: 20px 0 10px 0; color: #333; font-weight: bold;">${text}</h3>`,
        
        bold: (match, text) => `<strong style="font-weight: bold; color: #333;">${text}</strong>`,
        
        italic: (match, text) => `<em style="font-style: italic;">${text}</em>`,
        
        unorderedList: (match, text) => 
            `<li style="margin: 5px 0; line-height: 1.6; list-style-type: disc;"><span style="font-size: 14px; color: #333;">${text}</span></li>`,
        
        orderedList: (match, text) => 
            `<li style="margin: 5px 0; line-height: 1.6;"><span style="font-size: 14px; color: #333;">${text}</span></li>`,
        
        blockquote: (match, text) => 
            `<blockquote style="margin: 8px 0; padding: 12px 16px; background: #f8f9fa; border-left: 4px solid {{THEME_COLOR}}; border-radius: 4px;"><p style="line-height: 1.6; margin: 0; font-size: 14px; color: #555; font-style: italic;">${text}</p></blockquote>`,
        
        codeBlock: (match, lang, code) => 
            `<pre style="background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 15px 0; border: 1px solid #d0d7de; white-space: pre-wrap; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'Menlo', 'Courier New', monospace; font-size: 14px; line-height: 1.5; color: #24292f; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">${code.trim()}</pre>`,
        
        inlineCode: (match, code) => 
            `<code style="background: #f1f3f4; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px; color: #d73a49;">${code}</code>`,
        
        image: (match, alt, src) => {
            const altText = alt ? `<p style="font-size: 12px; color: #999; margin: 5px 0 0 0; font-style: italic; text-align: center;">${alt}</p>` : '';
            return `<section style="text-align: center; margin: 20px 0;"><img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 6px;">${altText}</section>`;
        },
        
        link: (match, text, url) => 
            `<a href="${url}" style="color: {{THEME_COLOR}}; text-decoration: none; border-bottom: 1px solid {{THEME_COLOR}};" target="_blank">${text}</a>`,
        
        paragraph: (match, text) => {
            if (text.trim() === '') return '';
            return `<p style="line-height: 1.7; margin: 12px 0; font-size: 15px; color: #333; text-align: justify;">${text}</p>`;
        }
    },

    // 标准模式样式（保持格式，适当换行）
    standard: {
        sectionNumber: (match, number) => 
            `<section style="text-align: center; margin: 30px 0;">
                <p style="font-size: 28px; color: rgb(0, 0, 0); line-height: 40px; font-weight: bold;">
                    ${number.padStart(2, '0')}
                </p>
            </section>`,
        
        h1: (match, text) => 
            `<section style="text-align: center; margin: 30px 0 20px 0;">
                <p style="min-height: 1em; color: rgb(51, 51, 51); line-height: 22px;">
                    <strong>
                        <span style="background: {{THEME_COLOR}}; color: white; padding: 6px 12px; border-radius: 4px;">
                            ${text}
                        </span>
                    </strong>
                </p>
            </section>`,
        
        h2: (match, text) => 
            `<p style="font-size: 22px; font-weight: bold; margin: 30px 0 20px 0; padding-left: 12px; border-left: 4px solid {{THEME_COLOR}}; line-height: 1.4;">
                <span style="font-weight: bold; color: #333;">${text}</span>
            </p>`,
        
        h3: (match, text) => 
            `<h3 style="line-height: 1.5em; font-size: 18px; margin: 20px 0 10px 0; color: #333;">
                <span style="font-weight: bold;">${text}</span>
            </h3>`,
        
        bold: (match, text) => `<strong style="font-weight: bold; color: #333;">${text}</strong>`,
        
        italic: (match, text) => `<em style="font-style: italic;">${text}</em>`,
        
        unorderedList: (match, text) => 
            `<li style="margin: 8px 0; line-height: 1.6;">
                <span style="font-size: 14px; color: #333;">${text}</span>
            </li>`,
        
        orderedList: (match, text) => 
            `<li style="margin: 8px 0; line-height: 1.6;">
                <span style="font-size: 14px; color: #333;">${text}</span>
            </li>`,
        
        blockquote: (match, text) => 
            `<blockquote style="margin: 12px 0; padding: 15px 20px; background: #f8f9fa; border-left: 4px solid {{THEME_COLOR}}; border-radius: 4px;">
                <p style="line-height: 1.6; margin: 0; font-size: 14px; color: #555; font-style: italic;">
                    ${text}
                </p>
            </blockquote>`,
        
        codeBlock: (match, lang, code) => 
            `<pre style="background: #f6f8fa; padding: 18px; border-radius: 8px; overflow-x: auto; margin: 20px 0; border: 1px solid #d0d7de; white-space: pre-wrap; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <code style="font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'Menlo', 'Courier New', monospace; font-size: 14px; line-height: 1.5; color: #24292f;">${code.trim()}</code>
            </pre>`,
        
        inlineCode: (match, code) => 
            `<code style="background: #f1f3f4; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px; color: #d73a49;">${code}</code>`,
        
        image: (match, alt, src) => {
            const altText = alt ? `<p style="font-size: 12px; color: #999; margin: 8px 0 0 0; font-style: italic;">${alt}</p>` : '';
            return `<section style="text-align: center; margin: 25px 0;">
                <img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                ${altText}
            </section>`;
        },
        
        link: (match, text, url) => 
            `<a href="${url}" style="color: {{THEME_COLOR}}; text-decoration: none; border-bottom: 1px solid {{THEME_COLOR}};" target="_blank">${text}</a>`,
        
        paragraph: (match, text) => {
            if (text.trim() === '') return '';
            return `<p style="line-height: 1.8; margin: 15px 0; font-size: 15px; color: #333; text-align: justify;">${text}</p>`;
        }
    },

    // 应用主题色到样式
    applyTheme: function(styles, themeColor) {
        if (!themeColor) {
            themeColor = this.defaultThemeColor;
        }

        const themedStyles = {};
        for (const key in styles) {
            if (typeof styles[key] === 'function') {
                themedStyles[key] = (...args) => {
                    const result = styles[key](...args);
                    return result.replace(/\{\{THEME_COLOR\}\}/g, themeColor);
                };
            } else {
                themedStyles[key] = styles[key];
            }
        }
        return themedStyles;
    },

    // 获取指定模式的样式
    getStyles: function(mode, themeColor) {
        const baseStyles = this[mode] || this.compact;
        return this.applyTheme(baseStyles, themeColor);
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WechatStyles;
}

// 浏览器环境下赋值给全局变量
if (typeof window !== 'undefined') {
    window.WechatStyles = WechatStyles;
} 