import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  FileText,
  Layers,
  AlertCircle,
  Building2,
} from 'lucide-react';
import type { Case, TraceResult, TraceJob, GraphCanvasNode, GraphCanvasEdge } from '@chaintrace/types';
import { FundFlowGraph } from './FundFlowGraph';
import { RiskEnginePanel } from './RiskEnginePanel';
import { IntelligencePanel } from './IntelligencePanel';
import { VaspAttributionPanel } from './VaspAttributionPanel';
import { WorkspaceBottomDrawer } from './WorkspaceBottomDrawer';
import { WalletDetailModal } from './WalletDetailModal';
import { TransactionDetailModal } from './TransactionDetailModal';
import { ReportGenerationModal } from './ReportGenerationModal';
import { SahyogRequestModal } from './SahyogRequestModal';

interface InvestigationWorkspaceProps {
  activeCase: Case;
  authToken: string;
  onStatusUpdated?: (updatedCase: Case) => void;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'fundflow', label: 'Fund Flow' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'attribution', label: 'Attribution' },
  { id: 'risk', label: 'Risk' },
] as const;

type TabId = typeof TABS[number]['id'];

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  activeCase,
  authToken,
  onStatusUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Trace State
  const [maxHops, setMaxHops] = useState<number>(4);
  const [minimumAmount, setMinimumAmount] = useState<string>('10.0');
  const [asset, setAsset] = useState<string>('USDT');
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD');
  const [loadingTrace, setLoadingTrace] = useState<boolean>(false);
  const [traceJob, setTraceJob] = useState<TraceJob | null>(null);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isSahyogModalOpen, setIsSahyogModalOpen] = useState<boolean>(false);

  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<GraphCanvasNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphCanvasEdge | null>(null);

  const startTrace = async () => {
    if (!activeCase || !authToken) return;
    setLoadingTrace(true);
    setTraceError(null);

    try {
      const payload = {
        chain: activeCase.targetChain,
        seed_wallet: activeCase.suspectWallet,
        max_hops: Number(maxHops),
        minimum_amount: minimumAmount || null,
        asset: asset || null,
        direction,
      };

      const res = await fetch(`/api/v1/investigations/${activeCase.id}/trace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to initialize trace');
      }

      const jobData: TraceJob = await res.json();
      setTraceJob(jobData);
      pollTraceJob(jobData.id);
    } catch (err: any) {
      setTraceError(err.message || 'Trace request failed');
      setLoadingTrace(false);
    }
  };

  const pollTraceJob = async (jobId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/v1/investigations/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const currentJob: TraceJob = await res.json();
          setTraceJob(currentJob);

          if (currentJob.status === 'COMPLETED' || currentJob.status === 'PARTIAL') {
            clearInterval(interval);
            setLoadingTrace(false);
            if (currentJob.result) {
              setTraceResult(currentJob.result);
            }
          } else if (currentJob.status === 'FAILED') {
            clearInterval(interval);
            setLoadingTrace(false);
            setTraceError(currentJob.error_message || 'Trace job failed');
          }
        }
      } catch {
        // Retry
      }

      if (attempts > 30) {
        clearInterval(interval);
        setLoadingTrace(false);
        setTraceError('Trace execution timed out');
      }
    }, 1000);
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/v1/cases/${activeCase.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        onStatusUpdated?.(updated);
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  const getPriorityStyle = () => {
    switch (activeCase.priority) {
      case 'CRITICAL': return 'ct-badge-danger';
      case 'HIGH': return 'ct-badge-warning';
      default: return 'ct-badge-success';
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ═══ Investigation Header ═══ */}
      <div
        className="ct-card flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ padding: 'var(--ct-space-4)' }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="ct-badge ct-badge-accent font-mono">{activeCase.caseNumber}</span>
            <span className="ct-badge ct-badge-default uppercase">{activeCase.targetChain}</span>
            <span className={`ct-badge ${getPriorityStyle()}`}>{activeCase.priority}</span>
            {activeCase.complaintId && (
              <span className="ct-badge ct-badge-default font-mono">Ref: {activeCase.complaintId}</span>
            )}
          </div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ct-text)' }}>
            {activeCase.title}
          </h2>
          <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: 'var(--ct-text-secondary)' }}>
            <span>Suspect:</span>
            <code
              className="font-mono px-1.5 py-0.5 rounded-ct-sm text-xs break-all max-w-full"
              style={{
                background: 'var(--ct-bg-subtle)',
                border: '1px solid var(--ct-border)',
                color: 'var(--ct-accent-text)',
              }}
            >
              {activeCase.suspectWallet}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-ct-md" style={{ background: 'var(--ct-bg-subtle)', border: '1px solid var(--ct-border)' }}>
            <span className="text-xs" style={{ color: 'var(--ct-text-secondary)' }}>Status:</span>
            <select
              value={activeCase.status}
              disabled={statusUpdating}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none"
              style={{ color: 'var(--ct-text)' }}
            >
              <option value="NEW">NEW</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <button onClick={() => setIsSahyogModalOpen(true)} className="ct-btn ct-btn-secondary ct-btn-sm">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SAHYOG</span>
          </button>

          <button onClick={() => setIsReportModalOpen(true)} className="ct-btn ct-btn-primary ct-btn-sm">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report</span>
          </button>
        </div>
      </div>

      {/* ═══ Tab Navigation ═══ */}
      <div className="ct-tabs flex items-center overflow-x-auto whitespace-nowrap scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`ct-tab shrink-0 ${activeTab === tab.id ? 'ct-tab-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ Tab Content ═══ */}

      {/* Overview: shows graph + panels */}
      {(activeTab === 'overview' || activeTab === 'fundflow') && (
        <>
          {/* Trace Parameters */}
          <div
            className="flex flex-wrap items-center gap-2.5 sm:gap-3 p-3 rounded-ct-md text-xs"
            style={{ background: 'var(--ct-bg-subtle)', border: '1px solid var(--ct-border)' }}
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" style={{ color: 'var(--ct-accent-text)' }} />
              <span style={{ color: 'var(--ct-text-secondary)' }}>Depth:</span>
              <select value={maxHops} onChange={(e) => setMaxHops(Number(e.target.value))} className="ct-select" style={{ padding: '4px 28px 4px 8px', fontSize: '12px' }}>
                {[1, 2, 3, 4, 5, 6, 7].map((h) => (<option key={h} value={h}>{h} hops</option>))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--ct-text-secondary)' }}>Min:</span>
              <input type="text" value={minimumAmount} onChange={(e) => setMinimumAmount(e.target.value)} className="ct-input" style={{ width: '70px', padding: '4px 8px', fontSize: '12px' }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--ct-text-secondary)' }}>Asset:</span>
              <select value={asset} onChange={(e) => setAsset(e.target.value)} className="ct-select" style={{ padding: '4px 28px 4px 8px', fontSize: '12px' }}>
                <option value="USDT">USDT</option>
                <option value="TRX">TRX</option>
                <option value="ETH">ETH</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--ct-text-secondary)' }}>Dir:</span>
              <select value={direction} onChange={(e) => setDirection(e.target.value as any)} className="ct-select" style={{ padding: '4px 28px 4px 8px', fontSize: '12px' }}>
                <option value="FORWARD">Forward</option>
                <option value="BACKWARD">Backward</option>
              </select>
            </div>
            <button onClick={startTrace} disabled={loadingTrace} className="ct-btn ct-btn-primary ct-btn-sm w-full sm:w-auto sm:ml-auto justify-center">
              {loadingTrace ? <RotateCw className="w-3.5 h-3.5 ct-animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {loadingTrace ? 'Tracing...' : 'Run Trace'}
            </button>
          </div>

          {/* Trace job status */}
          {traceJob && (
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-ct-md px-3 sm:px-4 py-2 text-xs"
              style={{ background: 'var(--ct-bg-subtle)', border: '1px solid var(--ct-border)' }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ color: 'var(--ct-text-secondary)' }}>Job:</span>
                <span className="font-mono font-medium truncate max-w-[140px] sm:max-w-none" style={{ color: 'var(--ct-accent-text)' }}>{traceJob.id}</span>
                <span className={`ct-badge ${
                  traceJob.status === 'COMPLETED' ? 'ct-badge-success' :
                  traceJob.status === 'RUNNING' ? 'ct-badge-warning' :
                  'ct-badge-danger'
                }`}>
                  {traceJob.status}
                </span>
              </div>
              {traceJob.progress && (
                <div className="flex items-center gap-3 font-mono" style={{ color: 'var(--ct-text-tertiary)' }}>
                  <span>Nodes: <strong style={{ color: 'var(--ct-text)' }}>{traceJob.progress.nodes_processed ?? 0}</strong></span>
                  <span>Edges: <strong style={{ color: 'var(--ct-text)' }}>{traceJob.progress.edges_processed ?? 0}</strong></span>
                  <span>Paths: <strong style={{ color: 'var(--ct-text)' }}>{traceJob.progress.paths_found ?? 0}</strong></span>
                </div>
              )}
            </div>
          )}

          {traceError && (
            <div
              className="flex items-center gap-2 p-3 rounded-ct-md text-sm"
              style={{ background: 'var(--ct-danger-subtle)', color: 'var(--ct-danger-text)', border: '1px solid transparent' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{traceError}</span>
            </div>
          )}

          {/* Graph + Panels grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
            <div className="lg:col-span-2 flex flex-col h-full">
              <FundFlowGraph
                traceResult={traceResult}
                seedWallet={activeCase.suspectWallet}
                chain={activeCase.targetChain}
                onSelectNode={(node) => setSelectedNode(node)}
                onSelectEdge={(edge) => setSelectedEdge(edge)}
              />
            </div>
            <div className="flex flex-col gap-4">
              <RiskEnginePanel activeCase={activeCase} authToken={authToken} />
              <IntelligencePanel activeCase={activeCase} authToken={authToken} />
              <VaspAttributionPanel activeCase={activeCase} authToken={authToken} />
            </div>
          </div>
        </>
      )}

      {/* Transactions tab */}
      {activeTab === 'transactions' && (
        <WorkspaceBottomDrawer
          traceResult={traceResult}
          caseId={activeCase.id}
          caseNumber={activeCase.caseNumber}
          onSelectEdge={(edge) => setSelectedEdge(edge)}
        />
      )}

      {/* Intelligence tab */}
      {activeTab === 'intelligence' && (
        <IntelligencePanel activeCase={activeCase} authToken={authToken} />
      )}

      {/* Attribution tab */}
      {activeTab === 'attribution' && (
        <VaspAttributionPanel activeCase={activeCase} authToken={authToken} />
      )}

      {/* Risk tab */}
      {activeTab === 'risk' && (
        <RiskEnginePanel activeCase={activeCase} authToken={authToken} />
      )}

      {/* Bottom drawer (only in overview/fundflow) */}
      {(activeTab === 'overview' || activeTab === 'fundflow') && (
        <WorkspaceBottomDrawer
          traceResult={traceResult}
          caseId={activeCase.id}
          caseNumber={activeCase.caseNumber}
          onSelectEdge={(edge) => setSelectedEdge(edge)}
        />
      )}

      {/* Modals */}
      <WalletDetailModal
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onRecenterTrace={() => startTrace()}
      />
      <TransactionDetailModal
        edge={selectedEdge}
        onClose={() => setSelectedEdge(null)}
      />
      <ReportGenerationModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        activeCase={activeCase}
        authToken={authToken}
      />
      <SahyogRequestModal
        isOpen={isSahyogModalOpen}
        onClose={() => setIsSahyogModalOpen(false)}
        activeCase={activeCase}
        authToken={authToken}
        initialTargetWallet={selectedNode ? selectedNode.address : activeCase.suspectWallet}
      />
    </div>
  );
};
