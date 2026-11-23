const test = require('node:test');
const assert = require('node:assert/strict');

const modulePath = '../js/custom-template-manager.js';

function freshModule() {
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
        snapshot() { return Object.fromEntries(values); }
    };
}

const candidates = [
    { id: 'style-1', sample: '标题', textLength: 8, style: { fontFamily: '"Segoe UI", sans-serif', fontSize: '24px', fontWeight: '800', textAlign: 'center', color: '#112233' } },
    { id: 'style-2', sample: '小标题', textLength: 16, style: { fontSize: '18px', fontWeight: '700', borderLeft: '4px solid #2563eb' } },
    { id: 'style-3', sample: '正文', textLength: 120, style: { fontSize: '15px', lineHeight: '1.9', color: '#222222' } },
    { id: 'style-4', sample: '引用', textLength: 60, style: { fontSize: '15px', backgroundColor: '#f8fafc', padding: '12px 16px' } }
];

test('unsupported Chrome AI returns a manual fallback instead of throwing', async () => {
    const CustomTemplateManager = freshModule();
    const result = await CustomTemplateManager.classifyCandidates(candidates, null);

    assert.equal(result.mode, 'manual');
    assert.equal(result.reason, 'unsupported');
    assert.equal(result.mapping.paragraph, 'style-3');
});

test('Chrome AI classification uses structured output and normalizes unknown candidate ids', async () => {
    const CustomTemplateManager = freshModule();
    let availabilityOptions = null;
    let createOptions = null;
    let promptOptions = null;
    const fakeSession = {
        async prompt(_input, options) {
            promptOptions = options;
            return JSON.stringify({
                h1: 'style-1', h2: 'style-2', h3: 'missing',
                paragraph: 'style-3', blockquote: 'style-4'
            });
        },
        destroy() {}
    };
    const FakeLanguageModel = {
        async availability(options) {
            availabilityOptions = options;
            return 'available';
        },
        async create(options) {
            createOptions = options;
            return fakeSession;
        }
    };

    const result = await CustomTemplateManager.classifyCandidates(candidates, FakeLanguageModel);

    assert.equal(result.mode, 'ai');
    assert.equal(result.mapping.h1, 'style-1');
    assert.equal(result.mapping.h3, '');
    assert.deepEqual(availabilityOptions.expectedInputs, [{ type: 'text', languages: ['en'] }]);
    assert.deepEqual(createOptions.expectedOutputs, [{ type: 'text', languages: ['en'] }]);
    assert.equal(promptOptions.responseConstraint.additionalProperties, false);
});

test('Chrome AI low-confidence output falls back to manual mapping', async () => {
    const CustomTemplateManager = freshModule();
    const result = await CustomTemplateManager.classifyCandidates(candidates, {
        async availability() { return 'available'; },
        async create() {
            return {
                async prompt() {
                    return JSON.stringify({ h1: 'style-1', h2: '', h3: '', paragraph: 'style-3', blockquote: '' });
                },
                destroy() {}
            };
        }
    });

    assert.equal(result.mode, 'manual');
    assert.equal(result.reason, 'low-confidence');
    assert.equal(result.mapping.paragraph, 'style-3');
});

test('candidate snapshots are grouped by visual style and capped for a simple manual fallback', () => {
    const CustomTemplateManager = freshModule();
    const snapshots = [
        { sample: '第一段正文', textLength: 80, style: { fontSize: '15px', lineHeight: '1.9' } },
        { sample: '第二段正文', textLength: 120, style: { fontSize: '15px', lineHeight: '1.9' } },
        { sample: '标题', textLength: 8, style: { fontSize: '24px', fontWeight: '800' } },
        { sample: '危险', textLength: 3, style: { fontSize: '14px', backgroundImage: 'url(https://bad.invalid)' } }
    ];

    const result = CustomTemplateManager.buildCandidatesFromSnapshots(snapshots, 2);

    assert.equal(result.length, 2);
    assert.equal(result[0].sample, '第二段正文');
    assert.equal(result[0].textLength, 120);
    assert.deepEqual(result[1].style, { fontSize: '24px', fontWeight: '800' });
    assert.match(result[0].id, /^style-/);
});

