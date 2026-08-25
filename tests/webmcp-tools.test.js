const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
global.document = {};
global.AppConfig = {
    themes: {
        purple: { primary: '#7E3AF2' },
        blue: { primary: '#2563EB' }
    },
    defaults: {
        mode: 'compact',
        theme: 'purple'
    }
};
global.UIController = {
    currentTheme: 'purple',
    customColor: null
};
global.TemplateManager = {
    activeId: 'wechat-default',
    list: () => [
        { id: 'wechat-default', name: '默认模板' },
        { id: 'wechat-magazine', name: '杂志模板' }
    ]
};
global.ImageHandler = {
    getLocalImageReferenceStatus: () => ({ unresolvedReferences: [] }),
    hydrateLocalImageReferences: (markdown) => markdown.replace(
        'local-image://asset-1',
        'data:image/png;base64,AAECAwQ='
    )
};

let renderCall = null;
global.ChannelConverter = {
    channelAliases: {},
    listChannels: () => [
        { id: 'wechat', name: 'WeChat' },
        { id: 'substack', name: 'Substack' },
        { id: 'linkedin', name: 'LinkedIn' },
        { id: 'x', name: 'X Article + Thread' }
    ],
    renderForChannel: async (channel, markdown, context) => {
        renderCall = { channel, markdown, context };
        return {
            channel: { id: channel },
            output: `OUTPUT:${markdown}`,
            previewHtml: `<p>${markdown}</p>`,
            previewMode: channel === 'x' ? 'x-publishing' : 'markdown',
            needsMathTypeset: channel === 'substack' || channel === 'linkedin',
            data: channel === 'x' ? { threadPosts: ['1/1\nPost'] } : null
        };
    }
};

const WebMCPTools = require('../js/webmcp-tools.js');

test.beforeEach(() => {
    WebMCPTools.destroy();
    global.document = {};
    global.UIController.currentTheme = 'purple';
    global.UIController.customColor = null;
    global.TemplateManager.activeId = 'wechat-default';
    global.ImageHandler.getLocalImageReferenceStatus = () => ({ unresolvedReferences: [] });
    global.ImageHandler.hydrateLocalImageReferences = (markdown) => markdown.replace(
        'local-image://asset-1',
        'data:image/png;base64,AAECAwQ='
    );
    renderCall = null;
});

test.after(() => {
    WebMCPTools.destroy();
});

test('WebMCP registration exposes all tools and waits for registration promises', async () => {
    const registrations = [];
    global.document.modelContext = {
        registerTool: async (tool, options) => {
            registrations.push({ tool, options });
        }
    };

    assert.equal(await WebMCPTools.init(), true);
    assert.equal(WebMCPTools.registered, true);
    assert.deepEqual(
        registrations.map(({ tool }) => tool.name),
        ['convert_markdown', 'list_supported_channels', 'list_wechat_templates']
    );
    assert.ok(registrations.every(({ options }) => options.signal instanceof AbortSignal));
    assert.deepEqual(
        registrations[0].tool.inputSchema.properties.output_language.enum,
        ['zh', 'en']
    );
    assert.equal(registrations[0].tool.annotations.untrustedContentHint, true);
});

test('WebMCP registration can retry after the browser API becomes available', async () => {
    assert.equal(await WebMCPTools.init(), false);
    assert.equal(WebMCPTools.registered, false);

    let registrations = 0;
    global.document.modelContext = {
        registerTool: async () => {
            registrations += 1;
        }
    };

    assert.equal(await WebMCPTools.init(), true);
    assert.equal(registrations, 3);
});

test('WebMCP registration reports asynchronous registration failures', async () => {
    let registrations = 0;
    global.document.modelContext = {
        registerTool: async () => {
            registrations += 1;
            if (registrations === 2) throw new Error('registration rejected');
        }
    };
    const originalWarn = console.warn;
    console.warn = () => {};

    try {
        assert.equal(await WebMCPTools.init(), false);
        assert.equal(WebMCPTools.registered, false);
        assert.equal(WebMCPTools.controller, null);
    } finally {
        console.warn = originalWarn;
    }
});

