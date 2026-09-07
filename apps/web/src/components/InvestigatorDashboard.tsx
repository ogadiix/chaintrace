import React from 'react';
import {
  FolderOpen,
  PlusCircle,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  Search,
  GitFork,
  FileText,
  Building2,
  BarChart3,
} from 'lucide-react';
import type { Case } from '@chaintrace/types';

interface InvestigatorDashboardProps {
  cases: Case[];
  onOpenCase: (caseItem: Case) => void;
  onNewCase: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'cases' | 'investigate' | 'reports' | 'integrations' | 'diagnostics') => void;
}

export const InvestigatorDashboard: React.FC<InvestigatorDashboardProps> = ({
  cases,
  onOpenCase,
  onNewCase,
  onNavigateTab,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const totalCases = cases.length;
  const activeCases = cases.filter((c) => ['NEW', 'ASSIGNED', 'UNDER_REVIEW'].includes(c.status)).length;
  const highRiskCases = cases.filter((c) => ['HIGH', 'CRITICAL'].includes(c.priority)).length;
  const resolvedCases = cases.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status)).length;

  const totalReported = cases.reduce((acc, c) => {
    const val = parseFloat(c.reportedAmount) || 0;
    return acc + val;
  }, 0);

  const filteredCases = cases.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.caseNumber.toLowerCase().includes(q) ||
      c.suspectWallet.toLowerCase().includes(q) ||
      (c.complaintId && c.complaintId.toLowerCase().includes(q))
    );
  });

  const metrics = [
    {
      label: 'Total Investigations',
      value: totalCases,
      sub: `${activeCases} active`,
      icon: FolderOpen,
      color: 'var(--ct-accent-text)',
    },
    {
      label: 'High Priority',
      value: highRiskCases,
      sub: 'Urgent triage',
      icon: AlertTriangle,
      color: 'var(--ct-danger-text)',
    },
    {
      label: 'Reported Volume',
      value: `$${totalReported.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: 'Cumulative',
      icon: TrendingUp,
      color: 'var(--ct-success-text)',
    },
    {
      label: 'Resolved',
      value: resolvedCases,
      sub: 'Concluded',
      icon: CheckCircle2,
      color: 'var(--ct-text-secondary)',
    },
  ];

  const quickLinks = onNavigateTab
    ? [
        { label: 'Cases', desc: 'Browse and triage', icon: FolderOpen, action: () => onNavigateTab('cases'), count: cases.length },
        { label: 'Investigations', desc: 'Graph & trace studio', icon: GitFork, action: () => onNavigateTab('investigate') },
        { label: 'Reports', desc: 'Forensic dossiers', icon: FileText, action: () => onNavigateTab('reports') },
        { label: 'Integrations', desc: 'NCRP / SAHYOG', icon: Building2, action: () => onNavigateTab('integrations') },
        { label: 'Settings', desc: 'System & audit', icon: BarChart3, action: () => onNavigateTab('diagnostics') },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header + New Case */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold tracking-tight" style={{ color: 'var(--ct-text)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ct-text-secondary)' }}>
            Investigation overview and forensic workstation.
          </p>
        </div>
        <button onClick={onNewCase} className="ct-btn ct-btn-primary">
          <PlusCircle className="w-4 h-4" />
          New Investigation
        </button>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="ct-card" style={{ padding: 'var(--ct-space-4)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--ct-text-secondary)' }}>{m.label}</span>
                <Icon className="w-4 h-4" style={{ color: m.color }} />
              </div>
              <div className="text-2xl font-semibold" style={{ color: 'var(--ct-text)' }}>
                {m.value}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--ct-text-tertiary)' }}>
                {m.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick navigation */}
      {quickLinks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                onClick={link.action}
                className="ct-card ct-card-interactive text-left group"
                style={{ padding: 'var(--ct-space-3)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: 'var(--ct-accent-text)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--ct-text)' }}>{link.label}</span>
                  </div>
                  {link.count !== undefined && (
                    <span className="ct-badge ct-badge-default" style={{ fontSize: '10px' }}>{link.count}</span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>{link.desc}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Recent investigations table */}
      <div className="ct-card" style={{ padding: 0 }}>
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
          style={{ borderBottom: '1px solid var(--ct-border)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--ct-text)' }}>
              Active Investigations
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ct-text-tertiary)' }}>
              Select an investigation to launch the workspace.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ct-text-tertiary)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cases..."
              className="ct-input"
              style={{ paddingLeft: '2.25rem', fontSize: 'var(--ct-text-xs)' }}
            />
          </div>
        </div>

        {filteredCases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="ct-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Title</th>
                  <th className="hidden md:table-cell">Suspect Wallet</th>
                  <th className="hidden sm:table-cell">Network</th>
                  <th className="hidden lg:table-cell">Amount</th>
                  <th>Priority</th>
                  <th className="hidden sm:table-cell">Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.slice(0, 8).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-mono text-xs font-medium" style={{ color: 'var(--ct-accent-text)' }}>
                        {c.caseNumber}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium truncate block max-w-[180px]" style={{ color: 'var(--ct-text)' }} title={c.title}>
                        {c.title}
                      </span>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="font-mono text-xs" style={{ color: 'var(--ct-text-tertiary)' }} title={c.suspectWallet}>
                        {c.suspectWallet.slice(0, 8)}...{c.suspectWallet.slice(-6)}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="ct-badge ct-badge-default text-xs uppercase">
                        {c.targetChain}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className="font-mono text-xs font-medium" style={{ color: 'var(--ct-success-text)' }}>
                        {c.reportedAmount} {c.currency}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ct-badge ${
                          c.priority === 'CRITICAL' ? 'ct-badge-danger' :
                          c.priority === 'HIGH' ? 'ct-badge-warning' :
                          'ct-badge-success'
                        }`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="ct-badge ct-badge-default">{c.status}</span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => onOpenCase(c)}
                        className="ct-btn ct-btn-primary ct-btn-sm"
                      >
                        Investigate
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ct-empty-state" style={{ padding: 'var(--ct-space-12) var(--ct-space-6)' }}>
            <FolderOpen className="w-8 h-8 mb-3" style={{ color: 'var(--ct-text-tertiary)' }} />
            <p className="text-sm mb-2" style={{ color: 'var(--ct-text-secondary)' }}>
              {searchTerm ? 'No cases match your search.' : 'No investigation cases yet.'}
            </p>
            <button onClick={onNewCase} className="ct-btn ct-btn-ghost ct-btn-sm" style={{ color: 'var(--ct-accent-text)' }}>
              Create an investigation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
