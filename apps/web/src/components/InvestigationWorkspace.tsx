import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  FileText,
  Sparkles,
  Layers,
  AlertCircle,
} from 'lucide-react';
import type { Case, TraceResult, TraceJob, GraphCanvasNode, GraphCanvasEdge } from '@chaintrace/types';
import { FundFlowGraph } from './FundFlowGraph';
import { RiskEnginePanel } from './RiskEnginePanel';
import { IntelligencePanel } from './IntelligencePanel';
import { VaspAttributionPanel } from './VaspAttributionPanel';
import { WorkspaceBottomDrawer } from './WorkspaceBottomDrawer';
import { WalletDetailModal } from './WalletDetailModal';
import { TransactionDetailModal } from './TransactionDetailModal';

interface InvestigationWorkspaceProps {
  activeCase: Case;
  authToken: string;
  onStatusUpdated?: (updatedCase: Case) => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  activeCase,
  authToken,
  onStatusUpdated,
}) => {
  // Trace State
  const [maxHops, setMaxHops] = useState<number>(4);
  const [minimumAmount, setMinimumAmount] = useState<string>('10.0');
  const [asset, setAsset] = useState<string>('USDT');
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD');
  const [loadingTrace, setLoadingTrace] = useState<boolean>(false);
  const [traceJob, setTraceJob] = useState<TraceJob | null>(null);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);

  // Status updating
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);

  // Modals for selection
  const [selectedNode, setSelectedNode] = useState<GraphCanvasNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphCanvasEdge | null>(null);

  // Demo loading
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);

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

  const loadDemoScenario = async () => {
    setLoadingDemo(true);
    try {
      const res = await fetch(`/api/v1/graph/demo-risk-scenario?chain=${activeCase.targetChain}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        // Auto-run trace after seeding demo
        startTrace();
      }
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 font-mono">
      {/* 1. Case Investigation Header */}
      <div className="bg-navy-900/95 border border-navy-700/80 rounded-lg p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
              {activeCase.caseNumber}
            </span>
            {activeCase.complaintId && (
              <span className="text-xs px-2 py-0.5 rounded bg-navy-950 text-slate-400 border border-navy-800">
                Complaint Ref: {activeCase.complaintId}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold uppercase">
              {activeCase.targetChain}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold border ${
                activeCase.priority === 'CRITICAL'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : activeCase.priority === 'HIGH'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {activeCase.priority} PRIORITY
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-100">{activeCase.title}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Suspect Wallet:</span>
            <code className="text-cyan-300 bg-navy-950 px-1.5 py-0.5 rounded border border-navy-800">
              {activeCase.suspectWallet}
            </code>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status selector */}
          <div className="flex items-center gap-1.5 bg-navy-950 px-2.5 py-1.5 rounded border border-navy-700">
            <span className="text-xs text-slate-400">Status:</span>
            <select
              value={activeCase.status}
              disabled={statusUpdating}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none"
            >
              <option value="NEW">NEW</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <button
            onClick={loadDemoScenario}
            disabled={loadingDemo}
            className="flex items-center gap-1.5 bg-navy-800 hover:bg-navy-750 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded text-xs transition-colors"
            title="Seed 5-hop fraud scenario (Victim -> Mule -> Consolidation -> VASP)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loadingDemo ? 'Seeding...' : 'Load Demo Scenario'}
          </button>

          <button
            disabled
            className="flex items-center gap-1.5 bg-navy-800/60 text-slate-500 border border-navy-700/60 px-3 py-1.5 rounded text-xs cursor-not-allowed"
            title="Investigation Report Engine scheduled for Phase 9"
          >
            <FileText className="w-3.5 h-3.5" />
            Generate Report (Phase 9)
          </button>
        </div>
      </div>

      {/* 2. Trace Parameters Controls Bar */}
      <div className="bg-navy-900/90 border border-navy-800 rounded-lg p-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300">Max Depth:</span>
          <select
            value={maxHops}
            onChange={(e) => setMaxHops(Number(e.target.value))}
            className="bg-navy-950 border border-navy-700 text-slate-200 rounded px-2 py-1 focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((h) => (
              <option key={h} value={h}>
                {h} hops
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-300">Min Amount:</span>
          <input
            type="text"
            value={minimumAmount}
            onChange={(e) => setMinimumAmount(e.target.value)}
            placeholder="0.0"
            className="w-20 bg-navy-950 border border-navy-700 text-slate-200 rounded px-2 py-1 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-300">Asset:</span>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="bg-navy-950 border border-navy-700 text-slate-200 rounded px-2 py-1 focus:outline-none"
          >
            <option value="USDT">USDT</option>
            <option value="TRX">TRX</option>
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-300">Direction:</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as any)}
            className="bg-navy-950 border border-navy-700 text-slate-200 rounded px-2 py-1 focus:outline-none"
          >
            <option value="FORWARD">Forward (Outflow)</option>
            <option value="BACKWARD">Backward (Inflow)</option>
          </select>
        </div>

        <button
          onClick={startTrace}
          disabled={loadingTrace}
          className="ml-auto flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition-colors shadow-lg shadow-cyan-900/30"
        >
          {loadingTrace ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{loadingTrace ? 'Tracing...' : 'Run Trace'}</span>
        </button>
      </div>

      {/* Trace Job Status Banner */}
      {traceJob && (
        <div className="flex items-center justify-between bg-navy-900/80 border border-navy-800 rounded-lg px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Trace Job:</span>
            <span className="text-cyan-400 font-mono font-bold">{traceJob.id}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                traceJob.status === 'COMPLETED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : traceJob.status === 'RUNNING'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {traceJob.status}
            </span>
          </div>
          {traceJob.progress && (
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span>Nodes: <strong className="text-slate-200">{traceJob.progress.nodes_processed ?? 0}</strong></span>
              <span>Edges: <strong className="text-slate-200">{traceJob.progress.edges_processed ?? 0}</strong></span>
              <span>Paths: <strong className="text-slate-200">{traceJob.progress.paths_found ?? 0}</strong></span>
            </div>
          )}
        </div>
      )}

      {traceError && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{traceError}</span>
        </div>
      )}

      {/* 3. Main Workspace Grid: Fund-Flow Graph (Left/Center) + Intelligence/Attribution/Risk Panels (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* Interactive Fund-Flow Graph Canvas */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <FundFlowGraph
            traceResult={traceResult}
            seedWallet={activeCase.suspectWallet}
            chain={activeCase.targetChain}
            onSelectNode={(node) => setSelectedNode(node)}
            onSelectEdge={(edge) => setSelectedEdge(edge)}
          />
        </div>

        {/* Forensic Panels Column */}
        <div className="flex flex-col gap-4">
          <RiskEnginePanel activeCase={activeCase} authToken={authToken} />
          <IntelligencePanel activeCase={activeCase} authToken={authToken} />
          <VaspAttributionPanel activeCase={activeCase} authToken={authToken} />
        </div>
      </div>

      {/* 4. Bottom Forensic Explorer Drawer */}
      <WorkspaceBottomDrawer
        traceResult={traceResult}
        caseId={activeCase.id}
        caseNumber={activeCase.caseNumber}
        onSelectEdge={(edge) => setSelectedEdge(edge)}
      />

      {/* 5. Modals */}
      <WalletDetailModal
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onRecenterTrace={(_addr) => {
          startTrace();
        }}
      />

      <TransactionDetailModal
        edge={selectedEdge}
        onClose={() => setSelectedEdge(null)}
      />
    </div>
  );
};
