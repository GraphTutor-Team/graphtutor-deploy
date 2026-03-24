export default function BackBar({ title='返回', href='/' }){
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <a className="btn btn-ghost" href={href}>← 返回</a>
        <div className="text-xl font-semibold">{title}</div>
      </div>
    </div>
  );
}
