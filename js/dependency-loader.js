// 按文章内容延迟加载体积较大的渲染依赖，避免它们阻塞应用首屏。
const DependencyLoader = {
    urls: {
        mathjax: 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js',
        mermaid: 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js',
        highlight: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js'
    },

    pending: {},

    waitUntilReady: function(name, timeoutMs = 10000) {
        const startedAt = Date.now();
        return new Promise((resolve, reject) => {
            const check = () => {
                if (this.isReady(name)) {
                    resolve();
                    return;
                }
                if (Date.now() - startedAt >= timeoutMs) {
                    reject(new Error(`渲染依赖加载后不可用：${name}`));
                    return;
                }
                setTimeout(check, 50);
            };
            check();
        });
    },

    isReady: function(name) {
        if (name === 'mathjax') {
            return typeof window !== 'undefined'
                && window.MathJax
                && typeof window.MathJax.tex2svg === 'function';
        }
        if (name === 'mermaid') {
            return typeof window !== 'undefined'
                && window.mermaid
                && typeof window.mermaid.render === 'function';
        }
        if (name === 'highlight') {
            return typeof window !== 'undefined'
                && window.hljs
                && typeof window.hljs.highlight === 'function';
        }
        return false;
    },

    getRequiredDependencies: function(markdown) {
        const source = String(markdown || '');
        const required = [];
        const fencePrefix = '[ \\t]{0,3}(?:```|~~~)';
        const hasMermaid = new RegExp(`^${fencePrefix}mermaid\\b`, 'im').test(source);
        const withoutMermaid = source.replace(
            new RegExp(`^${fencePrefix}mermaid\\b[\\s\\S]*?^${fencePrefix}\\s*$`, 'gim'),
            ''
        );

        if (/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/.test(source)) {
            required.push('mathjax');
        }
        if (hasMermaid) {
            required.push('mermaid');
        }
        if (new RegExp(`^${fencePrefix}(?!mermaid\\b)`, 'im').test(withoutMermaid)) {
            required.push('highlight');
        }

        return required;
    },

    load: function(name) {
        if (this.isReady(name)) {
            return Promise.resolve();
        }
        if (this.pending[name]) {
            return this.pending[name];
        }
        if (typeof document === 'undefined' || !document.head || !this.urls[name]) {
            return Promise.reject(new Error(`无法加载渲染依赖：${name}`));
        }

        this.pending[name] = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = this.urls[name];
            script.async = true;
            script.dataset.renderDependency = name;
            script.onload = async () => {
                try {
                    await this.waitUntilReady(name);
                } catch (error) {
                    delete this.pending[name];
                    reject(error);
                    return;
                }
                if (name === 'highlight' && typeof window.hljs.configure === 'function') {
                    window.hljs.configure({
                        languages: ['javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby', 'go', 'typescript', 'html', 'css', 'sql', 'bash', 'json', 'xml', 'yaml'],
                        ignoreUnescapedHTML: true
                    });
                }
                resolve();
            };
            script.onerror = () => {
                delete this.pending[name];
                reject(new Error(`渲染依赖加载失败，请检查网络后重试：${name}`));
            };
            document.head.appendChild(script);
        });

        return this.pending[name];
    },

    ensureForMarkdown: function(markdown) {
        return Promise.all(this.getRequiredDependencies(markdown).map((name) => this.load(name)));
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DependencyLoader;
}

if (typeof window !== 'undefined') {
    window.DependencyLoader = DependencyLoader;
}
