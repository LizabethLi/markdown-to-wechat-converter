# markdown-to-wechat-converter

## 1. 项目简介

`markdown-to-wechat-converter` 是一个将标准 Markdown 文档快速转换为适配微信公众号排版格式的工具。它支持常见的 Markdown 语法，并针对微信平台的排版需求进行了优化，支持数学公式渲染、语法高亮、主题配色和可插拔模板。

## 2. 功能特性
- 支持标准 Markdown 语法解析与转换
- 自动适配微信公众平台的排版样式
- 支持数学公式（MathJax，LaTeX 语法）渲染
- 语法高亮（highlight.js），多语言自动/指定高亮
- 主题配色与自定义颜色（保存到本地）
- 可插拔模板系统（默认/极简/杂志风，可扩展）
- 可视化界面，所见即所得，支持一键复制
- 多渠道输出：WeChat（HTML）、GitHub（Markdown），可选翻译合并（中英）

## 3. 截图/预览

以下为内置模板与渠道预览（建议将仓库内的占位图片替换为你自己的截图）：

模板（WeChat 渠道示例）：

![默认模板 - WeChat](assets/screenshots/template-default.png)
![极简风格 - WeChat](assets/screenshots/template-minimal.png)
![杂志风 - WeChat](assets/screenshots/template-magazine.png)

渠道切换预览：

![WeChat 渠道预览](assets/screenshots/channel-wechat.png)
![GitHub 渠道预览](assets/screenshots/channel-github.png)

如何更新这些截图：见 `assets/screenshots/README.md`。

## 4. 安装与使用说明

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

启动后：
- 在“Channel/渠道”选择 WeChat 或 GitHub（Markdown）。
- 在“模板”选择默认、极简、杂志风等模板。
- 在主题选择器中选择主题色或输入自定义颜色。

## 5. 文件结构说明

```
markdown-to-wechat-converter/
├── assets/                    # 示例数据等资源
├── index.html                 # 主页面入口
├── js/                        # 主要 JS 功能模块
│   ├── app.js                 # 应用主逻辑
│   ├── channel-converter.js   # 子栈/GitHub 转换
│   ├── config.js              # 配置项（主题/语法高亮/翻译）
│   ├── markdown-converter.js  # Markdown -> WeChat 渲染（marked 渲染器）
│   ├── math-renderer.js       # 数学公式渲染（MathJax）
│   ├── template-manager.js    # 模板注册与选择（新增）
│   ├── translator.js          # 翻译模块（Gemini/代理）
│   ├── ui-controller.js       # UI 控制
│   ├── wechat-styles.js       # 现有微信模板的实现（仍可直接使用）
│   └── templates/             # 模板目录（新增）
│       ├── wechat-default.js  # 默认模板（包装 wechat-styles）
│       ├── wechat-minimal.js  # 极简风模板
│       └── wechat-magazine.js # 杂志风模板
├── styles/
│   └── main.css               # 主样式表
└── README.md                  # 项目说明文档
```

## 6. 示例

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

## 7. 格式化小技巧

- H1 自动编号：每个 `# 一级标题` 会自动添加两位序号作为前缀，例如 `01 标题`。
- 左对齐段落：除一级标题外，普通段落均为左对齐，便于中英文混排阅读。
- 主题色强调段落：在段落开头加入 `[lead]` 可将本段以主题色背景强调显示，例如：

  ```markdown
  [lead] 这是一个被主题色强调的段落
  ```

  生成效果是一个带有主题色背景的小胶囊样式，适合做引导语或关键信息提示。

- 模板切换：在“模板”下拉框中选择不同模板（默认 / 极简 / 杂志风），预览会实时更新。
- 代码块：可自动检测语言高亮，也可通过围栏语法指定语言（如 ```js、```python 等）。

## 8. 新增渠道：Substack 与 GitHub

- 渠道选择：在左上角“Channel/渠道”下拉框选择输出类型：
  - `WeChat`：输出微信公众号样式 HTML（原有功能）
  - `Substack (HTML)`：将中文 Markdown 翻译为英文（Gemini），然后按“英文在前，中文在后”合并为一份 HTML，便于直接粘贴至 Substack 编辑器
  - `GitHub (Markdown)`：将中文 Markdown 翻译为英文（Gemini），按“英文在前，中文在后”合并为一份 Markdown，便于使用在 GitHub README/文档

### 8.1 启用翻译（Gemini）

