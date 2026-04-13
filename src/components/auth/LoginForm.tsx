import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';

type Tab = 'login' | 'register';

export function LoginForm() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email hoặc mật khẩu không đúng.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Bạn chưa xác nhận email. Vui lòng kiểm tra hộp thư.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Đăng nhập thành công!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Đăng ký thành công! Kiểm tra email để xác nhận tài khoản.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-[0_0_40px_rgba(99,102,241,0.4)]"
          >
            <Zap size={32} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            QzMaster
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Hệ thống ôn tập thông minh</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
          {/* Tabs */}
          <div className="flex bg-slate-950 rounded-xl p-1 mb-8 border border-slate-800">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                id={`tab-${t}`}
                onClick={() => {
                  setTab(t);
                  setEmail('');
                  setPassword('');
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  tab === t
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'login' ? (
                  <>
                    <LogIn size={15} /> Đăng nhập
                  </>
                ) : (
                  <>
                    <UserPlus size={15} /> Đăng ký
                  </>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={tab}
              initial={{ opacity: 0, x: tab === 'login' ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === 'login' ? 16 : -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={tab === 'login' ? handleLogin : handleRegister}
              className="space-y-5"
            >
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    placeholder={tab === 'register' ? 'Tối thiểu 6 ký tự' : '••••••••'}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id={`submit-${tab}`}
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang xử lý...
                  </span>
                ) : tab === 'login' ? (
                  <>
                    <LogIn size={16} /> Đăng nhập
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Tạo tài khoản
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Dữ liệu được lưu trữ an toàn trên Supabase Cloud
        </p>
      </motion.div>
    </div>
  );
}
