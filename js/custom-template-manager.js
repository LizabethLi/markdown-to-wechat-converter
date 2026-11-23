// Local-only custom WeChat templates with optional Chrome built-in AI classification.
(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.CustomTemplateManager = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    const STORAGE_KEY = 'wechat-custom-templates-v1';
    const MAX_TEMPLATES = 20;
    const ROLES = ['h1', 'h2', 'h3', 'paragraph', 'blockquote'];
    const SAFE_PROPERTIES = new Set([
        'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
        'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration', 'textIndent',
        'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
        'borderColor', 'borderStyle', 'borderWidth', 'borderRadius', 'boxShadow',
        'display', 'width', 'maxWidth', 'minWidth', 'height', 'maxHeight',
        'verticalAlign', 'whiteSpace', 'wordBreak', 'overflowWrap', 'boxSizing'
    ]);
    const DANGEROUS_CSS = /(?:[;{}]|url\s*\(|image-set\s*\(|expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:|@import|behavior\s*:|<|>|[\u0000-\u0008\u000b\u000c\u000e-\u001f])/i;

    function getStorage(storage) {
        if (storage) return storage;
        try { return localStorage; } catch (_) { return null; }
    }

    function safeId(id) {
        const value = String(id || '').trim();
        return /^custom:[a-z0-9][a-z0-9-]{0,63}$/i.test(value) ? value : '';
    }

    function createId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `custom:${crypto.randomUUID()}`;
        }
        return `custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function safeName(name) {
        return String(name || '我的模板').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 40) || '我的模板';
    }

    function sanitizeStyle(style) {
        const clean = {};
        if (!style || typeof style !== 'object') return clean;
        for (const [property, rawValue] of Object.entries(style)) {
            if (!SAFE_PROPERTIES.has(property)) continue;
            const value = String(rawValue || '').trim();
            if (!value || value.length > 160 || DANGEROUS_CSS.test(value)) continue;
            clean[property] = value;
        }
        return clean;
    }

    function normalizeMapping(mapping, candidates) {
        const ids = new Set((candidates || []).map(candidate => candidate.id));
        const normalized = {};
        ROLES.forEach(role => {
            const id = mapping && typeof mapping[role] === 'string' ? mapping[role] : '';
            normalized[role] = ids.has(id) ? id : '';
        });
        return normalized;
    }

    function fontSize(candidate) {
        const match = String(candidate && candidate.style && candidate.style.fontSize || '').match(/[\d.]+/);
        return match ? Number(match[0]) : 0;
    }

    function defaultMapping(candidates) {
        const list = Array.isArray(candidates) ? candidates : [];
        if (!list.length) return Object.fromEntries(ROLES.map(role => [role, '']));
        const bySize = [...list].sort((a, b) => fontSize(b) - fontSize(a));
        const paragraph = [...list].sort((a, b) => (b.textLength || 0) - (a.textLength || 0))[0];
        const quote = list.find(candidate => {
            const style = candidate.style || {};
            return !!(style.backgroundColor || style.borderLeft || style.padding);
        });
        return normalizeMapping({
            h1: bySize[0] && bySize[0].id,
            h2: bySize[1] && bySize[1].id,
            h3: bySize[2] && bySize[2].id,
            paragraph: paragraph && paragraph.id,
            blockquote: quote && quote.id
        }, list);
    }

    function buildCandidatesFromSnapshots(snapshots, limit = 10) {
        const groups = new Map();
        for (const snapshot of Array.isArray(snapshots) ? snapshots : []) {
            const style = sanitizeStyle(snapshot && snapshot.style);
            if (!Object.keys(style).length) continue;
            const signature = JSON.stringify(style);
            const textLength = Math.max(0, Number(snapshot.textLength) || 0);
            const sample = String(snapshot.sample || '').replace(/\s+/g, ' ').trim().slice(0, 80);
            const existing = groups.get(signature);
            if (!existing) {
                groups.set(signature, { sample, textLength, style });
            } else if (textLength > existing.textLength) {
                existing.sample = sample;
                existing.textLength = textLength;
            }
        }
        return Array.from(groups.values()).slice(0, Math.max(1, Number(limit) || 10)).map((candidate, index) => ({
            id: `style-${index + 1}`,
            ...candidate
        }));
    }

    function buildDefinition(name, candidates, mapping, id) {
        const list = Array.isArray(candidates) ? candidates : [];
        const normalized = normalizeMapping(mapping, list);
        const byId = new Map(list.map(candidate => [candidate.id, candidate]));
        const styles = {};
        ROLES.forEach(role => {
            const candidate = byId.get(normalized[role]);
            if (candidate) styles[role] = sanitizeStyle(candidate.style);
        });
        return {
            schemaVersion: 1,
            id: safeId(id) || createId(),
            name: safeName(name),
            baseTemplate: 'wechat-default',
            styles,
            createdAt: new Date().toISOString()
        };
    }

    function isDefinition(value) {
        return !!(value && value.schemaVersion === 1 && safeId(value.id)
            && typeof value.name === 'string' && value.styles && typeof value.styles === 'object');
    }

    function normalizeDefinition(value) {
        if (!isDefinition(value)) return null;
        const styles = {};
        ROLES.forEach(role => {
            if (value.styles[role]) styles[role] = sanitizeStyle(value.styles[role]);
        });
        return {
            schemaVersion: 1,
            id: safeId(value.id),
            name: safeName(value.name),
            baseTemplate: 'wechat-default',
            styles,
            createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString()
        };
    }

    function loadDefinitions(storage) {
        const target = getStorage(storage);
        if (!target) return [];
        try {
            const parsed = JSON.parse(target.getItem(STORAGE_KEY) || '[]');
            if (!Array.isArray(parsed)) return [];
            return parsed.map(normalizeDefinition).filter(Boolean).slice(0, MAX_TEMPLATES);
        } catch (_) {
            return [];
        }
    }

    function saveDefinition(definition, storage) {
        const target = getStorage(storage);
        const normalized = normalizeDefinition(definition);
        if (!target || !normalized) throw new Error('自定义模板格式无效');
        const existing = loadDefinitions(target).filter(item => item.id !== normalized.id);
        target.setItem(STORAGE_KEY, JSON.stringify([normalized, ...existing].slice(0, MAX_TEMPLATES)));
        return normalized;
    }

    function deleteDefinition(id, storage) {
        const target = getStorage(storage);
        if (!target) return false;
        const existing = loadDefinitions(target);
        const next = existing.filter(item => item.id !== id);
        if (next.length === existing.length) return false;
        target.setItem(STORAGE_KEY, JSON.stringify(next));
        return true;
    }

    function exportDefinitions(definitions) {
        const templates = (Array.isArray(definitions) ? definitions : [])
            .map(normalizeDefinition)
            .filter(Boolean)
            .slice(0, MAX_TEMPLATES);
        return JSON.stringify({ schemaVersion: 1, templates }, null, 2);
    }

    function importDefinitions(json, storage) {
        const target = getStorage(storage);
        if (!target) throw new Error('无法访问浏览器模板存储');
        let parsed;
        try {
            parsed = typeof json === 'string' ? JSON.parse(json) : json;
        } catch (_) {
            throw new Error('导入模板格式无效');
        }
        if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.templates)) {
            throw new Error('导入模板格式无效');
        }
        const templates = parsed.templates.map(normalizeDefinition).filter(Boolean).slice(0, MAX_TEMPLATES);
        if (templates.length !== parsed.templates.length) throw new Error('导入模板格式无效');
        const importedIds = new Set(templates.map(definition => definition.id));
        const existing = loadDefinitions(target).filter(definition => !importedIds.has(definition.id));
        target.setItem(STORAGE_KEY, JSON.stringify([...templates, ...existing].slice(0, MAX_TEMPLATES)));
        return templates;
    }

    function toCss(style) {
        return Object.entries(sanitizeStyle(style)).map(([property, value]) => {
            const cssName = property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            return `${cssName}:${value}`;
        }).join(';');
    }

    function escapeHtmlAttribute(value) {
        return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function compileDefinition(definition, baseTemplate) {
        const normalized = normalizeDefinition(definition);
        if (!normalized || !baseTemplate || typeof baseTemplate.getStyles !== 'function') {
            throw new Error('无法编译自定义模板');
        }
        return {
            id: normalized.id,
            name: `我的 · ${normalized.name}`,
            custom: true,
            getStyles(mode, themeColor) {
                const base = baseTemplate.getStyles(mode, themeColor);
                const styles = { ...base };
                const renderers = {
                    h1: (css) => (_m, text) => `<h1 style="${css}">${text}</h1>`,
                    h2: (css) => (_m, text) => `<h2 style="${css}">${text}</h2>`,
                    h3: (css) => (_m, text) => `<h3 style="${css}">${text}</h3>`,
                    paragraph: (css) => (_m, text) => String(text || '').trim() ? `<p style="${css}">${text}</p>` : '',
                    blockquote: (css) => (_m, text) => `<blockquote style="${css}"><p style="margin:0;">${text}</p></blockquote>`
                };
                ROLES.forEach(role => {
                    const css = escapeHtmlAttribute(toCss(normalized.styles[role]));
                    if (css && renderers[role]) styles[role] = renderers[role](css);
                });
                return styles;
            }
        };
    }

    function registerDefinition(definition, templateManager) {
        const manager = templateManager || (typeof TemplateManager !== 'undefined' ? TemplateManager : null);
        if (!manager || typeof manager.register !== 'function') return null;
        const base = typeof manager.get === 'function' ? manager.get('wechat-default') : null;
        if (!base) return null;
        const compiled = compileDefinition(definition, base);
        manager.register(compiled);
        return compiled;
    }

    function registerStoredTemplates(templateManager, storage) {
        return loadDefinitions(storage).map(definition => registerDefinition(definition, templateManager)).filter(Boolean);
    }

    function responseSchema() {
        return {
            type: 'object',
            properties: Object.fromEntries(ROLES.map(role => [role, { type: 'string' }])),
            required: [...ROLES],
            additionalProperties: false
        };
    }

    async function classifyCandidates(candidates, languageModel, onProgress) {
        const fallback = { mode: 'manual', reason: 'unsupported', mapping: defaultMapping(candidates) };
        if (!languageModel || typeof languageModel.availability !== 'function' || typeof languageModel.create !== 'function') {
            return fallback;
        }
        const options = {
            expectedInputs: [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }]
        };
        let session;
        try {
            const availability = await languageModel.availability(options);
            if (availability === 'unavailable') return fallback;
            session = await languageModel.create({
                ...options,
                monitor(monitor) {
                    if (!monitor || typeof monitor.addEventListener !== 'function') return;
                    monitor.addEventListener('downloadprogress', event => {
                        if (typeof onProgress === 'function') onProgress(Number(event.loaded) || 0);
                    });
                }
            });
            const fingerprints = (candidates || []).map(candidate => ({
                id: candidate.id,
                textLength: Number(candidate.textLength) || 0,
                style: sanitizeStyle(candidate.style)
            }));
            const prompt = [
                'Classify each visual style fingerprint from a rich-text article.',
                'Return the candidate id best suited for h1, h2, h3, paragraph, and blockquote.',
                'Use an empty string when no candidate fits. Base the decision only on style and text length.',
                JSON.stringify(fingerprints)
            ].join('\n');
            const result = await session.prompt(prompt, { responseConstraint: responseSchema() });
            const parsed = JSON.parse(result);
            const mapping = normalizeMapping(parsed, candidates);
            const required = [mapping.h1, mapping.h2, mapping.paragraph];
            if (required.some(id => !id) || new Set(required).size !== required.length) {
                return { mode: 'manual', reason: 'low-confidence', mapping: defaultMapping(candidates) };
            }
            return { mode: 'ai', reason: '', mapping };
        } catch (error) {
            return { mode: 'manual', reason: 'error', error, mapping: defaultMapping(candidates) };
        } finally {
            if (session && typeof session.destroy === 'function') session.destroy();
        }
    }

    return {
        storageKey: STORAGE_KEY,
        roles: [...ROLES],
        sanitizeStyle,
        buildCandidatesFromSnapshots,
        defaultMapping,
        buildDefinition,
        loadDefinitions,
        saveDefinition,
        deleteDefinition,
        exportDefinitions,
        importDefinitions,
        compileDefinition,
        registerDefinition,
        registerStoredTemplates,
        classifyCandidates,
        responseSchema
    };
});
