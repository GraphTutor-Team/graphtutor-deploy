import { Link } from 'react-router-dom';

export default function AuthLayout({ title='欢迎回来', subtitle='继续你的学习之旅', image='/images/auth-hero.svg', children }){
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <aside className="order-1 md:order-2 relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
        <div className="absolute top-4 left-4">
          <Link to="/home" className="btn btn-ghost">← 返回首页</Link>
        </div>
        <div className="h-full w-full flex flex-col items-center justify-center text-center px-8 gap-3">
          <Link to="/home" className="text-2xl font-extrabold tracking-wide">GraphTutor</Link>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-slate-600 dark:text-slate-300">{subtitle}</p>
          <div className="w-72 h-72 md:w-80 md:h-80 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-white/5 backdrop-blur grid place-items-center overflow-hidden">
            <img src={image} alt="" className="w-3/4 h-3/4 object-contain" onError={(e)=>{ e.currentTarget.style.display='none' }} />
            <div className="text-6xl select-none">🧭</div>
          </div>
          <div className="text-xs opacity-70">（预留插图/动画位）</div>
        </div>
      </aside>
      <section className="order-2 md:order-1 px-6 py-8 flex items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  )
}
