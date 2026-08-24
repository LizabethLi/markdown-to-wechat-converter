# SEO 与增长计划（后续执行）

> 状态：基础 SEO、渠道页与产品事件已在本地实施，等待部署和站长平台配置
> 记录日期：2026-08-24
> 适用项目：Markdown to WeChat Converter

## 1. 背景与当前判断

项目已经从单一的微信公众号排版工具，发展成一个 format-first 的 Markdown 多渠道发布格式转换工具：

- 输入一份 Markdown 原稿；
- 选择目标渠道；
- 输出适合 WeChat、Substack、LinkedIn 或 X 的格式；
- 用户自行复制粘贴到目标平台，而不是由工具自动登录、定时或发布。

当前品牌与 SEO 信息并不一致：

- 页面可见标题已经是“Markdown 多渠道发布工具”；
- HTML title、description、Open Graph、Twitter Card 和 JSON-LD 仍主要描述微信公众号；
- GitHub 仓库名和 GitHub Pages 路径仍是 `markdown-to-wechat-converter`；
- README、示例内容和部分代码日志仍保留旧名称；
- sitemap 目前只有首页，且 `lastmod` 已过期；
- 网站目前只有一个工具页，难以分别覆盖不同渠道的搜索意图。

核心判断：品牌名、SEO 关键词、仓库名和线上 URL 不必完全相同。仓库名不是当前 SEO 的主要瓶颈，页面内容、搜索意图匹配、独立落地页和用户激活数据更重要。

## 2. 推荐命名架构

建议将品牌和 SEO 类目描述分开：

- 产品英文名：`Markdown Publishing Toolkit`
- 产品中文名：`Markdown 发布工具箱`
- SEO 类目描述：`Markdown 多渠道发布格式转换器`

“发布格式转换器”比“自动发布工具”更符合目前的 format-first 产品能力，避免让用户误以为产品会自动登录并发帖。

建议首页使用：

```html
<title>Markdown 多渠道发布格式转换器｜微信、Substack、LinkedIn、X</title>

<meta
  name="description"
  content="一份 Markdown，转换为适合微信公众号、Substack、LinkedIn 和 X Article/Thread 的可复制发布格式。支持图片、公式、Mermaid、代码高亮与中英转换。"
>
```

页面主文案：

```text
H1：Markdown 多渠道发布格式转换器

副标题：一份 Markdown，生成适合 WeChat、Substack、LinkedIn 和 X 的可复制发布格式。
```

结构化数据建议保留旧名称，帮助名称迁移保持连续性：

```json
{
  "@type": "SoftwareApplication",
  "name": "Markdown Publishing Toolkit",
  "alternateName": [
    "Markdown 发布工具箱",
    "Markdown to WeChat Converter"
  ]
}
```

## 3. 仓库名、Pages 地址与独立域名

短期保留：

```text
https://github.com/LizabethLi/markdown-to-wechat-converter
https://lizabethli.github.io/markdown-to-wechat-converter/
```

原因：

- 仓库名对网站 SEO 的影响远小于页面标题、正文、内链和外链；
- 当前 URL 中的 `wechat` 仍可以承接原有细分关键词；
- GitHub 仓库改名后，普通仓库链接通常会重定向，但 GitHub Pages 项目站点 URL 不属于可靠的自动迁移范围；
- 现在同时改名称、URL 和页面结构，会增加不必要的迁移风险，也不方便判断每项修改的效果。

长期推荐顺序：

1. 先更新产品名称、SEO 元数据和 README，不改变 URL；
2. 购买并验证一个稳定的独立品牌域名；
3. 将 GitHub Pages 绑定至该域名并启用 HTTPS；
4. 更新 canonical、Open Graph、JSON-LD、robots.txt 和 sitemap；
5. 在 Google Search Console 中验证新站点、提交 sitemap 并请求重新索引；
6. 观察收录、曝光和流量迁移；
7. 新域名稳定后，再决定是否将仓库改名为 `markdown-publishing-toolkit`；
8. 测试旧 URL 到新 URL 的永久重定向，并尽可能长期保留。

如果暂时不准备购买域名，可以长期保留现有仓库名与 Pages 地址，仅更新公开品牌和页面内容，不必为了视觉统一而强行改 URL。

## 4. 渠道落地页的角色与交互

SEO 落地页是用户从搜索引擎进入网站的入口；编辑器下拉框是用户进入产品后的应用状态。二者不应被强制绑定成“每切换一次渠道就整页跳转”。

目标体验：

```text
搜索“Markdown 转微信公众号”
→ 进入 /wechat/，默认选中 WeChat
→ 直接使用转换器
→ 切换 LinkedIn 时原地更新，无刷新、无整页跳转
```

