# Markdown Publishing Toolkit

[🌐 在线体验](https://lizabethli.github.io/markdown-to-wechat-converter/)

一个把单份 Markdown 文稿整理成**不同平台可直接复制粘贴格式**的小工具。

中文名称：**Markdown 发布工具箱**；原项目名称为 `markdown-to-wechat-converter`，现有仓库地址和 GitHub Pages URL 暂时保持不变。

当前定位不是 schedule / auto-post，而是 **format-first**：
- 你输入一份 Markdown 原稿
- 选择目标平台
- 工具输出适合该平台的格式
- 你自己复制粘贴去发布

---

## 渠道发布指南

- [Markdown 转微信公众号排版](https://lizabethli.github.io/markdown-to-wechat-converter/wechat/)
- [Markdown to Substack Converter](https://lizabethli.github.io/markdown-to-wechat-converter/substack/)
- [Markdown to LinkedIn Article Formatter](https://lizabethli.github.io/markdown-to-wechat-converter/linkedin/)
- [Markdown to X Article and Thread Generator](https://lizabethli.github.io/markdown-to-wechat-converter/x-article-thread/)

渠道页中的按钮会通过 `?channel=` 参数打开主转换器并预选对应渠道；进入编辑器后切换渠道不会刷新页面。

---

## 支持的输出渠道

### 1. WeChat
输出微信公众号友好的富文本 HTML：
- 保留主题色、模板、代码高亮、数学公式、Mermaid 图表
- 支持直接把截图或本地图片粘贴进 Markdown 编辑框
- “复制样式”会尽量把正文和图片本体一起写入剪贴板，再粘贴到公众号编辑器

### 2. Substack / LinkedIn
生成一份可同时粘贴到 Substack 和 LinkedIn 的富文本内容：
- 选择 `中文` 时只输出中文原稿
- 选择 `English` 时只输出英文译稿
- 不再自动把中英文拼接在同一篇内容中
- 图片、数学公式和 Mermaid 图表会在复制时一并处理
- 点击一次“复制图文”，即可粘贴到 Substack 或 LinkedIn

### 3. X Article + Thread
输出一份完整的 X 发布包：
- X Article：保留标题、小标题、粗体和列表，支持富文本复制
- 主 Thread：AI 生成一段简短推荐，并列出文章要点
- 要点 Thread：每个 Bullet Point 单独展开为一条 post
- 自动编号 `1/N`, `2/N`, `3/N`，并限制每条不超过 280 字符
- 遵循全局语言开关，生成对应语言的 Article 和 Thread

X 推荐语和要点只会在点击 `✨ 生成 X Article + Thread` 后生成；选择 `English` 时，正文翻译仍会调用 OpenRouter。

注意：[X Articles](https://help.x.com/en/using-x/articles) 的发布资格目前限于 X Premium、Premium+、Premium Business 和 Premium Organizations。

---

## 主要能力

- 支持标准 Markdown
- WeChat 渠道支持模板化排版
- 支持主题色切换与自定义颜色
- 支持数学公式（MathJax）
- 支持 Mermaid 图表
- 支持代码高亮
- 支持全局 `中文 / English` 单语言输出切换
- 支持 Markdown 远程图片、相对路径图片和直接粘贴的本地图片
- 富文本复制时自动内嵌浏览器可读取的图片；无法跨域读取时保留原图片地址并提示
- 支持通过 OpenRouter 翻译内容、生成 X 推荐语和提取文章要点
- 支持多平台 copy/paste-ready 输出

---

## WebMCP（实验性）

页面会在支持 WebMCP 的浏览器中注册三个工具，让浏览器里的 AI Agent 直接调用现有转换器：

- `convert_markdown`：转换 WeChat、Substack / LinkedIn 或 X 内容
- `list_supported_channels`：查询渠道、别名和输出格式
- `list_wechat_templates`：查询微信模板

`convert_markdown` 支持 `zh / en` 语言、微信模板和主题、X AI 生成，并同时返回渠道原始输出、`preview_html` 和结构化数据。`linkedin` 会使用与 Substack 相同的富文本转换器。

本地图片短引用只能访问当前页面中已加载的图片；如果引用尚未解析，工具会返回明确错误，不会输出失效图片。

WebMCP 目前仍是实验性浏览器能力，需要安全上下文和支持 `document.modelContext` 的浏览器。不支持时页面会自动跳过注册，普通转换和复制功能不受影响。

---

## 使用方式

### 本地打开
无需安装依赖，直接打开：

```bash
open index.html
```

或者在浏览器中手动打开 `index.html`。

### 基本流程
1. 在左侧输入 Markdown
2. 选择输出渠道
3. 选择 `中文` 或 `English` 输出语言
4. 如需英文或 AI 生成，配置 OpenRouter
5. 查看右侧预览并直接复制到目标平台

### 图片说明

- 可点击“选择本地图片”，也可把图片直接粘贴或拖入左侧编辑框（单张不超过 10 MB）。剪贴板提供图片文件、Base64 文本或仅含图片的 HTML 时都能识别；左侧只保留短引用，预览和复制图文时再自动使用内嵌图片。
- 从 Obsidian 复制的 `![[Pasted image.png]]` 只包含附件名；页面会提示缺图。选择或拖入同名本地文件后，短引用保持不变，图片会加载到当前页面中。
- 也可继续使用 `![图片描述](https://example.com/image.png)` 或仓库内相对路径。
- WeChat 与 Substack / LinkedIn 支持从预览区直接复制图文。
- X Article 的图片、公式、Mermaid 和代码块会整理为编号素材，需要在 X 中按顺序上传。
- 远程图片服务器如果禁止跨域读取，工具无法把图片本体写入剪贴板，但仍会保留原地址并显示提示。

---

## 翻译与 AI 配置（OpenRouter）

在页面顶部点击 `⚙️` 可配置：
- OpenRouter API Key
- 模型
- System Prompt（可选，用于控制语言风格）

这些信息会保存在浏览器 localStorage。

翻译自带内置 Prompt：中文翻译为英文、保留 Markdown 结构、不改动代码/公式/URL，并且只返回译文。System Prompt 只用于补充术语表和文风要求。

同一篇原稿的英文译文会在渠道之间复用；切换 WeChat、Substack / LinkedIn 或 X 不会重复翻译。修改原稿或保存新的翻译设置后会重新翻译。

如果没有配置翻译：
- `中文` 模式仍可在所有渠道直接使用
- 选择 `English` 时页面会提示配置 OpenRouter API Key
- X Article + Thread 会提供本地预览；配置 API Key 并点击生成按钮后，AI 才会生成推荐语和要点

---

## 当前前端结构

```text
markdown-to-wechat-converter/
├── index.html
├── README.md
├── assets/
│   └── examples.js
├── js/
│   ├── app.js
│   ├── channel-converter.js     # 平台输出 adapter / formatter registry
│   ├── config.js
│   ├── markdown-converter.js    # WeChat HTML 渲染
│   ├── math-renderer.js
│   ├── template-manager.js
│   ├── translator.js
│   ├── ui-controller.js
│   ├── wechat-styles.js
│   └── templates/
│       ├── wechat-default.js
│       ├── wechat-minimal.js
│       └── wechat-magazine.js
└── styles/
    └── main.css
```

---

## 架构说明

### WeChat 路径
- `markdown-converter.js` 负责把 Markdown 渲染成公众号风格 HTML
- `template-manager.js` + `js/templates/*` 负责模板切换

### 其他平台路径
- `channel-converter.js` 维护统一的 formatter registry
- 每个 channel 都定义自己的：
  - 输出格式
  - 预览模式
  - 复制按钮文案
  - 提醒文案

这样后续新增渠道（比如 Medium、Notion、Slack）时，只需要新增一个 formatter adapter。

---

## 适合继续扩展的方向

- 给 LinkedIn 加 hook / CTA / hashtag 策略
- 给 X Article 加封面图和发布链接占位
- 新增 Medium / Notion / Slack formatter
- 增加“只输出英文 / 只输出中文 / bilingual”切换
- 把平台策略抽成更细的 formatter pipeline

---

## 注意事项

- WeChat 复制时建议使用“粘贴并保留格式”
- 浏览器内直连 API Key 仅适合个人本地使用
- 若要减少密钥暴露，可把翻译切到代理模式

---

## License

MIT
