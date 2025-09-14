// Template Manager: registers and selects WeChat styling templates
const TemplateManager = {
    activeId: 'wechat-default',
    registry: {},

    register(template) {
        if (!template || !template.id || typeof template.getStyles !== 'function') {
            console.warn('Invalid template registration attempt:', template);
            return;
        }
        this.registry[template.id] = template;
        // If there was no active template persisted, keep default; otherwise ensure active is valid
        if (!this.registry[this.activeId]) {
            this.activeId = template.id;
        }
    },

    setActive(id) {
        if (this.registry[id]) {
            this.activeId = id;
            try { localStorage.setItem('wechat-template', id); } catch (_) {}
            return true;
        }
        console.warn('Unknown template id:', id);
        return false;
    },

    loadFromStorage() {
        try {
            const id = localStorage.getItem('wechat-template');
            if (id && this.registry[id]) {
                this.activeId = id;
            }
        } catch (_) { /* ignore */ }
    },

    list() {
        return Object.values(this.registry).map(t => ({ id: t.id, name: t.name || t.id }));
    },

    getActive() {
        return this.registry[this.activeId] || null;
    },

    getStyles(mode, themeColor) {
        const tpl = this.getActive();
        if (tpl && typeof tpl.getStyles === 'function') {
            return tpl.getStyles(mode, themeColor);
        }
        // Fallbacks for backward compatibility
        if (typeof WechatStyles !== 'undefined' && typeof WechatStyles.getStyles === 'function') {
            return WechatStyles.getStyles(mode, themeColor);
        }
        console.warn('No template available; returning empty styles.');
        return {};
    }
};

// Expose globally
if (typeof window !== 'undefined') {
    window.TemplateManager = TemplateManager;
}

