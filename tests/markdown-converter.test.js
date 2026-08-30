const test = require('node:test');
const assert = require('node:assert/strict');

global.marked = {
    Renderer: class Renderer {}
};

const styles = {
    italic: (_match, text) => `<em style="font-style:italic;">${text}</em>`,
    bold: (_match, text) => `<strong>${text}</strong>`,
    inlineCode: (_match, text) => `<code style="font-family:monospace;">${text}</code>`,
    paragraph: (_match, text) => `<p>${text}</p>`,
    leadParagraph: (_match, text) => `<aside>${text}</aside>`
};

global.TemplateManager = {
    getStylesFor: () => styles,
    getStyles: () => styles
};

global.AppConfig = {
    syntaxHighlighting: {
        enabled: true,
        themeStyles: {
            purple: {
                background: '#f8f9fa',
                border: '#e9ecef',
                text: '#333333',
                keyword: '#7E3AF2',
                string: '#0969da',
                comment: '#6a737d',
                number: '#e36209',
                function: '#8250df',
                variable: '#953800'
            }
        }
    },
    themes: {
        purple: { primary: '#7E3AF2' }
    },
    defaults: { theme: 'purple' }
};

const MarkdownConverter = require('../js/markdown-converter.js');

test('the WeChat renderer keeps emphasis and downgrades strikethrough to plain text', () => {
    const renderer = MarkdownConverter.createWechatRenderer('compact', '#2563EB', 'test-template');

    assert.equal(renderer.em('斜体'), '<em style="font-style:italic;">斜体</em>');
    assert.equal(renderer.strong('粗体'), '<strong>粗体</strong>');
    assert.equal(renderer.del('删除线'), '删除线');
});

test('the WeChat horizontal rule carries the selected theme color inline', () => {
    const renderer = MarkdownConverter.createWechatRenderer('compact', '#2563EB', 'test-template');

    assert.match(renderer.hr(), /border-top:1px solid #2563EB/);
    assert.match(renderer.hr(), /margin:24px 0/);
});

test('WeChat task items use portable text markers instead of checkbox inputs', () => {
    const renderer = MarkdownConverter.createWechatRenderer('compact', '#2563EB', 'test-template');
    const checked = renderer.listitem('<input disabled="" type="checkbox" checked=""> 已完成', true, true);
    const unchecked = renderer.listitem('<input disabled="" type="checkbox"> 待完成', true, false);

    assert.doesNotMatch(checked, /<input/);
    assert.match(checked, /☑/);
    assert.match(checked, /已完成/);
    assert.match(unchecked, /☐/);
    assert.match(unchecked, /待完成/);
});

test('a WeChat task list uses portable paragraphs instead of list tags', () => {
    const renderer = MarkdownConverter.createWechatRenderer('compact', '#2563EB', 'test-template');
    const body = [
        renderer.listitem('<input disabled="" type="checkbox" checked=""> 已完成', true, true),
        renderer.listitem('<input disabled="" type="checkbox"> 待完成', true, false)
    ].join('');
    const list = renderer.list(body, false);

    assert.match(list, /data-wechat-task-list="true"/);
    assert.doesNotMatch(list, /<(?:ul|ol|li)\b/);
    assert.match(list, /☑.*已完成/);
    assert.match(list, /☐.*待完成/);
});

test('ordinary list items keep their normal list marker behavior', () => {
    const renderer = MarkdownConverter.createWechatRenderer('compact', '#2563EB', 'test-template');
    const item = renderer.listitem('普通项目');

    assert.doesNotMatch(item, /list-style:none|☑|☐/);
    assert.match(item, /普通项目/);
});

test('the lead marker reaches the WeChat paragraph renderer and is not displayed', () => {
    const renderer = MarkdownConverter.createWechatRenderer('compact', '#2563EB', 'test-template');

    assert.equal(renderer.paragraph('[lead] 这是引导段。'), '<aside>这是引导段。</aside>');
    assert.equal(renderer.paragraph('这是普通段落。'), '<p>这是普通段落。</p>');
});

test('WeChat code blocks use portable sections and explicit line breaks', () => {
    const renderer = MarkdownConverter.createWechatRenderer('compact', '#2563EB', 'test-template');
    const block = renderer.code('const value = 1;\n  console.log(value);', 'javascript');

    assert.match(block, /data-wechat-code-block="true"/);
    assert.doesNotMatch(block, /<(?:pre|code)\b/);
    assert.match(block, /const value = 1;<br>/);
    assert.match(block, /&nbsp;&nbsp;console\.log\(value\);/);
});

test('WeChat inline code uses a portable span instead of a code tag', () => {
    const renderer = MarkdownConverter.createWechatRenderer('compact', '#2563EB', 'test-template');
    const inline = renderer.codespan('npm run build');

    assert.match(inline, /data-wechat-inline-code="true"/);
    assert.doesNotMatch(inline, /<code\b/);
    assert.match(inline, /npm run build/);
});
