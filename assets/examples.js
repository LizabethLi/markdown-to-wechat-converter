// 示例数据模块
const ExampleData = {
    // 获取示例Markdown内容
    getExampleMarkdown: function() {
        return `
# 这是主标题
## 这是副标题  
### 这是小标题

这是一段正文，支持 **粗体** 和 *斜体*。

- **一级列表项目1**
    - 二级列表项目1
    - 二级列表项目2
        - 三级列表项目1
        - 三级列表项目2
- **一级列表项目2**
    - 二级列表项目3

> 这是引用内容


| 表头1 | 表头2 |
|---|---|
| 单元格1 | 单元格2 |

行内公式：$E = mc^2$

块级公式：$$ \\sum_{i=1}^{n} x_i = n $$

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