规划的入口：

```text
/                         Markdown 多渠道发布格式转换器
/wechat/                  Markdown 转微信公众号排版
/substack/                Markdown 转 Substack 富文本
/linkedin/                Markdown 转 LinkedIn 格式
/x-article-thread/        Markdown 转 X Article 和 Thread
```

### 第一阶段：低成本验证

每个渠道先建立一个轻量内容页，包含：

- 独立 title、description、H1 和 canonical；
- 目标渠道的用途与限制；
- 转换前后示例；
- 常见问题；
- “立即转换”按钮。

按钮进入首页编辑器，例如：

```text
/?channel=wechat
```

首页读取 `channel` 参数并预选渠道。用户进入编辑器后，切换下拉框只更新 JavaScript 状态，不刷新页面。

这一方案存在一次从介绍页进入编辑器的明确跳转，但开发成本最低，适合先验证关键词是否真的能获得曝光和激活。

### 第二阶段：有流量后升级

当某个渠道页已经产生稳定流量，可让该渠道页直接加载同一套编辑器：

- 所有渠道页共享 CSS、JavaScript 和转换逻辑；
- 页面只保留不同的 head 元数据、可见介绍文字和默认渠道；
- 下拉框切换仍然在当前页面内完成；
- SEO 内容可以放在编辑器下方，不打断主要操作。

不要把 `?channel=wechat` 等查询参数直接当成正式 SEO 落地页。它们适合保存或分享应用状态，但不适合作为多个高度相似的可索引页面。

## 5. 各渠道页面的关键词方向

### WeChat

主搜索意图：Markdown 转微信公众号、公众号排版、技术内容格式保留。

种子词：

```text
markdown 转微信公众号
markdown 公众号排版
微信公众号 markdown 编辑器
obsidian 发布微信公众号
mermaid 微信公众号
latex 公式复制到公众号
公众号代码高亮
markdown 图片复制到公众号
```

可覆盖能力：模板、主题色、图片、公式、Mermaid、代码高亮、富文本复制。

### Substack

```text
markdown to substack
substack markdown converter
paste markdown into substack
substack rich text formatter
```

### LinkedIn

```text
markdown to linkedin
linkedin article formatter
paste markdown into linkedin
linkedin post formatting tool
```

### X

```text
markdown to x article
x article formatter
twitter thread generator from markdown
markdown to twitter thread
x article and thread generator
```

## 6. 增长漏斗与核心指标

不能只观察访问量。这个产品的价值时刻是“用户成功复制了一份可发布内容”。

建议漏斗：

```text
搜索曝光
→ 点击进入
→ 输入或加载 Markdown
→ 选择渠道
→ 生成预览
→ 复制成功
→ 再次使用或点击 GitHub
```

建议北极星指标：

```text
每周成功复制人数
```

建议核心转化率：

```text
成功复制率 = 发生 copy_success 的用户数 / 网站访客数
```

解释方式：

- SEO 流量增长但复制率低：关键词、页面承诺或落地体验可能不匹配；
- 流量较小但复制率高：该搜索意图质量较高，适合继续扩展相似关键词和内容；
- 有输入和预览但没有复制：需要检查复制按钮、结果质量、平台兼容性和错误提示；
- 有复制但没有回访：需要考虑模板保存、最近使用渠道、可分享链接或更新订阅。

## 7. GA4 事件规划

当前页面已有 GA4，但后续应从只有 `page_view` 扩展到产品事件：

```text
example_loaded
markdown_entered
channel_selected
preview_generated
copy_success
copy_failed
translation_completed
x_thread_generated
github_clicked
```

推荐事件参数：

```text
channel
language
template
copy_type
error_type
```

隐私约束：

- 不上传用户输入的 Markdown；
- 不上传图片内容或地址；
- 不上传 OpenRouter API Key；
- 不上传生成后的文章正文；
- 只记录渠道、语言、模板和结果状态等非内容数据。

## 8. 免费 SEO 与增长工具

