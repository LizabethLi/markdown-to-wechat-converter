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
