const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');

test('the core Markdown parser is shipped locally for offline startup', () => {
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

    assert.doesNotMatch(
        indexHtml,
        /<script\b[^>]+src=["'][^"']*cdnjs\.cloudflare\.com\/ajax\/libs\/marked/i
    );

    const localScript = indexHtml.match(
        /<script\b[^>]+src=["'](js\/vendor\/marked-3\.0\.8\.min\.js)["'][^>]*>/i
    );
    assert.ok(localScript, 'index.html should load the pinned local marked build');

    const markedPath = path.join(projectRoot, localScript[1]);
    assert.equal(fs.existsSync(markedPath), true, 'the local marked build should exist');

    const marked = require(markedPath);
    assert.equal(typeof marked.parse, 'function');
    assert.equal(typeof marked.Renderer, 'function');
});

test('the OpenRouter API key field opts out of browser credential autofill', () => {
    const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const apiKeyInput = indexHtml.match(/<input\b[^>]+id=["']translatorApiKey["'][^>]*>/i);

    assert.ok(apiKeyInput, 'index.html should include the OpenRouter API key input');
    assert.match(apiKeyInput[0], /\bautocomplete=["']off["']/i);
});

test('startup errors identify the dependency that is missing', () => {
    const previousWindow = global.window;
    const previousDocument = global.document;
    const appPath = require.resolve('../js/app.js');

    global.window = {
        WechatStyles: {},
        MathRenderer: {},
        MarkdownConverter: {},
        UIController: {},
        AppConfig: {},
        DependencyLoader: {},
        SiteAnalytics: {}
    };
    global.document = {
        readyState: 'loading',
        addEventListener: () => {}
    };
    delete require.cache[appPath];

    try {
        const App = require(appPath);
        let shownMessage = '';
        App.showError = (message) => { shownMessage = message; };

        App.init();

        assert.deepEqual(App.getMissingDependencies(), ['marked']);
        assert.equal(shownMessage, '缺少必要的依赖库：marked');
    } finally {
        delete require.cache[appPath];
        global.window = previousWindow;
        global.document = previousDocument;
    }
});
