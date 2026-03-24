// Non-destructive add-on component
export default function SectionCard({ title, extra=null, children }){
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{title}</div>
        <div className="flex gap-2">{extra}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}
