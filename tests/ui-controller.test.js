const test = require('node:test');
const assert = require('node:assert/strict');

const markdownSource = '正文开头\n![[first.png]]\n一段很长的正文\n![[second diagram.png]]\n正文结尾';
const createReference = (raw, fileName) => {
    const start = markdownSource.indexOf(raw);
    return { raw, fileName, start, end: start + raw.length };
};
const references = [
    createReference('![[first.png]]', 'first.png'),
    createReference('![[second diagram.png]]', 'second diagram.png')
];

const classList = () => ({
    values: new Set(),
    toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
    }
});

const elements = {
    localImageStatus: { textContent: '', title: '', classList: classList() },
    locateMissingImageButton: { hidden: true, textContent: '', title: '' },
    imageFileButton: { textContent: '', title: '', classList: classList() },
    channelSelect: { value: 'wechat' },
    translatorPanel: { style: { display: 'none' } },
    translatorApiKey: {
        focusCount: 0,
        focus() { this.focusCount += 1; }
    },
    translationStatus: { hidden: true, classList: classList() },
    translationStatusMessage: { textContent: '' },
    translationRetryButton: { hidden: true },
    copyPreviewBtn: { disabled: false },
    preview: { classList: classList() },
    markdownInput: {
        value: markdownSource,
        clientHeight: 100,
        scrollTop: 0,
        focused: false,
        selectionStart: 0,
        selectionEnd: 0,
        focus() { this.focused = true; },
        setSelectionRange(start, end) {
            this.selectionStart = start;
            this.selectionEnd = end;
        }
    }
};

global.document = {
    getElementById: (id) => elements[id] || null
};
global.ImageHandler = {
    getLocalImageReferenceStatus: () => ({
        references,
        unresolvedReferences: references,
        total: 2,
        loaded: 0
    })
};

const UIController = require('../js/ui-controller.js');

test.beforeEach(() => {
    UIController.missingImageReferenceCursor = 0;
    elements.localImageStatus.textContent = '';
    elements.localImageStatus.title = '';
    elements.locateMissingImageButton.hidden = true;
    elements.channelSelect.value = 'wechat';
    elements.translatorPanel.style.display = 'none';
    elements.translatorApiKey.focusCount = 0;
    elements.translationStatus.hidden = true;
    elements.translationStatus.classList.values.clear();
    elements.translationStatusMessage.textContent = '';
    elements.translationRetryButton.hidden = true;
    elements.copyPreviewBtn.disabled = false;
    elements.preview.classList.values.clear();
    elements.markdownInput.focused = false;
    elements.markdownInput.selectionStart = 0;
    elements.markdownInput.selectionEnd = 0;
});

test('English output opens translator settings without focusing the API key field', () => {
    const originalLanguage = UIController.outputLanguage;
    const originalHasTranslatorConfiguration = UIController.hasTranslatorConfiguration;
    const originalUpdateOutputLanguageUI = UIController.updateOutputLanguageUI;
    const originalUpdateChannelReminder = UIController.updateChannelReminder;
    const originalUpdateOutput = UIController.updateOutput;
    const originalLocalStorage = global.localStorage;

    UIController.outputLanguage = 'zh';
    UIController.hasTranslatorConfiguration = () => false;
    UIController.updateOutputLanguageUI = () => {};
    UIController.updateChannelReminder = () => {};
    UIController.updateOutput = () => {};
    global.localStorage = { setItem() {} };

    try {
        UIController.handleOutputLanguageChange('en');

        assert.equal(elements.translatorPanel.style.display, 'block');
        assert.equal(elements.translatorApiKey.focusCount, 0);
    } finally {
        UIController.outputLanguage = originalLanguage;
        UIController.hasTranslatorConfiguration = originalHasTranslatorConfiguration;
        UIController.updateOutputLanguageUI = originalUpdateOutputLanguageUI;
        UIController.updateChannelReminder = originalUpdateChannelReminder;
        UIController.updateOutput = originalUpdateOutput;
        global.localStorage = originalLocalStorage;
    }
});

test('translation state announces progress, dims the stale preview, and blocks copying', () => {
    UIController.setTranslationState('loading');

    assert.equal(elements.translationStatus.hidden, false);
    assert.equal(elements.translationStatusMessage.textContent, '正在翻译为英文，请稍候…');
    assert.equal(elements.translationStatus.classList.values.has('is-loading'), true);
    assert.equal(elements.preview.classList.values.has('is-translating'), true);
    assert.equal(elements.copyPreviewBtn.disabled, true);
    assert.equal(elements.translationRetryButton.hidden, true);

    UIController.setTranslationState('error', 'OpenRouter 返回 401：API Key 无效。');

    assert.equal(elements.translationStatusMessage.textContent, 'OpenRouter 返回 401：API Key 无效。');
    assert.equal(elements.translationStatus.classList.values.has('has-error'), true);
    assert.equal(elements.preview.classList.values.has('is-translating'), false);
    assert.equal(elements.copyPreviewBtn.disabled, true);
    assert.equal(elements.translationRetryButton.hidden, false);

    UIController.setTranslationState('idle');
    assert.equal(elements.translationStatus.hidden, true);
    assert.equal(elements.copyPreviewBtn.disabled, false);
});

