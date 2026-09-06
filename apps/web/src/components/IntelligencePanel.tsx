import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, RotateCw, Eye } from 'lucide-react';
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

  return (
    <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 flex flex-col space-y-3">
      <div className="flex items-center justify-between border-b border-navy-800 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Intelligence Findings ({findings.length})
          </span>
        </div>
        <button
          onClick={fetchIntelligence}
          disabled={loading}
          className="text-slate-400 hover:text-cyan-400 text-xs flex items-center gap-1 transition-colors"
          title="Re-run intelligence engine"
        >
          <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="text-[10px] font-mono">Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="py-6 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
          <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>Evaluating intelligence rules...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}

      {!loading && !error && findings.length === 0 && (
        <div className="py-6 text-center text-xs text-slate-400">
          <CheckCircle2 className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
          <p className="font-medium text-slate-300">No Suspicious Patterns Flagged</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Wallet behavior matches baseline rules without triggering anomaly thresholds.
          </p>
        </div>
      )}

      {!loading && findings.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {findings.map((f) => {
            const severityColor =
              f.severity === 'CRITICAL'
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                : f.severity === 'HIGH'
                  ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                  : f.severity === 'MEDIUM'
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';

            return (
              <div
                key={f.findingId || f.finding_id}
                onClick={() => setSelectedFinding(f)}
                className="bg-navy-950/60 hover:bg-navy-950 border border-navy-800 rounded-lg p-2.5 text-xs transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${severityColor}`}>
                    {f.severity}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Rule: {f.ruleId || f.rule_id}
                  </span>
                </div>

                <div className="font-semibold text-slate-200">{f.title}</div>
                <div className="text-[11px] text-slate-400 line-clamp-2">{f.description}</div>

                <div className="flex items-center justify-between pt-1 border-t border-navy-800/80 text-[10px] font-mono text-slate-500">
                  <span>Confidence: {Math.round(f.confidence * 100)}%</span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Eye className="w-3 h-3" />
                    Inspect
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Finding Inspector Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-slate-200">{selectedFinding.title}</span>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            {/* Observed Fact vs Interpretation (Principle Section 3) */}
            <div className="space-y-3 text-xs">
              <div className="bg-navy-950/80 border border-navy-800 rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                  1. Observed Blockchain Fact
                </span>
                <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                  {selectedFinding.observedFact || selectedFinding.observed_fact}
                </p>
              </div>

              <div className="bg-navy-950/80 border border-navy-800 rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  2. Forensic Interpretation
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedFinding.interpretation}
                </p>
              </div>

              {/* Evidence References */}
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Evidentiary References ({(selectedFinding.evidenceRefs || selectedFinding.evidence_refs || []).length})
                </span>
                <div className="space-y-1 font-mono text-[10px] max-h-32 overflow-y-auto">
                  {(selectedFinding.evidenceRefs || selectedFinding.evidence_refs || []).map((ev, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-navy-950 rounded border border-navy-800 text-slate-300">
                      <span className="text-cyan-300 font-bold">{ev.type}:</span>
                      <span className="truncate max-w-[280px] text-slate-400">{ev.refId || ev.ref_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-navy-800 flex justify-end">
              <button
                onClick={() => setSelectedFinding(null)}
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
