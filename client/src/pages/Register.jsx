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
import api from '../api/api';

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
      const r = await api.post('/auth/register', { email, password });
      const data = r.data || {};
      if (data.success){
        toast.success('注册成功'); 
        nav('/login');
      } else {
        setErr(data.message || data.error || '注册失败（接口未实现或邮箱已存在）');
      }
    }catch(e){
      console.error('注册错误:', e);
      const data = e.response?.data;
      setErr(data?.message || data?.error || '网络不可用或接口未实现');
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-bg-page)' }}>
      <div className="absolute top-4 left-4 z-10">
        <Link className="btn btn-ghost" to="/home">← 返回主页</Link>
      </div>

      <div className="w-full max-w-md animate-rise-in">
        <div className="mb-8 text-center">
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            GraphTutor
          </p>
          <p className="mt-2 text-sm text-slate-500">
            知识图谱驱动的智能学习
          </p>
        </div>

        <form onSubmit={submit} className="surface space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">注册</h1>
            <p className="mt-1 text-sm text-slate-500">使用邮箱创建账号</p>
            <p className="mt-1 text-xs text-slate-400">已有 GitHub？请前往登录页使用 GitHub 登录</p>
          </div>
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm animate-fade-in">
              {err}
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
                  className="input pr-12" 
                  type={show?'text':'password'} 
                  value={password} 
                  onChange={e=>handlePasswordChange(e.target.value)} 
                  placeholder="请输入密码（至少 6 位）" 
                  minLength={6}
                  maxLength={50}
                />
                <button 
                  type="button" 
                  className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800" 
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
                <div className="text-xs font-medium text-slate-500 space-y-1">
                  <div className="font-semibold mb-1 text-slate-600">密码格式要求：</div>
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
                  密码一致
                </div>
              )}
            </div>
          </div>
          <button 
            className="btn btn-primary w-full !py-3" 
            disabled={busy} 
            type="submit"
          >
            {busy ? "注册中…" : "注册"}
          </button>
          <div className="text-sm font-medium text-slate-500 text-center pt-2 border-t border-slate-100 space-y-2">
            <p>
              <span>已有账号？</span>
              <Link to="/login" className="ml-2 font-semibold text-blue-600 hover:text-blue-700 transition-colors">去登录</Link>
            </p>
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-normal">
              <Link to="/home?guide=1" className="text-blue-600 hover:underline font-medium">
                使用教程
              </Link>
              <span className="text-slate-300">·</span>
              <Link to="/quiz" className="text-blue-600 hover:underline font-medium">
                先去练习
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