test('translation errors are converted into actionable messages', () => {
    assert.match(UIController.formatTranslationError({ status: 401 }), /API Key 无效/);
    assert.match(UIController.formatTranslationError({ status: 402 }), /余额不足/);
    assert.match(UIController.formatTranslationError({ status: 429 }), /请求过于频繁/);
    assert.match(
        UIController.formatTranslationError(new TypeError('Failed to fetch')),
        /无法连接 OpenRouter/
    );
});

test('X generation opens translator settings without focusing the API key field', async () => {
    const originalTranslator = global.Translator;
    const originalUpdateChannelReminder = UIController.updateChannelReminder;

    elements.channelSelect.value = 'x';
    global.Translator = { hasAIConfiguration: () => false };
    UIController.updateChannelReminder = () => {};

    try {
        await UIController.generateXPublishingContent();

        assert.equal(elements.translatorPanel.style.display, 'block');
        assert.equal(elements.translatorApiKey.focusCount, 0);
    } finally {
        global.Translator = originalTranslator;
        UIController.updateChannelReminder = originalUpdateChannelReminder;
    }
});

test('missing image status names the file and exposes a locate action', () => {
    UIController.updateLocalImageReferenceStatus(elements.markdownInput.value);

    assert.match(elements.localImageStatus.textContent, /first\.png/);
    assert.match(elements.localImageStatus.textContent, /2 张/);
    assert.equal(elements.localImageStatus.title, 'first.png\nsecond diagram.png');
    assert.equal(elements.locateMissingImageButton.hidden, false);
    assert.equal(elements.locateMissingImageButton.textContent, '定位缺图 1/2');
    assert.match(elements.imageFileButton.title, /first\.png、second diagram\.png/);
});

test('locating missing images selects each exact Markdown reference in turn', () => {
    UIController.locateMissingImageReference(references);

    assert.equal(elements.markdownInput.focused, true);
    assert.equal(elements.markdownInput.selectionStart, references[0].start);
    assert.equal(elements.markdownInput.selectionEnd, references[0].end);
    assert.equal(
        elements.markdownInput.value.slice(
            elements.markdownInput.selectionStart,
            elements.markdownInput.selectionEnd
        ),
        references[0].raw
    );
    assert.equal(elements.locateMissingImageButton.textContent, '定位缺图 2/2');

    UIController.locateMissingImageReference(references);
    assert.equal(elements.markdownInput.selectionStart, references[1].start);
    assert.equal(elements.markdownInput.selectionEnd, references[1].end);
    assert.equal(
        elements.markdownInput.value.slice(
            elements.markdownInput.selectionStart,
            elements.markdownInput.selectionEnd
        ),
        references[1].raw
    );
    assert.equal(elements.locateMissingImageButton.textContent, '定位缺图 1/2');
});

test('copy guard names the missing files and automatically locates the first reference', () => {
    let notice = '';
    UIController.showCopyNotice = (message) => {
        notice = message;
    };

    assert.equal(UIController.ensureLocalImageReferencesResolved(markdownSource), false);
    assert.match(notice, /first\.png、second diagram\.png/);
    assert.equal(elements.markdownInput.selectionStart, references[0].start);
    assert.equal(elements.markdownInput.selectionEnd, references[0].end);
});

test('locating a reference after wrapped text scrolls it into the visible editor area', () => {
    const raw = '![[wrapped-missing.png]]';
    const wrappedSource = `${'这是一段没有手动换行但会自动折行的正文。'.repeat(300)}${raw}`;
    const start = wrappedSource.indexOf(raw);
    const reference = {
        raw,
        fileName: 'wrapped-missing.png',
        start,
        end: start + raw.length
    };
    const markdownInput = elements.markdownInput;
    const originalState = {
        value: markdownInput.value,
        clientHeight: markdownInput.clientHeight,
        scrollHeight: markdownInput.scrollHeight,
        scrollTop: markdownInput.scrollTop
    };

    try {
        markdownInput.value = wrappedSource;
        markdownInput.clientHeight = 220;
        markdownInput.scrollHeight = 2400;
        markdownInput.scrollTop = 0;

        UIController.locateMissingImageReference([reference]);

        assert.ok(markdownInput.scrollTop > 1000);
        assert.equal(
            markdownInput.value.slice(markdownInput.selectionStart, markdownInput.selectionEnd),
            raw
        );
    } finally {
        Object.assign(markdownInput, originalState);
    }
});

