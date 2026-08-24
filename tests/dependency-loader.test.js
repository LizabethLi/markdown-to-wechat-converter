const test = require('node:test');
const assert = require('node:assert/strict');

const DependencyLoader = require('../js/dependency-loader.js');

test('plain Markdown does not request any heavy rendering dependency', () => {
    assert.deepEqual(
        DependencyLoader.getRequiredDependencies('# Title\n\nA **plain** article.'),
        []
    );
});

test('formula, Mermaid, and code blocks request only their matching dependencies', () => {
    const markdown = [
        'Formula: $E=mc^2$',
        '',
        '```mermaid',
        'flowchart LR',
        'A --> B',
        '```',
        '',
        '```javascript',
        'console.log("hello");',
        '```'
    ].join('\n');

    assert.deepEqual(
        DependencyLoader.getRequiredDependencies(markdown),
        ['mathjax', 'mermaid', 'highlight']
    );
});

test('a Mermaid block alone is not mistaken for a highlighted code block', () => {
    assert.deepEqual(
        DependencyLoader.getRequiredDependencies('```mermaid\ngraph TD\nA-->B\n```'),
        ['mermaid']
    );
});

test('indented fenced blocks are detected using Markdown fence rules', () => {
    assert.deepEqual(
        DependencyLoader.getRequiredDependencies('   ```mermaid\ngraph TD\nA-->B\n   ```'),
        ['mermaid']
    );
    assert.deepEqual(
        DependencyLoader.getRequiredDependencies('  ```python\nprint("hello")\n  ```'),
        ['highlight']
    );
});

test('concurrent loads share one script request', async () => {
    const previousWindow = global.window;
    const previousDocument = global.document;
    const scripts = [];

    global.window = {};
    global.document = {
        head: {
            appendChild: (script) => {
                scripts.push(script);
                global.window.mermaid = { render: () => {} };
                queueMicrotask(() => script.onload());
            }
        },
        createElement: () => ({ dataset: {} })
    };
    DependencyLoader.pending = {};

    try {
        await Promise.all([
            DependencyLoader.load('mermaid'),
            DependencyLoader.load('mermaid')
        ]);
        assert.equal(scripts.length, 1);
        assert.match(scripts[0].src, /mermaid@10\.9\.1/);
    } finally {
        DependencyLoader.pending = {};
        global.window = previousWindow;
        global.document = previousDocument;
    }
});
