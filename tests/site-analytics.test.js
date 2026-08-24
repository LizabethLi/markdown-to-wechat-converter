const test = require('node:test');
const assert = require('node:assert/strict');

const SiteAnalytics = require('../js/site-analytics.js');

test.beforeEach(() => {
    SiteAnalytics.resetForTests();
    global.window = { gtag: () => {} };
});

test.after(() => {
    delete global.window;
});

test('analytics strips content-like and unknown parameters', () => {
    const calls = [];
    global.window.gtag = (...argumentsList) => calls.push(argumentsList);

    const tracked = SiteAnalytics.track('copy_success', {
        channel: 'wechat',
        language: 'zh',
        copy_type: 'rich_preview',
        markdown: '# private article',
        image_url: 'data:image/png;base64,private',
        api_key: 'secret'
    });

    assert.equal(tracked, true);
    assert.deepEqual(calls, [[
        'event',
        'copy_success',
        { channel: 'wechat', language: 'zh', copy_type: 'rich_preview' }
    ]]);
});

test('unknown events are never sent', () => {
    let callCount = 0;
    global.window.gtag = () => { callCount += 1; };

    assert.equal(SiteAnalytics.track('article_content', { channel: 'wechat' }), false);
    assert.equal(callCount, 0);
});

test('once and throttled events suppress noisy repeats', () => {
    const calls = [];
    global.window.gtag = (...argumentsList) => calls.push(argumentsList);
    const realNow = Date.now;
    let now = 100000;
    Date.now = () => now;

    try {
        assert.equal(SiteAnalytics.trackOnce('markdown_entered', 'first', { channel: 'wechat' }), true);
        assert.equal(SiteAnalytics.trackOnce('markdown_entered', 'first', { channel: 'wechat' }), false);
        assert.equal(SiteAnalytics.trackThrottled('preview_generated', 'wechat', { channel: 'wechat' }, 30000), true);
        now += 1000;
        assert.equal(SiteAnalytics.trackThrottled('preview_generated', 'wechat', { channel: 'wechat' }, 30000), false);
        now += 30000;
        assert.equal(SiteAnalytics.trackThrottled('preview_generated', 'wechat', { channel: 'wechat' }, 30000), true);
    } finally {
        Date.now = realNow;
    }

    assert.equal(calls.length, 3);
});
