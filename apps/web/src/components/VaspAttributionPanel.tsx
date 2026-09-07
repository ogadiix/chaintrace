import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle, HelpCircle, AlertCircle, RotateCw, X } from 'lucide-react';
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCHED':
        return <span className="ct-badge ct-badge-success">{status}</span>;
      case 'CONFLICTING_LABELS':
        return <span className="ct-badge ct-badge-warning">{status}</span>;
      default:
        return <span className="ct-badge ct-badge-neutral">{status}</span>;
    }
  };

  return (
    <div
      className="rounded-xl border p-4 flex flex-col space-y-3 transition-colors"
      style={{
        backgroundColor: 'var(--ct-surface)',
        borderColor: 'var(--ct-border)',
        boxShadow: 'var(--ct-shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between pb-3 border-b"
        style={{ borderColor: 'var(--ct-border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--ct-accent-subtle)' }}
          >
            <Building2 className="w-4 h-4" style={{ color: 'var(--ct-accent)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ct-text)' }}>
                VASP Attribution
              </span>
              <span className="ct-badge ct-badge-neutral text-[10px]">
                {matchedTerminals.length} Identified
              </span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
              Virtual Asset Service Provider directory matching
            </p>
          </div>
        </div>

        <button
          onClick={fetchAttribution}
          disabled={loading}
          className="ct-btn ct-btn-secondary ct-btn-sm"
          title="Refresh attribution analysis"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--ct-accent)' }} />
          <span className="text-xs">Refresh</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
          <RotateCw className="w-5 h-5 animate-spin" style={{ color: 'var(--ct-accent)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--ct-text-secondary)' }}>
            Cross-referencing verified entity directories...
          </span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          className="p-3 rounded-lg border text-xs flex items-center gap-2"
          style={{
            backgroundColor: 'var(--ct-danger-subtle)',
            borderColor: 'var(--ct-danger)',
            color: 'var(--ct-danger-text)',
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && terminals.length === 0 && (
        <div className="py-8 text-center flex flex-col items-center justify-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
            style={{ backgroundColor: 'var(--ct-bg-subtle)' }}
          >
            <HelpCircle className="w-5 h-5" style={{ color: 'var(--ct-text-tertiary)' }} />
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--ct-text)' }}>
            No Terminal Destinations Analyzed
          </p>
          <p className="text-[11px] max-w-xs mt-0.5" style={{ color: 'var(--ct-text-tertiary)' }}>
            Execute an automated fund trace to discover cash-out endpoints and exchange clusters.
          </p>
        </div>
      )}

      {/* Attribution List */}
      {!loading && terminals.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {terminals.map((item) => {
            const isMatched = item.status === 'MATCHED';
            const isConflict = item.status === 'CONFLICTING_LABELS';

            return (
              <div
                key={item.wallet}
                onClick={() => setSelectedWallet(item)}
                className="group rounded-lg p-3 border transition-all cursor-pointer space-y-2"
                style={{
                  backgroundColor: 'var(--ct-bg-subtle)',
                  borderColor: isMatched
                    ? 'var(--ct-border)'
                    : isConflict
                      ? 'var(--ct-warning)'
                      : 'var(--ct-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ct-accent)';
                  e.currentTarget.style.boxShadow = 'var(--ct-shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isConflict ? 'var(--ct-warning)' : 'var(--ct-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isMatched ? (
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--ct-success)' }} />
                    ) : isConflict ? (
                      <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--ct-warning)' }} />
                    ) : (
                      <HelpCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--ct-text-tertiary)' }} />
                    )}
                    <span className="text-xs font-semibold" style={{ color: 'var(--ct-text)' }}>
                      {item.entity ? item.entity.name : 'Unknown Destination'}
                    </span>
                  </div>

                  {getStatusBadge(item.status)}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--ct-text-secondary)' }}>
                  <span>
                    Wallet: {item.wallet.slice(0, 8)}...{item.wallet.slice(-6)}
                  </span>
                  <span className="capitalize font-sans text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                    Conf: {item.confidence}
                  </span>
                </div>

                {item.entity?.jurisdiction && (
                  <div className="text-[11px] flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                    <span style={{ color: 'var(--ct-text-tertiary)' }}>Jurisdiction</span>
                    <span className="font-medium" style={{ color: 'var(--ct-text-secondary)' }}>
                      {item.entity.jurisdiction}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attribution Detail Modal */}
      {selectedWallet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-xl border max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in"
            style={{
              backgroundColor: 'var(--ct-surface)',
              borderColor: 'var(--ct-border)',
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'var(--ct-border)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--ct-accent-subtle)' }}
                >
                  <Building2 className="w-4 h-4" style={{ color: 'var(--ct-accent)' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                    {selectedWallet.entity?.name || 'Unattributed Wallet'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getStatusBadge(selectedWallet.status)}
                    <span className="text-[11px] font-mono uppercase" style={{ color: 'var(--ct-text-tertiary)' }}>
                      {selectedWallet.chain}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedWallet(null)}
                className="ct-btn-icon"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Technical Metadata */}
              <div
                className="p-3.5 rounded-lg border space-y-2 text-xs"
                style={{
                  backgroundColor: 'var(--ct-bg-subtle)',
                  borderColor: 'var(--ct-border)',
                }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ct-text-tertiary)' }}>Address:</span>
                  <span className="font-mono text-[11px] font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
                    {selectedWallet.wallet}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ct-text-tertiary)' }}>Attributed Via:</span>
                  <span className="font-medium" style={{ color: 'var(--ct-text)' }}>
                    {selectedWallet.attributed_via || selectedWallet.attributedVia || 'Direct Registry'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--ct-text-tertiary)' }}>Dataset Version:</span>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                    {selectedWallet.dataset_version || selectedWallet.datasetVersion || 'v1.4.0'}
                  </span>
                </div>
              </div>

              {/* Confidence & Reasoning */}
              <div
                className="p-3.5 rounded-lg border space-y-2 text-xs"
                style={{
                  backgroundColor: 'var(--ct-bg-subtle)',
                  borderColor: 'var(--ct-border)',
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold" style={{ color: 'var(--ct-text)' }}>
                    Attribution Confidence:
                  </span>
                  <span className="font-mono font-bold" style={{ color: 'var(--ct-accent-text)' }}>
                    {selectedWallet.confidence}
                  </span>
                </div>
                <div className="space-y-1 text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                  {(selectedWallet.confidence_reasons || selectedWallet.confidenceReasons || []).map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-accent">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Labels & Provenance */}
              {selectedWallet.labels.length > 0 && (
                <div>
                  <span
                    className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1.5"
                    style={{ color: 'var(--ct-text-tertiary)' }}
                  >
                    Source Provenance ({selectedWallet.labels.length})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedWallet.labels.map((lbl, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded border flex justify-between items-center text-xs"
                        style={{
                          backgroundColor: 'var(--ct-surface)',
                          borderColor: 'var(--ct-border-subtle)',
                        }}
                      >
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--ct-text)' }}>
                            {lbl.source}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                            {lbl.source_reference || lbl.sourceReference || 'Verified registry entity'}
                          </div>
                        </div>
                        <span className="ct-badge ct-badge-neutral text-[10px]">
                          {lbl.label_type || lbl.labelType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="pt-3 border-t flex justify-end"
              style={{ borderColor: 'var(--ct-border)' }}
            >
              <button
                onClick={() => setSelectedWallet(null)}
                className="ct-btn ct-btn-secondary ct-btn-sm"
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
