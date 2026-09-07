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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ override_level: overrideLevel, reason: overrideReason.trim() }),
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

  useEffect(() => { fetchRisk(); }, [activeCase.id, authToken]);

  const score = assessment?.score ?? (activeCase.priority === 'CRITICAL' ? 85 : activeCase.priority === 'HIGH' ? 70 : 35);
  const currentRiskLevel = assessment?.risk_level || assessment?.riskLevel || activeCase.priority || 'LOW';
  const effectiveLevel = assessment?.manual_override?.override_level || currentRiskLevel;

  const getLevelBadge = (lvl: string) => {
    switch (lvl) {
      case 'CRITICAL': return 'ct-badge-danger';
      case 'HIGH': return 'ct-badge-warning';
      case 'MEDIUM': return 'ct-badge-warning';
      default: return 'ct-badge-success';
    }
  };

  const contributions = assessment?.contributions || [];
  const reasons = assessment?.reasons || [];
  const evidenceCount = (assessment?.evidence?.length || assessment?.evidence_refs?.length || 0);

  return (
    <div className="ct-card" style={{ padding: 'var(--ct-space-4)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: '1px solid var(--ct-border)' }}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" style={{ color: 'var(--ct-accent-text)' }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ct-text-secondary)' }}>
            Risk Assessment
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="ct-badge ct-badge-default font-mono" style={{ fontSize: '10px' }}>
            v{assessment?.engine_version || assessment?.engineVersion || '1.0.0'}
          </span>
          <button onClick={fetchRisk} disabled={loading || analyzing} className="ct-btn-icon" style={{ padding: '4px' }} title="Refresh">
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'ct-animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 p-2 rounded-ct-sm mb-3 text-xs" style={{ background: 'var(--ct-danger-subtle)', color: 'var(--ct-danger-text)' }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Score */}
      <div className="p-3 rounded-ct-md mb-3" style={{ background: 'var(--ct-bg-subtle)', border: '1px solid var(--ct-border-subtle)' }}>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--ct-text-tertiary)' }}>
          Risk Score
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold" style={{ color: 'var(--ct-text)' }}>{score}</span>
          <span className="text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>/ 100</span>
          <span className={`ct-badge ${getLevelBadge(effectiveLevel)}`}>{effectiveLevel}</span>
          {assessment?.manual_override && (
            <span className="ct-badge ct-badge-accent" style={{ fontSize: '10px' }}>
              <UserCheck className="w-2.5 h-2.5" /> Override
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="ct-progress">
          <div
            className="ct-progress-bar"
            style={{
              width: `${score}%`,
              background: score >= 70 ? 'var(--ct-danger)' : score >= 40 ? 'var(--ct-warning)' : 'var(--ct-success)',
            }}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <button onClick={runRiskAnalysis} disabled={analyzing || loading} className="ct-btn ct-btn-primary ct-btn-sm">
            {analyzing ? <RotateCw className="w-3 h-3 ct-animate-spin" /> : <ChevronRight className="w-3 h-3" />}
            {assessment ? 'Re-Analyze' : 'Analyze'}
          </button>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="text-xs transition-colors"
            style={{ color: 'var(--ct-text-tertiary)', textDecoration: 'underline' }}
          >
            Manual Override
          </button>
        </div>
      </div>

      {/* Override banner */}
      {assessment?.manual_override && (
        <div className="p-2 rounded-ct-sm mb-3 text-xs" style={{ background: 'var(--ct-accent-subtle)', border: '1px solid var(--ct-accent-muted)', color: 'var(--ct-accent-text)' }}>
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold">Classification Override</span>
            <span style={{ color: 'var(--ct-text-tertiary)', fontSize: '10px' }}>{assessment.manual_override.overridden_at?.slice(0, 19)}</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--ct-text-secondary)' }}>
            {assessment.manual_override.original_level} → <strong style={{ color: 'var(--ct-text)' }}>{assessment.manual_override.override_level}</strong>
          </p>
          <p className="text-xs mt-1 italic" style={{ color: 'var(--ct-text-tertiary)' }}>
            "{assessment.manual_override.reason}"
          </p>
        </div>
      )}

      {/* Reasons */}
      {reasons.length > 0 && (
        <div className="mb-3">
          <div className="ct-section-label" style={{ padding: '0 0 var(--ct-space-1) 0' }}>Findings</div>
          <ul className="space-y-1">
            {reasons.slice(0, 3).map((r, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--ct-text-secondary)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--ct-success)' }} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contributions */}
      {contributions.length > 0 ? (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="ct-section-label" style={{ padding: 0 }}>Signals</span>
            <span className="text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>{evidenceCount} evidence</span>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {contributions.map((c, i) => {
              const weightVal = c.effective_weight ?? c.effectiveWeight ?? c.weight ?? 0;
              return (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-ct-sm" style={{ background: 'var(--ct-bg-subtle)', border: '1px solid var(--ct-border-subtle)' }}>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--ct-text)' }}>{c.signal.replace(/_/g, ' ')}</div>
                    <div className="text-xs truncate max-w-[200px]" style={{ color: 'var(--ct-text-tertiary)' }} title={c.reason}>
                      {c.category} · {c.reason}
                    </div>
                  </div>
                  <span className="font-mono font-bold shrink-0" style={{ color: 'var(--ct-warning-text)' }}>+{weightVal}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-xs italic text-center py-2" style={{ color: 'var(--ct-text-tertiary)' }}>
          {assessment ? 'No high-risk signals triggered.' : 'Run analysis to compute risk score.'}
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="ct-overlay flex items-center justify-center p-4" onClick={() => setShowOverrideModal(false)}>
          <div className="ct-modal w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--ct-text)' }}>
              <UserCheck className="w-4 h-4" style={{ color: 'var(--ct-accent-text)' }} />
              Risk Classification Override
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--ct-text-secondary)' }}>
              Override the automated risk level with investigator judgment. The original score remains recorded.
            </p>
            <form onSubmit={handleApplyOverride} className="space-y-3">
              <div>
                <label className="ct-label">Target Level</label>
                <select value={overrideLevel} onChange={(e) => setOverrideLevel(e.target.value as RiskLevel)} className="ct-select w-full">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div>
                <label className="ct-label">Justification</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Document formal rationale..."
                  rows={3} required minLength={5}
                  className="ct-input" style={{ resize: 'vertical' }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowOverrideModal(false)} className="ct-btn ct-btn-ghost ct-btn-sm">Cancel</button>
                <button type="submit" disabled={submittingOverride || !overrideReason.trim()} className="ct-btn ct-btn-primary ct-btn-sm">
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
