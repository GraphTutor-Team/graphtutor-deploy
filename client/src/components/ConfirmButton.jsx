export default function ConfirmButton({ onConfirm, children, text='确定执行？', className='' }){
  function run(){
    if(window.confirm(text)) onConfirm?.();
  }
  return <button className={className || 'btn btn-danger'} onClick={run}>{children}</button>;
}
