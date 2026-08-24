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

test.beforeEach(() => {
    global.Translator.translateMarkdownToEnglish = async (markdown) => markdown;
    global.Translator.generateXPublishingPlan = async () => null;
    global.MarkdownConverter.convertMarkdownToWechat = async (markdown) => markdown;
    ChannelConverter.clearLocalizationCache();
});

test('Chinese output keeps the original Markdown without calling the translator', async () => {
    let translationCalls = 0;
    global.Translator.translateMarkdownToEnglish = async () => {
        translationCalls += 1;
        return '# Title';
    };
    const source = '# 标题\n\n这是原文。';

    assert.equal(await ChannelConverter.buildLocalizedMarkdown(source, 'zh'), source);
    assert.equal(translationCalls, 0);
});

test('English output translates once and returns only the translated Markdown', async () => {
    let translationCalls = 0;
    global.Translator.translateMarkdownToEnglish = async () => '# Title\n\nEnglish body.';
    const source = '# 标题\n\n中文正文。';

    global.Translator.translateMarkdownToEnglish = async () => {
        translationCalls += 1;
        return '# Title\n\nEnglish body.';
    };
    const rendered = await ChannelConverter.renderForChannel('substack', source, {
        outputLanguage: 'en'
    });

    assert.equal(rendered.output, '# Title\n\nEnglish body.');
    assert.doesNotMatch(rendered.output, /中文正文|---/);
    assert.equal(translationCalls, 1);
});

test('all channels receive the selected single-language Markdown', async () => {
    const source = '# 标题\n\n中文正文。';
    const translated = '# Title\n\nEnglish body.';
    let translationCalls = 0;
    global.Translator.translateMarkdownToEnglish = async () => {
        translationCalls += 1;
        return translated;
    };

    const wechat = await ChannelConverter.renderForChannel('wechat', source, { outputLanguage: 'en' });
    const legacyLinkedin = await ChannelConverter.renderForChannel('linkedin', source, { outputLanguage: 'en' });
    const chineseSubstack = await ChannelConverter.renderForChannel('substack', source, { outputLanguage: 'zh' });

    assert.equal(wechat.output, translated);
    assert.equal(legacyLinkedin.output, translated);
    assert.equal(legacyLinkedin.channel.id, 'substack');
    assert.equal(chineseSubstack.output, source);
    assert.equal(translationCalls, 1);
});

test('WeChat forwards an explicit template without changing global template state', async () => {
    let renderArguments = null;
    global.MarkdownConverter.convertMarkdownToWechat = async (...args) => {
        renderArguments = args;
        return '<section>Rendered</section>';
    };

    const rendered = await ChannelConverter.renderForChannel('wechat', '# Title', {
        outputLanguage: 'zh',
        mode: 'standard',
        themeColor: '#2563EB',
        templateId: 'wechat-magazine'
    });

    assert.equal(rendered.output, '<section>Rendered</section>');
    assert.deepEqual(renderArguments, [
        '# Title',
        'standard',
        '#2563EB',
        'wechat-magazine'
    ]);
});

test('a stale translation cannot overwrite the cache for newer source text', async () => {
    const resolvers = {};
    global.Translator.translateMarkdownToEnglish = (markdown) => new Promise((resolve) => {
        resolvers[markdown.trim()] = resolve;
    });

    const oldRequest = ChannelConverter.buildLocalizedMarkdown('旧正文', 'en');
    const newRequest = ChannelConverter.buildLocalizedMarkdown('新正文', 'en');
    resolvers['新正文']('New body');
    assert.equal(await newRequest, 'New body');
    resolvers['旧正文']('Old body');
    assert.equal(await oldRequest, 'Old body');

    assert.equal(await ChannelConverter.buildLocalizedMarkdown('新正文', 'en'), 'New body');
});

