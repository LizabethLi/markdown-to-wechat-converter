// 数学公式渲染模块
const MathRenderer = {
    // 创建行内数学公式渲染器
    createInlineRenderer: function() {
        return (mathContent) => {
            try {
                if (typeof MathJax === 'undefined' || !MathJax.tex2svg) {
                    return `<span style="color: red;">MathJax not ready</span>`;
                }
                
                MathJax.texReset();
                const mjxContainer = MathJax.tex2svg(mathContent, { display: false });
                const svg = mjxContainer.firstChild;
                
                if (!svg) {
                    throw new Error('No SVG generated');
                }
                
                // 优化 SVG 样式以适配微信公众号
                this.optimizeSvgForWechat(svg);
                
                return svg.outerHTML;
            } catch (error) {
                console.error('Error rendering inline math:', error);
                return `<span style="color: red;">Math Error</span>`;
            }
        };
    },

    // 创建块级数学公式渲染器
    createDisplayRenderer: function() {
        return (mathContent) => {
            try {
                if (typeof MathJax === 'undefined' || !MathJax.tex2svg) {
                    return `<section style="text-align: center; color: red;">MathJax not ready</section>`;
                }
                
                MathJax.texReset();
                const mjxContainer = MathJax.tex2svg(mathContent, { display: true });
                const svg = mjxContainer.firstChild;
                
                if (!svg) {
                    throw new Error('No SVG generated');
                }
                
                // 优化 SVG 样式以适配微信公众号
                this.optimizeSvgForWechat(svg);
                
                return `<section style="text-align: center; margin: 15px 0; overflow-x: auto; overflow-y: hidden;">${svg.outerHTML}</section>`;
            } catch (error) {
                console.error('Error rendering display math:', error);
                return `<section style="text-align: center; color: red;">Math Error: ${mathContent}</section>`;
            }
        };
    },

    // 优化SVG以适配微信公众号
    optimizeSvgForWechat: function(svg) {
        if (!svg) return;
        
        // 保存原始宽度
        const width = svg.style.minWidth || svg.getAttribute('width');
        
        // 移除固定尺寸属性
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        
        // 设置响应式样式
        svg.style.cssText = `max-width: 100% !important; vertical-align: middle;`;
        
        if (width) {
            svg.style.width = width;
        }
        
        svg.style.display = 'inline-block';
    },

    // 保护数学公式，用占位符替换
    protectMathExpressions: function(markdown) {
        const mathPlaceholders = {};
        let blockMathCounter = 0;
        let inlineMathCounter = 0;
        
        // 保护块级公式 $$...$$
        markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
            const placeholder = `MATHBLOCK${blockMathCounter++}PLACEHOLDER`;
            mathPlaceholders[placeholder] = latex.trim();
            return placeholder;
        });

        // 保护行内公式 $...$
        markdown = markdown.replace(/\$([^$]+?)\$/g, (match, latex) => {
            const placeholder = `MATHINLINE${inlineMathCounter++}PLACEHOLDER`;
            mathPlaceholders[placeholder] = latex.trim();
            return placeholder;
        });
        
        return { markdown, mathPlaceholders };
    },

    // 恢复数学公式，将占位符替换为渲染结果
    restoreMathExpressions: function(html, mathPlaceholders) {
        const displayRenderer = this.createDisplayRenderer();
        const inlineRenderer = this.createInlineRenderer();
        
        // 恢复块级公式
        html = html.replace(/MATHBLOCK(\d+)PLACEHOLDER/g, (match, num) => {
            const latex = mathPlaceholders[match];
            if (!latex) {
                return `<p style="color:red;">No latex found for ${match}</p>`;
            }
            return displayRenderer(latex);
        });

        // 恢复行内公式
        html = html.replace(/MATHINLINE(\d+)PLACEHOLDER/g, (match, num) => {
            const latex = mathPlaceholders[match];
            if (!latex) {
                return `<span style="color:red;">No latex found for ${match}</span>`;
            }
            return inlineRenderer(latex);
        });
        
        return html;
    },

    // 检查MathJax是否准备就绪
    isMathJaxReady: function() {
        return typeof MathJax !== 'undefined' && 
               MathJax.tex2svg && 
               typeof MathJax.tex2svg === 'function';
    },

    // 等待MathJax加载完成
    waitForMathJax: function(callback, retryCount = 0, maxRetries = 50) {
        if (this.isMathJaxReady()) {
            console.log('MathJax is ready');
            callback();
            return;
        }
        
        if (retryCount >= maxRetries) {
            console.error('MathJax failed to load after maximum retries');
            callback();
            return;
        }
        
        setTimeout(() => {
            this.waitForMathJax(callback, retryCount + 1, maxRetries);
        }, AppConfig.defaults.mathJaxRetryDelay);
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MathRenderer;
}

// 浏览器环境下赋值给全局变量
if (typeof window !== 'undefined') {
    window.MathRenderer = MathRenderer;
} 