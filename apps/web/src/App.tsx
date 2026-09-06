import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Activity, 
  Database, 
  Share2, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  FolderOpen,
  Search,
  FileText,
  Terminal
} from 'lucide-react';
import type { SystemHealth } from '@chaintrace/types';

export const App: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workspace' | 'diagnostics'>('workspace');

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/health');
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      const data: SystemHealth = await response.json();
      setHealth(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reach API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-navy-950 text-slate-100 selection:bg-cyan-500/20">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-navy-700/80 bg-navy-900/90 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider text-base">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span>CHAINTRACE</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-slate-300 font-mono font-medium border border-navy-600/50">
            SIH-183 MVP
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'workspace' 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Investigation Console
          </button>
          <button 
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'diagnostics' 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            System Diagnostics
          </button>
        </nav>

        {/* System Health Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-full bg-navy-800 border border-navy-700">
            <span className={`w-2 h-2 rounded-full ${
              loading 
                ? 'bg-amber-400 animate-pulse' 
                : health?.status === 'healthy' 
                  ? 'bg-emerald-400' 
                  : health?.status === 'degraded' 
                    ? 'bg-amber-400' 
                    : 'bg-rose-500'
            }`} />
            <span className="text-slate-300">
              {loading ? 'CHECKING...' : (health?.status ? health.status.toUpperCase() : 'OFFLINE')}
            </span>
          </div>
          <button 
            onClick={fetchHealth} 
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-cyan-400 rounded hover:bg-navy-800 transition-colors disabled:opacity-50"
            title="Refresh System Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4">
        {/* Active Tab: Investigation Console Scaffold */}
        {activeTab === 'workspace' && (
          <div className="flex flex-col gap-4 flex-1">
            {/* Case Header Banner */}
            <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Phase 0 Foundation Active
                  </span>
                  <span className="text-xs text-slate-400">Target: SIH 2026 Problem Statement 183</span>
                </div>
                <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Cryptocurrency Fraud Intelligence & VASP Attribution Engine</span>
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold px-3 py-1.5 rounded text-xs transition-colors">
                  <Search className="w-3.5 h-3.5" />
                  New Trace
                </button>
                <button className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-slate-300 px-3 py-1.5 rounded text-xs border border-navy-600/50 transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                  NCRP Intake (Demo)
                </button>
              </div>
            </div>

            {/* Investigation Layout Grid: Target structure from docs/design.md */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
              {/* Left Column: Fund Flow Graph Viewport Scaffold */}
              <div className="lg:col-span-2 bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 flex flex-col min-h-[420px] relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-200">Interactive Fund Flow Graph</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-navy-800 border border-navy-700">Hops: 4 (Max 7)</span>
                    <span className="px-2 py-0.5 rounded bg-navy-800 border border-navy-700">Cytoscape Canvas</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-navy-800/80 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-navy-800/80 flex items-center justify-center mb-3 text-cyan-400">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-200 mb-1">Graph Canvas Scaffold Ready</h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Graph construction engine and Cytoscape.js rendering target configured for Phase 3 and Phase 4.
                  </p>
                </div>
              </div>

              {/* Right Column: Risk & Attribution Summary Scaffold */}
              <div className="flex flex-col gap-4">
                {/* Risk Score Summary Panel */}
                <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Explainable Risk Engine</span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Phase 7 Spec
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl font-bold font-mono text-slate-200">--</span>
                    <span className="text-xs font-mono text-slate-400">/ 100</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Deterministic heuristic scoring with individual rule provenance and evidence references.
                  </p>
                </div>

                {/* VASP Attribution Panel */}
                <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">VASP Attribution</span>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      Phase 6 Spec
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mb-1">Destination Identification</p>
                  <p className="text-xs text-slate-400">
                    Confidence-aware attribution pipeline (Confirmed, Probable, Possible, Unknown).
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Panel: Transaction Timeline & Evidence Drawer Scaffold */}
            <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4">
              <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-slate-200">Transaction Evidence & Timeline Ledger</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">Immutable Provenance Chain</span>
              </div>
              <p className="text-xs text-slate-400">
                Normalized multi-chain transaction ledger (TRON, EVM, Bitcoin) with cryptographic evidence references.
              </p>
            </div>
          </div>
        )}

        {/* Diagnostics Tab: Live Architecture & Services Status */}
        {activeTab === 'diagnostics' && (
          <div className="flex flex-col gap-4">
            <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4">
              <h2 className="text-base font-bold text-slate-200 mb-1">Architecture Diagnostics & Connection State</h2>
              <p className="text-xs text-slate-400">
                Live status reported directly from the FastAPI backend at <code className="text-cyan-400 font-mono">/api/v1/health</code>.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-center gap-3 text-rose-300 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>Backend Connection Error: {error}. Ensure FastAPI is running on port 8000.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Primary Database Status */}
              <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-200">Primary Database</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                    health?.services.database.status === 'connected' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {health?.services.database.status || 'Checking...'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div>Engine: {health?.services.database.engine || 'PostgreSQL / SQLite'}</div>
                  <div>Target: Cases, Evidence, Audit Logs</div>
                </div>
              </div>

              {/* Neo4j Graph DB Status */}
              <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-200">Neo4j Graph</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                    health?.services.neo4j.status === 'connected' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {health?.services.neo4j.status || 'Checking...'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div>Target: Wallet Nodes, Transfer Edges</div>
                  <div>Mode: Bolt Driver + Mock Graph Fallback</div>
                </div>
              </div>

              {/* Redis Queue Status */}
              <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-200">Redis Queue</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                    health?.services.redis.status === 'connected' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {health?.services.redis.status || 'Checking...'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div>Target: Async Tracing & Risk Workers</div>
                  <div>Mode: Celery/RQ + Memory Fallback</div>
                </div>
              </div>
            </div>

            {health && (
              <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Backend Metadata Payload</span>
                </div>
                <pre className="text-xs bg-navy-950 p-3 rounded border border-navy-800 text-slate-300 font-mono overflow-x-auto">
                  {JSON.stringify(health, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
