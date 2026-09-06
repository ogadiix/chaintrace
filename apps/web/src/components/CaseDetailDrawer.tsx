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
    <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-navy-900 border-l border-navy-700/80 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-navy-700/80 flex items-center justify-between bg-navy-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {caseItem.caseNumber}
              </span>
              {caseItem.complaintId && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {caseItem.complaintId}
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono">
                {caseItem.fraudCategory.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 mt-1">{caseItem.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Quick Actions Card */}
          <div className="bg-navy-950 border border-cyan-500/30 rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Target Blockchain</span>
              <div className="text-sm font-bold text-cyan-300 font-mono flex items-center gap-2 mt-0.5">
                <span>{chainMeta.name}</span>
                <span className="text-xs text-slate-400">({caseItem.targetChain.toUpperCase()})</span>
              </div>
            </div>
            <button
              onClick={() => {
                onStartTrace(caseItem);
                onClose();
              }}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs transition-colors shadow-lg shadow-cyan-900/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Fund Flow Trace</span>
            </button>
          </div>

          {/* Suspect Target Wallet */}
          <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-4">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Victim-Reported Suspect Wallet
            </span>
            <div className="flex items-center justify-between gap-2 font-mono text-xs text-cyan-200 bg-navy-900 p-2.5 rounded border border-navy-700">
              <span className="break-all select-all">{caseItem.suspectWallet}</span>
              {chainMeta.explorerUrl && (
                <a
                  href={`${chainMeta.explorerUrl}${caseItem.suspectWallet}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-cyan-400 flex-shrink-0 p-1"
                  title="Open Public Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Case Status & Priority Controllers */}
          <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-4 flex flex-col gap-3">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                Case Status
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['ACTIVE', 'UNDER_REVIEW', 'CLOSED'] as CaseStatus[]).map((st) => (
                  <button
                    key={st}
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(st)}
                    className={`py-1.5 px-3 text-xs font-mono font-medium rounded-md border transition-all text-center ${
                      caseItem.status === st
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 shadow-sm'
                        : 'bg-navy-900 border-navy-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                Priority Tier
              </span>
              <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((pr) => (
                  <button
                    key={pr}
                    onClick={() => handlePriorityChange(pr)}
                    className={`py-1 px-2 rounded border text-center transition-all ${
                      caseItem.priority === pr
                        ? pr === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                          : pr === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                        : 'bg-navy-900 border-navy-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Incident Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-3">
              <span className="text-slate-400 block mb-1">Reported Amount</span>
              <span className="font-mono font-bold text-slate-100 text-sm">
                {Number(caseItem.reportedAmount).toLocaleString()} {caseItem.currency}
              </span>
            </div>
            <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-3">
              <span className="text-slate-400 block mb-1">Incident Date</span>
              <span className="font-mono font-medium text-slate-200">{caseItem.incidentDate}</span>
            </div>
          </div>

          {/* Case Narrative */}
          {caseItem.description && (
            <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-4 text-xs">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                Investigator Notes & Complaint Summary
              </span>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{caseItem.description}</p>
            </div>
          )}

          {/* Immutable Evidentiary Audit Trail */}
          <div className="bg-navy-950/60 border border-navy-800 rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-navy-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>Case Audit Trail (Immutable)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{auditLogs.length} Events</span>
            </div>

            {loadingLogs ? (
              <div className="py-4 text-center text-xs text-slate-500">Loading audit history...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">No events logged yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between text-[11px] font-mono border-b border-navy-800/40 pb-1.5 last:border-0"
                  >
                    <div>
                      <div className="text-cyan-400 font-medium">{log.action}</div>
                      <div className="text-slate-500 text-[10px]">By: {log.actorEmail || 'System'}</div>
                    </div>
                    <div className="text-right text-slate-500 text-[10px]">
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
