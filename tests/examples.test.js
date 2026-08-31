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

test('the load-example starts with a lead and demonstrates nested heading levels', () => {
    const lines = ExampleData.getExampleMarkdown().split('\n');
    const firstContentLine = lines.find(line => line.trim());
    const leadLines = lines.filter(line => /^\[lead\]\s+/i.test(line));
    const levelOneIndexes = lines
        .map((line, index) => (/^#\s+/.test(line) ? index : -1))
        .filter(index => index >= 0);

    assert.match(firstContentLine, /^\[lead\]\s+/i);
    assert.equal(leadLines.length, 1);
    assert.ok(levelOneIndexes.length >= 2 && levelOneIndexes.length <= 3);

    levelOneIndexes.forEach((start, sectionIndex) => {
        const end = levelOneIndexes[sectionIndex + 1] || lines.length;
        const section = lines.slice(start + 1, end);

        assert.ok(section.some(line => /^##\s+/.test(line)));
        assert.ok(section.some(line => line.trim() && !/^#{1,6}\s+/.test(line)));
    });
});

test('the simple cost equation uses portable text instead of inline formula images', () => {
    const example = ExampleData.getExampleMarkdown();
    const equationLine = example
        .split('\n')
        .find(line => line.includes('多渠道发布的重复劳动'));

    assert.match(equationLine, /C = n × \(E \+ F\)/);
    assert.doesNotMatch(equationLine, /\$|\\times/);
});
