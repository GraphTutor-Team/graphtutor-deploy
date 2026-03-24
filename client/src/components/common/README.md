# GraphTutor V3.0 - 通用组件使用指南

## 📚 可用组件

### 1. LoadingSpinner - 加载动画组件

统一的加载动画显示。

**使用示例：**
```javascript
import { LoadingSpinner } from '../components/common';

// 基础用法
<LoadingSpinner />

// 自定义大小和文本
<LoadingSpinner size="lg" text="正在加载数据..." />

// 全屏加载
<LoadingSpinner fullScreen text="页面加载中..." />
```

**Props：**
- `size`: 'sm' | 'md' | 'lg' | 'xl' (默认: 'md')
- `text`: string (默认: '加载中...')
- `fullScreen`: boolean (默认: false)
- `className`: string (自定义样式)

---

### 2. EmptyState - 空状态组件

统一显示空状态（无数据、无结果等）。

**使用示例：**
```javascript
import { EmptyState } from '../components/common';

// 基础用法
<EmptyState />

// 自定义内容
<EmptyState
  icon="📚"
  title="暂无题目"
  description="还没有创建任何题目，点击下方按钮开始创建"
  actionLabel="创建题目"
  actionLink="/questions/create"
/>

// 带操作按钮
<EmptyState
  title="暂无错题"
  description="恭喜！你还没有错题需要复习"
  action={() => navigate('/quiz')}
  actionLabel="开始练习"
/>
```

**Props：**
- `icon`: string (默认: '📭')
- `title`: string (默认: '暂无数据')
- `description`: string (默认: '这里还没有内容')
- `action`: function (点击操作函数)
- `actionLabel`: string (操作按钮文本)
- `actionLink`: string (操作链接路径)
- `className`: string (自定义样式)

---

### 3. ErrorBoundaryFallback - 错误边界回退组件

显示友好的错误界面。

**使用示例：**
```javascript
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorBoundaryFallback } from '../components/common';

<ErrorBoundary
  FallbackComponent={ErrorBoundaryFallback}
  onReset={() => window.location.reload()}
>
  <YourComponent />
</ErrorBoundary>
```

**Props：**
- `error`: Error (错误对象)
- `resetError`: function (重置错误函数)

---

### 4. ConfirmDialog - 确认对话框组件

统一的确认对话框。

**使用示例：**
```javascript
import { useState } from 'react';
import { ConfirmDialog } from '../components/common';

function MyComponent() {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>删除</button>
      <ConfirmDialog
        open={showConfirm}
        title="确认删除"
        message="确定要删除此项吗？此操作不可恢复。"
        type="danger"
        confirmText="删除"
        cancelText="取消"
        onConfirm={() => {
          // 执行删除操作
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
```

**Props：**
- `open`: boolean (是否显示)
- `title`: string (标题)
- `message`: string (消息内容)
- `confirmText`: string (确认按钮文本，默认: '确认')
- `cancelText`: string (取消按钮文本，默认: '取消')
- `onConfirm`: function (确认回调)
- `onCancel`: function (取消回调)
- `type`: 'warning' | 'danger' | 'info' (类型，默认: 'warning')

---

### 5. Badge - 徽章组件

显示标签、状态、数量等徽章。

**使用示例：**
```javascript
import { Badge } from '../components/common';

// 基础用法
<Badge>新</Badge>

// 不同变体
<Badge variant="success">已完成</Badge>
<Badge variant="warning">进行中</Badge>
<Badge variant="danger">已取消</Badge>

// 不同大小
<Badge size="sm">小</Badge>
<Badge size="md">中</Badge>
<Badge size="lg">大</Badge>

// 点状徽章
<Badge dot variant="danger" />
```

**Props：**
- `children`: ReactNode (徽章内容)
- `variant`: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' (默认: 'default')
- `size`: 'sm' | 'md' | 'lg' (默认: 'md')
- `dot`: boolean (是否显示为点，默认: false)
- `className`: string (自定义样式)

---

### 6. ProgressBar - 进度条组件

显示进度条。

**使用示例：**
```javascript
import { ProgressBar } from '../components/common';

// 基础用法
<ProgressBar value={60} max={100} />

// 带标签
<ProgressBar
  value={75}
  max={100}
  label="学习进度"
  showLabel
/>

// 不同变体
<ProgressBar value={80} variant="success" />
<ProgressBar value={50} variant="warning" />
<ProgressBar value={30} variant="danger" />

// 动画效果
<ProgressBar value={60} animated />
```

**Props：**
- `value`: number (当前值)
- `max`: number (最大值，默认: 100)
- `showLabel`: boolean (是否显示标签，默认: true)
- `label`: string (自定义标签文本)
- `variant`: 'default' | 'success' | 'warning' | 'danger' | 'info' (默认: 'default')
- `size`: 'sm' | 'md' | 'lg' (默认: 'md')
- `animated`: boolean (是否显示动画，默认: false)
- `className`: string (自定义样式)

---

### 7. ToastContainer - Toast通知容器组件

统一管理Toast通知的显示。

**使用示例：**
```javascript
import { ToastContainer } from '../components/common';

// 在App.jsx或根组件中添加
function App() {
  return (
    <>
      <YourApp />
      <ToastContainer />
    </>
  );
}
```

---

## 🎯 组合使用示例

### 加载状态 + 空状态

```javascript
import { LoadingSpinner, EmptyState } from '../components/common';

function DataList({ data, loading }) {
  if (loading) {
    return <LoadingSpinner text="加载数据中..." />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="暂无数据"
        description="还没有任何数据"
        actionLabel="创建数据"
        actionLink="/create"
      />
    );
  }

  return <div>{/* 数据列表 */}</div>;
}
```

### 确认对话框 + 操作

```javascript
import { useState } from 'react';
import { ConfirmDialog } from '../components/common';

function DeleteButton({ onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>删除</button>
      <ConfirmDialog
        open={showConfirm}
        title="确认删除"
        message="确定要删除吗？"
        type="danger"
        onConfirm={() => {
          onDelete();
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
```

---

## 📝 最佳实践

1. **统一使用**：在整个项目中使用这些通用组件，保持UI一致性
2. **合理使用**：根据场景选择合适的组件和变体
3. **自定义样式**：通过 `className` prop 进行样式定制
4. **无障碍访问**：所有组件都支持暗色模式和无障碍访问

---

## 🚀 性能优化

- 所有组件都使用函数式组件，性能优化
- 支持条件渲染，避免不必要的DOM操作
- 使用CSS动画而非JavaScript动画，性能更好

