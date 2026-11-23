// Browser UI for importing rich-text styles into local-only custom templates.
const CustomTemplateUI = {
    candidates: [],
    mapping: {},
    initialized: false,

    init() {
        if (this.initialized || typeof CustomTemplateManager === 'undefined') return;
        this.initialized = true;
        if (typeof TemplateManager !== 'undefined') {
            CustomTemplateManager.registerStoredTemplates(TemplateManager);
        }
        const button = document.getElementById('customTemplateButton');
        const closeButton = document.getElementById('customTemplateClose');
        const analyzeButton = document.getElementById('customTemplateAnalyze');
        const saveButton = document.getElementById('customTemplateSave');
        const cancelButton = document.getElementById('customTemplateCancel');
        const exportButton = document.getElementById('customTemplateExport');
        const importInput = document.getElementById('customTemplateImport');
        const pasteSurface = document.getElementById('customTemplatePaste');
        if (button) button.addEventListener('click', () => this.open());
        if (closeButton) closeButton.addEventListener('click', () => this.close());
        if (analyzeButton) analyzeButton.addEventListener('click', () => this.analyze());
        if (saveButton) saveButton.addEventListener('click', () => this.save());
        if (cancelButton) cancelButton.addEventListener('click', () => this.close());
        if (exportButton) exportButton.addEventListener('click', () => this.exportJson(true));
        if (pasteSurface) pasteSurface.addEventListener('paste', event => this.handlePaste(event));
        if (importInput) importInput.addEventListener('change', async event => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            try {
                this.importJson(await file.text());
                const status = document.getElementById('customTemplateStatus');
                if (status) status.textContent = '模板导入完成。';
            } catch (error) {
                const status = document.getElementById('customTemplateStatus');
                if (status) {
                    status.textContent = error && error.message ? error.message : '模板导入失败';
                    status.classList.add('warning');
                }
            } finally {
                event.target.value = '';
            }
        });
        document.querySelectorAll('[data-custom-template-role]').forEach(select => {
            select.addEventListener('change', () => {
                this.mapping[select.dataset.customTemplateRole] = select.value;
                this.renderPreview();
            });
        });
    },

    open() {
        const modal = document.getElementById('customTemplateModal');
        const result = document.getElementById('customTemplateResult');
        const paste = document.getElementById('customTemplatePaste');
        const status = document.getElementById('customTemplateStatus');
        if (!modal) return;
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        if (result) result.hidden = true;
        if (status) status.textContent = '复制一段喜欢的公众号排版，粘贴到下方。';
        this.candidates = [];
        this.mapping = {};
        this.renderLibrary();
        if (paste) {
            paste.innerHTML = '';
            paste.focus();
        }
    },

    close() {
        const modal = document.getElementById('customTemplateModal');
        if (!modal) return;
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        const paste = document.getElementById('customTemplatePaste');
        if (paste) paste.replaceChildren();
    },

    insertFragmentAtCursor(target, fragment) {
        const selection = window.getSelection();
        let range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
        if (!range || !target.contains(range.commonAncestorContainer)) {
            range = document.createRange();
            range.selectNodeContents(target);
            range.collapse(false);
        }
        range.deleteContents();
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);
        if (lastNode && selection) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    },

    handlePaste(event) {
        const target = event && event.currentTarget;
        const clipboard = event && event.clipboardData;
        if (!target || !clipboard) return;
        const html = clipboard.getData('text/html');
        const plain = clipboard.getData('text/plain');
        if (!html && !plain) return;
        event.preventDefault();
        if (html) {
            const template = document.createElement('template');
            template.innerHTML = html;
            this.insertFragmentAtCursor(target, this.sanitizeReference(template.content));
        } else {
            const fragment = document.createDocumentFragment();
            fragment.appendChild(document.createTextNode(plain));
            this.insertFragmentAtCursor(target, fragment);
        }
    },

    sanitizeInlineStyle(element) {
        if (!element || !element.style) return;
        const declarations = {};
        for (let index = 0; index < element.style.length; index += 1) {
            const cssName = element.style[index];
            const property = cssName.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
            declarations[property] = element.style.getPropertyValue(cssName);
        }
        const safe = CustomTemplateManager.sanitizeStyle(declarations);
        element.removeAttribute('style');
        Object.entries(safe).forEach(([property, value]) => {
            try { element.style[property] = value; } catch (_) {}
        });
    },

    sanitizeReference(source) {
        const clone = source.cloneNode(true);
        clone.querySelectorAll('script,style,iframe,object,embed,form,input,button,meta,link,template,svg,img,picture,video,audio,source,track').forEach(node => node.remove());
        clone.querySelectorAll('*').forEach(element => {
            Array.from(element.attributes || []).forEach(attribute => {
                const name = attribute.name.toLowerCase();
                const value = String(attribute.value || '').trim();
                if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction') {
                    element.removeAttribute(attribute.name);
                    return;
                }
                if ((name === 'href' || name === 'src' || name === 'poster') && /^(?:javascript|vbscript|file|data):/i.test(value)) {
                    element.removeAttribute(attribute.name);
                }
            });
            this.sanitizeInlineStyle(element);
        });
        return clone;
    },

    extractCandidates(source) {
        const safe = this.sanitizeReference(source);
        const sandbox = document.createElement('div');
        sandbox.className = 'custom-template-sandbox';
        sandbox.setAttribute('aria-hidden', 'true');
        while (safe.firstChild) sandbox.appendChild(safe.firstChild);
        document.body.appendChild(sandbox);
        try {
            const properties = [
                'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
                'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration', 'textIndent',
                'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
                'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
                'borderColor', 'borderStyle', 'borderWidth', 'borderRadius', 'boxShadow',
                'whiteSpace', 'wordBreak', 'overflowWrap'
            ];
            const snapshots = [];
            sandbox.querySelectorAll('h1,h2,h3,p,blockquote,li,section,div,span').forEach(element => {
                const sample = String(element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
                if (sample.length < 2) return;
                const tag = element.tagName.toLowerCase();
                const nestedBlocks = element.querySelectorAll('h1,h2,h3,p,blockquote,li,section,div').length;
                if (['section', 'div', 'span'].includes(tag) && nestedBlocks > 0) return;
                const computed = getComputedStyle(element);
                if (computed.display === 'none' || computed.visibility === 'hidden') return;
                if (tag === 'span' && !['block', 'inline-block'].includes(computed.display)) return;
                const style = {};
                const hasVisibleBorder = ['Top', 'Right', 'Bottom', 'Left']
                    .some(side => parseFloat(computed[`border${side}Width`]) > 0);
                properties.forEach(property => {
                    const value = computed[property];
                    if (property.startsWith('border') && property !== 'borderRadius' && !hasVisibleBorder) return;
                    if (value && value !== 'normal' && value !== 'none' && value !== 'auto'
                        && value !== 'rgba(0, 0, 0, 0)' && value !== '0px') {
                        style[property] = value;
                    }
                });
                snapshots.push({ sample, textLength: sample.length, style });
            });
            return CustomTemplateManager.buildCandidatesFromSnapshots(snapshots, 10);
        } finally {
            sandbox.remove();
        }
    },

    async analyze() {
        const paste = document.getElementById('customTemplatePaste');
        const status = document.getElementById('customTemplateStatus');
        const analyzeButton = document.getElementById('customTemplateAnalyze');
        if (!paste || !status) return;
        if (!String(paste.innerText || paste.textContent || '').trim()) {
            status.textContent = '请先粘贴一段带排版的内容。';
            status.classList.add('warning');
            return;
        }
        status.classList.remove('warning');
        status.textContent = '正在提取排版样式…';
        if (analyzeButton) analyzeButton.disabled = true;
        try {
            this.candidates = this.extractCandidates(paste);
            if (!this.candidates.length) throw new Error('没有识别到可用的文字样式');
            status.textContent = '正在尝试调用 Chrome 本地 AI…';
            const languageModel = typeof LanguageModel !== 'undefined' ? LanguageModel : null;
            const result = await CustomTemplateManager.classifyCandidates(
                this.candidates,
                languageModel,
                progress => { status.textContent = `正在下载 Chrome 本地模型… ${Math.round(progress * 100)}%`; }
            );
            this.mapping = result.mapping;
            if (result.mode === 'ai') {
                status.textContent = '已由 Chrome 本地 AI 自动识别。你可以直接保存，也可以调整下方结果。';
            } else if (result.reason === 'error') {
                status.textContent = 'Chrome 本地 AI 本次未能完成识别，已切换到手动调整。';
            } else if (result.reason === 'low-confidence') {
                status.textContent = 'Chrome 本地 AI 的判断不确定，已切换到手动调整。';
            } else {
                status.textContent = '当前浏览器不支持本地 AI，已生成基础结果，你可以手动调整。';
            }
            this.renderMappingControls();
            this.renderPreview();
            const resultPanel = document.getElementById('customTemplateResult');
            if (resultPanel) resultPanel.hidden = false;
        } catch (error) {
            status.textContent = error && error.message ? error.message : '模板识别失败，请换一段内容重试。';
            status.classList.add('warning');
        } finally {
            if (analyzeButton) analyzeButton.disabled = false;
        }
    },

    renderMappingControls() {
        document.querySelectorAll('[data-custom-template-role]').forEach(select => {
            const role = select.dataset.customTemplateRole;
            select.innerHTML = '';
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = '不设置';
            select.appendChild(empty);
            this.candidates.forEach(candidate => {
                const option = document.createElement('option');
                option.value = candidate.id;
                option.textContent = `${candidate.sample || '未命名样式'} · ${candidate.style.fontSize || '默认字号'}`;
                select.appendChild(option);
            });
            select.value = this.mapping[role] || '';
        });
    },

    selectedStyle(role) {
        const id = this.mapping[role];
        const candidate = this.candidates.find(item => item.id === id);
        return candidate ? candidate.style : {};
    },

    applyStyle(element, style) {
        if (!element) return;
        element.removeAttribute('style');
        Object.entries(CustomTemplateManager.sanitizeStyle(style)).forEach(([property, value]) => {
            try { element.style[property] = value; } catch (_) {}
        });
    },

    renderPreview() {
        const preview = document.getElementById('customTemplatePreview');
        if (!preview) return;
        this.applyStyle(preview.querySelector('[data-preview-role="h1"]'), this.selectedStyle('h1'));
        this.applyStyle(preview.querySelector('[data-preview-role="h2"]'), this.selectedStyle('h2'));
        this.applyStyle(preview.querySelector('[data-preview-role="h3"]'), this.selectedStyle('h3'));
        this.applyStyle(preview.querySelector('[data-preview-role="paragraph"]'), this.selectedStyle('paragraph'));
        this.applyStyle(preview.querySelector('[data-preview-role="blockquote"]'), this.selectedStyle('blockquote'));
    },

    renderLibrary() {
        const container = document.getElementById('customTemplateLibrary');
        if (!container) return;
        container.replaceChildren();
        const definitions = CustomTemplateManager.loadDefinitions();
        if (!definitions.length) {
            const empty = document.createElement('p');
            empty.className = 'custom-template-library-empty';
            empty.textContent = '还没有保存个人模板。';
            container.appendChild(empty);
            return;
        }
        definitions.forEach(definition => {
            const row = document.createElement('div');
            row.className = 'custom-template-library-row';
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 40;
            input.value = definition.name;
            input.setAttribute('aria-label', `重命名 ${definition.name}`);
            const renameButton = document.createElement('button');
            renameButton.type = 'button';
            renameButton.className = 'btn';
            renameButton.textContent = '重命名';
            renameButton.addEventListener('click', () => this.rename(definition.id, input.value));
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'btn custom-template-delete';
            deleteButton.textContent = '删除';
            deleteButton.addEventListener('click', () => this.remove(definition.id));
            row.append(input, renameButton, deleteButton);
            container.appendChild(row);
        });
    },

    refreshTemplateOptions(selectedId) {
        if (typeof UIController !== 'undefined') UIController.populateTemplateOptions();
        const templateSelect = document.getElementById('templateSelect');
        if (selectedId && templateSelect) templateSelect.value = selectedId;
    },

    rename(id, name) {
        const definition = CustomTemplateManager.loadDefinitions().find(item => item.id === id);
        if (!definition) return null;
        definition.name = String(name || '').trim() || '我的模板';
        const saved = CustomTemplateManager.saveDefinition(definition);
        CustomTemplateManager.registerDefinition(saved, TemplateManager);
        this.refreshTemplateOptions(TemplateManager.activeId);
        this.renderLibrary();
        return saved;
    },

    remove(id) {
        const removed = CustomTemplateManager.deleteDefinition(id);
        if (!removed) return false;
        if (TemplateManager.registry) delete TemplateManager.registry[id];
        if (TemplateManager.activeId === id) TemplateManager.setActive('wechat-default');
        this.refreshTemplateOptions(TemplateManager.activeId);
        this.renderLibrary();
        return true;
    },

    exportJson(download = true) {
        const json = CustomTemplateManager.exportDefinitions(CustomTemplateManager.loadDefinitions());
        if (download) {
            const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'wechat-custom-templates.json';
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 0);
        }
        return json;
    },

    importJson(json) {
        const imported = CustomTemplateManager.importDefinitions(json);
        imported.forEach(definition => CustomTemplateManager.registerDefinition(definition, TemplateManager));
        this.refreshTemplateOptions(TemplateManager.activeId);
        this.renderLibrary();
        return imported;
    },

    save() {
        const nameInput = document.getElementById('customTemplateName');
        const status = document.getElementById('customTemplateStatus');
        if (!this.candidates.length) return;
        try {
            const definition = CustomTemplateManager.buildDefinition(
                nameInput ? nameInput.value : '我的模板',
                this.candidates,
                this.mapping
            );
            const baseTemplate = TemplateManager && typeof TemplateManager.get === 'function'
                ? TemplateManager.get('wechat-default')
                : null;
            const compiled = CustomTemplateManager.compileDefinition(definition, baseTemplate);
            CustomTemplateManager.saveDefinition(definition);
            TemplateManager.register(compiled);
            if (typeof UIController !== 'undefined') {
                UIController.populateTemplateOptions();
                const templateSelect = document.getElementById('templateSelect');
                if (templateSelect) templateSelect.value = definition.id;
                UIController.handleTemplateChange(definition.id);
            }
            if (status) status.textContent = '模板已保存在当前浏览器。';
            this.close();
            return definition;
        } catch (error) {
            if (status) {
                status.textContent = error && error.message ? error.message : '模板保存失败';
                status.classList.add('warning');
            }
            return null;
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CustomTemplateUI.init());
} else {
    CustomTemplateUI.init();
}

if (typeof window !== 'undefined') window.CustomTemplateUI = CustomTemplateUI;
