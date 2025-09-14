# markdown-to-wechat-converter

## 1. 项目简介

`markdown-to-wechat-converter` 是一个将标准 Markdown 文档快速转换为适配微信公众号排版格式的工具。它支持常见的 Markdown 语法，并针对微信平台的排版需求进行了优化，支持数学公式渲染和自定义样式。

## 2. 功能特性
- 支持标准 Markdown 语法解析与转换
- 自动适配微信公众平台的排版样式
- 支持数学公式（LaTeX 语法）渲染
- 可视化界面，所见即所得
- 一键复制微信格式内容

## 3. 安装与使用说明

### 克隆仓库
```bash
git clone https://github.com/你的用户名/markdown-to-wechat-converter.git
cd markdown-to-wechat-converter
```

### 本地运行
无需安装依赖，直接用浏览器打开 `index.html` 即可使用。

```bash
open index.html
```
或手动在浏览器中打开。

### 主要入口文件说明
- `index.html`：主页面入口
- `js/`：主要功能实现的 JavaScript 文件夹
- `styles/`：样式文件夹

## 4. 文件结构说明

```
markdown-to-wechat-converter/
├── assets/                # 示例数据等资源
├── index.html             # 主页面入口
├── js/                    # 主要 JS 功能模块
│   ├── app.js             # 应用主逻辑
│   ├── config.js          # 配置项
│   ├── markdown-converter.js # Markdown 转换核心
│   ├── math-renderer.js   # 数学公式渲染
│   ├── ui-controller.js   # UI 控制
│   └── wechat-styles.js   # 微信样式适配
├── styles/                # 样式文件
│   └── main.css           # 主样式表
└── README.md              # 项目说明文档
```

## 5. 示例

**Markdown 输入：**
```markdown
# 微信公众号排版示例

## 代码语法高亮示例

### Python 代码示例

```python
def fibonacci(n):
    """计算斐波那契数列的第n项"""
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# 生成前10项斐波那契数列
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

## 引用和列表

> 💡 **提示**：这个工具现在支持190+种编程语言的语法高亮。
> 
> - **前端开发**：JavaScript、TypeScript、HTML、CSS
> - **后端开发**：Python、Java、C#、PHP、Go
> - **数据科学**：Python、R、SQL

## 数学公式

行内公式：$E = mc^2$

块级公式：
$$ \\sum_{i=1}^{n} x_i = n $$
```

**转换后效果预览：**

将以上 Markdown 内容粘贴到 `index.html` 的编辑器中，即可在右侧实时预览适配微信的精美排版效果。

## 6. 格式化小技巧

- H1 自动编号：每个 `# 一级标题` 会自动添加两位序号作为前缀，例如 `01 标题`。
- 左对齐段落：除一级标题外，普通段落均为左对齐，便于中英文混排阅读。
- 主题色强调段落：在段落开头加入 `[lead]` 可将本段以主题色背景强调显示，例如：

  ```markdown
  [lead] 这是一个被主题色强调的段落
  ```

  生成效果是一个带有主题色背景的小胶囊样式，适合做引导语或关键信息提示。

## 7. 新增渠道：Substack 与 GitHub

- 渠道选择：在左上角“Channel/渠道”下拉框选择输出类型：
  - `WeChat`：输出微信公众号样式 HTML（原有功能）
  - `Substack (HTML)`：将中文 Markdown 翻译为英文（Gemini），然后按“英文在前，中文在后”合并为一份 HTML，便于直接粘贴至 Substack 编辑器
  - `GitHub (Markdown)`：将中文 Markdown 翻译为英文（Gemini），按“英文在前，中文在后”合并为一份 Markdown，便于使用在 GitHub README/文档

### 7.1 启用翻译（Gemini）

在输入栏上方点击“⚙️ 翻译设置”按钮，填写 Gemini API Key 与可选的 System Prompt，即可启用翻译；设置会本地保存（浏览器 localStorage）。

此外，也支持下列方式：

- 代理模式（推荐）：在 `js/config.js` 中设置 `AppConfig.translation.mode = 'proxy'`，并配置 `proxyEndpoint` 指向你自有的服务端代理（例如 Cloudflare Worker 或服务器接口）。代理接收 JSON：`{ text, sourceLang, targetLang, format, instructions }`，返回：`{ translation }`。
- 直连模式（本地/可信环境）：在 `js/config.js` 中设置 `AppConfig.translation.mode = 'direct'`，并提供 `gemini.apiKey`。或者在浏览器控制台执行：`localStorage.setItem('gemini_api_key', 'YOUR_KEY')`。

提示：直连模式会在浏览器内携带 API Key，谨慎在公开环境使用。

### 7.2 Substack 输出

- 输入：中文 Markdown
- 输出：一份 HTML，包含英文（翻译）在前、中文在后，样式简洁、左对齐，便于直接复制进 Substack。

### 7.3 GitHub 输出

- 输入：中文 Markdown
- 输出：一份合并后的 Markdown，结构为：英文（翻译） + 分隔线 `---` + 中文原文。
