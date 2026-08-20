const test = require('node:test');
const assert = require('node:assert/strict');

const ImageHandler = require('../js/image-handler.js');

test('clipboard image discovery ignores non-image files', () => {
    const imageFile = { name: 'figure.png', type: 'image/png', size: 10 };
    const textFile = { name: 'notes.txt', type: 'text/plain', size: 10 };
    const clipboardData = {
        items: [
            { kind: 'file', type: 'image/png', getAsFile: () => imageFile },
            { kind: 'file', type: 'text/plain', getAsFile: () => textFile }
        ]
    };

    assert.deepEqual(ImageHandler.getClipboardImageFiles(clipboardData), [imageFile]);
});

test('image Markdown is inserted at the current selection with readable spacing', () => {
    const textarea = {
        value: 'beforeafter',
        selectionStart: 6,
        selectionEnd: 6,
        setSelectionRange(start, end) {
            this.selectionStart = start;
            this.selectionEnd = end;
        },
        focus() {}
    };

    assert.equal(ImageHandler.insertMarkdownAtSelection(textarea, '![figure](data:image/png;base64,AA==)'), true);
    assert.equal(textarea.value, 'before\n\n![figure](data:image/png;base64,AA==)\n\nafter');
    assert.equal(textarea.selectionStart, textarea.selectionEnd);
});

test('relative image paths resolve against the current document URL', () => {
    assert.equal(
        ImageHandler.resolveImageUrl('./images/figure.png', 'https://example.com/articles/post/'),
        'https://example.com/articles/post/images/figure.png'
    );
    assert.equal(
        ImageHandler.resolveImageUrl('data:image/png;base64,AA==', 'https://example.com/'),
        'data:image/png;base64,AA=='
    );
});

test('pasted image size guard reports an actionable error before reading the file', async () => {
    const oversized = {
        name: 'huge.png',
        type: 'image/png',
        size: ImageHandler.maxPastedImageBytes + 1
    };

    await assert.rejects(ImageHandler.filesToMarkdown([oversized]), /不能超过 10 MB/);
});
