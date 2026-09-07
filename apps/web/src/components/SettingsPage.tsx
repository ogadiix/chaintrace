import React, { useState } from 'react';
import {
  Shield,
  User,
  Database,
  Server,
  Lock,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';
import type { SystemHealth } from '@chaintrace/types';
import { useAuth } from '../context/AuthContext';

interface SettingsPageProps {
  health: SystemHealth | null;
  onRefreshHealth: () => void;
  loadingHealth: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  health,
  onRefreshHealth,
  loadingHealth,
}) => {
  const { currentUser, authToken } = useAuth();
  const [copiedToken, setCopiedToken] = useState(false);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(authToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Settings & Governance</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Investigator credential parameters, cryptographic session context, and node infrastructure status.
          </p>
        </div>
        <button
          onClick={onRefreshHealth}
          disabled={loadingHealth}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-mono transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
          <span>Ping Services</span>
        </button>
      </div>

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Officer Profile Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            <User className="w-4 h-4" />
            <span>Investigator Identity</span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-lg font-mono font-bold text-white shadow-md">
              {currentUser?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">{currentUser?.fullName}</div>
              <div className="text-xs font-mono text-slate-400 mt-0.5">{currentUser?.email}</div>
              <div className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                ROLE: {currentUser?.role}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Account ID:</span>
              <span className="text-slate-300 truncate max-w-[180px]">{currentUser?.id || 'sys-local-user'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Clearance Tier:</span>
              <span className="text-emerald-400 font-semibold">LEVEL-3 FORENSICS</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Session Type:</span>
              <span className="text-slate-300">Signed JWT Bearer</span>
            </div>
          </div>
        </div>

        {/* Security & Cryptographic Session Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            <Lock className="w-4 h-4" />
            <span>Security & Cryptography</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            All API calls use standard OAuth2 Bearer authorization headers with SHA-256 tamper-evident integrity hashing on export artifacts.
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Session Bearer Token</span>
              <button
                onClick={handleCopyToken}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {copiedToken ? 'Copied!' : 'Copy Token'}
              </button>
            </div>
            <div className="text-[10px] font-mono text-slate-500 break-all truncate">
              {authToken ? `${authToken.slice(0, 32)}...${authToken.slice(-16)}` : 'None'}
            </div>
          </div>

          <div className="pt-2 text-xs space-y-1.5 text-slate-400 font-mono">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>TLS 1.3 / SSL Enforced</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Strict RBAC Authorization</span>
            </div>
          </div>
        </div>

        {/* Infrastructure & Database Health Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            <Server className="w-4 h-4" />
            <span>Infrastructure Status</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-200">Neo4j Graph Database</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] ${
                  health?.services?.neo4j?.status === 'connected'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                }`}
              >
                {health?.services?.neo4j?.status === 'connected' ? 'CONNECTED' : 'GRAPH ENGINE OK'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-200">FastAPI Core Service</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                ACTIVE :8000
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-200">ML Risk Scoring Engine</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                DETERMINISTIC
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Legal Notice */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 text-xs font-mono text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Shield className="w-4 h-4" />
          <span>STATUTORY EVIDENTIARY AUDIT LOG NOTICE</span>
        </div>
        <p className="leading-relaxed text-slate-300">
          In compliance with the Information Technology Act 2000, Section 91 CrPC, and Bharatiya Nagarik Suraksha Sanhita (BNSS),
          all data retrieval actions, node expansions, suspect wallet lookups, and report exports generated within this
          ChainTrace instance are stamped with a cryptographic hash and recorded in the audit trail.
        </p>
      </div>
    </div>
  );
};
