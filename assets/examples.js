// 示例数据模块
const ExampleData = {
    // 获取示例Markdown内容
    getExampleMarkdown: function() {
        return `# AI视觉领域的"铁三角"

## 他们是谁？

**Lucas Beyer、Alexander Kolesnikov 和 Xiaohua Zhai** 被业界称为 AI 视觉领域的"铁三角"。

### Vision Transformer (ViT)：给AI换了副"眼镜"

**原来VS现在**：

- **原来（CNN方式）**：像一个靠放大镜局部查看图像的人
    - CNN 像一个人拿着放大镜在图片上**从左到右、从上到下地滑动观察**
    - 每次只关注图片的**局部区域（小方块）**，从中提取纹理、边缘等信息
    - 多层叠加后，它逐渐构建出对整体图像的理解
- **现在（ViT方式）**：像一个人把整张图切成拼图块，然后"阅读"这些拼图块的关系
    - ViT 首先把整张图像**切成一个个小块（patch）**，每个块像是一张卡片
    - 把每个卡片"编码"为一个向量，然后像 Transformer 看句子一样
        - 使用注意力机制捕捉它们之间的关系
        - 能同时关注图片任意两个位置
    - 它不像 CNN 那样关注邻近区域，而是能一开始就从全局出发进行建模

### 核心贡献

他们的主要研究成果包括：

- **Big Transfer (BiT)**：让AI成为"学霸"
    - 大规模预训练策略：在3亿张图片的超大数据集上训练AI
    - 标准化迁移流程：建立了一套"预训练→微调"的标准做法
    - BiT-HyperRule规则：根据任务大小自动调整训练参数
- **Vision Transformer (ViT)**：给AI换了副"眼镜"  
    - 图像序列化：把2D图片变成1D序列，就像把文字排成一行
    - 全局注意力机制：能同时关注图片任意两个位置的关系
    - 统一架构：图片和文字用同样的Transformer处理
- **MLP-Mixer**：极简主义的胜利
    - Token-Mixing MLP（空间搅拌器）：混合不同位置间的信息
    - Channel-Mixing MLP（特征搅拌器）：混合每个位置内部的特征
    - 挑战传统认知：证明简单有时更有效

### 技术细节对比

下面是一个表格示例：

| 特性 | 传统CNN | Vision Transformer (ViT) |
| :--- | :--- | :--- |
| **核心操作** | 局部卷积 | 全局自注意力 |
| **感受野** | 逐步扩大 | 一开始即全局 |
| **数据处理** | 2D图像数组 | 1D序列（Patches） |
| **计算复杂度**| O(k² * C_in * C_out) | O(n² * d) |

以及数学公式：

- **行内公式**: 著名的质能方程是 $E = mc^2$。
- **块级公式**: 求解二次方程 $ax^2 + bx + c = 0$ 的公式是：
$$ x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} $$

> 如果说 AI 是个不断学习的学生，那三位就是陪它从"看不懂图片"到"能看图说话"的老师。

### 应用场景展示

这些技术已经被广泛应用在：

- **计算机视觉领域**
    - 图像分类任务
        - ImageNet 数据集
        - 细粒度分类
    - 目标检测任务
        - COCO 数据集
        - 实时检测系统
    - 语义分割任务
        - 像素级分类
        - 医学影像分析
- **多模态应用领域**
    - 图文理解任务
        - 看图说话
        - 视觉问答
    - 跨模态检索
        - 图文匹配
        - 内容推荐
- **工业应用领域**
    - 自动驾驶技术
        - 路况识别
        - 障碍物检测
        - 交通标志识别
    - 医学影像诊断
        - X光片分析
        - CT扫描处理
        - 病理切片检查
    - 智能制造系统
        - 质量检测
        - 缺陷识别
        - 自动化分拣

![AI视觉发展](https://via.placeholder.com/600x300/7E3AF2/ffffff?text=AI+Vision+Evolution)

**了解更多**：[点击查看详细论文](https://example.com)

### 代码示例

\`\`\`python
import torch
import timm

# 加载预训练的Vision Transformer模型
model = timm.create_model('vit_base_patch16_224', pretrained=True)

# 设置为评估模式
model.eval()

# 输入图像（假设已经预处理）
x = torch.randn(1, 3, 224, 224)

# 前向传播
with torch.no_grad():
    output = model(x)
    
print(f"输出形状: {output.shape}")
\`\`\`

**总结：** 这三位研究者的工作不仅推动了计算机视觉技术的发展，更重要的是改变了我们对视觉感知的理解方式。`;
    },

    // 获取简单示例
    getSimpleExample: function() {
        return `# 标题示例

## 二级标题

这是一段正文，支持 **粗体** 和 *斜体*。

- 列表项目1
- 列表项目2
    - 嵌套列表
    - 另一个嵌套项

> 这是引用内容

\`\`\`javascript
console.log('Hello World');
\`\`\`

| 列1 | 列2 |
|---|---|
| 内容1 | 内容2 |

数学公式：$E = mc^2$

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
            { name: 'AI视觉完整示例', key: 'full' },
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