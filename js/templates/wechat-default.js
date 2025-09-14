// Registers the current WechatStyles implementation as a default template
(function() {
    if (typeof TemplateManager === 'undefined') return;
    // Ensure WechatStyles exists; if not, delay until window load
    function registerWhenReady() {
        if (typeof WechatStyles !== 'undefined' && WechatStyles && typeof WechatStyles.getStyles === 'function') {
            const WechatDefaultTemplate = {
                id: 'wechat-default',
                name: '默认模板',
                getStyles: function(mode, themeColor) {
                    return WechatStyles.getStyles(mode, themeColor);
                }
            };
            TemplateManager.register(WechatDefaultTemplate);
            // Try load selection from storage after at least one template exists
            TemplateManager.loadFromStorage();
        } else {
            // Try again after load
            if (typeof window !== 'undefined') {
                window.addEventListener('load', registerWhenReady, { once: true });
            }
        }
    }
    registerWhenReady();
})();