在输入栏上方点击“⚙️ 翻译设置”按钮，填写 Gemini API Key 与可选的 System Prompt，即可启用翻译；设置会本地保存（浏览器 localStorage）。

此外，也支持下列方式：

- 代理模式（推荐）：在 `js/config.js` 中设置 `AppConfig.translation.mode = 'proxy'`，并配置 `proxyEndpoint` 指向你自有的服务端代理（例如 Cloudflare Worker 或服务器接口）。代理接收 JSON：`{ text, sourceLang, targetLang, format, instructions }`，返回：`{ translation }`。
- 直连模式（本地/可信环境）：在 `js/config.js` 中设置 `AppConfig.translation.mode = 'direct'`，并提供 `gemini.apiKey`。或者在浏览器控制台执行：`localStorage.setItem('gemini_api_key', 'YOUR_KEY')`。

提示：直连模式会在浏览器内携带 API Key，谨慎在公开环境使用。

### 8.2 Substack 输出

- 输入：中文 Markdown
- 输出：一份 HTML，包含英文（翻译）在前、中文在后，样式简洁、左对齐，便于直接复制进 Substack。

### 8.3 GitHub 输出

- 输入：中文 Markdown
- 输出：一份合并后的 Markdown，结构为：英文（翻译） + 分隔线 `---` + 中文原文。

在应用内切换到 `GitHub (Markdown)` 渠道后，右侧将显示 Markdown 风格的预览（非微信样式）。我们已修复了渲染器全局污染问题，WeChat 和 GitHub 预览互不影响。

## 9. 模板系统（可插拔）

现在的样式采用模板化架构，任何人都可以“增量添加”新模板，而无需修改现有文件。

- 模板契约（必须暴露）：
  - `id: string` 唯一标识
  - `name: string` 展示名称
  - `getStyles(mode, themeColor)` 返回样式函数集合（与现有 WechatStyles 兼容），包括：
    - `sectionNumber`、`h1`、`h2`、`h3`、`bold`、`italic`、`blockquote`、`codeBlock`、`inlineCode`、`image`、`link`、`paragraph`、`leadParagraph`

- 注册方式：模板文件中调用 `TemplateManager.register(template)` 即可；注册后会自动出现在“模板”下拉框。

- 目录结构：将模板放到 `js/templates/` 下，示例：

```js
// js/templates/my-template.js
(function(){
  if (typeof TemplateManager === 'undefined') return;
  const MyTemplate = {
    id: 'my-template',
    name: '我的模板',
    getStyles(mode, themeColor) {
      // 返回与 WechatStyles.getStyles 等价的函数集合
      return { /* ...sectionNumber/h1/h2/... 等函数 ... */ };
    }
  };
  TemplateManager.register(MyTemplate);
})();
```

- 引入方式：在 `index.html` 中、`wechat-default.js` 之后新增 `<script src="js/templates/my-template.js"></script>`。

- 兼容性：旧的 `js/wechat-styles.js` 仍可直接使用（默认模板通过 `js/templates/wechat-default.js` 进行注册包装）。

## 10. 配置与定制

- 主题与语法高亮：
  - `js/config.js` 中 `AppConfig.themes` 定义主题主色；
  - `AppConfig.syntaxHighlighting.themeStyles` 定义各主题下代码高亮配色；
  - 可使用 `mint` 或自定义主题色（保存在 `localStorage`）。

- 翻译：见第 7 节（代理/直连模式）。

- 本地存储键（可清理恢复默认）：
  - `wechat-converter-theme`、`wechat-converter-custom-color`、`wechat-template`、`gemini_api_key`、`translation_system_prompt`

## 11. 常见问题（FAQ）

- GitHub 预览仍显示微信样式？
  - 强制刷新页面（清缓存），我们已改为每次调用使用局部 `marked(..., { renderer })`，不会污染全局。

- 报错 “Cannot read properties of undefined (reading 'keyword')”？
  - 该问题由主题高亮样式缺失引发，已修复；如仍遇到，请清理本地存储：
    ```js
    localStorage.removeItem('wechat-converter-theme');
    localStorage.removeItem('wechat-converter-custom-color');
    ```

- 复制到公众号排版粘贴后样式丢失？
  - 使用“粘贴并保留样式/格式”（或 `Ctrl+Shift+V`/编辑器对应选项）。

## 12. 贡献

欢迎提交 PR：
- 新模板（在 `js/templates/` 下新增并注册）
- 样式调整/主题配色完善
- Bug 修复与文档改进
