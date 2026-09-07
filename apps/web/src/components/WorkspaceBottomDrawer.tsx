import React, { useState } from 'react';
import { Terminal, Clock, FileText, Search, ExternalLink, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TraceResult, GraphCanvasEdge } from '@chaintrace/types';

interface WorkspaceBottomDrawerProps {
  traceResult: TraceResult | null;
  caseId: string;
  caseNumber: string;
  onSelectEdge?: (edge: GraphCanvasEdge) => void;
}

export const WorkspaceBottomDrawer: React.FC<WorkspaceBottomDrawerProps> = ({
  traceResult,
  caseNumber,
  onSelectEdge,
}) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'timeline' | 'evidence'>('transactions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 5;

  // Extract all hops as flat transaction rows
  const allHops = React.useMemo(() => {
    if (!traceResult || !traceResult.paths) return [];
    const seen = new Set<string>();
    const rows: any[] = [];

    traceResult.paths.forEach((path) => {
      path.hops.forEach((hop) => {
        const txHash = hop.tx_hash || (hop as any).txHash;
        if (!seen.has(txHash)) {
          seen.add(txHash);
          rows.push({
            txHash,
            from: hop.from_wallet || (hop as any).fromWallet,
            to: hop.to_wallet || (hop as any).toWallet,
            amount: hop.amount,
            asset: hop.asset,
            chain: hop.chain,
            timestamp: hop.timestamp,
            hopNumber: hop.hop_number ?? (hop as any).hopNumber ?? 1,
            isDemo: txHash?.includes('demo'),
          });
        }
      });
    });
    return rows;
  }, [traceResult]);

  const filteredHops = allHops.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.txHash?.toLowerCase().includes(q) ||
      h.from?.toLowerCase().includes(q) ||
      h.to?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredHops.length / pageSize) || 1;
  const paginatedHops = filteredHops.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col transition-colors"
      style={{
        backgroundColor: 'var(--ct-surface)',
        borderColor: 'var(--ct-border)',
        boxShadow: 'var(--ct-shadow-sm)',
      }}
    >
      {/* Tab Navigation Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{
          backgroundColor: 'var(--ct-bg-subtle)',
          borderColor: 'var(--ct-border)',
        }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'transactions'
                ? 'shadow-sm'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: activeTab === 'transactions' ? 'var(--ct-surface)' : 'transparent',
              color: activeTab === 'transactions' ? 'var(--ct-accent-text)' : 'var(--ct-text-secondary)',
              border: activeTab === 'transactions' ? '1px solid var(--ct-border)' : '1px solid transparent',
            }}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Transaction Ledger</span>
            <span
              className="text-[10px] px-1.5 py-0.2 rounded-full font-mono"
              style={{
                backgroundColor: activeTab === 'transactions' ? 'var(--ct-accent-subtle)' : 'var(--ct-border)',
                color: activeTab === 'transactions' ? 'var(--ct-accent-text)' : 'var(--ct-text-tertiary)',
              }}
            >
              {allHops.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'timeline'
                ? 'shadow-sm'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: activeTab === 'timeline' ? 'var(--ct-surface)' : 'transparent',
              color: activeTab === 'timeline' ? 'var(--ct-accent-text)' : 'var(--ct-text-secondary)',
              border: activeTab === 'timeline' ? '1px solid var(--ct-border)' : '1px solid transparent',
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Investigation Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'evidence'
                ? 'shadow-sm'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: activeTab === 'evidence' ? 'var(--ct-surface)' : 'transparent',
              color: activeTab === 'evidence' ? 'var(--ct-accent-text)' : 'var(--ct-text-secondary)',
              border: activeTab === 'evidence' ? '1px solid var(--ct-border)' : '1px solid transparent',
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Forensic Evidence Chains</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--ct-text-tertiary)' }}>Case Ref:</span>
          <span className="font-mono font-medium px-2 py-0.5 rounded border text-[11px]" style={{ backgroundColor: 'var(--ct-surface)', borderColor: 'var(--ct-border)', color: 'var(--ct-text)' }}>
            {caseNumber}
          </span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* 1. Transaction Ledger */}
        {activeTab === 'transactions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5" style={{ color: 'var(--ct-text-tertiary)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by hash or wallet address..."
                  className="ct-input pl-9 text-xs"
                  style={{ height: '32px' }}
                />
              </div>
              <span className="text-xs" style={{ color: 'var(--ct-text-secondary)' }}>
                Showing {paginatedHops.length} of {filteredHops.length} transactions
              </span>
            </div>

            {paginatedHops.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--ct-border)' }}>
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
                      <th className="py-2.5 px-3">Tx Hash</th>
                      <th className="py-2.5 px-3">Hop</th>
                      <th className="py-2.5 px-3">Sender</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Timestamp (UTC)</th>
                      <th className="py-2.5 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                    {paginatedHops.map((tx, idx) => (
                      <tr
                        key={idx}
                        className="transition-colors hover:opacity-90"
                        style={{ backgroundColor: 'var(--ct-surface)' }}
                      >
                        <td className="py-2 px-3 font-mono text-[11px] font-semibold" style={{ color: 'var(--ct-accent-text)' }} title={tx.txHash}>
                          {tx.txHash ? `${tx.txHash.slice(0, 10)}...${tx.txHash.slice(-6)}` : 'N/A'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="ct-badge ct-badge-info text-[10px] font-mono">
                            H{tx.hopNumber}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]" style={{ color: 'var(--ct-text-secondary)' }} title={tx.from}>
                          {tx.from ? `${tx.from.slice(0, 8)}...` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]" style={{ color: 'var(--ct-text)' }} title={tx.to}>
                          {tx.to ? `${tx.to.slice(0, 8)}...` : 'N/A'}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs font-semibold" style={{ color: 'var(--ct-success-text)' }}>
                          {tx.amount} {tx.asset}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                          {tx.timestamp?.slice(0, 19).replace('T', ' ') || 'Recent'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() =>
                              onSelectEdge?.({
                                id: `${tx.from}->${tx.to}:${tx.txHash}`,
                                source: tx.from,
                                target: tx.to,
                                txHash: tx.txHash,
                                chain: tx.chain,
                                asset: tx.asset,
                                amount: tx.amount,
                                timestamp: tx.timestamp,
                                hopNumber: tx.hopNumber,
                              })
                            }
                            className="ct-btn-icon"
                            title="Inspect in modal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                {allHops.length === 0 ? 'No transactions in active trace.' : 'No transactions match search criteria.'}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                <span style={{ color: 'var(--ct-text-secondary)' }}>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    className="ct-btn ct-btn-secondary ct-btn-sm"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Prev</span>
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    className="ct-btn ct-btn-secondary ct-btn-sm"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Investigation Timeline */}
        {activeTab === 'timeline' && (
          <div className="py-2">
            <div
              className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5"
              style={{
                // Timeline vertical bar color
              }}
            >
              <div
                className="absolute left-2.5 top-2 bottom-2 w-0.5"
                style={{ backgroundColor: 'var(--ct-border)' }}
              />

              <div className="relative flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center -ml-6 z-10"
                  style={{
                    backgroundColor: 'var(--ct-surface)',
                    borderColor: 'var(--ct-accent)',
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ct-accent)' }} />
                </div>
                <div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--ct-text)' }}>
                    Investigation Case Initialized
                  </span>
                  <p className="text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                    Case intake recorded with suspect seed wallet and complaint metadata.
                  </p>
                </div>
              </div>

              {allHops.length > 0 && (
                <div className="relative flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center -ml-6 z-10"
                    style={{
                      backgroundColor: 'var(--ct-surface)',
                      borderColor: 'var(--ct-success)',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ct-success)' }} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--ct-text)' }}>
                      N-Hop Breadth-First Traversal Executed
                    </span>
                    <p className="text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                      Discovered {allHops.length} transaction edges across {traceResult?.paths.length || 0} paths.
                    </p>
                  </div>
                </div>
              )}

              <div className="relative flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center -ml-6 z-10"
                  style={{
                    backgroundColor: 'var(--ct-surface)',
                    borderColor: 'var(--ct-warning)',
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ct-warning)' }} />
                </div>
                <div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--ct-text)' }}>
                    Rule-Based Intelligence Patterns Evaluated
                  </span>
                  <p className="text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                    Feature extractor scanned for rapid forwarding, fan-out, fan-in, and peel chain behaviors.
                  </p>
                </div>
              </div>

              <div className="relative flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center -ml-6 z-10"
                  style={{
                    backgroundColor: 'var(--ct-surface)',
                    borderColor: 'var(--ct-info)',
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ct-info)' }} />
                </div>
                <div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--ct-text)' }}>
                    VASP Attribution & Risk Assessment Scored
                  </span>
                  <p className="text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                    Indexed terminal hops against curated labels; bounded explainable score synthesized.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Forensic Evidence Chains */}
        {activeTab === 'evidence' && (
          <div className="space-y-3 py-1">
            <p className="text-xs" style={{ color: 'var(--ct-text-secondary)' }}>
              Forensic evidence links extracted directly from validated blockchain transfer events:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {allHops.slice(0, 6).map((h, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border flex items-center justify-between transition-all"
                  style={{
                    backgroundColor: 'var(--ct-bg-subtle)',
                    borderColor: 'var(--ct-border)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--ct-success-subtle)' }}
                    >
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--ct-success)' }} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--ct-text)' }}>
                        Transfer Event Ref #{i + 1}
                      </span>
                      <p className="text-[11px] font-mono truncate max-w-[200px]" style={{ color: 'var(--ct-text-secondary)' }}>
                        {h.txHash}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold" style={{ color: 'var(--ct-success-text)' }}>
                    {h.amount} {h.asset}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