test('empty source produces empty channel output', async () => {
    assert.equal(await ChannelConverter.buildLocalizedMarkdown('', 'en'), '');
    assert.equal(ChannelConverter.buildSingleLanguageMarkdown('  \n'), '');
    assert.equal(await ChannelConverter.buildXThread(''), '');
    assert.deepEqual(ChannelConverter.splitIntoXThread(''), []);
});

test('rich preview requests math typesetting only when the article contains math', async () => {
    const plain = await ChannelConverter.renderRichMarkdownPreview('# Plain article');
    const formula = await ChannelConverter.renderRichMarkdownPreview('Formula: $E=mc^2$');

    assert.equal(plain.needsMathTypeset, false);
    assert.equal(formula.needsMathTypeset, true);
});

test('image Markdown is preserved for every publishing workflow', async () => {
    const source = '# Article\n\n![Architecture](https://example.com/architecture.png)';

    const substack = await ChannelConverter.renderForChannel('substack', source, { outputLanguage: 'zh' });
    const wechat = await ChannelConverter.renderForChannel('wechat', source, { outputLanguage: 'zh' });
    const legacyLinkedin = await ChannelConverter.renderForChannel('linkedin', source, { outputLanguage: 'zh' });
    const x = await ChannelConverter.renderForChannel('x', source, { outputLanguage: 'zh' });

    assert.match(substack.output, /!\[Architecture\]\(https:\/\/example\.com\/architecture\.png\)/);
    assert.match(wechat.output, /!\[Architecture\]\(https:\/\/example\.com\/architecture\.png\)/);
    assert.match(legacyLinkedin.output, /!\[Architecture\]\(https:\/\/example\.com\/architecture\.png\)/);
    assert.match(x.data.articleMarkdown, /!\[Architecture\]\(https:\/\/example\.com\/architecture\.png\)/);
});

test('embedded image data bypasses translation and is restored in the translated article', async () => {
    const dataUrl = 'data:image/png;base64,AAECAwQ=';
    let translationInput = '';
    global.Translator.translateMarkdownToEnglish = async (markdown) => {
        translationInput = markdown;
        return markdown.replace('中文正文', 'English body');
    };

    const rendered = await ChannelConverter.renderForChannel(
        'substack',
        `中文正文\n\n![Screenshot](${dataUrl})`,
        { outputLanguage: 'en' }
    );

    assert.doesNotMatch(translationInput, /AAECAwQ/);
    assert.match(translationInput, /__INLINE_IMAGE_DATA_0__/);
    assert.match(rendered.output, /English body/);
    assert.match(rendered.output, /data:image\/png;base64,AAECAwQ=/);
});

test('Obsidian image references bypass translation and retain the exact attachment name', async () => {
    let translationInput = '';
    global.Translator.translateMarkdownToEnglish = async (markdown) => {
        translationInput = markdown;
        return markdown.replace('中文正文', 'English body');
    };

    const rendered = await ChannelConverter.renderForChannel(
        'substack',
        '中文正文\n\n![[Pasted image 20260818133657.png]]',
        { outputLanguage: 'en' }
    );

    assert.doesNotMatch(translationInput, /Pasted image/);
    assert.match(translationInput, /__OBSIDIAN_IMAGE_REFERENCE_0__/);
    assert.match(rendered.output, /!\[\[Pasted image 20260818133657\.png\]\]/);
});

test('temporary local image references bypass translation and stay compact', async () => {
    let translationInput = '';
    global.Translator.translateMarkdownToEnglish = async (markdown) => {
        translationInput = markdown;
        return markdown.replace('中文正文', 'English body');
    };

    const rendered = await ChannelConverter.renderForChannel(
        'substack',
        '中文正文\n\n![示意图](local-image://asset-demo-1)',
        { outputLanguage: 'en' }
    );

    assert.doesNotMatch(translationInput, /local-image/);
    assert.match(translationInput, /__LOCAL_IMAGE_REFERENCE_0__/);
    assert.match(rendered.output, /!\[示意图\]\(local-image:\/\/asset-demo-1\)/);
});

