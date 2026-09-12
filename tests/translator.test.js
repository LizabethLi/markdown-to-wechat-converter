const test = require('node:test');
const assert = require('node:assert/strict');

global.AppConfig = { translation: { openrouter: {} } };

const Translator = require('../js/translator.js');

test('parseXPublishingPlan accepts fenced JSON and normalizes bullet fields', () => {
    const plan = Translator.parseXPublishingPlan(`\`\`\`json
{
  "recommendation": "Read this for a practical framework.",
  "bullets": [
    { "point": "Start with the user", "explanation": "Solve a concrete pain first." },
    "Ship a small feedback loop"
  ]
}
\`\`\``);

    assert.deepEqual(plan, {
        recommendation: 'Read this for a practical framework.',
        bulletPoints: [
            { title: 'Start with the user', detail: 'Solve a concrete pain first.' },
            { title: 'Ship a small feedback loop', detail: '' }
        ]
    });
});

test('parseXPublishingPlan rejects incomplete AI output', () => {
    assert.throws(
        () => Translator.parseXPublishingPlan('{"recommendation":"","bulletPoints":[]}'),
        /incomplete X publishing plan/
    );
});

test('disabled translation rejects instead of silently returning the Chinese source', async () => {
    const originalTranslation = global.AppConfig.translation;
    global.AppConfig.translation = {
        mode: 'disabled',
        openrouter: { apiKey: 'sk-redacted' }
    };

    try {
        await assert.rejects(
            () => Translator.translateText('中文正文'),
            /Translation is not configured/
        );
    } finally {
        global.AppConfig.translation = originalTranslation;
    }
});

test('OpenRouter errors reach the caller instead of becoming a successful source-text result', async () => {
    const originalTranslation = global.AppConfig.translation;
    const originalFetch = global.fetch;
    const originalLocalStorage = global.localStorage;
    global.AppConfig.translation = {
        mode: 'direct',
        openrouter: {
            apiKey: 'sk-redacted',
            model: 'openai/gpt-4o-mini',
            apiBase: 'https://openrouter.ai/api/v1',
            fallbackModels: []
        }
    };
    global.localStorage = { getItem: () => '' };
    global.fetch = async () => ({
        ok: false,
        status: 401,
        text: async () => '{"error":"invalid key"}'
    });

    try {
        await assert.rejects(
            () => Translator.translateText('中文正文'),
            (error) => error.status === 401 && /invalid key/.test(error.message)
        );
    } finally {
        global.AppConfig.translation = originalTranslation;
        global.fetch = originalFetch;
        global.localStorage = originalLocalStorage;
    }
});

test('the effective translation system prompt contains built-in rules and optional additions once', () => {
    const originalTranslation = global.AppConfig.translation;
    global.AppConfig.translation = {
        openrouter: {},
        systemPrompt: 'Use the glossary: 大模型 -> foundation model.'
    };

    try {
        const builtInPrompt = Translator.promptInstructions();
        const effectivePrompt = Translator.composeTranslationSystemPrompt();

        assert.match(effectivePrompt, /Translate the following Markdown content/);
        assert.match(effectivePrompt, /Additional user requirements/);
        assert.match(effectivePrompt, /foundation model/);
        assert.equal(effectivePrompt.split(builtInPrompt).length - 1, 1);
    } finally {
        global.AppConfig.translation = originalTranslation;
    }
});
