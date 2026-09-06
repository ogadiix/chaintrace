import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  KeyRound,
  Fingerprint,
} from 'lucide-react';
import type { User } from '@chaintrace/types';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed. Please verify your credentials.');
      }

      onLoginSuccess(data.accessToken, data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Quick authentication failed.');
      }

      onLoginSuccess(data.accessToken, data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-between font-mono selection:bg-cyan-500/20 relative overflow-hidden">
      {/* Background Decorative Cyber Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.08),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500" />

      {/* Top Banner */}
      <header className="border-b border-navy-800/80 bg-navy-900/60 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="font-bold tracking-widest text-sm text-cyan-400">CHAINTRACE</div>
            <div className="text-[10px] text-slate-400">NATIONAL CRYPTO FORENSICS PLATFORM</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded bg-navy-800 text-cyan-300 border border-navy-700 font-mono">
            SIH-183 HACKATHON EDITION
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            API ONLINE
          </span>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Platform Brief & Inter-Agency Context */}
          <div className="lg:col-span-5 space-y-5 hidden md:block">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">
              <Fingerprint className="w-3.5 h-3.5" />
              Law Enforcement Gateway
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100 leading-tight">
              Investigator Intelligence & Asset Tracing Terminal
            </h1>

            <p className="text-xs text-slate-400 leading-relaxed">
              Forensic cross-chain money flow tracking, automated peel-chain detection, confidence-scored VASP attribution, and court-admissible PDF dossier generation.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>N-Hop Multi-Chain Graph Ingestion (TRON, EVM, BTC)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Heuristic Laundering Pattern Detections (Rapid Peels)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>NCRP Complaint Intake & SAHYOG Section 91 CrPC Freeze</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Cryptographically Hashed (SHA-256) Investigation Dossiers</span>
              </div>
            </div>

            {/* Legal / Statutory Disclaimer */}
            <div className="p-3 rounded-lg bg-navy-900/90 border border-navy-800 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-amber-400 font-semibold flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> STATUTORY NOTICE
              </span>
              Unauthorised access or misuse of this forensic portal is strictly prohibited under the Information Technology Act. All queries, traces, and requisition actions are audit-logged.
            </div>
          </div>

          {/* Right Column: Interactive Login Box */}
          <div className="lg:col-span-7 bg-navy-900/95 border border-navy-700/80 rounded-xl p-6 md:p-8 shadow-2xl backdrop-blur-md relative">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-navy-800">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  Operator Authentication
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in with your assigned departmental credentials
                </p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-navy-800 text-slate-400 border border-navy-700">
                SECURE HS256
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Official Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="investigator@chaintrace.internal"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-navy-950 border border-navy-700 rounded-md text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Access Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2 bg-navy-950 border border-navy-700 rounded-md text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-md shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials & Clearance...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Forensic Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Personas 1-Click Access */}
            <div className="mt-6 pt-5 border-t border-navy-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Quick Demo Access (1-Click)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Pre-Configured Roles</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('investigator@chaintrace.internal', 'Investigator123!')}
                  className="p-2.5 rounded-lg bg-navy-950 hover:bg-cyan-950/40 border border-navy-800 hover:border-cyan-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400">
                      Alex Mercer
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      INVESTIGATOR
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Case & Graph Workspace</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@chaintrace.internal', 'AdminSecure123!')}
                  className="p-2.5 rounded-lg bg-navy-950 hover:bg-emerald-950/40 border border-navy-800 hover:border-emerald-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400">
                      Sarah Vance
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      ADMIN
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Supervision & Global Audit</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('analyst@chaintrace.internal', 'AnalystSecure123!')}
                  className="p-2.5 rounded-lg bg-navy-950 hover:bg-amber-950/40 border border-navy-800 hover:border-amber-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-400">
                      Raj Patel
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      ANALYST
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Attribution & Risk Scoring</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('viewer@chaintrace.internal', 'ViewerSecure123!')}
                  className="p-2.5 rounded-lg bg-navy-950 hover:bg-indigo-950/40 border border-navy-800 hover:border-indigo-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400">
                      David Kim
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                      VIEWER
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Read-Only Case Dossiers</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-800/80 bg-navy-900/40 px-6 py-2.5 text-center text-[11px] text-slate-400 z-10 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>ChainTrace Forensic Suite v0.1.0</span>
          <span>•</span>
          <span className="text-slate-400">Smart India Hackathon 2026 (Problem Statement 183)</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Security: TLS 1.3 / AES-256</span>
          <span>•</span>
          <span>Evidence Integrity: SHA-256</span>
          <span>•</span>
          <span>Indian Cybercrime Coordination Centre (I4C) Reference Architecture</span>
        </div>
      </footer>
    </div>
  );
};
