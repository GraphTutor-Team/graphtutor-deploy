export default function Empty({ text='暂无数据', className='' }){
  return <div className={`text-sm text-slate-500 ${className}`}>{text}</div>;
}
