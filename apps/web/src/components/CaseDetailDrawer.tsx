import React, { useEffect, useState } from 'react';
import { 
  X, 
  ExternalLink, 
  History,
  Play
} from 'lucide-react';
import type { AuditLogEntry, Case, CaseStatus } from '@chaintrace/types';
import { CHAIN_METADATA } from '@chaintrace/shared';

interface CaseDetailDrawerProps {
  caseItem: Case | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: (updated: Case) => void;
  onStartTrace: (caseItem: Case) => void;
  authToken: string;
}

export const CaseDetailDrawer: React.FC<CaseDetailDrawerProps> = ({
  caseItem,
  isOpen,
  onClose,
  onStatusUpdated,
  onStartTrace,
  authToken,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (caseItem && isOpen) {
      setLoadingLogs(true);
      fetch(`/api/v1/audit?case_id=${caseItem.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((res) => res.json())
        .then((data) => setAuditLogs(data.logs || []))
        .catch(() => setAuditLogs([]))
        .finally(() => setLoadingLogs(false));
    }
  }, [caseItem, isOpen, authToken]);

  if (!isOpen || !caseItem) return null;

  const handleStatusChange = async (newStatus: CaseStatus) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/v1/cases/${caseItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        const updated = await response.json();
        onStatusUpdated(updated);
      }
    } catch {
      // Handled silently
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      const response = await fetch(`/api/v1/cases/${caseItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (response.ok) {
        const updated = await response.json();
        onStatusUpdated(updated);
      }
    } catch {
      // Handled silently
    }
  };

  const chainMeta = CHAIN_METADATA[caseItem.targetChain];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-xl border-l shadow-2xl flex flex-col h-full overflow-hidden transition-all animate-fade-in"
        style={{
          backgroundColor: 'var(--ct-surface)',
          borderColor: 'var(--ct-border)',
        }}
      >
        {/* Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{
            backgroundColor: 'var(--ct-bg-subtle)',
            borderColor: 'var(--ct-border)',
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="ct-badge ct-badge-info font-mono text-[11px]">
                {caseItem.caseNumber}
              </span>
              {caseItem.complaintId && (
                <span className="ct-badge ct-badge-success font-mono text-[11px]">
                  {caseItem.complaintId}
                </span>
              )}
              <span className="text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                {caseItem.fraudCategory.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-base font-semibold mt-1.5" style={{ color: 'var(--ct-text)' }}>
              {caseItem.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ct-btn-icon"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Quick Actions Card */}
          <div
            className="rounded-xl border p-4 flex items-center justify-between"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <div>
              <span className="text-xs" style={{ color: 'var(--ct-text-secondary)' }}>Target Blockchain</span>
              <div className="text-sm font-semibold flex items-center gap-2 mt-0.5" style={{ color: 'var(--ct-text)' }}>
                <span>{chainMeta?.name || caseItem.targetChain}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--ct-text-tertiary)' }}>
                  ({caseItem.targetChain.toUpperCase()})
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onStartTrace(caseItem);
                onClose();
              }}
              className="ct-btn ct-btn-primary ct-btn-sm inline-flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Fund Flow Trace</span>
            </button>
          </div>

          {/* Suspect Target Wallet */}
          <div
            className="rounded-xl border p-4 space-y-2"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-wider block"
              style={{ color: 'var(--ct-text-tertiary)' }}
            >
              Victim-Reported Suspect Wallet
            </span>
            <div
              className="flex items-center justify-between gap-2 font-mono text-xs p-3 rounded-lg border"
              style={{
                backgroundColor: 'var(--ct-surface)',
                borderColor: 'var(--ct-border)',
                color: 'var(--ct-text)',
              }}
            >
              <span className="break-all select-all font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
                {caseItem.suspectWallet}
              </span>
              {chainMeta?.explorerUrl && (
                <a
                  href={`${chainMeta.explorerUrl}${caseItem.suspectWallet}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ct-btn-icon p-1 shrink-0"
                  title="Open in blockchain explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Case Status & Priority Controllers */}
          <div
            className="rounded-xl border p-4 space-y-4"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <div>
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--ct-text-tertiary)' }}
              >
                Case Status
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['ACTIVE', 'UNDER_REVIEW', 'CLOSED'] as CaseStatus[]).map((st) => (
                  <button
                    key={st}
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(st)}
                    className="py-1.5 px-3 text-xs font-medium rounded-lg border transition-all text-center"
                    style={{
                      backgroundColor: caseItem.status === st ? 'var(--ct-accent)' : 'var(--ct-surface)',
                      color: caseItem.status === st ? '#FFFFFF' : 'var(--ct-text-secondary)',
                      borderColor: caseItem.status === st ? 'var(--ct-accent)' : 'var(--ct-border)',
                    }}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--ct-text-tertiary)' }}
              >
                Priority Tier
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((pr) => (
                  <button
                    key={pr}
                    onClick={() => handlePriorityChange(pr)}
                    className="py-1 px-2 rounded-md border text-center transition-all font-mono text-[11px]"
                    style={{
                      backgroundColor: caseItem.priority === pr
                        ? pr === 'CRITICAL'
                          ? 'var(--ct-danger-subtle)'
                          : pr === 'HIGH'
                          ? 'var(--ct-warning-subtle)'
                          : 'var(--ct-accent-subtle)'
                        : 'var(--ct-surface)',
                      color: caseItem.priority === pr
                        ? pr === 'CRITICAL'
                          ? 'var(--ct-danger-text)'
                          : pr === 'HIGH'
                          ? 'var(--ct-warning-text)'
                          : 'var(--ct-accent-text)'
                        : 'var(--ct-text-secondary)',
                      borderColor: caseItem.priority === pr
                        ? pr === 'CRITICAL'
                          ? 'var(--ct-danger)'
                          : pr === 'HIGH'
                          ? 'var(--ct-warning)'
                          : 'var(--ct-accent)'
                        : 'var(--ct-border)',
                    }}
                  >
                    {pr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Incident Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              className="rounded-xl border p-3.5"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <span className="block mb-1 text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>Reported Loss</span>
              <span className="font-mono font-bold text-sm" style={{ color: 'var(--ct-text)' }}>
                {Number(caseItem.reportedAmount).toLocaleString()} {caseItem.currency}
              </span>
            </div>
            <div
              className="rounded-xl border p-3.5"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <span className="block mb-1 text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>Incident Date</span>
              <span className="font-mono font-medium text-xs" style={{ color: 'var(--ct-text)' }}>
                {caseItem.incidentDate}
              </span>
            </div>
          </div>

          {/* Case Narrative */}
          {caseItem.description && (
            <div
              className="rounded-xl border p-4 text-xs"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1.5"
                style={{ color: 'var(--ct-text-tertiary)' }}
              >
                Investigator Notes & Complaint Summary
              </span>
              <p className="leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ct-text)' }}>
                {caseItem.description}
              </p>
            </div>
          )}

          {/* Immutable Evidentiary Audit Trail */}
          <div
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-2"
              style={{ borderColor: 'var(--ct-border)' }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--ct-text)' }}>
                <History className="w-3.5 h-3.5" style={{ color: 'var(--ct-accent)' }} />
                <span>Case Audit Trail (Immutable)</span>
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--ct-text-tertiary)' }}>
                {auditLogs.length} Events
              </span>
            </div>

            {loadingLogs ? (
              <div className="py-4 text-center text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                Loading audit history...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-4 text-center text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                No events logged yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between text-[11px] font-mono border-b pb-1.5 last:border-0"
                    style={{ borderColor: 'var(--ct-border-subtle)' }}
                  >
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
                        {log.action}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                        By: {log.actorEmail || 'System'}
                      </div>
                    </div>
                    <div className="text-right text-[10px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