test('plain-text channels describe embedded images without copying Base64 payloads', () => {
    const output = ChannelConverter.markdownToPlainText(
        '![Screenshot](data:image/png;base64,AAECAwQ=)'
    );

    assert.equal(output, '[图片：Screenshot]');
    assert.doesNotMatch(output, /base64/);
});

test('X AI planning receives an image placeholder while the article keeps the image', async () => {
    const dataUrl = 'data:image/png;base64,AAECAwQ=';
    let planInput = '';
    global.Translator.generateXPublishingPlan = async (markdown) => {
        planInput = markdown;
        return {
            recommendation: 'Recommended.',
            bulletPoints: [{ title: 'Point', detail: 'Detail.' }]
        };
    };

    const rendered = await ChannelConverter.renderForChannel(
        'x',
        `# Article\n\n![Screenshot](${dataUrl})`,
        { outputLanguage: 'zh', useAI: true }
    );

    assert.doesNotMatch(planInput, /AAECAwQ/);
    assert.match(planInput, /embedded-image:\/\/omitted/);
    assert.match(rendered.data.articleMarkdown, /data:image\/png;base64,AAECAwQ=/);
});

test('publishing channels expose their platform-specific copy modes', () => {
    assert.equal(ChannelConverter.getChannel('wechat').previewCopyMode, 'rich');
    assert.equal(ChannelConverter.getChannel('substack').previewCopyMode, 'rich');
    assert.equal(ChannelConverter.getChannel('substack').portableRichCopy, true);
    assert.equal(ChannelConverter.getChannel('linkedin'), ChannelConverter.getChannel('substack'));
    assert.equal(ChannelConverter.getChannel('substack').name, 'Substack / LinkedIn');
    assert.equal(ChannelConverter.getChannel('substack').reminder, null);
    assert.deepEqual(ChannelConverter.listChannels().map(channel => channel.id), [
        'wechat',
        'substack',
        'x'
    ]);
    assert.match(ChannelConverter.getChannel('x').reminder.text, /按编号上传/);
    assert.match(ChannelConverter.getChannel('x').reminder.text, /代码块/);
    assert.deepEqual(ChannelConverter.getChannel('x').reminder.steps, [
        '复制 Article 文字',
        '按编号上传图片素材'
    ]);
    assert.equal(ChannelConverter.getChannel('x').copyPreviewLabel, '复制 Article 文字');
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

    const rendered = await ChannelConverter.renderForChannel('x', '# 中文标题', {
        useAI: true,
        outputLanguage: 'en'
    });
    const bundle = rendered.data;

    assert.equal(bundle.usedAI, true);
    assert.equal(bundle.articleMarkdown, '# English title\n\nEnglish article.');
    assert.equal(bundle.threadPosts.length, 3);
    assert.match(bundle.threadPosts[0], /A short recommendation/);
    assert.match(bundle.threadPosts[0], /• First insight/);
    assert.match(bundle.threadPosts[1], /A focused explanation of the first insight/);
    assert.ok(bundle.threadPosts.every(post => post.length <= 280));
});

test('X Chinese mode sends the Chinese article directly to AI without translation', async () => {
    let planSource = '';
    global.Translator.translateMarkdownToEnglish = async () => {
        throw new Error('translator should not be called in Chinese mode');
    };
    global.Translator.generateXPublishingPlan = async (markdown) => {
        planSource = markdown;
        return {
            recommendation: '推荐阅读这篇文章。',
            bulletPoints: [{ title: '中文要点', detail: '中文解释。' }]
        };
    };

    const rendered = await ChannelConverter.renderForChannel('x', '# 中文标题', {
        useAI: true,
        outputLanguage: 'zh'
    });

    assert.equal(planSource, '# 中文标题');
    assert.equal(rendered.data.articleMarkdown, '# 中文标题');
    assert.match(rendered.data.threadPosts[0], /推荐阅读/);
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
