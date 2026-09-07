import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, RotateCw, Eye, X } from 'lucide-react';
import type { Case, IntelligenceAnalysisResult, IntelligenceFinding } from '@chaintrace/types';

interface IntelligencePanelProps {
  activeCase: Case;
  authToken: string;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ activeCase, authToken }) => {
  const [analysis, setAnalysis] = useState<IntelligenceAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<IntelligenceFinding | null>(null);

  const fetchIntelligence = async () => {
    if (!activeCase || !authToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/investigations/${activeCase.id}/intelligence`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data: IntelligenceAnalysisResult = await res.json();
        setAnalysis(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Could not retrieve intelligence findings');
      }
    } catch {
      setError('Failed to query intelligence engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, [activeCase.id, authToken]);

  const findings = analysis?.findings || [];

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'ct-badge ct-badge-danger';
      case 'HIGH':
        return 'ct-badge ct-badge-danger';
      case 'MEDIUM':
        return 'ct-badge ct-badge-warning';
      default:
        return 'ct-badge ct-badge-info';
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
            <ShieldAlert className="w-4 h-4" style={{ color: 'var(--ct-accent)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ct-text)' }}>
                Intelligence Findings
              </span>
              <span className="ct-badge ct-badge-neutral text-[10px]">
                {findings.length}
              </span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
              Behavioral heuristical pattern analysis
            </p>
          </div>
        </div>

        <button
          onClick={fetchIntelligence}
          disabled={loading}
          className="ct-btn ct-btn-secondary ct-btn-sm"
          title="Re-run intelligence engine"
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
            Evaluating forensic intelligence rules...
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
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && findings.length === 0 && (
        <div className="py-8 text-center flex flex-col items-center justify-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
            style={{ backgroundColor: 'var(--ct-success-subtle)' }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--ct-success)' }} />
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--ct-text)' }}>
            No Suspicious Patterns Flagged
          </p>
          <p className="text-[11px] max-w-xs mt-0.5" style={{ color: 'var(--ct-text-tertiary)' }}>
            Wallet activity adheres to baseline rules without triggering anomaly thresholds.
          </p>
        </div>
      )}

      {/* Findings List */}
      {!loading && findings.length > 0 && (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {findings.map((f) => {
            return (
              <div
                key={f.findingId || f.finding_id}
                onClick={() => setSelectedFinding(f)}
                className="group rounded-lg p-3 border transition-all cursor-pointer space-y-2"
                style={{
                  backgroundColor: 'var(--ct-bg-subtle)',
                  borderColor: 'var(--ct-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ct-accent)';
                  e.currentTarget.style.boxShadow = 'var(--ct-shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ct-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={getSeverityBadgeClass(f.severity)}>
                      {f.severity}
                    </span>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--ct-surface)',
                        color: 'var(--ct-text-secondary)',
                        border: '1px solid var(--ct-border)',
                      }}
                    >
                      Rule: {f.ruleId || f.rule_id}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-mono font-medium"
                    style={{ color: 'var(--ct-text-secondary)' }}
                  >
                    {Math.round(f.confidence * 100)}% conf.
                  </span>
                </div>

                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--ct-text)' }}>
                    {f.title}
                  </div>
                  <div className="text-[11px] line-clamp-2 mt-0.5" style={{ color: 'var(--ct-text-secondary)' }}>
                    {f.description}
                  </div>
                </div>

                <div
                  className="flex items-center justify-between pt-2 border-t text-[11px]"
                  style={{ borderColor: 'var(--ct-border-subtle)' }}
                >
                  <span style={{ color: 'var(--ct-text-tertiary)' }}>
                    {(f.evidenceRefs || f.evidence_refs || []).length} evidentiary refs
                  </span>
                  <span
                    className="flex items-center gap-1 font-medium text-xs transition-colors"
                    style={{ color: 'var(--ct-accent-text)' }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Details
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Finding Inspector Modal */}
      {selectedFinding && (
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
                  style={{ backgroundColor: 'var(--ct-warning-subtle)' }}
                >
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--ct-warning)' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                    {selectedFinding.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={getSeverityBadgeClass(selectedFinding.severity)}>
                      {selectedFinding.severity}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--ct-text-tertiary)' }}>
                      Rule {selectedFinding.ruleId || selectedFinding.rule_id}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="ct-btn-icon"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Observed Fact vs Forensic Interpretation */}
            <div className="space-y-3">
              <div
                className="p-3.5 rounded-lg border space-y-1"
                style={{
                  backgroundColor: 'var(--ct-bg-subtle)',
                  borderColor: 'var(--ct-border)',
                }}
              >
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-wider block"
                  style={{ color: 'var(--ct-accent-text)' }}
                >
                  1. Observed Blockchain Fact
                </span>
                <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--ct-text)' }}>
                  {selectedFinding.observedFact || selectedFinding.observed_fact}
                </p>
              </div>

              <div
                className="p-3.5 rounded-lg border space-y-1"
                style={{
                  backgroundColor: 'var(--ct-bg-subtle)',
                  borderColor: 'var(--ct-border)',
                }}
              >
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-wider block"
                  style={{ color: 'var(--ct-warning-text)' }}
                >
                  2. Forensic Interpretation
                </span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--ct-text)' }}>
                  {selectedFinding.interpretation}
                </p>
              </div>

              {/* Evidence References */}
              <div>
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1.5"
                  style={{ color: 'var(--ct-text-tertiary)' }}
                >
                  Evidentiary References ({(selectedFinding.evidenceRefs || selectedFinding.evidence_refs || []).length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {(selectedFinding.evidenceRefs || selectedFinding.evidence_refs || []).map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded border text-xs"
                      style={{
                        backgroundColor: 'var(--ct-surface)',
                        borderColor: 'var(--ct-border-subtle)',
                      }}
                    >
                      <span className="font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
                        {ev.type}:
                      </span>
                      <span className="font-mono text-[11px] truncate max-w-[280px]" style={{ color: 'var(--ct-text-secondary)' }}>
                        {ev.refId || ev.ref_id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="pt-3 border-t flex justify-end"
              style={{ borderColor: 'var(--ct-border)' }}
            >
              <button
                onClick={() => setSelectedFinding(null)}
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
