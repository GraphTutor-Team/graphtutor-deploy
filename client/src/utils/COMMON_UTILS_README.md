# GraphTutor V3.0 - 通用工具函数使用指南

## 📚 工具函数分类

### 1. 日期工具 (`dateUtils.js`)

#### `formatDate(date, format)`
格式化日期
```javascript
import { formatDate } from '../utils/commonUtils';

formatDate(new Date(), 'YYYY-MM-DD'); // "2024-01-15"
formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss'); // "2024-01-15 14:30:00"
```

#### `formatRelativeTime(date)`
格式化相对时间
```javascript
import { formatRelativeTime } from '../utils/commonUtils';

formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000)); // "5分钟前"
formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)); // "2小时前"
```

#### `getDateRange(days)`
获取日期范围
```javascript
import { getDateRange } from '../utils/commonUtils';

const { start, end } = getDateRange(-7); // 过去7天
```

#### `isSameDay(date1, date2)`
判断是否为同一天
```javascript
import { isSameDay } from '../utils/commonUtils';

isSameDay(new Date(), new Date()); // true
```

---

### 2. 数字工具 (`numberUtils.js`)

#### `formatNumber(num, decimals)`
格式化数字（添加千分位）
```javascript
import { formatNumber } from '../utils/commonUtils';

formatNumber(1234567.89, 2); // "1,234,567.89"
formatNumber(1234567); // "1,234,567"
```

#### `formatPercent(num, decimals)`
格式化百分比
```javascript
import { formatPercent } from '../utils/commonUtils';

formatPercent(0.8567, 1); // "85.7%"
```

#### `formatFileSize(bytes, decimals)`
格式化文件大小
```javascript
import { formatFileSize } from '../utils/commonUtils';

formatFileSize(1024); // "1 KB"
formatFileSize(1048576); // "1 MB"
```

#### `clamp(num, min, max)`
限制数字范围
```javascript
import { clamp } from '../utils/commonUtils';

clamp(150, 0, 100); // 100
clamp(-10, 0, 100); // 0
```

---

### 3. 字符串工具 (`stringUtils.js`)

#### `truncate(str, length, suffix)`
截断字符串
```javascript
import { truncate } from '../utils/commonUtils';

truncate('这是一段很长的文本', 5); // "这是一段..."
truncate('短文本', 10); // "短文本"
```

#### `capitalize(str)`
首字母大写
```javascript
import { capitalize } from '../utils/commonUtils';

capitalize('hello world'); // "Hello world"
```

#### `stripHtml(html)`
移除HTML标签
```javascript
import { stripHtml } from '../utils/commonUtils';

stripHtml('<p>Hello <b>World</b></p>'); // "Hello World"
```

#### `escapeHtml(str)`
转义HTML
```javascript
import { escapeHtml } from '../utils/commonUtils';

escapeHtml('<script>alert("xss")</script>'); // "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
```

---

### 4. 数组工具 (`arrayUtils.js`)

#### `unique(arr, keyFn)`
数组去重
```javascript
import { unique } from '../utils/commonUtils';

unique([1, 2, 2, 3, 3, 3]); // [1, 2, 3]
unique([{id: 1}, {id: 2}, {id: 1}], item => item.id); // [{id: 1}, {id: 2}]
```

#### `groupBy(arr, keyFn)`
数组分组
```javascript
import { groupBy } from '../utils/commonUtils';

groupBy([{type: 'A', value: 1}, {type: 'B', value: 2}, {type: 'A', value: 3}], 'type');
// { A: [{type: 'A', value: 1}, {type: 'A', value: 3}], B: [{type: 'B', value: 2}] }
```

#### `sortBy(arr, keyFn, order)`
数组排序
```javascript
import { sortBy } from '../utils/commonUtils';

sortBy([{score: 80}, {score: 90}, {score: 70}], 'score', 'desc');
// [{score: 90}, {score: 80}, {score: 70}]
```

#### `paginate(arr, page, pageSize)`
数组分页
```javascript
import { paginate } from '../utils/commonUtils';

paginate([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 2, 3);
// { items: [4, 5, 6], total: 10, page: 2, pageSize: 3, totalPages: 4 }
```

#### `chunk(arr, size)`
数组分块
```javascript
import { chunk } from '../utils/commonUtils';

chunk([1, 2, 3, 4, 5, 6], 2); // [[1, 2], [3, 4], [5, 6]]
```

---

## 🎯 使用示例

### 组合使用多个工具函数

```javascript
import { formatDate, formatPercent, truncate, groupBy } from '../utils/commonUtils';

// 格式化学习数据
const learningData = [
  { date: new Date(), score: 0.85, title: '这是一段很长的学习笔记标题' },
  { date: new Date(), score: 0.92, title: '另一段笔记' },
];

// 格式化显示
const formatted = learningData.map(item => ({
  date: formatDate(item.date, 'YYYY-MM-DD'),
  score: formatPercent(item.score),
  title: truncate(item.title, 10),
}));

// 按日期分组
const grouped = groupBy(learningData, item => formatDate(item.date, 'YYYY-MM-DD'));
```

---

## 📝 注意事项

1. **日期处理**：所有日期函数都支持 Date 对象、时间戳和日期字符串
2. **数字处理**：注意 NaN 和 null 的处理
3. **字符串处理**：注意空字符串和 null 的处理
4. **数组处理**：注意空数组和 null 的处理

---

## 🚀 性能优化建议

1. **大量数据处理**：使用 `chunk` 分块处理
2. **频繁计算**：考虑使用 memoization
3. **字符串操作**：避免在循环中进行大量字符串拼接

---

## 📖 完整API文档

所有工具函数都包含详细的JSDoc注释，可以在IDE中查看完整的类型定义和使用说明。

