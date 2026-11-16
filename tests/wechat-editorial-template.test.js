const test = require('node:test');
const assert = require('node:assert/strict');

global.marked = {
    Renderer: class Renderer {}
};

const registry = {};
global.TemplateManager = {
    register(template) {
        registry[template.id] = template;
    },
    getStylesFor(id, mode, themeColor) {
        const template = registry[id];
        return template ? template.getStyles(mode, themeColor) : null;
    },
    getStyles() {
        return {};
    }
};

global.AppConfig = {
    syntaxHighlighting: {
        enabled: false,
        themeStyles: {
            paper: {
                background: '#fffdf8',
                border: '#d8d2c0',
                text: '#292620'
            }
        }
    },
    themes: {
        paper: { primary: '#2f6e5c' }
    },
    defaults: { theme: 'paper' }
};

require('../js/templates/wechat-editorial.js');
const MarkdownConverter = require('../js/markdown-converter.js');

test('the editorial template registers as a selectable paper-themed template', () => {
    const template = registry['wechat-editorial'];

    assert.ok(template);
    assert.equal(template.name, '纸页观察');
    assert.equal(template.defaultTheme, 'paper');
});

test('the editorial template renders its paper, serif, quote, and term treatments inline', () => {
    const renderer = MarkdownConverter.createWechatRenderer(
        'compact',
        '#2f6e5c',
        'wechat-editorial'
    );
    const wrapped = MarkdownConverter.wrapInWechatContainer(
        '<p>正文</p>',
        'compact',
        '#2f6e5c',
        'wechat-editorial'
    );

    assert.match(wrapped, /data-wechat-template="editorial"/);
    assert.match(wrapped, /background:#faf8f3/);
    assert.match(renderer.heading('标题', 1, '标题'), /font-family:'Songti SC'/);
    assert.match(renderer.heading('章节', 2, '章节'), /border-top:1px solid #d8d2c0/);
    assert.match(renderer.em('具身智能'), /font-style:normal/);
    assert.match(renderer.em('具身智能'), /background:#eaf1ef/);
    assert.match(renderer.blockquote('<p>机器人的学习，就像人的学习。</p>'), /text-align:center/);
    assert.match(renderer.blockquote('<p>机器人的学习，就像人的学习。</p>'), /border-top:3px solid #2f6e5c/);
});

test('the editorial template supplies portable list and table styles through renderer hooks', () => {
    const renderer = MarkdownConverter.createWechatRenderer(
        'standard',
        '#2f6e5c',
        'wechat-editorial'
    );
    const item = renderer.listitem('现场发现问题');
    const list = renderer.list(item, true, 1);
    const header = renderer.tablecell('维度', { header: true, align: null });
    const cell = renderer.tablecell('通识教材', { header: false, align: null });
    const table = renderer.table(renderer.tablerow(header), renderer.tablerow(cell));

    assert.match(list, /color:#2f6e5c/);
    assert.match(list, /现场发现问题/);
    assert.match(header, /background:#f2efe5/);
    assert.match(header, /border-bottom:2px solid #2f6e5c/);
    assert.match(cell, /background|color:#292620/);
    assert.match(table, /background:#fffdf8/);
});

test('the editorial template falls back to its reference green for invalid colors', () => {
    const styles = registry['wechat-editorial'].getStyles('compact', 'red;display:none');
    const number = styles.sectionNumber(null, '1');

    assert.match(number, /#2f6e5c/);
    assert.doesNotMatch(number, /display:none/);
});
