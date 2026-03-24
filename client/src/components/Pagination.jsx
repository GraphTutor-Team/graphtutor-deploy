// Non-destructive add-on component
export default function Pagination({ page, pageSize, total, onChange }){
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-end gap-2">
      <button className="btn" disabled={page<=1} onClick={()=>onChange(page-1)}>上一页</button>
      <div className="text-sm">第 {page} / {pages} 页</div>
      <button className="btn" disabled={page>=pages} onClick={()=>onChange(page+1)}>下一页</button>
    </div>
  );
}
