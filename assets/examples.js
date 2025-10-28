// 示例数据模块
const ExampleData = {
    // 获取示例Markdown内容
    getExampleMarkdown: function() {
        return [
            "# Markdown to WeChat Converter 产品速览",
            "",
            "[lead] 一站式把 Markdown 文稿秒变成微信公众号友好的排版样式，内置语法高亮、公式渲染、主题色与可插拔模板，让创作者专注内容、复制即用。",
            "",
            "## 为什么选择我们",
            "",
            "- **不改写内容，只升级排版**：Markdown 所见即所得，复制到公众号后台仍保持样式。",
            "- **主题色&模板一键切换**：根据品牌配色或场景选择想要的风格。",
            "- **语法、公式、表格全覆盖**：自动处理代码高亮、MathJax 公式和复杂表格。",
            "- **多渠道输出**：除微信外，还支持 GitHub Markdown、Substack HTML 等扩展场景。",
            "",
            "## 核心能力图谱",
            "",
            "```mermaid",
            "graph TD",
            "    A[Markdown 输入] --> B[Channel 选择]",
            "    B -->|WeChat| C[TemplateManager 选择模板]",
            "    B -->|GitHub| I[ChannelConverter 合并输出]",
            "    C --> D[MarkdownConverter 转换]",
            "    D --> E[MathRenderer 保护/恢复公式]",
            "    D --> F[Highlight.js 语法高亮]",
            "    E --> G[WeChat HTML 输出]",
            "    F --> G",
            "    G --> H[预览面板]",
            "    H --> J[复制 HTML 粘贴公众号]",
            "    I --> K[Markdown / HTML 预览]",
            "    K --> H",
            "    J --> L[内容发布]",
            "```",
            "",
            "> 💡 **提示**：Mermaid 流程图自动渲染成矢量图并自适应主题色，在公众号里依旧清晰可复制。",
            "",
            "## 功能矩阵",
            "",
            "| 场景 | 我们的能力 | 公众号后台原生体验 |",
            "|---|---|---|",
            "| Markdown 导入 | 一键粘贴即完成排版 | 需手动调整、样式不统一 |",
            "| 主题色/模板 | 6+ 主题 + 可插拔模板 | 无主题概念 |",
            "| 代码高亮 | 190+ 语言自动识别 | 无高亮，需要手动截图 |",
            "| 数学公式 | MathJax 渲染，复制即用 | 需第三方插件 |",
            "| 多渠道输出 | 微信 / GitHub / Substack | 单一渠道 |",
            "",
            "## 样式亮点演示",
            "",
            "### 1. 代码高亮 & 语言徽章",
            "",
            "```javascript",
            "const pipeline = async (markdown) => {",
            "  const enriched = await markdownToWechat(markdown, {",
            "    theme: 'purple',",
            "    template: 'wechat-default'",
            "  });",
            "  return enriched.html;",
            "};",
            "",
            "pipeline(\"# Hello WeChat\").then(html => {",
            "  console.log('🎉 已生成公众号排版:');",
            "  console.log(html);",
            "});",
            "```",
            "",
            "### 2. 数学公式 & 引导段落",
            "",
            "行内公式示例：$E = mc^2$",
            "",
            "块级公式示例：",
            "$$ \\int_{0}^{\\infty} e^{-x^2}\\ dx = \\frac{\\sqrt{\\pi}}{2} $$",
            "",
            "[lead] 在段落开头加入 [lead]，可生成自适应主题色的“重点提示”模块。",
            "",
            "### 3. 待办清单与强调",
            "",
            "1. **写作**：在任意编辑器完成 Markdown",
            "2. **粘贴**：复制到左侧输入框",
            "3. **预览**：右侧实时看微信排版",
            "4. **发布**：复制 HTML，粘贴到公众号后台",
            "",
            "> ✨ **写作搭档**：支持保存主题偏好、模板选择，刷新仍保留设置。",
            "",
            "## 快速上手 Checklist",
            "",
            "- [ ] 选择 Channel：`WeChat`",
            "- [ ] 选择模板：默认 / 极简 / 杂志风 / Notebook",
            "- [ ] 设置主题色或输入品牌色",
            "- [ ] 粘贴 Markdown，确认预览",
            "- [ ] 点击“复制样式代码”，在公众号后台选择“粘贴并保留样式”",
            "",
            "**结语：** 让创作者只思考内容，排版交给 Markdown to WeChat Converter。复制这一段例子，即刻体验全流程。"
        ].join('\n');
    },

    // 获取简单示例
    getSimpleExample: function() {
        return `# 微信公众号排版示例

## 功能特性

这个工具支持以下特性：

- **丰富的格式支持**：支持标题、列表、引用、表格等
- **数学公式渲染**：支持 LaTeX 数学公式
- **代码语法高亮**：支持 190+ 种编程语言
- **主题色自定义**：6种精美主题色可选
- **实时预览**：所见即所得的编辑体验

## 代码语法高亮示例

### Python 代码示例

\`\`\`python
def fibonacci(n):
    """计算斐波那契数列的第n项"""
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# 生成前10项斐波那契数列
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
\`\`\`

### JavaScript 代码示例

\`\`\`javascript
// 现代 JavaScript ES6+ 示例
class DataProcessor {
    constructor(data) {
        this.data = data;
    }
    
    // 使用箭头函数和数组方法
    processData() {
        return this.data
            .filter(item => item.active)
            .map(item => ({ ...item, processed: true }))
            .sort((a, b) => a.priority - b.priority);
    }
    
    // 异步数据获取
    async fetchData(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('数据获取失败:', error);
            throw error;
        }
    }
}
\`\`\`

### SQL 查询示例

\`\`\`sql
-- 复杂的数据分析查询
SELECT 
    u.name,
    u.email,
    COUNT(o.id) as order_count,
    SUM(o.total_amount) as total_spent,
    AVG(o.total_amount) as avg_order_value
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC
LIMIT 100;
\`\`\`

### Java 代码示例

\`\`\`java
public class QuickSort {
    public static void quickSort(int[] arr, int low, int high) {
        if (low < high) {
            // 分区操作，获得枢轴位置
            int pivotIndex = partition(arr, low, high);
            
            // 递归排序枢轴左右两部分
            quickSort(arr, low, pivotIndex - 1);
            quickSort(arr, pivotIndex + 1, high);
        }
    }
    
    private static int partition(int[] arr, int low, int high) {
        int pivot = arr[high]; // 选择最后一个元素作为枢轴
        int i = low - 1;
        
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                swap(arr, i, j);
            }
        }
        swap(arr, i + 1, high);
        return i + 1;
    }
    
    private static void swap(int[] arr, int i, int j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}
\`\`\`

## 引用和列表

> 💡 **提示**：这个工具现在支持190+种编程语言的语法高亮，包括但不限于：
> 
> - **前端开发**：JavaScript、TypeScript、HTML、CSS、React、Vue
> - **后端开发**：Python、Java、C#、PHP、Go、Rust、Node.js  
> - **数据科学**：Python、R、SQL、MATLAB、Julia
> - **移动开发**：Swift、Kotlin、Dart、Objective-C
> - **系统编程**：C、C++、Rust、Assembly
> - **配置文件**：JSON、YAML、XML、TOML

### 功能列表

1. **智能语言检测**：自动识别代码语言类型
2. **主题色集成**：语法高亮配色与整体主题协调
3. **微信兼容性**：所有样式完美适配微信公众号
4. **代码美化**：
    - 更好的字体选择（SF Mono、Monaco等）
    - 14px字体大小，提升可读性
    - 语言标签显示
    - 优雅的阴影和边框效果

## 数学公式

行内公式：$E = mc^2$

块级公式：
$$ \\sum_{i=1}^{n} x_i = n $$`;
    },

    // 获取数学公式示例
    getMathExample: function() {
        return `# 数学公式示例

## 行内公式

爱因斯坦质能方程：$E = mc^2$

欧拉公式：$e^{i\\pi} + 1 = 0$

## 块级公式

二次方程求解公式：
$$ x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} $$

泰勒展开：
$$ f(x) = f(a) + f'(a)(x-a) + \\frac{f''(a)}{2!}(x-a)^2 + \\cdots $$

矩阵示例：
$$ A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} $$

求和公式：
$$ \\sum_{i=1}^{n} i = \\frac{n(n+1)}{2} $$`;
    },

    // 获取所有可用示例的列表
    getAvailableExamples: function() {
        return [
            { name: '产品体验示例', key: 'full' },
            { name: '简单示例', key: 'simple' },
            { name: '数学公式示例', key: 'math' }
        ];
    },

    // 根据键获取示例
    getExampleByKey: function(key) {
        switch (key) {
            case 'full':
                return this.getExampleMarkdown();
            case 'simple':
                return this.getSimpleExample();
            case 'math':
                return this.getMathExample();
            default:
                return this.getExampleMarkdown();
        }
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExampleData;
}

// 浏览器环境下赋值给全局变量
if (typeof window !== 'undefined') {
    window.ExampleData = ExampleData;
} 
