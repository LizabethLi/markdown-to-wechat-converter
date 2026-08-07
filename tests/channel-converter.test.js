const test = require('node:test');
const assert = require('node:assert/strict');

global.Translator = {
    translateMarkdownToEnglish: async (markdown) => markdown
};
global.MarkdownConverter = {
    convertMarkdownToWechat: async (markdown) => markdown
};
global.marked = (markdown) => markdown;

const ChannelConverter = require('../js/channel-converter.js');

test('passthrough translation does not duplicate bilingual Markdown', async () => {
    const source = '# 标题\n\n这是原文。';

    assert.equal(await ChannelConverter.buildBilingualMarkdown(source), source);
});

test('passthrough translation does not duplicate a LinkedIn post', async () => {
    const source = '# 标题\n\n这是原文。';

    assert.equal(await ChannelConverter.buildLinkedInPost(source), '标题\n\n这是原文。');
});

test('distinct translation keeps both translated and original content', async () => {
    global.Translator.translateMarkdownToEnglish = async () => '# Title\n\nEnglish body.';
    const source = '# 标题\n\n中文正文。';

    assert.equal(
        await ChannelConverter.buildBilingualMarkdown(source),
        '# Title\n\nEnglish body.\n\n---\n\n# 标题\n\n中文正文。'
    );
    assert.equal(
        await ChannelConverter.buildLinkedInPost(source),
        'Title\n\nEnglish body.\n\n——\n\n标题\n\n中文正文。'
    );
});

test('empty source produces empty channel output', async () => {
    global.Translator.translateMarkdownToEnglish = async (markdown) => markdown;

    assert.equal(await ChannelConverter.buildBilingualMarkdown(''), '');
    assert.equal(await ChannelConverter.buildLinkedInPost('  \n'), '');
    assert.equal(await ChannelConverter.buildXThread(''), '');
    assert.deepEqual(ChannelConverter.splitIntoXThread(''), []);
});

test('X thread splitting preserves complete Unicode characters', () => {
    const text = `${'a'.repeat(259)}😀b`;
    const posts = ChannelConverter.splitIntoXThread(text);

    assert.equal(posts.join(''), text);
    assert.ok(posts.every((post) => post.length <= 260));
    assert.ok(posts.every((post) => !/[\uD800-\uDBFF]$/.test(post)));
    assert.ok(posts.every((post) => !/^[\uDC00-\uDFFF]/.test(post)));
});

test('numbered X posts remain within the 280-character limit', () => {
    const text = Array.from(
        { length: 10 },
        (_, index) => `paragraph-${index}-${'x'.repeat(245)}`
    ).join('\n\n');
    const posts = ChannelConverter.splitIntoXThread(text);
    const numberedPosts = posts.map((post, index) => `${index + 1}/${posts.length}\n${post}`);

    assert.ok(numberedPosts.every((post) => post.length <= 280));
});

test('X local preview does not call AI while the user is typing', async () => {
    let translationCalls = 0;
    let generationCalls = 0;
    global.Translator.translateMarkdownToEnglish = async (markdown) => {
        translationCalls += 1;
        return markdown;
    };
    global.Translator.generateXPublishingPlan = async () => {
        generationCalls += 1;
        return null;
    };
    const source = '# 标题\n\n## 要点一\n\n这里是解释。';

    const bundle = await ChannelConverter.buildXPublishingBundle(source, { useAI: false });

    assert.equal(translationCalls, 0);
    assert.equal(generationCalls, 0);
    assert.equal(bundle.articleMarkdown, source);
    assert.equal(bundle.usedAI, false);
    assert.equal(bundle.threadPosts.length, 2);
});

test('X AI publishing bundle creates one main post and one post per bullet point', async () => {
    global.Translator.translateMarkdownToEnglish = async () => '# English title\n\nEnglish article.';
    global.Translator.generateXPublishingPlan = async () => ({
        recommendation: 'A short recommendation for this useful article.',
        bulletPoints: [
            { title: 'First insight', detail: 'A focused explanation of the first insight.' },
            { title: 'Second insight', detail: 'A focused explanation of the second insight.' }
        ]
    });

    const bundle = await ChannelConverter.buildXPublishingBundle('# 中文标题', { useAI: true });

    assert.equal(bundle.usedAI, true);
    assert.equal(bundle.articleMarkdown, '# English title\n\nEnglish article.');
    assert.equal(bundle.threadPosts.length, 3);
    assert.match(bundle.threadPosts[0], /A short recommendation/);
    assert.match(bundle.threadPosts[0], /• First insight/);
    assert.match(bundle.threadPosts[1], /A focused explanation of the first insight/);
    assert.ok(bundle.threadPosts.every(post => post.length <= 280));
});

test('X AI failure falls back to a usable local publishing bundle', async () => {
    global.Translator.translateMarkdownToEnglish = async (markdown) => markdown;
    global.Translator.generateXPublishingPlan = async () => {
        throw new Error('temporary model failure');
    };

    const originalWarn = console.warn;
    console.warn = () => {};
    let bundle;
    try {
        bundle = await ChannelConverter.buildXPublishingBundle(
            '# 标题\n\n## 要点\n\n解释内容。',
            { useAI: true }
        );
    } finally {
        console.warn = originalWarn;
    }

    assert.equal(bundle.usedAI, false);
    assert.equal(bundle.aiError, 'temporary model failure');
    assert.equal(bundle.threadPosts.length, 2);
    assert.match(ChannelConverter.formatXPublishingBundle(bundle), /# X ARTICLE/);
    assert.match(ChannelConverter.renderXPublishingPreview(bundle), /data-x-copy="article"/);
});
