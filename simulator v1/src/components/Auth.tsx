import React, { useState } from 'react';
import { CloudLightning, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Info } from 'lucide-react';
import { dbGet, dbAdd, STORE_USERS } from '../lib/db';

interface AuthProps {
  onLogin: (user: any) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ msg: string; isError: boolean } | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const showError = (msg: string, isError = true) => {
    setError({ msg, isError });
    setTimeout(() => setError(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password, firstName, lastName } = formData;
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) return showError('Please enter your email.');
    if (!password) return showError('Please enter your password.');

    if (isLogin) {
      try {
        const user = await dbGet(STORE_USERS, cleanEmail);
        if (!user) return showError('No account found with this email. Please sign up.');
        if (user.password !== password) return showError('Incorrect password. Please try again.');
        onLogin(user);
      } catch (err) {
        showError('Error accessing database.');
      }
    } else {
      if (!firstName || !lastName) return showError('Please enter your first and last name.');
      if (!cleanEmail.includes('@')) return showError('Please enter a valid email address.');
      if (password.length < 6) return showError('Password must be at least 6 characters.');

      try {
        const existing = await dbGet(STORE_USERS, cleanEmail);
        if (existing) return showError('An account with this email already exists.');

        const newUser = { email: cleanEmail, password, firstName, lastName, createdAt: Date.now() };
        await dbAdd(STORE_USERS, newUser);

        showError(`Account created! Welcome, ${firstName}. Signing you in...`, false);
        setTimeout(() => onLogin(newUser), 1000);
      } catch (err) {
        showError('Error creating account.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="auth-grid-bg animate-grid-move"></div>
      <div className="auth-orb-1 animate-orb-float-1"></div>
      <div className="auth-orb-2 animate-orb-float-2"></div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-teal-500/5 rounded-full animate-spin-slow pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-cyan-500/5 rounded-full animate-spin-slow pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '14s' }}></div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-slate-950 text-2xl font-black shadow-2xl shadow-teal-500/30 mb-4 animate-float">
            <CloudLightning size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">CloudGenz</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Student Cloud Simulator Platform</p>
        </div>

        <div className="auth-card rounded-2xl p-8">
          <div className="flex border-b border-slate-700/60 mb-6 -mx-8 px-8">
            <button
              className={`tab-btn-auth ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError(null); }}
            >
              Sign In
            </button>
            <button
              className={`tab-btn-auth ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError(null); }}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium animate-shake ${error.isError ? 'bg-rose-500/10 border border-rose-500/25 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'}`}>
              {error.msg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">First Name</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Arjun" className="auth-input w-full px-4 py-3 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Last Name</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Sharma" className="auth-input w-full px-4 py-3 rounded-xl" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{isLogin ? 'Email Address' : 'Student Email'}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-500" size={16} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@student.edu" className="auth-input w-full pl-10 pr-4 py-3 rounded-xl" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-500" size={16} />
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder={isLogin ? "••••••••" : "Min. 6 characters"} className="auth-input w-full pl-10 pr-12 py-3 rounded-xl" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors p-1">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn w-full py-3 rounded-xl text-sm mt-2 cursor-pointer flex justify-center items-center">
              {isLogin ? <><LogIn size={18} className="mr-2" /> Sign In to Dashboard</> : <><UserPlus size={18} className="mr-2" /> Create My Account</>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-teal-400 hover:text-teal-300 font-semibold cursor-pointer">
              {isLogin ? "Create one free" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4 flex items-center justify-center">
          <Info size={12} className="mr-1.5" /> Sign up to create your account — stored locally in your browser.
        </p>
      </div>
    </div>
  );
}