test('template definitions keep only safe style properties and values', () => {
    const CustomTemplateManager = freshModule();
    const unsafeCandidates = [{
        id: 'style-1', sample: '正文', textLength: 20,
        style: {
            fontSize: '15px', lineHeight: '1.9', color: '#222',
            position: 'fixed', backgroundImage: 'url(https://tracker.invalid/pixel)',
            width: 'expression(alert(1))', margin: '12px 0',
            textAlign: 'left;position:fixed;inset:0',
            fontFamily: 'image-set("https://tracker.invalid/a.png" 1x)',
            borderLeft: '4px solid #2563eb'
        }
    }];

    const definition = CustomTemplateManager.buildDefinition(
        '我的模板', unsafeCandidates,
        { h1: '', h2: '', h3: '', paragraph: 'style-1', blockquote: '' },
        'custom:test'
    );

    assert.deepEqual(definition.styles.paragraph, {
        fontSize: '15px', lineHeight: '1.9', color: '#222',
        margin: '12px 0', borderLeft: '4px solid #2563eb'
    });
    assert.equal(definition.schemaVersion, 1);
});

test('saved templates stay in the supplied browser storage and load back safely', () => {
    const CustomTemplateManager = freshModule();
    const storage = memoryStorage();
    const definition = CustomTemplateManager.buildDefinition(
        '本地模板', candidates,
        { h1: 'style-1', h2: 'style-2', h3: '', paragraph: 'style-3', blockquote: 'style-4' },
        'custom:local'
    );

    CustomTemplateManager.saveDefinition(definition, storage);
    const loaded = CustomTemplateManager.loadDefinitions(storage);

    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].id, 'custom:local');
    assert.match(storage.snapshot()[CustomTemplateManager.storageKey], /custom:local/);
});

test('import writes all validated templates atomically in one storage update', () => {
    const CustomTemplateManager = freshModule();
    let writes = 0;
    const storage = memoryStorage();
    const originalSetItem = storage.setItem;
    storage.setItem = (key, value) => { writes += 1; originalSetItem(key, value); };
    const existing = CustomTemplateManager.buildDefinition('已有', [], {}, 'custom:existing');
    CustomTemplateManager.saveDefinition(existing, storage);
    writes = 0;
    const one = CustomTemplateManager.buildDefinition('导入一', [], {}, 'custom:one');
    const two = CustomTemplateManager.buildDefinition('导入二', [], {}, 'custom:two');

    CustomTemplateManager.importDefinitions(CustomTemplateManager.exportDefinitions([one, two]), storage);

    assert.equal(writes, 1);
    assert.deepEqual(CustomTemplateManager.loadDefinitions(storage).map(item => item.id), ['custom:one', 'custom:two', 'custom:existing']);
});

test('template definitions can be exported and safely imported without replacing unrelated local templates', () => {
    const CustomTemplateManager = freshModule();
    const storage = memoryStorage();
    const first = CustomTemplateManager.buildDefinition('已有模板', [], {}, 'custom-template-existing');
    const incoming = CustomTemplateManager.buildDefinition('导入模板', [], {}, 'custom-template-imported');
    CustomTemplateManager.saveDefinition(first, storage);

    const exported = CustomTemplateManager.exportDefinitions([incoming]);
    const imported = CustomTemplateManager.importDefinitions(exported, storage);

    assert.equal(imported.length, 1);
    assert.deepEqual(CustomTemplateManager.loadDefinitions(storage).map(item => item.name).sort(), ['导入模板', '已有模板']);
    assert.throws(() => CustomTemplateManager.importDefinitions('{"bad":true}', storage), /格式无效/);
});

test('compiled custom templates extend a base template and render safe role styles', () => {
    const CustomTemplateManager = freshModule();
    const definition = CustomTemplateManager.buildDefinition(
        '本地模板', candidates,
        { h1: 'style-1', h2: 'style-2', h3: '', paragraph: 'style-3', blockquote: 'style-4' },
        'custom:compiled'
    );
    const base = {
        id: 'wechat-default',
        getStyles() {
            return {
                h1: (_m, text) => `<h1>${text}</h1>`,
                h2: (_m, text) => `<h2>${text}</h2>`,
                h3: (_m, text) => `<h3>${text}</h3>`,
                paragraph: (_m, text) => `<p>${text}</p>`,
                blockquote: (_m, text) => `<blockquote>${text}</blockquote>`,
                bold: (_m, text) => `<strong>${text}</strong>`
            };
        }
    };

    const compiled = CustomTemplateManager.compileDefinition(definition, base);
    const styles = compiled.getStyles('compact', '#2563eb');

    assert.match(styles.h1(null, 'Title'), /^<h1 style="[^"]*font-family:&quot;Segoe UI&quot;, sans-serif/);
    assert.match(styles.h1(null, 'Title'), /font-size:24px/);
    assert.match(styles.paragraph(null, 'Body'), /line-height:1\.9/);
    assert.match(styles.blockquote(null, 'Quote'), /<blockquote style=/);
    assert.equal(styles.bold(null, 'Bold'), '<strong>Bold</strong>');
});
