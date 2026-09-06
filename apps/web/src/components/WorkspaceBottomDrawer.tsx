import React, { useState } from 'react';
import { Terminal, Clock, FileText, Search, ExternalLink, CheckCircle2 } from 'lucide-react';
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
            isDemo: txHash.includes('demo'),
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
      h.txHash.toLowerCase().includes(q) ||
      h.from.toLowerCase().includes(q) ||
      h.to.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredHops.length / pageSize) || 1;
  const paginatedHops = filteredHops.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg overflow-hidden font-mono flex flex-col">
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-navy-800 px-4 py-2.5 bg-navy-950/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
              activeTab === 'transactions'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Transaction Ledger ({allHops.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
              activeTab === 'timeline'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Investigation Timeline
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
              activeTab === 'evidence'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Forensic Evidence Chains
          </button>
        </div>

        <span className="text-[11px] text-slate-400">
          Ref: <strong className="text-cyan-400">{caseNumber}</strong>
        </span>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* 1. Transaction Ledger */}
        {activeTab === 'transactions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by hash or wallet address..."
                  className="w-full bg-navy-950 border border-navy-700 text-slate-200 text-xs rounded pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <span className="text-xs text-slate-400">
                Showing {paginatedHops.length} of {filteredHops.length} transactions
              </span>
            </div>

            {paginatedHops.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-navy-950/80 text-[10px] uppercase text-slate-400 border-b border-navy-800">
                    <tr>
                      <th className="py-2 px-3">Tx Hash</th>
                      <th className="py-2 px-3">Hop</th>
                      <th className="py-2 px-3">Sender</th>
                      <th className="py-2 px-3">Recipient</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Timestamp (UTC)</th>
                      <th className="py-2 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-800/60">
                    {paginatedHops.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-navy-800/40 transition-colors">
                        <td className="py-2 px-3 text-cyan-300 font-bold truncate max-w-[140px]" title={tx.txHash}>
                          {tx.txHash.slice(0, 12)}...{tx.txHash.slice(-6)}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px] font-bold border border-cyan-800/60">
                            H{tx.hopNumber}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 truncate max-w-[120px]" title={tx.from}>
                          {tx.from.slice(0, 8)}...
                        </td>
                        <td className="py-2 px-3 text-slate-300 truncate max-w-[120px]" title={tx.to}>
                          {tx.to.slice(0, 8)}...
                        </td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">
                          {tx.amount} {tx.asset}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {tx.timestamp?.slice(0, 19).replace('T', ' ')}
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
                            className="p-1 text-cyan-400 hover:text-cyan-300 hover:bg-navy-800 rounded transition-colors"
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
              <div className="py-8 text-center text-xs text-slate-500 italic">
                {allHops.length === 0 ? 'No transactions in active trace.' : 'No transactions match search criteria.'}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-navy-800/80 text-xs">
                <span className="text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    className="px-2.5 py-1 bg-navy-950 border border-navy-700 disabled:opacity-40 rounded text-slate-300"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    className="px-2.5 py-1 bg-navy-950 border border-navy-700 disabled:opacity-40 rounded text-slate-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Investigation Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 py-1">
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-navy-700">
              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-cyan-900 border-2 border-cyan-400 shrink-0 flex items-center justify-center -ml-6" />
                <div>
                  <span className="text-xs font-bold text-slate-200">Investigation Case Initialized</span>
                  <p className="text-[11px] text-slate-400">Case intake recorded with suspect seed wallet and complaint metadata.</p>
                </div>
              </div>

              {allHops.length > 0 && (
                <div className="relative flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-900 border-2 border-emerald-400 shrink-0 flex items-center justify-center -ml-6" />
                  <div>
                    <span className="text-xs font-bold text-slate-200">N-Hop Breadth-First Traversal Executed</span>
                    <p className="text-[11px] text-slate-400">
                      Discovered {allHops.length} transaction edges across {traceResult?.paths.length || 0} paths.
                    </p>
                  </div>
                </div>
              )}

              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-900 border-2 border-amber-400 shrink-0 flex items-center justify-center -ml-6" />
                <div>
                  <span className="text-xs font-bold text-slate-200">Rule-Based Intelligence Patterns Evaluated</span>
                  <p className="text-[11px] text-slate-400">
                    Feature extractor scanned for rapid forwarding, fan-out, fan-in, and peel chain behaviors.
                  </p>
                </div>
              </div>

              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-900 border-2 border-purple-400 shrink-0 flex items-center justify-center -ml-6" />
                <div>
                  <span className="text-xs font-bold text-slate-200">VASP Attribution & Risk Assessment Scored</span>
                  <p className="text-[11px] text-slate-400">
                    Indexed terminal hops against curated labels; bounded explainable score synthesized.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Forensic Evidence Chains */}
        {activeTab === 'evidence' && (
          <div className="space-y-2 py-1 text-xs">
            <p className="text-slate-400 text-[11px]">
              Forensic evidence links extracted directly from validated blockchain transfer events:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allHops.slice(0, 6).map((h, i) => (
                <div key={i} className="bg-navy-950 p-2.5 rounded border border-navy-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-slate-200 font-bold">Transfer Event Ref #{i + 1}</span>
                      <p className="text-[10px] text-slate-400 truncate max-w-[220px]">{h.txHash}</p>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-bold">{h.amount} {h.asset}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
