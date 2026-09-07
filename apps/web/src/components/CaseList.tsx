import React, { useState } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  ArrowUpRight, 
  AlertOctagon, 
  Clock,
  Plus
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

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return <span className="ct-badge ct-badge-danger">{priority}</span>;
      case 'HIGH':
        return <span className="ct-badge ct-badge-warning">{priority}</span>;
      case 'MEDIUM':
        return <span className="ct-badge ct-badge-info">{priority}</span>;
      default:
        return <span className="ct-badge ct-badge-neutral">{priority}</span>;
    }
  };

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="ct-badge ct-badge-success">{status.replace('_', ' ')}</span>;
      case 'UNDER_REVIEW':
        return <span className="ct-badge ct-badge-warning">{status.replace('_', ' ')}</span>;
      case 'CLOSED':
        return <span className="ct-badge ct-badge-neutral">{status.replace('_', ' ')}</span>;
      default:
        return <span className="ct-badge ct-badge-info">{status.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Bar */}
      <div
        className="flex flex-col md:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors"
        style={{
          backgroundColor: 'var(--ct-surface)',
          borderColor: 'var(--ct-border)',
          boxShadow: 'var(--ct-shadow-sm)',
        }}
      >
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5" style={{ color: 'var(--ct-text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search by case number, title, or wallet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ct-input pl-9 text-xs"
            style={{ height: '34px' }}
          />
        </div>

        {/* Filters and New Case CTA */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Status Segmented Control */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg border overflow-x-auto"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            {['ALL', 'ACTIVE', 'UNDER_REVIEW', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className="px-2.5 py-1 rounded text-[11px] font-medium transition-all"
                style={{
                  backgroundColor: statusFilter === st ? 'var(--ct-surface)' : 'transparent',
                  color: statusFilter === st ? 'var(--ct-accent-text)' : 'var(--ct-text-secondary)',
                  boxShadow: statusFilter === st ? 'var(--ct-shadow-sm)' : 'none',
                }}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            className="ct-input text-xs font-mono"
            style={{ height: '34px', width: 'auto', paddingRight: '2rem' }}
          >
            <option value="ALL">All Blockchains</option>
            <option value="tron">TRON</option>
            <option value="ethereum">Ethereum</option>
            <option value="bitcoin">Bitcoin</option>
          </select>

          <button
            onClick={onOpenCreateModal}
            className="ct-btn ct-btn-primary ct-btn-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Case</span>
          </button>
        </div>
      </div>

      {/* Case Table */}
      <div
        className="rounded-xl border overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--ct-surface)',
          borderColor: 'var(--ct-border)',
          boxShadow: 'var(--ct-shadow-sm)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className="text-[11px] font-semibold uppercase tracking-wider border-b"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
                color: 'var(--ct-text-secondary)',
              }}
            >
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
            <tbody className="divide-y" style={{ borderColor: 'var(--ct-border-subtle)' }}>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <Clock className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: 'var(--ct-accent)' }} />
                    <span className="text-xs" style={{ color: 'var(--ct-text-secondary)' }}>
                      Loading investigation cases...
                    </span>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: 'var(--ct-bg-subtle)' }}
                    >
                      <AlertOctagon className="w-6 h-6" style={{ color: 'var(--ct-text-tertiary)' }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                      No cases match your filters.
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ct-text-tertiary)' }}>
                      Create an intake case to begin tracing fraud fund flows.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="cursor-pointer transition-colors group"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--ct-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold whitespace-nowrap" style={{ color: 'var(--ct-accent-text)' }}>
                      {c.caseNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold transition-colors" style={{ color: 'var(--ct-text)' }}>
                        {c.title}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                        {c.fraudCategory.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="uppercase font-mono text-[11px] px-2 py-0.5 rounded border" style={{ backgroundColor: 'var(--ct-bg-subtle)', borderColor: 'var(--ct-border)', color: 'var(--ct-text-secondary)' }}>
                        {c.targetChain}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5" style={{ color: 'var(--ct-text-secondary)' }}>
                        <span>
                          {c.suspectWallet.slice(0, 8)}...{c.suspectWallet.slice(-6)}
                        </span>
                        <button
                          onClick={(e) => handleCopy(c.suspectWallet, e)}
                          className="ct-btn-icon p-1"
                          title="Copy full wallet address"
                        >
                          {copiedAddress === c.suspectWallet ? (
                            <Check className="w-3.5 h-3.5" style={{ color: 'var(--ct-success)' }} />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold" style={{ color: 'var(--ct-text)' }}>
                      {Number(c.reportedAmount).toLocaleString()} {c.currency}
                    </td>
                    <td className="py-3.5 px-4">
                      {getPriorityBadge(c.priority)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c);
                        }}
                        className="ct-btn ct-btn-secondary ct-btn-sm inline-flex items-center gap-1 text-xs"
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
