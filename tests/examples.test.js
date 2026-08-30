const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ExampleData = require('../assets/examples.js');

test('the load-example content matches the product introduction demo article', () => {
    const articlePath = path.join(__dirname, '..', 'PROJECT-INTRO-DEMO.md');
    const article = fs.readFileSync(articlePath, 'utf8').trimEnd();

    assert.equal(ExampleData.getExampleMarkdown(), article);
});

test('the simple cost equation uses portable text instead of inline formula images', () => {
    const example = ExampleData.getExampleMarkdown();
    const equationLine = example
        .split('\n')
        .find(line => line.includes('多渠道发布的重复劳动'));

    assert.match(equationLine, /C = n × \(E \+ F\)/);
    assert.doesNotMatch(equationLine, /\$|\\times/);
});
