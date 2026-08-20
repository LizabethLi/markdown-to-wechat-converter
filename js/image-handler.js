// 图片输入与富文本剪贴板辅助模块
const ImageHandler = {
    maxPastedImageBytes: 10 * 1024 * 1024,
    maxEmbeddedImageBytes: 12 * 1024 * 1024,
    fetchTimeoutMs: 8000,
    imageDataUrlCache: new Map(),

    isImageFile: function(file) {
        if (!file) return false;
        if (/^image\//i.test(file.type || '')) return true;
        return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(file.name || '');
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

        const oversized = imageFiles.find(file => file.size > this.maxPastedImageBytes);
        if (oversized) {
            const sizeInMb = (oversized.size / 1024 / 1024).toFixed(1);
            throw new Error(`图片 ${oversized.name || ''} 为 ${sizeInMb} MB，单张图片不能超过 10 MB`);
        }

        const markdownImages = await Promise.all(imageFiles.map(async (file, index) => {
            const dataUrl = await this.blobToDataUrl(file);
            const alt = this.sanitizeAltText(file.name, index);
            return `![${alt}](${dataUrl})`;
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
