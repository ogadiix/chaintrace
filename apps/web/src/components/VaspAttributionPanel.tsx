import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle, HelpCircle, AlertCircle, RotateCw } from 'lucide-react';
import type { Case, AttributionAnalysisResult, WalletAttribution } from '@chaintrace/types';

interface VaspAttributionPanelProps {
  activeCase: Case;
  authToken: string;
}

export const VaspAttributionPanel: React.FC<VaspAttributionPanelProps> = ({ activeCase, authToken }) => {
  const [result, setResult] = useState<AttributionAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletAttribution | null>(null);

  const fetchAttribution = async () => {
    if (!activeCase || !authToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/investigations/${activeCase.id}/attribution`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data: AttributionAnalysisResult = await res.json();
        setResult(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to fetch attribution');
      }
    } catch {
      setError('Attribution lookup failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttribution();
  }, [activeCase.id, authToken]);

  const terminals = result?.terminal_attributions || result?.terminalAttributions || [];
  const matchedTerminals = terminals.filter((t) => t.status === 'MATCHED');

  return (
    <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 flex flex-col space-y-3">
      <div className="flex items-center justify-between border-b border-navy-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            VASP Attribution ({matchedTerminals.length} Identified)
          </span>
        </div>
        <button
          onClick={fetchAttribution}
          disabled={loading}
          className="text-slate-400 hover:text-cyan-400 text-xs flex items-center gap-1 transition-colors"
          title="Refresh attribution analysis"
        >
          <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="text-[10px] font-mono">Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="py-6 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
          <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>Cross-referencing VASP directory...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}

      {!loading && !error && terminals.length === 0 && (
        <div className="py-6 text-center text-xs text-slate-400">
          <HelpCircle className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
          <p className="font-medium text-slate-300">No Terminal Destinations Analyzed</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Execute a multi-hop trace to discover cash-out endpoints.
          </p>
        </div>
      )}

      {!loading && terminals.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {terminals.map((item) => {
            const isMatched = item.status === 'MATCHED';
            const isConflict = item.status === 'CONFLICTING_LABELS';

            return (
              <div
                key={item.wallet}
                onClick={() => setSelectedWallet(item)}
                className={`border rounded-lg p-2.5 text-xs transition-colors cursor-pointer space-y-1.5 ${
                  isMatched
                    ? 'bg-cyan-950/40 border-cyan-700/50 hover:bg-cyan-950/70'
                    : isConflict
                      ? 'bg-amber-950/40 border-amber-700/50 hover:bg-amber-950/70'
                      : 'bg-navy-950/40 border-navy-800 hover:bg-navy-950/70 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    {isMatched ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isConflict ? (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={isMatched ? 'text-slate-100' : 'text-slate-400'}>
                      {item.entity ? item.entity.name : 'Unknown Destination'}
                    </span>
                  </div>

                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    isMatched
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : isConflict
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                  <span>Wallet: {item.wallet.slice(0, 10)}...</span>
                  <span>Confidence: {item.confidence}</span>
                </div>

                {item.entity?.jurisdiction && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Jurisdiction: {item.entity.jurisdiction}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attribution Detail Modal */}
      {selectedWallet && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-200">
                  {selectedWallet.entity?.name || 'Unattributed Wallet'}
                </span>
              </div>
              <button
                onClick={() => setSelectedWallet(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-navy-950 p-3 rounded-lg border border-navy-800 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Address:</span>
                  <span className="text-cyan-300 font-bold">{selectedWallet.wallet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chain:</span>
                  <span className="text-slate-200">{selectedWallet.chain.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attributed Via:</span>
                  <span className="text-slate-200">{selectedWallet.attributed_via || selectedWallet.attributedVia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dataset Version:</span>
                  <span className="text-slate-200">{selectedWallet.dataset_version || selectedWallet.datasetVersion}</span>
                </div>
              </div>

              {/* Confidence & Reasoning */}
              <div className="bg-navy-950 p-3 rounded-lg border border-navy-800 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">Attribution Confidence:</span>
                  <span className="font-mono text-cyan-400 font-bold">{selectedWallet.confidence}</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-400">
                  {(selectedWallet.confidence_reasons || selectedWallet.confidenceReasons || []).map((r, i) => (
                    <div key={i}>• {r}</div>
                  ))}
                </div>
              </div>

              {/* Labels & Provenance */}
              {selectedWallet.labels.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Source Provenance ({selectedWallet.labels.length})
                  </span>
                  <div className="space-y-1.5 font-mono text-[10px]">
                    {selectedWallet.labels.map((lbl, idx) => (
                      <div key={idx} className="p-2 bg-navy-950 rounded border border-navy-800 flex justify-between items-center text-slate-300">
                        <div>
                          <div className="font-bold text-cyan-300">{lbl.source}</div>
                          <div className="text-slate-500">{lbl.source_reference || lbl.sourceReference || 'Curated record'}</div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-navy-900 border border-navy-700 text-slate-400">
                          {lbl.label_type || lbl.labelType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-navy-800 flex justify-end">
              <button
                onClick={() => setSelectedWallet(null)}
                className="bg-navy-800 hover:bg-navy-700 text-slate-200 px-3 py-1.5 rounded text-xs font-mono transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
