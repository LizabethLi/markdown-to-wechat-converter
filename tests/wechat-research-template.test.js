const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const marked = require('../js/vendor/marked-3.0.8.min.js');

const root = path.join(__dirname, '..');
function runtime() {
    const input = { value: '保留正在编辑的原稿', scrollTop: 20 };
    const channel = { value: 'wechat' };
    const context = vm.createContext({
        marked, console,
        localStorage: { getItem() { return null; }, setItem() {} },
        document: { getElementById(id) {
            return id === 'markdownInput' ? input : id === 'channelSelect' ? channel : null;
        } }
    });
    for (const file of [
        'js/config.js', 'js/template-manager.js', 'js/wechat-styles.js',
        'js/templates/wechat-default.js', 'js/templates/wechat-magazine.js',
        'js/templates/wechat-editorial.js', 'js/templates/wechat-research.js',
        'js/math-renderer.js', 'js/markdown-converter.js',
        'assets/examples.js', 'js/ui-controller.js'
    ]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
    const app = vm.runInContext('({ AppConfig, TemplateManager, MarkdownConverter, ExampleData, UIController })', context);
    app.UIController.updateOutput = () => {};
    app.UIController.updateStyleSummary = () => {};
    return { ...app, input, channel };
}

test('selecting research preserves the chosen theme, custom color, and article', () => {
    const { UIController: ui, TemplateManager: templates, input } = runtime();
    for (const theme of ['purple', 'blue', 'mint', 'custom']) {
        templates.setActive('wechat-default');
        ui.currentTheme = theme;
        ui.customColor = '#ab4';
        ui.handleTemplateChange('wechat-research');
        assert.equal(templates.activeId, 'wechat-research');
        assert.equal(ui.currentTheme, theme);
        assert.equal(ui.customColor, '#ab4');
        assert.equal(input.value, '保留正在编辑的原稿');
    }
});

test('loading research sample is explicit and does not replace other channels examples', () => {
    const { UIController: ui, TemplateManager: templates, ExampleData: examples, input, channel } = runtime();
    templates.setActive('wechat-research');
    ui.loadExample();
    assert.equal(input.value, examples.getResearchExample());
    assert.equal(input.scrollTop, 0);
    channel.value = 'linkedin';
    ui.loadExample();
    assert.equal(input.value, examples.getExampleMarkdown());
    channel.value = 'wechat';
    templates.setActive('wechat-magazine');
    ui.loadExample();
    assert.equal(input.value, examples.getExampleMarkdown());
});

test('real Markdown conversion supports all existing theme colors and custom hex formats', async () => {
    const { AppConfig: config, MarkdownConverter: converter } = runtime();
    const colors = [...Object.values(config.themes).map(theme => theme.primary), '#ab4', '#33669980'];
    for (const color of colors) {
        const html = await converter.convertMarkdownToWechat(
            '[lead] 一段**导语**\n\n# 01｜Papers\n\n### A long research title\n\n**研究机构：** 示例机构',
            'compact', color, 'wechat-research'
        );
        const normalized = color === '#ab4' ? '#aabb44' : color.toLowerCase();
        assert.ok(html.includes(`border-left:4px solid ${normalized}`), color);
        assert.match(html, /data-wechat-template="research"/);
        assert.match(html, /<h1\b/);
        assert.match(html, /<h3\b/);
        assert.doesNotMatch(html, /\[lead\]|NaN|undefined/);
        if (color !== '#01fabd') assert.doesNotMatch(html, /#01fabd/);
    }
});

test('sample conversion retains explicit captions once and ships readable local images', async () => {
    const { MarkdownConverter: converter, ExampleData: examples } = runtime();
    const sample = examples.getResearchExample();
    const html = await converter.convertMarkdownToWechat(sample, 'compact', '#01fabd', 'wechat-research');
    assert.equal((html.match(/四类任务漂移下，三种自演进方法的逐组学习曲线。/g) || []).length, 1);
    const visibleText = html.replace(/<[^>]+>/g, '');
    assert.doesNotMatch(visibleText, /01_self_evolving_fig1\.png|03_harness_fig1\.png/);
    assert.match(html, /alt="01_self_evolving_fig1.png"/);
    for (const match of sample.matchAll(/!\[[^\]]*\]\((assets\/examples\/[^)]+)\)/g)) {
        assert.ok(fs.statSync(path.join(root, match[1])).size > 1000);
    }
});

test('quotes and lists keep nested content and ordered numbering in portable output', async () => {
    const { MarkdownConverter: converter } = runtime();
    const html = await converter.convertMarkdownToWechat(
        '> 第一段 **加粗**\n>\n> 第二段\n>\n> - 内部列表\n\n3. 第三项\n4. 第四项\n\n- [x] 已完成\n\n| 研究 | 主题 |\n| --- | --- |\n| 示例 | 记忆 |',
        'standard', '#2563EB', 'wechat-research'
    );
    assert.match(html, /<ol start="3"/);
    assert.match(html, /内部列表/);
    assert.match(html, /☑/);
    assert.match(html, /<table\b/);
    assert.doesNotMatch(html, /<input\b|<p[^>]*>\s*<p\b|PLACEHOLDER/);
});
