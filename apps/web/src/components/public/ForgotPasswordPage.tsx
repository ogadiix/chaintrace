import React, { useState } from 'react';
import {
  Shield,
  Mail,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { navigate } from '../../router';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your official registered email.');
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500/25 relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_10%,rgba(14,165,233,0.08),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold tracking-wider text-sm text-slate-100 font-mono">CHAINTRACE</div>
            <div className="text-[10px] text-slate-400 font-mono">SECURITY CREDENTIAL RECOVERY</div>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="text-xs text-slate-400 hover:text-white font-mono transition-colors"
        >
          &larr; Back to Login
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl">
            {submitted ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Reset Dispatch Confirmed</h2>
                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  If <strong className="text-white font-mono">{email}</strong> is registered with an authorized agency account,
                  a cryptographic single-use recovery token has been transmitted along with instructions.
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 mb-6 text-left">
                  <div>Security Advisory:</div>
                  <div className="text-slate-300 mt-1">
                    Password recovery links expire in 15 minutes. In case of hardware token or 2FA desynchronization,
                    contact your agency system administrator.
                  </div>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
                >
                  Return to Investigator Sign In
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>

                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Credential Reset</h1>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Submit your registered institutional email to initiate secure token issuance.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Registered Agency Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="officer@agency.gov.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950/40 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Dispatch Recovery Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-[11px] text-slate-400 font-mono">
        Official Credential Recovery Gateway &bull; Authorized Officers Only
      </footer>
    </div>
  );
};