test('textarea scrolling uses the rendered marker position when DOM measurement is available', () => {
    const markdownInput = elements.markdownInput;
    const originalDocumentMethods = {
        body: global.document.body,
        createElement: global.document.createElement,
        createTextNode: global.document.createTextNode
    };
    const originalWindow = global.window;
    const originalState = {
        value: markdownInput.value,
        clientWidth: markdownInput.clientWidth,
        clientHeight: markdownInput.clientHeight,
        scrollHeight: markdownInput.scrollHeight,
        scrollTop: markdownInput.scrollTop,
        style: markdownInput.style
    };

    const body = {
        appendChild(node) { node.parentNode = this; },
        removeChild(node) { node.parentNode = null; }
    };
    global.document.body = body;
    global.document.createTextNode = (text) => ({ textContent: text });
    global.document.createElement = (tagName) => ({
        tagName,
        style: {},
        parentNode: null,
        textContent: '',
        offsetTop: tagName === 'span' ? 1800 : 0,
        offsetHeight: tagName === 'span' ? 22 : 0,
        appendChild() {}
    });
    global.window = {
        getComputedStyle: () => ({ width: '600px', lineHeight: '22px' })
    };

    try {
        markdownInput.value = `${'长正文'.repeat(1000)}![[missing.png]]`;
        markdownInput.clientWidth = 600;
        markdownInput.clientHeight = 220;
        markdownInput.scrollHeight = 2400;
        markdownInput.scrollTop = 0;
        markdownInput.style = { scrollBehavior: 'smooth' };

        const target = UIController.scrollTextareaSelectionIntoView(
            markdownInput,
            markdownInput.value.indexOf('![[missing.png]]'),
            markdownInput.value.length
        );

        assert.equal(target, 1701);
        assert.equal(markdownInput.scrollTop, 1701);
        assert.equal(markdownInput.style.scrollBehavior, 'smooth');
    } finally {
        Object.assign(global.document, originalDocumentMethods);
        global.window = originalWindow;
        Object.assign(markdownInput, originalState);
    }
});

test('X thread preview expands and collapses without changing its source content', () => {
    const bodyClassList = classList();
    bodyClassList.values.add('is-collapsed');
    const body = { classList: bodyClassList };
    const card = {
        querySelector: (selector) => selector === '[data-x-thread-body]' ? body : null
    };
    const attributes = new Map([['aria-expanded', 'false']]);
    const button = {
        textContent: '... 展开全部',
        closest(selector) {
            if (selector === '[data-x-thread-expand]') return this;
            if (selector === '.thread-card') return card;
            return null;
        },
        getAttribute: (name) => attributes.get(name) || null,
        setAttribute: (name, value) => attributes.set(name, String(value))
    };

    UIController.handlePreviewAction({ target: button });
    assert.equal(attributes.get('aria-expanded'), 'true');
    assert.equal(bodyClassList.values.has('is-collapsed'), false);
    assert.equal(button.textContent, '收起');

    UIController.handlePreviewAction({ target: button });
    assert.equal(attributes.get('aria-expanded'), 'false');
    assert.equal(bodyClassList.values.has('is-collapsed'), true);
    assert.equal(button.textContent, '... 展开全部');
});

test('copying an X thread post uses the complete source instead of its collapsed preview', async () => {
    const fullPost = '1/1\nSupport for Multiple Platforms and Languages';
    const originalResult = UIController.currentRenderedResult;
    const originalCopyToClipboard = UIController.copyToClipboard;
    const originalShowCopySuccess = UIController.showCopySuccess;
    let copied = '';

    UIController.currentRenderedResult = { data: { threadPosts: [fullPost] } };
    UIController.copyToClipboard = async (text) => {
        copied = text;
        return true;
    };
    UIController.showCopySuccess = () => {};

    try {
        await UIController.copyXPublishingPart({
            textContent: '复制这条',
            getAttribute(name) {
                if (name === 'data-x-copy') return 'thread';
                if (name === 'data-thread-index') return '0';
                return null;
            }
        });

        assert.equal(copied, fullPost);
        assert.doesNotMatch(copied, /\.\.\.$/);
    } finally {
        UIController.currentRenderedResult = originalResult;
        UIController.copyToClipboard = originalCopyToClipboard;
        UIController.showCopySuccess = originalShowCopySuccess;
    }
});
