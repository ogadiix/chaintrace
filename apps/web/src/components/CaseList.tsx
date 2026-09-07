import React, { useState } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  ArrowUpRight, 
  AlertOctagon, 
  Clock 
} from 'lucide-react';
import type { Case, CaseStatus } from '@chaintrace/types';

interface CaseListProps {
  cases: Case[];
  loading: boolean;
  onSelectCase: (caseItem: Case) => void;
  onOpenCreateModal: () => void;
}

export const CaseList: React.FC<CaseListProps> = ({
  cases,
  loading,
  onSelectCase,
  onOpenCreateModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [chainFilter, setChainFilter] = useState<string>('ALL');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.suspectWallet.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesChain = chainFilter === 'ALL' || c.targetChain === chainFilter;

    return matchesSearch && matchesStatus && matchesChain;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'HIGH':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'MEDIUM':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'UNDER_REVIEW':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'CLOSED':
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
      default:
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-navy-900 border border-navy-700/80 rounded-lg p-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by case number, title, or wallet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filters and New Case CTA */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-navy-950 p-1 rounded-md border border-navy-800 overflow-x-auto max-w-full">
            {['ALL', 'ACTIVE', 'UNDER_REVIEW', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-navy-800 text-cyan-400 shadow-sm border border-navy-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            className="bg-navy-950 border border-navy-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Blockchains</option>
            <option value="tron">TRON</option>
            <option value="ethereum">Ethereum</option>
            <option value="bitcoin">Bitcoin</option>
          </select>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-3 py-1.5 rounded-md text-xs transition-colors"
          >
            <span>+ New Case</span>
          </button>
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-navy-900 border border-navy-700/80 rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950/60 text-slate-400 uppercase tracking-wider font-mono border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Case Number</th>
                <th className="py-3 px-4">Title & Category</th>
                <th className="py-3 px-4">Chain</th>
                <th className="py-3 px-4">Suspect Wallet</th>
                <th className="py-3 px-4">Reported Loss</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    <span>Loading investigation cases...</span>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertOctagon className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    <p className="text-sm font-medium text-slate-300">No cases match your filters.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Create an intake case to begin tracing fraud fund flows.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="hover:bg-navy-850 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">
                      {c.caseNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {c.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {c.fraudCategory.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="uppercase font-mono text-[11px] px-2 py-0.5 rounded bg-navy-800 border border-navy-700 text-slate-300">
                        {c.targetChain}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span>
                          {c.suspectWallet.slice(0, 8)}...{c.suspectWallet.slice(-6)}
                        </span>
                        <button
                          onClick={(e) => handleCopy(c.suspectWallet, e)}
                          className="text-slate-400 hover:text-cyan-400 p-0.5 rounded transition-colors"
                          title="Copy full wallet address"
                        >
                          {copiedAddress === c.suspectWallet ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      {Number(c.reportedAmount).toLocaleString()} {c.currency}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getPriorityColor(
                          c.priority
                        )}`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getStatusColor(
                          c.status
                        )}`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-navy-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 border border-navy-700 text-xs font-medium transition-all"
                      >
                        <span>Open Console</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
