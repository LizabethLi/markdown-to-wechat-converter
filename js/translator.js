// Translation module leveraging OpenRouter or proxy, with Markdown/code/math protection
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

            const openRuntime = this.resolveOpenRouterConfig(cfg);

            if (cfg.mode === 'direct') {
                const directKey = openRuntime.configApiKey;
                if (directKey) {
                    return await this.translateViaOpenRouter(
                        text,
                        directKey,
                        openRuntime.model,
                        openRuntime.apiBase,
                        openRuntime.fallbackModels,
                        openRuntime.extraHeaders
                    );
                }
            }

            const key = this.safeReadLocalStorage('openrouter_api_key');
            if (key) {
                return await this.translateViaOpenRouter(
                    text,
                    key,
                    openRuntime.model,
                    openRuntime.apiBase,
                    openRuntime.fallbackModels,
                    openRuntime.extraHeaders
                );
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

    translateViaOpenRouter: async function(text, apiKey, model, apiBase, fallbackModels, extraHeaders) {
        const modelsToTry = [];
        const addModel = (m) => {
            if (!m || typeof m !== 'string') return;
            const trimmed = m.trim();
            if (!trimmed) return;
            if (!modelsToTry.includes(trimmed)) modelsToTry.push(trimmed);
        };
        addModel((model && typeof model === 'string' && model.trim()) || 'openrouter/auto');
        (Array.isArray(fallbackModels) ? fallbackModels : []).forEach(addModel);
        addModel('openrouter/auto');

        const base = (apiBase && typeof apiBase === 'string' && apiBase.trim()) || 'https://openrouter.ai/api/v1';
        const baseUrl = base.replace(/\/+$/, '');
        const systemPrompt = this.getSystemPrompt();
        const instructions = this.promptInstructions();

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
        };
        if (extraHeaders && typeof extraHeaders === 'object') {
            Object.entries(extraHeaders).forEach(([k, v]) => {
                if (!k) return;
                headers[k] = typeof v === 'string' ? v : String(v);
            });
        }

        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const url = `${baseUrl}/chat/completions`;
                const messages = [];
                if (systemPrompt) {
                    messages.push({ role: 'system', content: systemPrompt });
                }
                messages.push({ role: 'user', content: `${instructions}\n\n${text}` });

                const body = {
                    model: modelName,
                    messages,
                    temperature: 0.2
                };

                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body)
                });

                if (!res.ok) {
                    const errText = await res.text();
                    const error = new Error(`OpenRouter API error: ${res.status} ${errText}`);
                    error.status = res.status;
                    error.model = modelName;
                    throw error;
                }

                const data = await res.json();
                const choice = (((data || {}).choices || [])[0] || {}).message;
                const content = choice ? choice.content : '';
                if (typeof content === 'string') {
                    const trimmed = content.trim();
                    if (trimmed) return trimmed;
                } else if (Array.isArray(content)) {
                    const merged = content.map(part => {
                        if (!part) return '';
                        if (typeof part === 'string') return part;
                        if (typeof part.text === 'string') return part.text;
                        return '';
                    }).join('').trim();
                    if (merged) return merged;
                }
                return text;
            } catch (err) {
                lastError = err;
                if (err && err.status) {
                    if (err.status === 401 || err.status === 403) {
                        throw err;
                    }
                    if ([404, 422, 429, 500, 503].includes(err.status)) {
                        console.warn(`OpenRouter model ${err.model || modelName} returned ${err.status}, attempting fallback...`);
                        continue;
                    }
                }
                if (err instanceof TypeError || (err && /Failed to fetch/i.test(String(err.message || '')))) {
                    console.warn(`OpenRouter request failed for ${modelName}: ${err.message || err}. Trying next model...`);
                    continue;
                }
                throw err;
            }
        }

        throw lastError || new Error('OpenRouter API error: all model attempts failed');
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

    safeReadLocalStorage: function(key) {
        try {
            if (typeof localStorage === 'undefined' || !key) return '';
            const value = localStorage.getItem(key);
            return value && value.trim() ? value.trim() : '';
        } catch (_) {
            return '';
        }
    },

    parseModelList: function(raw, defaults) {
        const result = [];
        const add = (val) => {
            if (!val || typeof val !== 'string') return;
            const trimmed = val.trim();
            if (!trimmed) return;
            if (!result.includes(trimmed)) result.push(trimmed);
        };
        if (raw && typeof raw === 'string') {
            raw.split(/[\n,]+/).forEach(add);
        }
        if (Array.isArray(defaults)) {
            defaults.forEach(add);
        }
        return result;
    },

    resolveOpenRouterConfig: function(cfg) {
        const openCfg = (cfg && cfg.openrouter) || {};
        const modelFromStorage = this.safeReadLocalStorage('openrouter_model');
        const fallbackRaw = this.safeReadLocalStorage('openrouter_fallback_models');
        const resolvedModel = (modelFromStorage && modelFromStorage.trim())
            || (openCfg.model && openCfg.model.trim())
            || 'openrouter/auto';
        const fallbackModels = this.parseModelList(fallbackRaw, openCfg.fallbackModels || []);
        return {
            model: resolvedModel,
            fallbackModels,
            apiBase: openCfg.apiBase,
            extraHeaders: openCfg.extraHeaders,
            configApiKey: openCfg.apiKey && openCfg.apiKey.trim()
        };
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
