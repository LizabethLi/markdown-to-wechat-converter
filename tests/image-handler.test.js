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

test('local image detection accepts browser MIME types and common image extensions', () => {
    assert.equal(ImageHandler.isImageFile({ name: 'photo', type: 'image/jpeg' }), true);
    assert.equal(ImageHandler.isImageFile({ name: 'diagram.PNG', type: '' }), true);
    assert.equal(ImageHandler.isImageFile({ name: 'notes.txt', type: '' }), false);
});

test('Obsidian image references are detected with folders, spaces, and display sizes', () => {
    const references = ImageHandler.getObsidianImageReferences([
        '![[Pasted image 20260818133657.png]]',
        '![[attachments/Diagram.webp|600]]',
        '![[notes.pdf]]'
    ].join('\n'));

    assert.deepEqual(
        references.map(reference => reference.fileName),
        ['Pasted image 20260818133657.png', 'Diagram.webp']
    );
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

test('local files are converted to self-contained Markdown images', async () => {
    const OriginalFileReader = global.FileReader;
    global.FileReader = class FakeFileReader {
        readAsDataURL() {
            this.result = 'data:image/png;base64,AAECAwQ=';
            this.onload();
        }
    };

    try {
        const markdown = await ImageHandler.filesToMarkdown([
            { name: 'architecture.png', type: 'image/png', size: 5 }
        ]);
        assert.equal(markdown, '![architecture](data:image/png;base64,AAECAwQ=)');
    } finally {
        global.FileReader = OriginalFileReader;
    }
});

test('selecting a matching local file resolves an Obsidian image reference in place', async () => {
    const OriginalFileReader = global.FileReader;
    global.FileReader = class FakeFileReader {
        readAsDataURL() {
            this.result = 'data:image/png;base64,AAECAwQ=';
            this.onload();
        }
    };

    try {
        const source = [
            '单独看，每件事似乎都听过。',
            '',
            '![[Pasted image 20260818133657.png]]',
            '',
            '做完一波调研之后。'
        ].join('\n');
        const file = {
            name: 'Pasted image 20260818133657.png',
            type: 'image/png',
            size: 5
        };
        const resolved = await ImageHandler.resolveObsidianImageReferences(source, [file]);

        assert.equal(resolved.resolvedCount, 1);
        assert.equal(resolved.unresolvedReferences.length, 0);
        assert.equal(resolved.unusedFiles.length, 0);
        assert.doesNotMatch(resolved.markdown, /!\[\[/);
        assert.match(
            resolved.markdown,
            /!\[Pasted image 20260818133657\]\(data:image\/png;base64,AAECAwQ=\)/
        );
        assert.match(resolved.markdown, /做完一波调研之后/);
    } finally {
        global.FileReader = OriginalFileReader;
    }
});

test('non-matching files leave Obsidian references unresolved', async () => {
    const file = { name: 'another.png', type: 'image/png', size: 5 };
    const resolved = await ImageHandler.resolveObsidianImageReferences(
        '![[expected.png]]',
        [file]
    );

    assert.equal(resolved.markdown, '![[expected.png]]');
    assert.equal(resolved.resolvedCount, 0);
    assert.equal(resolved.unresolvedReferences.length, 1);
    assert.deepEqual(resolved.unusedFiles, [file]);
});
