export default function HelpHint({title='说明', children}){
  return (
    <details className="rounded-xl border p-3">
      <summary className="cursor-pointer select-none font-medium">{title}</summary>
      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{children}</div>
    </details>
  );
}
