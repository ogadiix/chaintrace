import React from 'react';
import {
  Shield,
  AlertTriangle,
  FolderOpen,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  ArrowUpRight,
  Search,
  Target,
  FileText,
  ShieldAlert,
  Activity,
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

  // Compute live metrics from actual cases
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

  return (
    <div className="flex flex-col space-y-6 font-mono">
      {/* Welcome & Quick Action Banner */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h1 className="text-base font-bold text-slate-100">
              Cybercrime Intelligence & Forensic Workstation
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Real-time multi-chain tracing, heuristic pattern intelligence, and explainable risk attribution for cryptocurrency fraud investigations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onNewCase}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-3.5 py-2 rounded text-xs transition-colors shadow-lg shadow-cyan-900/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Investigation
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Investigations */}
        <div className="bg-navy-900/80 border border-navy-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Investigations</span>
            <FolderOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">{totalCases}</span>
            <span className="text-[11px] text-slate-400">cases</span>
          </div>
          <div className="text-[10px] text-cyan-400 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>{activeCases} currently active</span>
          </div>
        </div>

        {/* High & Critical Triage */}
        <div className="bg-navy-900/80 border border-navy-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>High / Critical Triage</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400">{highRiskCases}</span>
            <span className="text-[11px] text-slate-400">urgent</span>
          </div>
          <div className="text-[10px] text-rose-400 mt-2 flex items-center gap-1">
            <span>Prioritized by Risk Engine</span>
          </div>
        </div>

        {/* Total Reported Fraud Value */}
        <div className="bg-navy-900/80 border border-navy-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Reported Fraud Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">
              ${totalReported.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Cumulative across investigations
          </div>
        </div>

        {/* Resolved Cases */}
        <div className="bg-navy-900/80 border border-navy-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Resolved / Closed</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-300">{resolvedCases}</span>
            <span className="text-[11px] text-slate-400">concluded</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Attributed & evidence logged
          </div>
        </div>
      </div>

      {/* Connected Investigation Workspaces Navigation Grid */}
      {onNavigateTab && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigateTab('cases')}
            className="p-3 bg-navy-900/80 hover:bg-navy-800/90 border border-navy-700/70 hover:border-cyan-500/40 rounded-lg text-left transition-all group shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                Cases Directory
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-950 text-cyan-300 border border-navy-800">
                {cases.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Filter, search & triage fraud cases</p>
          </button>

          <button
            onClick={() => onNavigateTab('investigate')}
            className="p-3 bg-navy-900/80 hover:bg-navy-800/90 border border-navy-700/70 hover:border-cyan-500/40 rounded-lg text-left transition-all group shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                Graph & Trace Studio
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-950 text-emerald-300 border border-navy-800">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Interactive fund-flow traversal</p>
          </button>

          <button
            onClick={() => onNavigateTab('reports')}
            className="p-3 bg-navy-900/80 hover:bg-navy-800/90 border border-navy-700/70 hover:border-cyan-500/40 rounded-lg text-left transition-all group shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Reports & Dossiers
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-950 text-cyan-300 border border-navy-800">
                PDF
              </span>
            </div>
            <p className="text-[10px] text-slate-400">SHA-256 verified forensic dossiers</p>
          </button>

          <button
            onClick={() => onNavigateTab('integrations')}
            className="p-3 bg-navy-900/80 hover:bg-navy-800/90 border border-navy-700/70 hover:border-amber-500/40 rounded-lg text-left transition-all group shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                NCRP / SAHYOG
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-950 text-amber-300 border border-navy-800">
                I4C
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Victim intake & freeze orders</p>
          </button>

          <button
            onClick={() => onNavigateTab('diagnostics')}
            className="p-3 bg-navy-900/80 hover:bg-navy-800/90 border border-navy-700/70 hover:border-cyan-500/40 rounded-lg text-left transition-all group shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Diagnostics
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-950 text-emerald-300 border border-navy-800">
                SYSTEM
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Infrastructure health & logs</p>
          </button>
        </div>
      )}

      {/* Recent Investigations Table */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Active Forensic Investigations</h2>
            <p className="text-[11px] text-slate-400">
              Select an investigation to launch the interactive Fund-Flow Graph and intelligence suite.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search case, wallet, or ref..."
              className="w-full bg-navy-950 border border-navy-700 text-slate-200 text-xs rounded pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {filteredCases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-navy-950/80 text-[10px] uppercase text-slate-400 border-b border-navy-800">
                <tr>
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Suspect Wallet</th>
                  <th className="py-2.5 px-3">Network</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Priority / Risk</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60">
                {filteredCases.slice(0, 8).map((c) => (
                  <tr key={c.id} className="hover:bg-navy-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">{c.caseNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-100 truncate max-w-[180px]" title={c.title}>
                      {c.title}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[140px]" title={c.suspectWallet}>
                      {c.suspectWallet.slice(0, 8)}...{c.suspectWallet.slice(-6)}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[11px] text-purple-300">{c.targetChain}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">
                      {c.reportedAmount} {c.currency}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          c.priority === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : c.priority === 'HIGH'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] text-slate-300 px-2 py-0.5 rounded bg-navy-950 border border-navy-800">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onOpenCase(c)}
                        className="px-2.5 py-1 text-xs bg-cyan-600/90 hover:bg-cyan-500 text-slate-950 font-bold rounded inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Investigate</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500 italic space-y-2">
            <FolderOpen className="w-8 h-8 mx-auto text-slate-600" />
            <p>No investigation cases found matching your query.</p>
            <button
              onClick={onNewCase}
              className="text-cyan-400 underline hover:text-cyan-300"
            >
              Create an investigation case
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
