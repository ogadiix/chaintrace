import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../router';

export const ProductionLogin: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your official email address and password.');
      return;
    }

    setError(null);
    const result = await login(email.trim(), password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Authentication failed. Please verify your credentials or contact your security supervisor.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500/25 selection:text-cyan-200 relative overflow-hidden">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_10%,rgba(14,165,233,0.08),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1322_1px,transparent_1px),linear-gradient(to_bottom,#0c1322_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none opacity-40" />

      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shadow-sm shadow-cyan-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold tracking-wider text-sm text-slate-100 font-mono">CHAINTRACE</div>
            <div className="text-[10px] text-slate-400 font-mono">NATIONAL FORENSIC INTELLIGENCE</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white transition-colors"
          >
            &larr; Platform Overview
          </button>
          <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[11px]">
            SECURITY ZONE: RESTRICTED
          </span>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md">
          {/* Card Wrapper */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-7 sm:p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Fingerprint className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Investigator Sign In</h1>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Access authorized blockchain analytics, evidentiary casefiles, and statutory freeze requisition tools.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Official Email / Service ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="officer@agency.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-400">Keep session active</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate Officer</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Statutory Security Disclaimer */}
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Official Law Enforcement & FIU portal. Unauthorized access is punishable under IT Act 2000 & statutory provisions. All logins are audited with SHA-256 session logging.
                </span>
              </div>
            </div>
          </div>

          {/* New Agency Clearance Link */}
          <div className="text-center mt-5 text-xs text-slate-400">
            <span>Need institutional clearance for your agency? </span>
            <button
              onClick={() => navigate('/register')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 ml-1 transition-colors"
            >
              Submit Clearance Application
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-[11px] text-slate-400 font-mono">
        ChainTrace Secure Cryptographic Perimeter &bull; Multi-Tenant Data Isolation &bull; End-to-End Encrypted Session
      </footer>
    </div>
  );
};
