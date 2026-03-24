import { forwardRef } from 'react';
const FilePicker = forwardRef(function FilePicker({ onText, accept='.json,.csv' }, ref){
  async function pick(e){
    const f = e.target.files?.[0];
    if(!f) return;
    const text = await f.text();
    onText?.(text, f);
    e.target.value = '';
  }
  return <input ref={ref} type="file" accept={accept} onChange={pick} className="hidden" />;
});
export default FilePicker;
