import React, { useState } from 'react';
import { Play, RotateCw, AlertCircle, CheckCircle2, ChevronRight, Layers, DollarSign, Clock } from 'lucide-react';
import type { Case, TraceResult, TraceJob } from '@chaintrace/types';

interface TraceConsoleProps {
  activeCase: Case;
  authToken: string;
}

export const TraceConsole: React.FC<TraceConsoleProps> = ({ activeCase, authToken }) => {
  const [maxHops, setMaxHops] = useState<number>(4);
  const [minimumAmount, setMinimumAmount] = useState<string>('10.0');
  const [asset, setAsset] = useState<string>('USDT');
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD');
  const [loading, setLoading] = useState<boolean>(false);
  const [job, setJob] = useState<TraceJob | null>(null);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startTrace = async () => {
    setLoading(true);
    setError(null);
    setTraceResult(null);

    try {
      // 1. Submit trace request
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
      setJob(jobData);

      // 2. Poll job status
      pollJob(jobData.id);
    } catch (err: any) {
      setError(err.message || 'Trace failed');
      setLoading(false);
    }
  };

  const pollJob = async (jobId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/v1/investigations/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const currentJob: TraceJob = await res.json();
          setJob(currentJob);

          if (currentJob.status === 'COMPLETED' || currentJob.status === 'PARTIAL') {
            clearInterval(interval);
            setLoading(false);
            if (currentJob.result) {
              setTraceResult(currentJob.result);
            }
          } else if (currentJob.status === 'FAILED') {
            clearInterval(interval);
            setLoading(false);
            setError(currentJob.error_message || 'Trace job failed during execution');
          }
        }
      } catch {
        // Continue polling
      }

      if (attempts > 30) {
        clearInterval(interval);
        setLoading(false);
        setError('Trace job polling timed out');
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Controls Bar */}
      <div className="bg-navy-950/70 border border-navy-800 rounded-lg p-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300 font-medium">Hops:</span>
          <select
            value={maxHops}
            onChange={(e) => setMaxHops(Number(e.target.value))}
            className="bg-navy-900 border border-navy-700 text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-500 font-mono"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((h) => (
              <option key={h} value={h}>
                {h} hops
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300 font-medium">Min Amount:</span>
          <input
            type="text"
            value={minimumAmount}
            onChange={(e) => setMinimumAmount(e.target.value)}
            placeholder="0.0"
            className="w-20 bg-navy-900 border border-navy-700 text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-300 font-medium">Asset:</span>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="bg-navy-900 border border-navy-700 text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="USDT">USDT</option>
            <option value="TRX">TRX</option>
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-300 font-medium">Direction:</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as any)}
            className="bg-navy-900 border border-navy-700 text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="FORWARD">Forward (Outflow)</option>
            <option value="BACKWARD">Backward (Inflow)</option>
          </select>
        </div>

        <button
          onClick={startTrace}
          disabled={loading}
          className="ml-auto flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition-colors shadow-lg shadow-cyan-900/40"
        >
          {loading ? (
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{loading ? 'Tracing...' : 'Run Trace'}</span>
        </button>
      </div>

      {/* Progress & Status Banner */}
      {job && (
        <div className="flex items-center justify-between bg-navy-900/80 border border-navy-700 rounded-lg px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-400">Job:</span>
            <span className="text-cyan-300 font-semibold">{job.id}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              job.status === 'COMPLETED' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : job.status === 'RUNNING'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {job.status}
            </span>
          </div>

          {job.progress && (
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>Nodes: <strong className="text-slate-200">{job.progress.nodes_processed ?? 0}</strong></span>
              <span>Edges: <strong className="text-slate-200">{job.progress.edges_processed ?? 0}</strong></span>
              <span>Paths: <strong className="text-slate-200">{job.progress.paths_found ?? 0}</strong></span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Paths & Hops Display */}
      {traceResult && (
        <div className="flex-1 flex flex-col min-h-0 bg-navy-950/40 border border-navy-800 rounded-lg p-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-navy-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase text-slate-300">
                Discovered Flow Paths ({traceResult.paths.length})
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
              <span>Max Hop Reached: <strong className="text-cyan-300">{traceResult.statistics.max_hop_reached}</strong></span>
              <span>Elapsed: <strong className="text-cyan-300">{traceResult.statistics.duration_ms}ms</strong></span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {traceResult.paths.map((path, pIdx) => (
              <div
                key={path.path_id || pIdx}
                className="bg-navy-900/70 border border-navy-700/70 rounded-lg p-3 text-xs space-y-2"
              >
                <div className="flex items-center justify-between border-b border-navy-800/80 pb-1.5 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">Path #{pIdx + 1}</span>
                    <span className="text-slate-400">({path.hops.length} hops)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Terminal:</span>
                    <span className="text-amber-400 font-semibold">{path.terminal_reason}</span>
                  </div>
                </div>

                {/* Hops timeline */}
                <div className="space-y-1.5 pl-2 border-l-2 border-navy-700 font-mono text-[11px]">
                  {path.hops.map((hop, hIdx) => {
                    const hopNum = hop.hop_number ?? hop.hopNumber ?? (hIdx + 1);
                    const fromW = hop.from_wallet || hop.fromWallet || '';
                    const toW = hop.to_wallet || hop.toWallet || '';
                    const txH = hop.tx_hash || hop.txHash || '';
                    return (
                      <div key={hopNum} className="flex items-center gap-2 text-slate-300 py-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50 font-bold">
                          H{hopNum}
                        </span>
                        <span className="text-slate-400">{fromW.slice(0, 8)}...</span>
                        <ChevronRight className="w-3 h-3 text-cyan-500" />
                        <span className="text-slate-200 font-medium">{toW.slice(0, 8)}...</span>
                        <span className="ml-auto text-emerald-400 font-bold">
                          {hop.amount} {hop.asset}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {txH.slice(0, 10)}...
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!traceResult && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-navy-800 rounded-lg p-6 text-center bg-navy-950/40">
          <Clock className="w-8 h-8 text-cyan-500/50 mb-2" />
          <h4 className="text-xs font-semibold text-slate-300 mb-1">No Active Trace</h4>
          <p className="text-[11px] text-slate-500 max-w-sm">
            Adjust max hops and threshold above, then click <strong>Run Trace</strong> to initiate bounded BFS graph traversal.
          </p>
        </div>
      )}
    </div>
  );
};
