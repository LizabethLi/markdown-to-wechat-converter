# markdown-to-wechat-converter

[🌐 在线体验](https://lizabethli.github.io/markdown-to-wechat-converter/)

一个把单份 Markdown 文稿整理成**不同平台可直接复制粘贴格式**的小工具。

当前定位不是 schedule / auto-post，而是 **format-first**：
- 你输入一份 Markdown 原稿
- 选择目标平台
- 工具输出适合该平台的格式
- 你自己复制粘贴去发布

---

## 支持的输出渠道

### 1. WeChat
输出微信公众号友好的富文本 HTML：
- 保留主题色、模板、代码高亮、数学公式、Mermaid 图表
- 支持直接把截图或本地图片粘贴进 Markdown 编辑框
- “复制样式”会尽量把正文和图片本体一起写入剪贴板，再粘贴到公众号编辑器

### 2. Substack / GitHub (Markdown)
输出适合复制到 Substack 或 GitHub 的 Markdown 文案：
- 选择 `中文` 时只输出中文原稿
- 选择 `English` 时只输出英文译稿
- 不再自动把中英文拼接在同一篇内容中

这条渠道现在默认就是“可复制的 Markdown 输出”，不再强调调度或自动发布。

预览区的“复制图文”适合 Substack 等富文本编辑器；HTML/Markdown 标签页仍会复制原始 Markdown，并保留图片地址。GitHub 不接受内嵌的 `data:` 图片，粘贴的本地图片如需发布到 GitHub，应先上传到仓库或图床并换成公网/仓库地址。

### 3. LinkedIn
输出适合 LinkedIn 的纯文本文案：
- 遵循全局 `中文 / English` 开关
- 每次只输出一个语言版本，方便直接复制发布

### 4. X Article + Thread
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

- 可点击“选择本地图片”，也可把图片直接粘贴或拖入左侧编辑框；工具会转成内嵌 Markdown 图片（单张不超过 10 MB）。
- 也可继续使用 `![图片描述](https://example.com/image.png)` 或仓库内相对路径。
- WeChat、Substack 富文本预览和 X Article 支持图文富文本复制。
- LinkedIn 正文和 X Thread 是纯文本渠道，图片需要在目标平台单独上传；文案中会保留原图片地址。
- 远程图片服务器如果禁止跨域读取，工具无法把图片本体写入剪贴板，但仍会保留原地址并显示提示。

---

## 翻译与 AI 配置（OpenRouter）

在页面顶部点击 `⚙️` 可配置：
- OpenRouter API Key
- 模型
- System Prompt（可选，用于控制语言风格）

这些信息会保存在浏览器 localStorage。

翻译自带内置 Prompt：中文翻译为英文、保留 Markdown 结构、不改动代码/公式/URL，并且只返回译文。System Prompt 只用于补充术语表和文风要求。

同一篇原稿的英文译文会在渠道之间复用；切换 WeChat、Substack、LinkedIn 或 X 不会重复翻译。修改原稿或保存新的翻译设置后会重新翻译。

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
