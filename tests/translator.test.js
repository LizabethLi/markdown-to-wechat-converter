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
