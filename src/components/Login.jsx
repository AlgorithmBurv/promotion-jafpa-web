import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, ChevronRight } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('master_users')
        .select('*')
        .eq('email', loginForm.email)
        .eq('password', loginForm.password)
        .single();

      if (error || !data) throw new Error('Email atau password salah!');
      if (!data.is_active) throw new Error('Akun dinonaktifkan. Hubungi Admin!');

      toast.success(`Selamat datang kembali, ${data.nama_lengkap.split(' ')[0]}!`);
      onLoginSuccess(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4">
      {/* Ornamen Latar Belakang Premium */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-100 rounded-full blur-[120px] opacity-50" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-50 rounded-full blur-[100px] opacity-60" />

      {/* Kontainer Login (Flat / Clean Design) */}
      <div className="bg-white p-8 md:p-10 rounded-lg shadow-xl w-full max-w-[420px] border border-slate-200 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-slate-50 border border-slate-100 shadow-sm mb-5">
            <img src="logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            JAPFA <span className="text-blue-900">Food</span>
          </h1>

        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {/* Input Email */}
          <div className="group">
            <label className="block text-sm font-medium text-slate-700 mb-1 group-focus-within:text-blue-900 transition-colors">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-900 transition-colors pointer-events-none" size={18} />
              <input 
                type="email" 
                name="email" 
                value={loginForm.email} 
                onChange={handleLoginChange} 
                required 
                placeholder="name@company.com"
                className="w-full bg-white border border-slate-300 rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all" 
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="group">
            <label className="block text-sm font-medium text-slate-700 mb-1 group-focus-within:text-blue-900 transition-colors">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-900 transition-colors pointer-events-none" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                value={loginForm.password} 
                onChange={handleLoginChange} 
                required 
                placeholder="••••••••"
                className="w-full bg-white border border-slate-300 rounded-md py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-900 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>



          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-2.5 rounded-md transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed text-sm mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Memproses...
              </span>
            ) : (
              <>
                Masuk
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-xs font-medium">
            © 2026 PT Japfa Comfeed Indonesia Tbk.
          </p>
        </div>
      </div>
    </div>
  );
}