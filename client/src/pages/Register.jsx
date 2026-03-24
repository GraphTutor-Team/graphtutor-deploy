/**
 * GraphTutor V3.0 - 用户注册页面
 * 
 * 作用：提供用户注册功能，包括邮箱验证、密码强度检查、密码确认等
 * 关联页面：
 *   - pages/Login.jsx (登录页面)
 *   - context/AuthContext.jsx (认证上下文，处理注册逻辑)
 *   - api/auth.js (注册API)
 *   - utils/passwordValidation.js (密码验证工具)
 * 技术栈：
 *   - React Hooks (useState)
 *   - React Router (useNavigate)
 *   - 密码强度验证
 *   - 实时表单验证
 *   - Toast通知
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validatePasswordFormat, checkPasswordRequirements, getPasswordRequirements } from '../utils/passwordValidation';
import { toast } from '../utils/toast';

export default function Register(){
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');

  function handlePasswordChange(value) {
    setPassword(value);
    setErr('');
    
    if (value) {
      const validation = validatePasswordFormat(value);
      if (validation.valid) {
        const colorClass = 
          validation.strength === "strong" ? "text-emerald-700" :
          validation.strength === "medium" ? "text-amber-700" :
          "text-red-700";
        setPasswordHint(validation.message);
      } else {
        setPasswordHint(validation.message);
      }
    } else {
      setPasswordHint('');
    }
  }

  async function submit(e){
    e.preventDefault();
    setErr('');
    
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
      setErr('请输入有效邮箱'); 
      return;
    }
    
    // 验证密码格式
    const passwordCheck = checkPasswordRequirements(password);
    if (!passwordCheck.valid) {
      setErr(passwordCheck.message);
      return;
    }
    
    if (password !== confirm){
      setErr('两次密码不一致'); 
      return;
    }
    setBusy(true);
    try{
      const r = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
      const data = await r.json();
      if (r.ok && data.success){
        toast.success('注册成功'); 
        nav('/login');
      } else {
        // 显示后端返回的具体错误信息
        setErr(data.message || '注册失败（接口未实现或邮箱已存在）');
      }
    }catch(e){
      console.error('注册错误:', e);
      setErr('网络不可用或接口未实现');
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="absolute top-4 left-4">
        <Link className="btn btn-ghost bg-white/90 backdrop-blur-sm hover:bg-white shadow-md" to="/home">← 返回主页</Link>
      </div>
      <form onSubmit={submit} className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">注册</h1>
          <p className="text-sm font-medium text-slate-600">创建新账号，开始学习之旅</p>
        </div>
        {err && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg text-sm animate-fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {err}
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="label">邮箱</label>
            <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="label">
              密码
              <span className="text-xs font-normal text-slate-500 ml-2">（至少 6 位）</span>
            </label>
            <div className="relative">
              <input 
                className="input pr-10" 
                type={show?'text':'password'} 
                value={password} 
                onChange={e=>handlePasswordChange(e.target.value)} 
                placeholder="请输入密码（至少 6 位）" 
                minLength={6}
                maxLength={50}
              />
              <button 
                type="button" 
                className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-700 hover:text-slate-900" 
                onClick={()=>setShow(s=>!s)}
              >
                {show?'隐藏':'显示'}
              </button>
            </div>
            {passwordHint && (
              <div className={`text-xs font-medium ${
                passwordHint.includes('强') ? 'text-emerald-700' :
                passwordHint.includes('中') ? 'text-amber-700' :
                passwordHint.includes('弱') ? 'text-red-700' :
                'text-red-700'
              }`}>
                {passwordHint}
              </div>
            )}
            {password && (
              <div className="text-xs font-medium text-slate-600 space-y-1">
                <div className="font-semibold mb-1">密码格式要求：</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {getPasswordRequirements().map((req, i) => (
                    <li key={i} className={i === 0 ? 'font-semibold' : ''}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="label">确认密码</label>
            <input 
              className="input" 
              type={show?'text':'password'} 
              value={confirm} 
              onChange={e=>setConfirm(e.target.value)} 
              placeholder="再次输入密码" 
            />
            {confirm && password !== confirm && (
              <div className="text-xs font-medium text-red-700">
                两次输入的密码不一致
              </div>
            )}
            {confirm && password === confirm && password && (
              <div className="text-xs font-medium text-emerald-700">
                ✓ 密码一致
              </div>
            )}
          </div>
        </div>
        <button 
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" 
          disabled={busy} 
          type="submit"
        >
          {busy ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              注册中…
            </>
          ) : (
            "注册"
          )}
        </button>
        <div className="text-sm font-medium text-slate-600 text-center pt-4 border-t border-slate-200">
          <span>已有账号？</span>
          <Link to="/login" className="ml-2 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">去登录</Link>
        </div>
      </form>
    </div>
  );
}
