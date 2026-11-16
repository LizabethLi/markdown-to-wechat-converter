// 示例数据模块
const ExampleData = {
    getResearchExample: function() {
        return `[lead] 我们平时会读不少论文和技术博客，Research AI+ 社区里也常有大家分享的好内容。**「什么值得看」栏目希望把这些日常阅读、推荐和讨论积累下来，每半个月精选一批有意思、值得细读的工作，为大家提供一份有参考价值的阅读清单。**

这份排版示例节选自「什么值得看」阅读清单，展示论文、Research Blog、研究机构、配图与图注的排版方式。可以在「样式」中选择薄荷青、紫色、蓝色或自定义颜色，查看同一份内容的不同效果。

# 01｜Papers

### 01. Are Self-Evolving Agents Continual Learners?

**研究机构：** Mila、Université de Montréal、Google DeepMind

![01_self_evolving_fig1.png](assets/examples/research-learning.jpg)

*图：四类任务漂移下，三种自演进方法的逐组学习曲线。*

Self-Evolving Agent 的能力提升，可能伴随着旧任务表现的退化。研究基于 BIRD、BFCL 和 ScienceWorld 构建四类动态任务流，对比 ReasoningBank、GEPA 和 Meta-Harness，发现自我修改容易产生跨任务干扰，记忆检索也会遭遇相似任务间的冲突。

它将 Self-Evolving 的评估从单次任务表现推进到长期学习过程，揭示了**能力可塑性与稳定性之间的关系**。对研究 Agent Memory、Harness Evolution 和 Continual Learning 的团队来说，这提供了非常具体的设计与评测问题。

### 02. How Much of a Harness Does a Strong Agent Need for Autonomous ML Engineering?

**研究机构：** EPFL、Apple

![03_harness_fig1.png](assets/examples/research-harness.png)

*图：相同时间预算下，不同基础模型与 Harness 的获奖率及平均排名百分位。*

Multi-Agent 编排、专用检索与复杂任务管理，究竟为 Agent 带来了多少额外能力？研究在相同基础模型和时间预算下开展系统性消融，发现具备文件读写、Bash 执行等基础工具的单 Agent，在所测 ML Engineering 任务中可以匹敌复杂 Harness。

> 这篇为 Agent 架构设计提供了少见的控制变量证据，也促使我们重新思考模型能力与外部系统复杂度的关系。

# 02｜Research Blogs / Essays

### 01. The sleep framework: A new way for LLMs to retain knowledge in continual learning

**作者及机构：** Ali Behrouz、Vahab Mirrokni，Google Research

Google 提出了一种受人类记忆巩固过程启发的持续学习框架，让模型交替经历交互学习与离线“睡眠”。在睡眠阶段，系统将短期经验转化为长期参数知识，并利用“做梦”机制探索新的训练样本。

## 值得继续追问的问题

- 模型如何从经验中成长，同时保留旧任务的能力？
- 复杂的 Agent Harness 究竟贡献了多少额外能力？
- 长期运行的 AI 系统，应当如何组织和巩固记忆？

---

欢迎关注「什么值得看」栏目，也欢迎推荐值得读的研究，或投稿自己的文章。`;
    },

    // 获取示例Markdown内容
    // 与仓库根目录 PROJECT-INTRO-DEMO.md 保持同步。
    getExampleMarkdown: function() {
        return [
            "[lead] 写内容时，我只想专心表达；但真正准备发布时，常常还要重新调标题、改颜色、处理代码、截图公式，再为不同平台各做一遍。于是我做了「Markdown 发布工具箱」：写一份 Markdown，生成适合 WeChat、Substack、LinkedIn 和 X 的可复制发布格式。",
            "",
            "# 为什么做 Markdown 发布工具箱",
            "",
            "![Markdown 发布工具箱：一份 Markdown，适配多个内容平台](https://lizabethli.github.io/markdown-to-wechat-converter/assets/og-image.png)",
            "",
            "> 这篇文章既是产品介绍，也是一个可以直接复制到工具里的完整 Demo。继续读，你会依次看到标题、强调、列表、表格、代码、公式和 Mermaid 图表的实际效果。",
            "",
            "## 写完文章，为什么还没法直接发布？",
            "",
            "Markdown 很适合写作：结构清楚、格式简单，也不绑定某个编辑器。但到了发布环节，问题就来了：",
            "",
            "- 微信公众号需要带内联样式的富文本，普通 Markdown 不能直接使用；",
            "- Substack 和 LinkedIn 的排版习惯不同，表格、公式和图表也不一定能原样粘贴；",
            "- X 不仅需要 Article，还需要适合传播的 Thread，以及需要单独上传的图片素材；",
            "- 同一篇文章要发布中文和英文版本时，复制、翻译和校对又会形成一套重复流程。",
            "",
            "如果只是偶尔发布，这些步骤似乎还能接受。但当写作变成长期习惯，**排版就不该继续占用创作时间**。",
            "",
            "## 它是什么，又不是什么？",
            "",
            "Markdown 发布工具箱的定位很简单：它是一个 **format-first 的多渠道格式转换器**。",
            "",
            "你提供一份 Markdown 原稿，选择目标平台和输出语言，工具负责生成适合该平台的预览与内容；确认效果后，复制到对应平台发布即可。",
            "",
            "它目前不替你定时发布，也不会接管平台账号。这样做的好处是：发布前的最后一次检查仍然掌握在创作者手里，使用流程也足够轻量。",
            "",
            "## 一份原稿，四种发布结果",
            "",
            "| 发布渠道 | 工具生成的内容 | 适合的使用方式 |",
            "|---|---|---|",
            "| WeChat | 带模板、主题色、代码高亮、公式和图表的公众号富文本 | 复制样式后粘贴到公众号编辑器 |",
            "| Substack | 接近平台阅读体验的文章预览与可移植富文本 | 复制图文后继续在 Substack 编辑 |",
            "| LinkedIn | 独立的 LinkedIn Article 排版与可移植富文本 | 复制图文后发布长文 |",
            "| X | Article 正文、主 Thread、要点 Thread 和编号图片素材 | 先复制文字，再按编号上传素材 |",
            "",
            "这张表本身也是 Demo：切换到 Substack 或 LinkedIn 后复制时，工具会把 Markdown 表格转成更容易跨平台携带的图片；切换到 X 时，它会被整理成编号素材。",
            "",
            "## 从写作到发布，只需要这条流水线",
            "",
            "```mermaid",
            "flowchart LR",
            "    A[一份 Markdown 原稿] --> B{选择语言}",
            "    B -->|中文| C{选择发布渠道}",
            "    B -->|English| T[OpenRouter 翻译]",
            "    T --> C",
            "    C --> W[WeChat 富文本]",
            "    C --> S[Substack 图文]",
            "    C --> L[LinkedIn Article]",
            "    C --> X[X Article + Thread]",
            "    W --> P[复制并发布]",
            "    S --> P",
            "    L --> P",
            "    X --> P",
            "```",
            "",
            "你不需要维护四份内容。渠道切换发生在同一个编辑器里，修改原稿后，预览也会跟着更新。",
            "",
            "# 它能处理哪些发布细节",
            "",
            "## 常用格式开箱即用",
            "",
            "普通正文里可以直接使用这些通用格式，不需要记住新的私有语法：",
            "",
            "*这是斜体，用来补充语气。*",
            "",
            "**这是粗体，用来强调重点。**",
            "",
            "***这是粗斜体，同时拥有两种强调。***",
            "",
            "这里还有一段 `行内代码`。",
            "",
            "---",
            "",
            "任务清单也沿用通用写法：",
            "",
            "- [x] 完成 Markdown 原稿",
            "- [x] 选择目标发布渠道",
            "- [ ] 粘贴到平台并做最后检查",
            "",
            "## 让公众号排版保留自己的风格",
            "",
            "WeChat 渠道提供 **默认模板、极简风格、杂志风** 3 套模板，并内置 7 个主题色，也可以直接输入品牌色。标题、引用、链接、代码块和强调内容会跟随主题变化。",
            "",
            "文章开头的 `[lead]` 标记，会在 WeChat 渠道中变成醒目的引导段。它适合放摘要、核心观点或章节导语。",
            "",
            "## 图片不再打断写作",
            "",
            "你可以使用远程图片、仓库中的相对路径图片，也可以把截图或本地图片直接粘贴、拖入编辑器。对于 Obsidian 用户，工具还能识别这样的附件引用：",
            "",
            "```markdown",
            "![[Pasted image 20260818133657.png]]",
            "```",
            "",
            "只要再选择同名本地图片，短引用就可以继续保留，预览和复制时再使用真正的图片内容。",
            "",
            "## 代码、公式和图表可以一起走",
            "",
            "下面这段代码会以语法高亮形式显示：",
            "",
            "```javascript",
            "const result = await ChannelConverter.renderForChannel(",
            "  \"wechat\",",
            "  markdown,",
            "  {",
            "    outputLanguage: \"zh\",",
            "    templateId: \"wechat-magazine\",",
            "    themeColor: \"#7E3AF2\"",
            "  }",
            ");",
            "",
            "console.log(result.previewHtml);",
            "```",
            "",
            "简单的行内关系式直接使用通用数学符号，在各个平台更稳定。比如，可以把一次多渠道发布的重复劳动粗略写成：C = n × (E + F)，其中 n 是平台数量，E 是编辑成本，F 是排版成本。",
            "",
            "复杂公式仍然可以使用独立公式块。使用一份原稿和统一转换流程后，可以把它简化为：",
            "",
            "$$",
            "C_{toolkit} = E + \\sum_{i=1}^{n} A_i",
            "$$",
            "",
            "其中 Aᵢ 只代表每个平台最后的检查和微调。公式不是为了精确计时，而是为了说明一件事：**应该被消除的是重复排版，而不是创作者的判断。**",
            "",
            "## 中英文输出使用同一套流程",
            "",
            "所有渠道都可以选择 `中文` 或 `English`。中文模式直接使用原稿；需要英文时，可以在设置中配置 OpenRouter。工具会尽量保留 Markdown 结构、代码、公式、链接和图片引用，并在不同渠道之间复用同一篇原稿的译文。",
            "",
            "> 浏览器直连 API Key 更适合个人使用。如果要把工具提供给团队，建议改用后端代理，避免在前端暴露密钥。",
            "",
            "# 从 Demo 到真正发布",
            "",
            "## 30 秒体验一次完整发布",
            "",
            "1. 打开 [Markdown 发布工具箱](https://lizabethli.github.io/markdown-to-wechat-converter/)；",
            "2. 复制这篇文章的 Markdown 原文，粘贴到左侧编辑器；",
            "3. 选择 `WeChat`，切换模板和主题色，观察右侧预览；",
            "4. 再切换到 `Substack` 或 `LinkedIn`，比较不同平台的文章样式；",
            "5. 选择 `X Article + Thread`，查看正文、Thread 和编号素材；",
            "6. 点击复制按钮，把结果粘贴到目标平台做最后检查。",
            "",
            "如果你想快速检查功能，也可以直接使用这份清单：",
            "",
            "- [x] 标题与正文层级",
            "- [x] 粗体、链接和引用",
            "- [x] 有序列表与任务清单",
            "- [x] Markdown 表格",
            "- [x] 代码语法高亮",
            "- [x] 行内与块级数学公式",
            "- [x] Mermaid 流程图",
            "- [x] 远程图片",
            "- [x] 多渠道与中英文输出",
            "",
            "## 为什么我选择“复制即用”",
            "",
            "自动发布听起来更彻底，但也意味着账号授权、平台 API、草稿管理和失败重试。对于个人创作者和小团队，很多时候真正费时间的并不是点击“发布”，而是发布前的格式整理。",
            "",
            "所以这个项目先解决最稳定、最普遍的一段流程：",
            "",
            "> 保留 Markdown 的写作自由，同时把不同平台的格式差异交给工具处理。",
            "",
            "它不要求你改变写作软件，也不要求把内容迁移到新的内容系统。你仍然可以在 Obsidian、VS Code、Typora 或任何喜欢的编辑器里完成原稿。",
            "",
            "## 开源，也欢迎一起继续完善",
            "",
            "项目不需要安装依赖，下载后直接打开 `index.html` 就能使用：",
            "",
            "```bash",
            "git clone https://github.com/LizabethLi/markdown-to-wechat-converter.git",
            "cd markdown-to-wechat-converter",
            "open index.html",
            "```",
            "",
            "目前的核心流程已经覆盖 WeChat、Substack、LinkedIn 和 X。未来还可以继续扩展 Medium、Notion、Slack 等 formatter，让“写一次，适配多个内容平台”变得更完整。",
            "",
            "- 在线体验：[Markdown 发布工具箱](https://lizabethli.github.io/markdown-to-wechat-converter/)",
            "- 项目源码：[GitHub Repository](https://github.com/LizabethLi/markdown-to-wechat-converter)",
            "",
            "**如果你也在用 Markdown 写作，不妨直接把这篇文章复制进去试试。你看到的每一种格式，都是这个工具正在完成的工作。**",
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
            case 'research':
                return this.getResearchExample();
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
