// Channel-specific conversions: Substack (HTML) and GitHub (Markdown)
const ChannelConverter = {
    // Substack: translate to EN, then combine EN HTML + ZH HTML
    convertToSubstack: async function(markdown) {
        const enMd = await Translator.translateMarkdownToEnglish(markdown);
        const enHtml = marked(enMd);
        const zhHtml = marked(markdown);
        // Minimal Substack-friendly wrapper, left-aligned
        const html = `
<article style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; color: #111; line-height: 1.7; max-width: 100%;">
  <div class="lang-section en" style="text-align: left;">${enHtml}</div>
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;"/>
  <div class="lang-section zh" style="text-align: left;">${zhHtml}</div>
</article>`;
        return html;
    },

    // GitHub: translate to EN, then combine EN markdown + divider + ZH markdown
    convertToGithub: async function(markdown) {
        const enMd = await Translator.translateMarkdownToEnglish(markdown);
        const combined = `${enMd}\n\n---\n\n${markdown}`;
        return combined;
    }
};

// Exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChannelConverter;
}
if (typeof window !== 'undefined') {
    window.ChannelConverter = ChannelConverter;
}

