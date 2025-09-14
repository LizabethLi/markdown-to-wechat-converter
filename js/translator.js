// Translation module leveraging Gemini or proxy, with Markdown/code/math protection
const Translator = {
    // Translate Markdown Chinese -> English
    translateMarkdownToEnglish: async function(markdown) {
        // Protect math first using existing MathRenderer
        const mathProtected = MathRenderer.protectMathExpressions(markdown);
        const afterMath = mathProtected.markdown;
        // Protect code fences and inline code
        const { text, placeholders } = this.protectCode(afterMath);

        const translated = await this.translateText(text);
        const restoredCode = this.restoreCode(translated, placeholders);
        const restoredAll = this.restoreMathMarkdown(restoredCode, mathProtected.mathPlaceholders);
        return restoredAll;
    },
    // Restore math placeholders back to Markdown math
    restoreMathMarkdown: function(text, mathPlaceholders) {
        if (!mathPlaceholders) return text;
        // Block math
        text = text.replace(/MATHBLOCK(\d+)PLACEHOLDER/g, (match) => {
            const latex = mathPlaceholders[match];
            return latex ? `$$ ${latex} $$` : match;
        });
        // Inline math
        text = text.replace(/MATHINLINE(\d+)PLACEHOLDER/g, (match) => {
            const latex = mathPlaceholders[match];
            return latex ? `$${latex}$` : match;
        });
        return text;
    },

    // Core translate via configured backend
    translateText: async function(text) {
        const cfg = AppConfig.translation || {};
        if (cfg.mode === 'disabled') return text; // passthrough

        try {
            if (cfg.mode === 'proxy' && cfg.proxyEndpoint) {
                return await this.translateViaProxy(text, cfg.proxyEndpoint);
            }
            if (cfg.mode === 'direct' && cfg.gemini && cfg.gemini.apiKey) {
                return await this.translateViaGeminiDirect(text, cfg.gemini.apiKey, cfg.gemini.model || 'gemini-1.5-flash-latest');
            }
            // Fallback: try localStorage API key for convenience
            const key = (typeof localStorage !== 'undefined') ? localStorage.getItem('gemini_api_key') : '';
            if (key) {
                return await this.translateViaGeminiDirect(text, key, 'gemini-1.5-flash-latest');
            }
        } catch (e) {
            console.warn('Translation failed, returning original text:', e);
            return text;
        }
        console.warn('Translation not configured (mode disabled or no credentials). Returning original text.');
        return text;
    },

    // Proxy backend (recommended to avoid exposing keys)
    translateViaProxy: async function(text, endpoint) {
        const payload = {
            sourceLang: 'zh',
            targetLang: 'en',
            format: 'markdown',
            text,
            instructions: this.composeInstructions(),
            systemPrompt: this.getSystemPrompt()
        };
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Proxy translation failed: ' + res.status);
        const data = await res.json();
        return (data.translation || data.text || '').trim() || text;
    },

    // Direct Gemini API (use only in trusted/local environments)
    translateViaGeminiDirect: async function(text, apiKey, model) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const userText = (this.getSystemPrompt() ? `[System Prompt]\n${this.getSystemPrompt()}\n\n` : '') + this.composeInstructions() + '\n\n' + text;
        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: userText }
                    ]
                }
            ]
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error('Gemini API error: ' + res.status + ' ' + errText);
        }
        const data = await res.json();
        const textOut = (((data || {}).candidates || [])[0] || {}).content;
        const parts = (textOut && textOut.parts) || [];
        const result = parts.map(p => p.text || '').join('').trim();
        return result || text;
    },

    promptInstructions: function() {
        return [
            'Translate the following Markdown content from Chinese to English.',
            'Requirements:',
            '- Preserve Markdown structure and spacing.',
            '- Do NOT translate code blocks, inline code, or math placeholders (e.g., CODEBLOCK0, CODEINLINE1, MATHBLOCK0, MATHINLINE1).',
            '- Keep URLs and code unchanged.',
            '- Return only the translated Markdown, no explanations.'
        ].join('\n');
    },

    composeInstructions: function() {
        // Combine user system prompt (if any) and built-in instructions for proxy backends
        const sys = this.getSystemPrompt();
        return (sys ? `[System Prompt]\n${sys}\n\n` : '') + this.promptInstructions();
    },

    getSystemPrompt: function() {
        if (AppConfig.translation && AppConfig.translation.systemPrompt) {
            return AppConfig.translation.systemPrompt;
        }
        try {
            return localStorage.getItem('translation_system_prompt') || '';
        } catch (_) {
            return '';
        }
    },

    // Code protection helpers
    protectCode: function(text) {
        const placeholders = { blocks: [], inlines: [] };
        // Protect fenced code blocks ``` ``` and ~~~ ~~~
        let idx = 0;
        text = text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (m) => {
            const ph = `CODEBLOCK${idx++}PLACEHOLDER`;
            placeholders.blocks.push({ ph, value: m });
            return ph;
        });
        // Protect inline code `...`
        let j = 0;
        text = text.replace(/`[^`\n]+`/g, (m) => {
            const ph = `CODEINLINE${j++}PLACEHOLDER`;
            placeholders.inlines.push({ ph, value: m });
            return ph;
        });
        return { text, placeholders };
    },

    restoreCode: function(text, placeholders) {
        // Restore inline first (shorter tokens)
        (placeholders.inlines || []).forEach(({ ph, value }) => {
            text = text.split(ph).join(value);
        });
        (placeholders.blocks || []).forEach(({ ph, value }) => {
            text = text.split(ph).join(value);
        });
        return text;
    }
};

// Exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Translator;
}
if (typeof window !== 'undefined') {
    window.Translator = Translator;
}
