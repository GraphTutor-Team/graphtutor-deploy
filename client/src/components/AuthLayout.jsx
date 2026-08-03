import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function AuthLayout({ title='欢迎回来', subtitle='继续你的学习之旅', image, children }){
  const hero = image || logo;
  return (
    <div className="min-h-screen grid md:grid-cols-2" style={{ backgroundColor: 'var(--color-bg-page)' }}>
      <aside className="order-1 md:order-2 relative" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="absolute top-4 left-4">
          <Link to="/home" className="btn btn-ghost">← 返回首页</Link>
        </div>
        <div className="h-full w-full flex flex-col items-center justify-center text-center px-8 gap-3">
          <Link to="/home" className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>GraphTutor</Link>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>
          <div className="w-72 h-72 md:w-80 md:h-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] grid place-items-center overflow-hidden">
            <img src={hero} alt="" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none' }} />
          </div>
        </div>
      </aside>
      <section className="order-2 md:order-1 px-6 py-8 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  )
}