test('LinkedIn keeps its own channel identity and returns rich output', async () => {
    const response = await WebMCPTools.convertMarkdown({
        markdown: '![Local](local-image://asset-1)',
        channel: 'linkedin',
        output_language: 'en'
    });

    assert.equal(response.ok, true);
    assert.equal(response.result.requested_channel, 'linkedin');
    assert.equal(response.result.channel, 'linkedin');
    assert.equal(response.result.output_format, 'markdown_and_html');
    assert.match(response.result.preview_html, /data:image\/png;base64,AAECAwQ=/);
    assert.equal(response.structuredContent, response.result);
    assert.equal(renderCall.channel, 'linkedin');
    assert.equal(renderCall.context.outputLanguage, 'en');
    assert.match(renderCall.markdown, /data:image\/png;base64,AAECAwQ=/);
});

test('WeChat conversion uses explicit theme and template without changing page state', async () => {
    const response = await WebMCPTools.convertMarkdown({
        markdown: '# Title',
        channel: 'wechat',
        theme: 'blue',
        template: 'wechat-magazine',
        mode: 'standard'
    });

    assert.equal(response.ok, true);
    assert.equal(response.result.template_used, 'wechat-magazine');
    assert.equal(response.result.theme_used, 'blue');
    assert.equal(response.result.theme_color_used, '#2563EB');
    assert.equal(global.TemplateManager.activeId, 'wechat-default');
    assert.equal(renderCall.context.templateId, 'wechat-magazine');
    assert.equal(renderCall.context.themeColor, '#2563EB');
    assert.equal(renderCall.context.mode, 'standard');
});

test('WebMCP rejects unsafe theme values and misplaced AI options', async () => {
    const unsafeTheme = await WebMCPTools.convertMarkdown({
        markdown: '# Title',
        channel: 'wechat',
        theme: 'red; background:url(example)'
    });
    assert.equal(unsafeTheme.ok, false);
    assert.match(unsafeTheme.error, /invalid hex color/);

    const misplacedAI = await WebMCPTools.convertMarkdown({
        markdown: '# Title',
        channel: 'substack',
        use_ai: true
    });
    assert.equal(misplacedAI.ok, false);
    assert.match(misplacedAI.error, /only supported for the X channel/);
});

test('WebMCP reports unresolved local image references before conversion', async () => {
    global.ImageHandler.getLocalImageReferenceStatus = () => ({
        unresolvedReferences: [{ id: 'missing' }]
    });

    const response = await WebMCPTools.convertMarkdown({
        markdown: '![Missing](local-image://missing)',
        channel: 'wechat'
    });

    assert.equal(response.ok, false);
    assert.match(response.error, /1 local image reference/);
    assert.equal(renderCall, null);
});

test('WebMCP capability tools describe separate publishing channels, X AI, and templates', async () => {
    const channels = await WebMCPTools.listSupportedChannels();
    const substack = channels.result.channels.find((channel) => channel.id === 'substack');
    const linkedin = channels.result.channels.find((channel) => channel.id === 'linkedin');
    const x = channels.result.channels.find((channel) => channel.id === 'x');
    assert.deepEqual(substack.aliases, []);
    assert.equal(substack.output_format, 'markdown_and_html');
    assert.deepEqual(linkedin.aliases, []);
    assert.equal(linkedin.output_format, 'markdown_and_html');
    assert.equal(x.supports_ai, true);

    const templates = await WebMCPTools.listWechatTemplates();
    assert.equal(templates.result.active_template, 'wechat-default');
    assert.equal(templates.result.templates.length, 2);
});

test('destroy aborts registered WebMCP tools', async () => {
    let registrationSignal = null;
    global.document.modelContext = {
        registerTool: async (_tool, options) => {
            registrationSignal = options.signal;
        }
    };
    await WebMCPTools.init();

    WebMCPTools.destroy();

    assert.equal(registrationSignal.aborted, true);
    assert.equal(WebMCPTools.registered, false);
});
