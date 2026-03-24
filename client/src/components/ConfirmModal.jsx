export default function ConfirmModal({ open, title='确认操作', content, onCancel, onOk }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
        <div className="font-semibold mb-2">{title}</div>
        <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">{content}</div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onCancel}>取消</button>
          <button className="btn btn-danger" onClick={onOk}>确认</button>
        </div>
      </div>
    </div>
  );
}