| 工具 | 用途 |
|---|---|
| [Google Search Console](https://search.google.com/search-console/) | 查看真实搜索词、曝光、点击、CTR、平均位置、收录和 sitemap 状态 |
| [Google Analytics](https://analytics.google.com/) | 查看用户进入网站后的渠道选择、预览、复制和回访行为 |
| [Google Keyword Planner](https://ads.google.com/home/tools/keyword-planner/) | 扩展关键词，查看大致搜索量、地区和语言差异 |
| [Google Trends](https://trends.google.com/) | 比较关键词趋势、地区和季节性，不代表绝对搜索量 |
| [Bing Webmaster Tools](https://www.bing.com/webmasters/) | 关键词研究、搜索量趋势、问题型关键词、索引和 SEO 报告 |
| [Ahrefs Free](https://ahrefs.com/webmaster-tools) | 检查已验证网站的技术问题、关键词、外链和热门页面 |
| [PageSpeed Insights](https://pagespeed.web.dev/) | 检查移动端/桌面端性能与 Core Web Vitals |
| [Rich Results Test](https://search.google.com/test/rich-results) | 检查结构化数据是否可被 Google 识别 |
| [Screaming Frog SEO Spider](https://www.screamingfrog.co.uk/seo-spider/) | 批量检查 title、description、canonical、404、重复页面；免费版最多抓取 500 个 URL |

项目规模较小时不需要立即购买 Semrush 或 Ahrefs 的付费版本。先使用 Search Console 的真实数据、GA4 行为数据和免费关键词工具建立方法。

## 9. “50–200”指标的澄清

“50–200”可能指两种完全不同的指标。

### 如果是每月搜索量 50–200

这类关键词适合早期项目：

- 搜索量不大但意图具体；
- 竞争通常相对较低；
- 一个实用工具页或教程就可能承接稳定长尾流量；
- 更容易验证访问者是否真正需要产品。

### 如果是搜索排名第 50–200 位

这些位置通常几乎没有点击，只适合作为选题线索，不应作为最快的增长机会。

建议优先级：

- 排名 5–15：重点改善 title、description 和搜索摘要，提高 CTR；
- 排名 8–30：典型的快速提升机会，优先补充内容、示例、FAQ 和内链；
- 排名 30–50：产品高度匹配时继续优化；
- 排名 50–200：只有意图高度相关、产品能直接解决问题时才考虑单独建页；
- 没有现有排名但月搜索量约 50–500：适合作为新落地页或教程候选。

最终应更关注曝光、点击、CTR 和成功复制量的趋势，而不是孤立地追逐平均排名。

## 10. 关键词研究流程

### 10.1 建立种子词

从用户想完成的任务出发，而不是只枚举产品功能。按渠道、问题和内容类型建立种子词。

### 10.2 扩展关键词

将种子词分别输入：

1. Google Keyword Planner；
2. Bing Keyword Research；
3. Google 搜索自动补全；
4. Google 的 People also ask；
5. 搜索结果页的相关搜索；
6. Google Trends；
7. Search Console 中网站已经产生曝光的真实 query。

### 10.3 建立关键词表

建议字段：

```text
关键词
语言/地区
搜索意图
月搜索量范围
当前平均排名
当前曝光
当前点击
当前 CTR
竞争程度
产品匹配度（1–5）
目标页面
内容类型
发布日期
后续复盘日期
状态
```

### 10.4 人工检查搜索意图

亲自搜索关键词并查看前十名结果：

- 结果大部分是在线转换器：建立工具型落地页；
- 结果大部分是教程：编写教程；
- 结果大部分是产品列表：考虑比较页或工具集合内容；
- 结果与产品能力不匹配：即使搜索量高也暂时放弃。

示例：

```text
“Markdown 转微信公众号”
→ 工具型意图
→ /wechat/

“微信公众号怎么显示 LaTeX 公式”
→ 教程型意图
→ /guides/wechat-latex-formula/

“Substack 支持 Markdown 吗”
→ 问题/教程型意图
→ /guides/does-substack-support-markdown/
```

一个 URL 覆盖一个搜索意图及其近义词，不要为每一个词序变化建立独立页面，避免关键词互相竞争和重复内容。

### 10.5 排定优先级

早期可使用简单规则：

```text
产品匹配度高
+ 搜索意图明确
+ 月搜索量约 50–500
+ 搜索结果中的现有页面不够完整或已经过时
+ 用户进入后可以直接使用产品解决问题
= 高优先级
```

对已经产生 Search Console 数据的页面，优先处理：

- 高曝光、低 CTR：优化标题、描述和页面承诺；
- 排名 8–30、产品高度匹配：补充内容、案例、FAQ 和内链；
- 有点击但复制率低：优化落地体验和产品输出，而不是继续堆 SEO 内容；
- 复制率高但曝光低：扩展相似长尾词、教程和外部传播。

## 11. 每周增长节奏

建议建立一个轻量、可持续的循环：

1. 周一查看 Search Console 最近 28 天与前 28 天对比；
2. 查看 Queries、Pages、Impressions、Clicks、CTR 和 Average position；
3. 同时查看 GA4 中各落地页的 `copy_success`；
4. 每周只选择一个关键词集或一个漏斗问题；
5. 新建或改进一个页面，不同时修改大量无关因素；
6. 从首页和相关页面增加内部链接；
7. 更新 sitemap，并使用 URL Inspection 请求重新索引；
8. 记录发布日期、修改内容和基准数据；
9. 两至四周后复盘，不因一两天的排名波动做激烈修改。

Search Console 尚无足够数据时：

1. 先建立四个渠道页；
2. 再发布两至三篇与核心能力直接相关的高意图教程；
3. 完成 GA4 漏斗事件；
4. 等待真实 query 数据出现后，再决定下一批内容。

## 12. 推荐的初始内容组合

第一批：

- `/wechat/`
- `/substack/`
- `/linkedin/`
- `/x-article-thread/`

第二批教程候选：

- Markdown 里的 LaTeX 公式如何复制到微信公众号；
- Mermaid 流程图如何发布到微信公众号；
- 从 Obsidian 把带图片的 Markdown 发布到微信公众号；
- 如何把一篇 Markdown 同时整理成 Substack、LinkedIn 和 X 版本；
- Substack 是否支持 Markdown，以及粘贴时会丢失哪些格式；
- 如何把 Markdown 长文拆成 X Article 和 Thread。

每篇内容都应该包含真实示例、产品实际限制、可操作步骤和进入对应转换渠道的按钮，避免只为关键词制造空泛页面。

## 13. 市场与定位提醒

WeChat 与 Substack、LinkedIn、X 对应的用户、语言和搜索引擎环境并不完全相同。后续需要明确第一阶段主市场：

- 如果先服务中文技术创作者：优先 WeChat、Obsidian、公式、Mermaid、代码和图片相关搜索意图；
- 如果先服务国际创作者：优先英文 `/en/` 页面，以及 Substack、LinkedIn、X 关键词；
- 如果同时做中英文：使用独立的 `/zh/` 与 `/en/` 内容和 hreflang，不在同一个页面里简单堆叠两种语言。

推荐的差异化定位：

> 技术创作者用一份 Markdown，把公式、Mermaid、代码和图片适配到多个内容平台。

它比泛泛的“多平台发布工具”更窄，但更符合现有产品能力，也更容易建立高意图关键词与用户成功复制之间的增长闭环。

## 14. 后续执行清单

2026-08-24 实施说明：已完成首页多渠道元数据、分享图、隐私安全 GA4 事件、`?channel=` 预选、四个轻量渠道页、内部链接和 sitemap。Search Console、Bing Webmaster Tools、GA4 关键事件及独立域名仍需站点所有者在外部后台完成。

### 品牌与基础 SEO

- [ ] 确认最终产品名与独立域名候选；
- [x] 更新 title、description、H1 和首页可见说明；
- [x] 更新 Open Graph、Twitter Card 和分享图；
- [x] 更新 JSON-LD，并保留旧名称作为 `alternateName`；
- [ ] 更新 README、示例内容、GitHub description 和 topics；
- [x] 更新 sitemap 的 URL 和真实修改日期；
- [ ] 检查 robots.txt、canonical 和 404；
- [ ] 使用 PageSpeed Insights 和 Rich Results Test 验证；
- [ ] 在 Search Console 与 Bing Webmaster Tools 中提交 sitemap。

### 落地页

- [x] 新建 WeChat 落地页；
- [x] 新建 Substack 落地页；
- [x] 新建 LinkedIn 落地页；
- [x] 新建 X Article + Thread 落地页；
- [x] 首页支持读取 `?channel=` 并预选渠道；
- [x] 确保下拉框切换无刷新；
- [x] 为每页添加独立内容、FAQ、示例和内链；
- [ ] 根据流量决定是否将完整编辑器嵌入渠道页。

### 分析与增长

- [x] 配置 GA4 产品事件；
- [ ] 将 `copy_success` 设为关键事件；
- [ ] 连接 Search Console 与 GA4；
- [ ] 建立关键词与实验记录表；
- [ ] 记录初始 28 天基准；
- [ ] 建立每周增长复盘；
- [ ] 按曝光、CTR、复制成功率共同评估页面；
- [ ] 每次只验证一个主要假设。

## 参考资料

- [Google Search Console](https://search.google.com/search-console/)
- [Google Search Console 与 Google Analytics 配合使用](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console)
- [Google Search Console Performance 常见任务](https://support.google.com/webmasters/answer/17010961)
- [Google Keyword Planner 使用说明](https://support.google.com/google-ads/answer/7337243)
- [Google 站点迁移指南](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [GitHub 仓库改名说明](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
- [GitHub Pages 自定义域名说明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Bing Webmaster Tools Keyword Research](https://www.bing.com/webmasters/help/keyword-research-628070b6)
- [Ahrefs Free / Webmaster Tools](https://ahrefs.com/webmaster-tools)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Screaming Frog SEO Spider](https://www.screamingfrog.co.uk/seo-spider/)
