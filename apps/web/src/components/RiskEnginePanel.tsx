import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, RotateCw, CheckCircle2, ChevronRight, UserCheck } from 'lucide-react';
import type { Case, RiskAssessment, RiskLevel } from '@chaintrace/types';

interface RiskEnginePanelProps {
  activeCase: Case;
  authToken: string;
}

export const RiskEnginePanel: React.FC<RiskEnginePanelProps> = ({ activeCase, authToken }) => {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideLevel, setOverrideLevel] = useState<RiskLevel>('HIGH');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [submittingOverride, setSubmittingOverride] = useState<boolean>(false);

  const fetchRisk = async () => {
    if (!activeCase || !authToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/investigations/${activeCase.id}/risk`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data: RiskAssessment = await res.json();
        setAssessment(data);
      } else if (res.status === 404) {
        setAssessment(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to fetch risk assessment');
      }
    } catch {
      setError('Risk score retrieval failed');
    } finally {
      setLoading(false);
    }
  };

  const runRiskAnalysis = async () => {
    if (!activeCase || !authToken) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/investigations/${activeCase.id}/risk/analyze?max_hops=4`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data: RiskAssessment = await res.json();
        setAssessment(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to analyze risk');
      }
    } catch {
      setError('Risk analysis request failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !authToken || !overrideReason.trim()) return;
    setSubmittingOverride(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/investigations/${activeCase.id}/risk/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          override_level: overrideLevel,
          reason: overrideReason.trim(),
        }),
      });
      if (res.ok) {
        const data: RiskAssessment = await res.json();
        setAssessment(data);
        setShowOverrideModal(false);
        setOverrideReason('');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to submit override');
      }
    } catch {
      setError('Manual override request failed');
    } finally {
      setSubmittingOverride(false);
    }
  };

  useEffect(() => {
    fetchRisk();
  }, [activeCase.id, authToken]);

  const score = assessment?.score ?? (activeCase.priority === 'CRITICAL' ? 85 : activeCase.priority === 'HIGH' ? 70 : 35);
  const currentRiskLevel = assessment?.risk_level || assessment?.riskLevel || activeCase.priority || 'LOW';
  const effectiveLevel = assessment?.manual_override?.override_level || currentRiskLevel;

  const getLevelBadgeClass = (lvl: string) => {
    switch (lvl) {
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'HIGH':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const contributions = assessment?.contributions || [];
  const reasons = assessment?.reasons || [];
  const evidenceCount = (assessment?.evidence?.length || assessment?.evidence_refs?.length || 0);

  return (
    <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-800 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Explainable Risk Engine
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            v{assessment?.engine_version || assessment?.engineVersion || '1.0.0'}
          </span>
          <button
            onClick={fetchRisk}
            disabled={loading || analyzing}
            className="text-slate-400 hover:text-cyan-400 text-xs flex items-center gap-1 transition-colors"
            title="Refresh assessment"
          >
            <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded p-2 flex items-center gap-1.5 font-mono">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Score Summary */}
      <div className="flex items-center justify-between bg-navy-950/60 p-3 rounded border border-navy-800">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
            Investigation Risk Score
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100">{score}</span>
            <span className="text-xs font-mono text-slate-400">/ 100</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getLevelBadgeClass(effectiveLevel)}`}>
              {effectiveLevel} RISK
            </span>
            {assessment?.manual_override && (
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                <UserCheck className="w-2.5 h-2.5" /> OVERRIDDEN
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 items-end">
          <button
            onClick={runRiskAnalysis}
            disabled={analyzing || loading}
            className="text-xs font-mono bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-2.5 py-1 rounded transition-colors flex items-center gap-1"
          >
            {analyzing ? <RotateCw className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
            {assessment ? 'Re-Analyze' : 'Analyze Risk'}
          </button>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="text-[10px] font-mono text-slate-400 hover:text-slate-200 underline"
          >
            Manual Override
          </button>
        </div>
      </div>

      {/* Manual Override Active Banner */}
      {assessment?.manual_override && (
        <div className="bg-purple-950/30 border border-purple-800/50 rounded p-2 text-xs font-mono text-purple-300">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-purple-200">Investigator Classification Override</span>
            <span className="text-[10px] text-purple-400">{assessment.manual_override.overridden_at?.slice(0, 19)}</span>
          </div>
          <p className="text-[11px] text-purple-300">
            Automated: <span className="font-bold">{assessment.manual_override.original_level}</span> ({assessment.score}/100) → Overridden: <span className="font-bold text-white">{assessment.manual_override.override_level}</span>
          </p>
          <p className="text-[10px] text-purple-400 mt-1 italic">
            Justification: "{assessment.manual_override.reason}"
          </p>
        </div>
      )}

      {/* Top Reasons */}
      {reasons.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold font-mono uppercase tracking-wider text-slate-400">
            Forensic Reasonings
          </span>
          <ul className="space-y-1 text-xs text-slate-300 font-mono">
            {reasons.slice(0, 3).map((r, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contributing Signals */}
      {contributions.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[10px] font-semibold font-mono uppercase tracking-wider text-slate-400">
            <span>Signal Contributions</span>
            <span>Evidence ({evidenceCount} refs)</span>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {contributions.map((c, i) => {
              const weightVal = c.effective_weight ?? c.effectiveWeight ?? c.weight ?? 0;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs font-mono bg-navy-950/40 px-2 py-1 rounded border border-navy-800/80"
                >
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">{c.signal.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={c.reason}>
                      {c.category} • {c.reason}
                    </span>
                  </div>
                  <span className="text-amber-400 font-bold shrink-0">+{weightVal}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-500 font-mono italic text-center py-2">
          {assessment ? 'No high-risk pattern anomalies triggered.' : 'Run analysis to compute deterministic risk score.'}
        </div>
      )}

      {/* Manual Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-lg p-5 max-w-md w-full font-mono space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              Document Manual Risk Classification Override
            </h3>
            <p className="text-xs text-slate-400">
              The automated score and evidence remain forensic records. Overrides update analytical prioritization while recording investigator identity and justification.
            </p>

            <form onSubmit={handleApplyOverride} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Target Risk Level</label>
                <select
                  value={overrideLevel}
                  onChange={(e) => setOverrideLevel(e.target.value as RiskLevel)}
                  className="w-full bg-navy-950 border border-navy-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Investigative Justification</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Document formal rationale (e.g., active subpoena, verified off-chain intelligence, false positive on exchange address)..."
                  rows={3}
                  required
                  minLength={5}
                  className="w-full bg-navy-950 border border-navy-700 text-slate-200 text-xs rounded p-2 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride || !overrideReason.trim()}
                  className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-bold"
                >
                  {submittingOverride ? 'Saving...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
