// GA4 产品事件的隐私保护封装。只允许非内容型参数进入分析系统。
const SiteAnalytics = {
    allowedEvents: new Set([
        'example_loaded',
        'markdown_entered',
        'channel_selected',
        'preview_generated',
        'copy_success',
        'copy_failed',
        'translation_completed',
        'x_thread_generated',
        'github_clicked'
    ]),

    allowedParameters: new Set([
        'channel',
        'language',
        'template',
        'copy_type',
        'error_type'
    ]),

    onceKeys: new Set(),
    throttleTimestamps: new Map(),

    sanitizeParameters: function(parameters = {}) {
        return Object.entries(parameters).reduce((safe, [key, value]) => {
            if (!this.allowedParameters.has(key) || value === undefined || value === null) {
                return safe;
            }
            const normalized = String(value).trim().slice(0, 80);
            if (normalized) safe[key] = normalized;
            return safe;
        }, {});
    },

    track: function(eventName, parameters = {}) {
        if (!this.allowedEvents.has(eventName)) return false;
        if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false;
        window.gtag('event', eventName, this.sanitizeParameters(parameters));
        return true;
    },

    trackOnce: function(eventName, key, parameters = {}) {
        const onceKey = `${eventName}:${key || 'default'}`;
        if (this.onceKeys.has(onceKey)) return false;
        const tracked = this.track(eventName, parameters);
        if (tracked) this.onceKeys.add(onceKey);
        return tracked;
    },

    trackThrottled: function(eventName, key, parameters = {}, intervalMs = 30000) {
        const throttleKey = `${eventName}:${key || 'default'}`;
        const now = Date.now();
        const lastTrackedAt = this.throttleTimestamps.get(throttleKey) || 0;
        if (now - lastTrackedAt < intervalMs) return false;
        const tracked = this.track(eventName, parameters);
        if (tracked) this.throttleTimestamps.set(throttleKey, now);
        return tracked;
    },

    resetForTests: function() {
        this.onceKeys.clear();
        this.throttleTimestamps.clear();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SiteAnalytics;
}

if (typeof window !== 'undefined') {
    window.SiteAnalytics = SiteAnalytics;
}
