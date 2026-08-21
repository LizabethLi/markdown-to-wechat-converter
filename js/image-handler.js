// 图片输入与富文本剪贴板辅助模块
const ImageHandler = {
    maxPastedImageBytes: 10 * 1024 * 1024,
    maxEmbeddedImageBytes: 12 * 1024 * 1024,
    fetchTimeoutMs: 8000,
    imageDataUrlCache: new Map(),
    localImageAssets: new Map(),
    localImageAssetCounter: 0,

    isImageFile: function(file) {
        if (!file) return false;
        if (/^image\//i.test(file.type || '')) return true;
        return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(file.name || '');
    },

    normalizeFileName: function(fileName) {
        let normalized = String(fileName || '').trim();
        try {
            normalized = decodeURIComponent(normalized);
        } catch (_) {}
        return normalized.normalize('NFC').toLowerCase();
    },

    getObsidianAssetKey: function(fileName) {
        return `obsidian:${this.normalizeFileName(fileName)}`;
    },

    createLocalImageAsset: function(dataUrl, fileName) {
        this.localImageAssetCounter += 1;
        const id = `asset-${Date.now().toString(36)}-${this.localImageAssetCounter}`;
        this.localImageAssets.set(`local:${id}`, {
            dataUrl: String(dataUrl || ''),
            fileName: String(fileName || '')
        });
        return id;
    },

    getLocalImageReferences: function(markdown) {
        const references = [];
        const pattern = /!\[([^\]\n]*)\]\(local-image:\/\/([a-z0-9-]+)\)/gi;
        let match;

        while ((match = pattern.exec(String(markdown || ''))) !== null) {
            references.push({
                raw: match[0],
                alt: match[1],
                id: match[2],
                assetKey: `local:${match[2]}`,
                start: match.index,
                end: match.index + match[0].length
            });
        }
        return references;
    },

    getObsidianImageReferences: function(markdown) {
        const source = String(markdown || '');
        const references = [];
        const pattern = /!\[\[([^\]\n]+)\]\]/g;
        let match;

        while ((match = pattern.exec(source)) !== null) {
            const target = String(match[1] || '').split('|')[0].trim();
            const normalizedPath = target.replace(/\\/g, '/');
            const fileName = normalizedPath.split('/').pop() || '';
            if (!/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(fileName)) continue;
            references.push({
                raw: match[0],
                target,
                fileName,
                normalizedFileName: this.normalizeFileName(fileName),
                start: match.index,
                end: match.index + match[0].length
            });
        }

        return references;
    },

    validateImageFileSizes: function(files) {
        const oversized = Array.from(files || [])
            .find(file => file && file.size > this.maxPastedImageBytes);
        if (!oversized) return;

        const sizeInMb = (oversized.size / 1024 / 1024).toFixed(1);
        throw new Error(`图片 ${oversized.name || ''} 为 ${sizeInMb} MB，单张图片不能超过 10 MB`);
    },

    getLocalImageReferenceStatus: function(markdown) {
        const obsidianReferences = this.getObsidianImageReferences(markdown).map(reference => ({
            ...reference,
            assetKey: this.getObsidianAssetKey(reference.fileName)
        }));
        const localReferences = this.getLocalImageReferences(markdown);
        const references = obsidianReferences.concat(localReferences);
        const unresolvedReferences = references.filter(
            reference => !this.localImageAssets.has(reference.assetKey)
        );

        return {
            references,
            unresolvedReferences,
            total: references.length,
            loaded: references.length - unresolvedReferences.length
        };
    },

    hydrateLocalImageReferences: function(markdown) {
        let output = String(markdown || '');
        const references = this.getObsidianImageReferences(output)
            .map(reference => ({
                ...reference,
                assetKey: this.getObsidianAssetKey(reference.fileName),
                alt: this.sanitizeAltText(reference.fileName)
            }))
            .concat(this.getLocalImageReferences(output));

        for (const reference of references.sort((a, b) => b.start - a.start)) {
            const asset = this.localImageAssets.get(reference.assetKey);
            if (!asset || !asset.dataUrl) continue;
            const alt = reference.alt || this.sanitizeAltText(asset.fileName);
            const replacement = `![${alt}](${asset.dataUrl})`;
            output = `${output.slice(0, reference.start)}${replacement}${output.slice(reference.end)}`;
        }
        return output;
    },

    compactEmbeddedImages: function(markdown) {
        let compactedCount = 0;
        const output = String(markdown || '').replace(
            /!\[([^\]\n]*)\]\((data:image\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*;base64,[a-z0-9+\/_=-]+)\)/gi,
            (_match, alt, dataUrl) => {
                const fileName = String(alt || '').trim() || `image-${compactedCount + 1}`;
                const id = this.createLocalImageAsset(dataUrl, fileName);
                compactedCount += 1;
                return `![${alt || fileName}](local-image://${id})`;
            }
        );
        return { markdown: output, compactedCount };
    },

    resolveObsidianImageReferences: async function(markdown, files) {
        const source = String(markdown || '');
        const references = this.getObsidianImageReferences(source);
        const imageFiles = Array.from(files || []).filter(file => this.isImageFile(file));
        this.validateImageFileSizes(imageFiles);

        if (!references.length || !imageFiles.length) {
            return {
                markdown: source,
                resolvedCount: 0,
                unresolvedReferences: references,
                unusedFiles: imageFiles
            };
        }

        const filesByName = new Map();
        imageFiles.forEach((file) => {
            const key = this.normalizeFileName(file.name);
            if (!filesByName.has(key)) filesByName.set(key, file);
        });

        const dataUrlPromises = new Map();
        const usedFiles = new Set();
        let resolvedCount = 0;

        for (const reference of references) {
            const file = filesByName.get(reference.normalizedFileName);
            if (!file) continue;

            if (!dataUrlPromises.has(file)) {
                dataUrlPromises.set(file, this.blobToDataUrl(file));
            }
            const dataUrl = await dataUrlPromises.get(file);
            this.localImageAssets.set(this.getObsidianAssetKey(reference.fileName), {
                dataUrl,
                fileName: reference.fileName
            });
            usedFiles.add(file);
            resolvedCount += 1;
        }

        return {
            markdown: source,
            resolvedCount,
            unresolvedReferences: this.getLocalImageReferenceStatus(source).unresolvedReferences,
            unusedFiles: imageFiles.filter(file => !usedFiles.has(file))
        };
    },

    getClipboardImageFiles: function(clipboardData) {
        if (!clipboardData) return [];

        const files = [];
        const items = Array.from(clipboardData.items || []);
        items.forEach((item) => {
            if (item.kind !== 'file') return;
            const file = item.getAsFile && item.getAsFile();
            if (this.isImageFile(file)) files.push(file);
        });

        if (files.length > 0) return files;
        return Array.from(clipboardData.files || [])
            .filter(file => this.isImageFile(file));
    },

    getClipboardEmbeddedImageMarkdown: function(clipboardData) {
        if (!clipboardData || typeof clipboardData.getData !== 'function') return null;

        const readClipboardData = (type) => {
            try {
                return String(clipboardData.getData(type) || '');
            } catch (_) {
                return '';
            }
        };
        const dataUrlPattern = /data:image\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*;base64,[a-z0-9+\/_=-]+/gi;
        const plainText = readClipboardData('text/plain');

        if (plainText) {
            const compacted = this.compactEmbeddedImages(plainText);
            let count = compacted.compactedCount;
            const markdown = compacted.markdown.replace(dataUrlPattern, (dataUrl) => {
                count += 1;
                const alt = `粘贴图片-${count}`;
                const id = this.createLocalImageAsset(dataUrl, alt);
                return `![${alt}](local-image://${id})`;
            });
            if (count > 0) return { markdown, count };
        }

        const html = readClipboardData('text/html');
        if (!html) return null;

        const imageTags = html.match(/<img\b[^>]*>/gi) || [];
        if (!imageTags.length) return null;
        const nonImageText = html
            .replace(/<img\b[^>]*>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;|&#160;/gi, ' ')
            .trim();
        if (plainText.trim() && nonImageText) return null;

        const markdownImages = [];
        imageTags.forEach((tag, index) => {
            const sourceMatch = tag.match(
                /\bsrc\s*=\s*(?:"(data:image\/[^"\s>]+)"|'(data:image\/[^'\s>]+)'|(data:image\/[^\s>]+))/i
            );
            const dataUrl = sourceMatch && (sourceMatch[1] || sourceMatch[2] || sourceMatch[3]);
            if (!dataUrl || !dataUrlPattern.test(dataUrl)) {
                dataUrlPattern.lastIndex = 0;
                return;
            }
            dataUrlPattern.lastIndex = 0;

            const altMatch = tag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const alt = this.sanitizeAltText(
                (altMatch && (altMatch[1] || altMatch[2])) || `粘贴图片-${index + 1}`,
                index
            );
            const id = this.createLocalImageAsset(dataUrl, alt);
            markdownImages.push(`![${alt}](local-image://${id})`);
        });

        return markdownImages.length
            ? { markdown: markdownImages.join('\n\n'), count: markdownImages.length }
            : null;
    },

    sanitizeAltText: function(fileName, index = 0) {
        const withoutExtension = String(fileName || '')
            .replace(/\.[a-z0-9]+$/i, '')
            .replace(/[\[\]\\]/g, '')
            .trim();
        return withoutExtension && withoutExtension.toLowerCase() !== 'image'
            ? withoutExtension
            : `粘贴图片-${index + 1}`;
    },

    blobToDataUrl: function(blob) {
        return new Promise((resolve, reject) => {
            if (typeof FileReader === 'undefined') {
                reject(new Error('当前浏览器不支持读取本地图片'));
                return;
            }

            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
            reader.readAsDataURL(blob);
        });
    },

    filesToMarkdown: async function(files) {
        const imageFiles = Array.from(files || [])
            .filter(file => this.isImageFile(file));

        if (!imageFiles.length) return '';

        this.validateImageFileSizes(imageFiles);

        const markdownImages = await Promise.all(imageFiles.map(async (file, index) => {
            const dataUrl = await this.blobToDataUrl(file);
            const alt = this.sanitizeAltText(file.name, index);
            const id = this.createLocalImageAsset(dataUrl, file.name);
            return `![${alt}](local-image://${id})`;
        }));

        return markdownImages.join('\n\n');
    },

    insertMarkdownAtSelection: function(textarea, markdown) {
        if (!textarea || !markdown) return false;

        const value = textarea.value || '';
        const start = Number.isInteger(textarea.selectionStart) ? textarea.selectionStart : value.length;
        const end = Number.isInteger(textarea.selectionEnd) ? textarea.selectionEnd : start;
        const before = value.slice(0, start);
        const after = value.slice(end);
        const prefix = before && !before.endsWith('\n') ? '\n\n' : '';
        const suffix = after && !after.startsWith('\n') ? '\n\n' : '';
        const insertion = `${prefix}${markdown}${suffix}`;

        textarea.value = `${before}${insertion}${after}`;
        const cursor = before.length + insertion.length;
        if (typeof textarea.setSelectionRange === 'function') {
            textarea.setSelectionRange(cursor, cursor);
        }
        if (typeof textarea.focus === 'function') textarea.focus();
        return true;
    },

    resolveImageUrl: function(src, baseUrl) {
        const value = String(src || '').trim();
        if (!value || /^(?:data|blob):/i.test(value)) return value;

        try {
            return new URL(value, baseUrl || (typeof document !== 'undefined' ? document.baseURI : undefined)).href;
        } catch (_) {
            return value;
        }
    },

    fetchImageAsDataUrl: function(src, baseUrl) {
        const resolved = this.resolveImageUrl(src, baseUrl);
        if (!resolved) return Promise.reject(new Error('图片地址为空'));
        if (/^data:image\//i.test(resolved)) return Promise.resolve(resolved);

        if (this.imageDataUrlCache.has(resolved)) {
            return this.imageDataUrlCache.get(resolved);
        }

        const request = (async () => {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeout = controller
                ? setTimeout(() => controller.abort(), this.fetchTimeoutMs)
                : null;

            try {
                const response = await fetch(resolved, {
                    mode: 'cors',
                    credentials: 'same-origin',
                    cache: 'force-cache',
                    signal: controller ? controller.signal : undefined
                });
                if (!response.ok) {
                    throw new Error(`图片请求失败（HTTP ${response.status}）`);
                }

                const blob = await response.blob();
                if (!/^image\//i.test(blob.type || '')) {
                    throw new Error('图片地址返回的不是图片');
                }
                if (blob.size > this.maxEmbeddedImageBytes) {
                    const sizeInMb = (blob.size / 1024 / 1024).toFixed(1);
                    throw new Error(`图片为 ${sizeInMb} MB，超过 12 MB 内嵌上限`);
                }
                return this.blobToDataUrl(blob);
            } finally {
                if (timeout) clearTimeout(timeout);
            }
        })();

        this.imageDataUrlCache.set(resolved, request);
        request.catch(() => {
            if (this.imageDataUrlCache.get(resolved) === request) {
                this.imageDataUrlCache.delete(resolved);
            }
        });

        if (this.imageDataUrlCache.size > 40) {
            const oldestKey = this.imageDataUrlCache.keys().next().value;
            this.imageDataUrlCache.delete(oldestKey);
        }
        return request;
    },

    embedImagesInElement: async function(element, options = {}) {
        const emptyReport = { total: 0, embedded: 0, alreadyEmbedded: 0, external: 0, failures: [] };
        if (!element || typeof element.querySelectorAll !== 'function') return emptyReport;

        const images = Array.from(element.querySelectorAll('img'));
        const report = { ...emptyReport, total: images.length };
        const baseUrl = options.baseUrl || (typeof document !== 'undefined' ? document.baseURI : '');

        await Promise.all(images.map(async (image) => {
            const originalSrc = image.getAttribute('src') || '';
            if (!originalSrc) {
                report.external += 1;
                report.failures.push({ src: '', reason: '图片地址为空' });
                return;
            }

            if (/^data:image\//i.test(originalSrc)) {
                report.alreadyEmbedded += 1;
                image.removeAttribute('srcset');
                return;
            }

            const resolvedSrc = this.resolveImageUrl(originalSrc, baseUrl);
            if (resolvedSrc) image.setAttribute('src', resolvedSrc);
            image.removeAttribute('srcset');
            image.removeAttribute('loading');

            try {
                const dataUrl = await this.fetchImageAsDataUrl(resolvedSrc, baseUrl);
                image.setAttribute('src', dataUrl);
                report.embedded += 1;
            } catch (error) {
                report.external += 1;
                report.failures.push({
                    src: resolvedSrc || originalSrc,
                    reason: error && error.message ? error.message : String(error || '图片读取失败')
                });
            }
        }));

        return report;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageHandler;
}
if (typeof window !== 'undefined') {
    window.ImageHandler = ImageHandler;
}
