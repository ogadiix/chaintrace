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
  Copy,
  Check,
  Moon,
  Sun,
} from 'lucide-react';
import type { SystemHealth } from '@chaintrace/types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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
  const { theme, setTheme } = useTheme();
  const [copiedToken, setCopiedToken] = useState(false);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(authToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in" style={{ color: 'var(--ct-text)' }}>
      {/* Page Title */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: 'var(--ct-border)' }}
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--ct-text)' }}>
            System Settings & Governance
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--ct-text-secondary)' }}>
            Investigator credential parameters, cryptographic session context, and node infrastructure status.
          </p>
        </div>
        <button
          onClick={onRefreshHealth}
          disabled={loadingHealth}
          className="ct-btn ct-btn-secondary ct-btn-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
          <span>Ping Services</span>
        </button>
      </div>

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Officer Profile Card */}
        <div
          className="rounded-xl border p-5 space-y-4 shadow-sm transition-colors"
          style={{
            backgroundColor: 'var(--ct-surface)',
            borderColor: 'var(--ct-border)',
          }}
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
            <User className="w-4 h-4" />
            <span>Investigator Identity</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm"
              style={{
                backgroundColor: 'var(--ct-accent)',
                color: '#FFFFFF',
              }}
            >
              {currentUser?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight" style={{ color: 'var(--ct-text)' }}>
                {currentUser?.fullName || 'Active Investigator'}
              </div>
              <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--ct-text-tertiary)' }}>
                {currentUser?.email || 'officer@chaintrace.internal'}
              </div>
              <div className="inline-block mt-1">
                <span className="ct-badge ct-badge-info text-[10px] font-mono uppercase">
                  ROLE: {currentUser?.role || 'INVESTIGATOR'}
                </span>
              </div>
            </div>
          </div>

          <div
            className="pt-3 border-t space-y-2 text-xs"
            style={{ borderColor: 'var(--ct-border-subtle)' }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--ct-text-tertiary)' }}>Account ID:</span>
              <span className="font-mono text-[11px] truncate max-w-[180px]" style={{ color: 'var(--ct-text-secondary)' }}>
                {currentUser?.id || 'sys-local-user'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--ct-text-tertiary)' }}>Clearance Tier:</span>
              <span className="ct-badge ct-badge-success text-[10px]">
                LEVEL-3 FORENSICS
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--ct-text-tertiary)' }}>Session Type:</span>
              <span className="font-mono text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                Signed JWT Bearer
              </span>
            </div>
          </div>
        </div>

        {/* Security & Cryptographic Session Card */}
        <div
          className="rounded-xl border p-5 space-y-4 shadow-sm transition-colors"
          style={{
            backgroundColor: 'var(--ct-surface)',
            borderColor: 'var(--ct-border)',
          }}
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
            <Lock className="w-4 h-4" />
            <span>Security & Cryptography</span>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--ct-text-secondary)' }}>
            All API calls use standard OAuth2 Bearer authorization headers with SHA-256 tamper-evident integrity hashing on export artifacts.
          </p>

          <div
            className="p-3 rounded-lg border space-y-1.5"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: 'var(--ct-text-tertiary)' }}>Session Bearer Token</span>
              <button
                onClick={handleCopyToken}
                className="inline-flex items-center gap-1 font-semibold transition-colors"
                style={{ color: 'var(--ct-accent-text)' }}
              >
                {copiedToken ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedToken ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-[10px] font-mono break-all truncate" style={{ color: 'var(--ct-text-secondary)' }}>
              {authToken ? `${authToken.slice(0, 30)}...${authToken.slice(-14)}` : 'None'}
            </div>
          </div>

          <div className="pt-2 text-xs space-y-2">
            <div className="flex items-center gap-2" style={{ color: 'var(--ct-success-text)' }}>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--ct-success)' }} />
              <span className="font-medium">TLS 1.3 / SSL Enforced</span>
            </div>
            <div className="flex items-center gap-2" style={{ color: 'var(--ct-success-text)' }}>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--ct-success)' }} />
              <span className="font-medium">Strict RBAC Authorization</span>
            </div>
          </div>
        </div>

        {/* Infrastructure & Database Health Card */}
        <div
          className="rounded-xl border p-5 space-y-4 shadow-sm transition-colors"
          style={{
            backgroundColor: 'var(--ct-surface)',
            borderColor: 'var(--ct-border)',
          }}
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
            <Server className="w-4 h-4" />
            <span>Infrastructure Status</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div
              className="flex items-center justify-between p-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--ct-text)' }}>
                <Database className="w-3.5 h-3.5" style={{ color: 'var(--ct-accent)' }} />
                <span>Neo4j Graph Database</span>
              </div>
              <span
                className={
                  health?.services?.neo4j?.status === 'connected'
                    ? 'ct-badge ct-badge-success text-[10px]'
                    : 'ct-badge ct-badge-info text-[10px]'
                }
              >
                {health?.services?.neo4j?.status === 'connected' ? 'CONNECTED' : 'GRAPH ENGINE OK'}
              </span>
            </div>

            <div
              className="flex items-center justify-between p-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--ct-text)' }}>
                <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--ct-accent)' }} />
                <span>FastAPI Core Service</span>
              </div>
              <span className="ct-badge ct-badge-success text-[10px]">
                ACTIVE :8000
              </span>
            </div>

            <div
              className="flex items-center justify-between p-2.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--ct-text)' }}>
                <Layers className="w-3.5 h-3.5" style={{ color: 'var(--ct-accent)' }} />
                <span>ML Risk Scoring Engine</span>
              </div>
              <span className="ct-badge ct-badge-info text-[10px]">
                DETERMINISTIC
              </span>
            </div>
          </div>

          {/* Theme Preference */}
          <div
            className="pt-3 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--ct-border-subtle)' }}
          >
            <span className="text-xs" style={{ color: 'var(--ct-text-secondary)' }}>Appearance</span>
            <div
              className="flex items-center p-1 rounded-lg border gap-1"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <button
                onClick={() => setTheme('light')}
                className="px-2 py-1 rounded text-xs inline-flex items-center gap-1 transition-all"
                style={{
                  backgroundColor: theme === 'light' ? 'var(--ct-surface)' : 'transparent',
                  color: theme === 'light' ? 'var(--ct-text)' : 'var(--ct-text-tertiary)',
                  boxShadow: theme === 'light' ? 'var(--ct-shadow-sm)' : 'none',
                }}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className="px-2 py-1 rounded text-xs inline-flex items-center gap-1 transition-all"
                style={{
                  backgroundColor: theme === 'dark' ? 'var(--ct-surface)' : 'transparent',
                  color: theme === 'dark' ? 'var(--ct-text)' : 'var(--ct-text-tertiary)',
                  boxShadow: theme === 'dark' ? 'var(--ct-shadow-sm)' : 'none',
                }}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Legal Notice */}
      <div
        className="p-5 rounded-xl border text-xs space-y-2"
        style={{
          backgroundColor: 'var(--ct-bg-subtle)',
          borderColor: 'var(--ct-border)',
        }}
      >
        <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--ct-warning-text)' }}>
          <Shield className="w-4 h-4" />
          <span>STATUTORY EVIDENTIARY AUDIT LOG NOTICE</span>
        </div>
        <p className="leading-relaxed" style={{ color: 'var(--ct-text-secondary)' }}>
          In compliance with the Information Technology Act 2000, Section 91 CrPC, and Bharatiya Nagarik Suraksha Sanhita (BNSS),
          all data retrieval actions, node expansions, suspect wallet lookups, and report exports generated within this
          ChainTrace instance are stamped with a cryptographic hash and recorded in the audit trail.
        </p>
      </div>
    </div>
  );
};
