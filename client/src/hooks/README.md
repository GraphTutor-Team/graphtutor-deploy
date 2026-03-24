# GraphTutor V3.0 - 自定义 Hooks 使用指南

## 📚 可用 Hooks

### 1. `useApiData` - API数据获取Hook

统一处理API数据获取、加载状态和错误处理。

**使用示例：**
```javascript
import { useApiData } from '../hooks';
import { getTodayReviewQuestions } from '../api/v3/smartReview';

function MyComponent() {
  const { data, loading, error, refetch } = useApiData(
    getTodayReviewQuestions,
    { limit: 20 },
    {
      onSuccess: (data) => {
        console.log('数据加载成功:', data);
      },
      onError: (err) => {
        console.error('数据加载失败:', err);
      },
    }
  );

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  
  return (
    <div>
      {data?.questions?.map(q => <div key={q._id}>{q.content}</div>)}
      <button onClick={refetch}>刷新</button>
    </div>
  );
}
```

---

### 2. `useLocalStorage` - 本地存储Hook

简化localStorage的使用，自动处理JSON序列化。

**使用示例：**
```javascript
import { useLocalStorage } from '../hooks';

function MyComponent() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  const [settings, setSettings] = useLocalStorage('settings', {
    notifications: true,
    language: 'zh-CN',
  });

  return (
    <div>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        切换主题: {theme}
      </button>
      <button onClick={() => setSettings(prev => ({
        ...prev,
        notifications: !prev.notifications
      }))}>
        通知: {settings.notifications ? '开启' : '关闭'}
      </button>
    </div>
  );
}
```

---

### 3. `useDebounce` - 防抖Hook

延迟执行，避免频繁调用。

**使用示例：**
```javascript
import { useState } from 'react';
import { useDebounce } from '../hooks';
import { searchQuestions } from '../api/v3/questions';

function SearchComponent() {
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 500);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (debouncedKeyword) {
      searchQuestions({ keyword: debouncedKeyword }).then(res => {
        setResults(res.data.items || []);
      });
    }
  }, [debouncedKeyword]);

  return (
    <div>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索题目..."
      />
      <div>
        {results.map(r => <div key={r._id}>{r.content}</div>)}
      </div>
    </div>
  );
}
```

---

### 4. `usePagination` - 分页Hook

统一处理分页逻辑。

**使用示例：**
```javascript
import { usePagination } from '../hooks';
import { getWrongQuestions } from '../api/v3/wrongQuestions';

function WrongQuestionsList() {
  const pagination = usePagination({
    initialPage: 1,
    initialLimit: 20,
  });

  const { data, loading } = useApiData(
    getWrongQuestions,
    {
      page: pagination.page,
      limit: pagination.limit,
    }
  );

  useEffect(() => {
    if (data) {
      pagination.setTotal(data.total || 0);
    }
  }, [data]);

  return (
    <div>
      {loading ? <div>加载中...</div> : (
        <div>
          {data?.items?.map(q => <div key={q._id}>{q.content}</div>)}
        </div>
      )}
      
      <div>
        <button
          onClick={pagination.prevPage}
          disabled={!pagination.hasPrev}
        >
          上一页
        </button>
        <span>第 {pagination.page} 页 / 共 {pagination.totalPages} 页</span>
        <button
          onClick={pagination.nextPage}
          disabled={!pagination.hasNext}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
```

---

### 5. `useIntersectionObserver` - 交叉观察器Hook

检测元素是否进入视口，用于无限滚动等场景。

**使用示例：**
```javascript
import { useIntersectionObserver } from '../hooks';
import { getNotifications } from '../api/v3/notifications';

function InfiniteScrollList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [loadMoreRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && !loading) {
      loadMore();
    }
  }, [isIntersecting]);

  const loadMore = async () => {
    setLoading(true);
    const result = await getNotifications({ page, limit: 20 });
    setItems(prev => [...prev, ...(result.data.items || [])]);
    setPage(prev => prev + 1);
    setLoading(false);
  };

  return (
    <div>
      {items.map(item => <div key={item._id}>{item.content}</div>)}
      <div ref={loadMoreRef}>
        {loading ? '加载中...' : '滚动加载更多'}
      </div>
    </div>
  );
}
```

---

## 🎯 最佳实践

1. **组合使用**：多个Hooks可以组合使用，例如 `useApiData` + `usePagination`
2. **错误处理**：使用 `useApiData` 时，错误会自动处理，但可以通过 `onError` 回调自定义
3. **性能优化**：使用 `useDebounce` 优化搜索和输入场景
4. **无限滚动**：使用 `useIntersectionObserver` 实现无限滚动列表

---

## 📝 注意事项

- `useApiData` 的 `params` 参数变化时会自动重新获取数据
- `useLocalStorage` 会自动处理JSON序列化，但只支持可序列化的值
- `useDebounce` 的延迟时间建议根据实际场景调整（搜索500ms，输入300ms）
- `usePagination` 需要手动调用 `setTotal` 来更新总数
- `useIntersectionObserver` 需要确保元素已挂载到DOM

