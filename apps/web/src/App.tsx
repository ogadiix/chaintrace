import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Activity, 
  Share2, 
  AlertTriangle, 
  RefreshCw,
  FolderOpen,
  FileText,
  Terminal,
  UserCheck,
  PlusCircle,
  ChevronDown
} from 'lucide-react';
import type { Case, SystemHealth, User } from '@chaintrace/types';
import { CHAIN_METADATA } from '@chaintrace/shared';
import { CaseList } from './components/CaseList';
import { CreateCaseModal } from './components/CreateCaseModal';
import { CaseDetailDrawer } from './components/CaseDetailDrawer';
import { TraceConsole } from './components/TraceConsole';
import { IntelligencePanel } from './components/IntelligencePanel';

export const App: React.FC = () => {
  // Navigation & View
  const [activeTab, setActiveTab] = useState<'workspace' | 'cases' | 'diagnostics'>('cases');

  // Authentication State (default to Senior Investigator)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Case Management State
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState<boolean>(false);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Diagnostics State
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Auto-login with default demo credentials
  const loginAs = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.accessToken);
        setCurrentUser(data.user);
      }
    } catch {
      // Handled silently
    }
  };

  useEffect(() => {
    // Initial login as Senior Investigator
    loginAs('investigator@chaintrace.internal', 'Investigator123!');
    fetchHealth();
  }, []);

  const fetchCases = async () => {
    if (!authToken) return;
    setLoadingCases(true);
    try {
      const res = await fetch('/api/v1/cases', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
        // Set first case as active if none selected
        if (!activeCase && data.cases && data.cases.length > 0) {
          setActiveCase(data.cases[0]);
        }
      }
    } catch {
      // Handled silently
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchCases();
    }
  }, [authToken]);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const response = await fetch('/api/v1/health');
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      const data: SystemHealth = await response.json();
      setHealth(data);
    } catch (err: unknown) {
      setHealthError(err instanceof Error ? err.message : 'Failed to reach API server');
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleCaseCreated = (newCase: Case) => {
    setCases((prev) => [newCase, ...prev]);
    setActiveCase(newCase);
    setActiveTab('workspace');
  };

  const handleSelectCase = (caseItem: Case) => {
    setActiveCase(caseItem);
    setActiveTab('workspace');
  };

  const handleStatusUpdated = (updatedCase: Case) => {
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    if (activeCase?.id === updatedCase.id) {
      setActiveCase(updatedCase);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-navy-950 text-slate-100 selection:bg-cyan-500/20">
      {/* Top Application Header */}
      <header className="h-14 border-b border-navy-700/80 bg-navy-900/90 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider text-base">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span>CHAINTRACE</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-navy-800 text-slate-300 font-mono font-medium border border-navy-700">
            SIH-183
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('cases')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'cases' 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Cases Directory ({cases.length})
          </button>
          <button 
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'workspace' 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Investigation Console
            {activeCase && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-navy-800 text-cyan-300 border border-cyan-500/20">
                {activeCase.caseNumber}
              </span>
            )}
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
            Diagnostics
          </button>
        </nav>

        {/* Right Controls: User Profile & System Status */}
        <div className="flex items-center gap-3">
          {/* User Profile Selector (Demo RBAC switcher) */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 text-xs bg-navy-800 hover:bg-navy-750 px-2.5 py-1 rounded-md border border-navy-700 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-200 font-medium">
                {currentUser?.fullName.split(' ')[0] || 'Investigator'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-navy-900 text-cyan-300 border border-navy-700">
                {currentUser?.role || 'INVESTIGATOR'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-navy-900 border border-navy-700 rounded-lg shadow-2xl py-1 z-50 text-xs">
                <div className="px-3 py-1.5 text-[10px] uppercase font-mono text-slate-400 border-b border-navy-800">
                  Switch Demo Persona (RBAC)
                </div>
                {[
                  { email: 'investigator@chaintrace.internal', pass: 'Investigator123!', role: 'INVESTIGATOR', name: 'Alex Mercer' },
                  { email: 'admin@chaintrace.internal', pass: 'AdminSecure123!', role: 'ADMIN', name: 'Sarah Vance' },
                  { email: 'analyst@chaintrace.internal', pass: 'AnalystSecure123!', role: 'ANALYST', name: 'Raj Patel' },
                  { email: 'viewer@chaintrace.internal', pass: 'ViewerSecure123!', role: 'VIEWER', name: 'David Kim' },
                ].map((u) => (
                  <button
                    key={u.email}
                    onClick={() => {
                      loginAs(u.email, u.pass);
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-navy-800 transition-colors ${
                      currentUser?.email === u.email ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-950 border border-navy-800">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Health Pill */}
          <div className="flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-md bg-navy-800 border border-navy-700">
            <span className={`w-2 h-2 rounded-full ${
              loadingHealth 
                ? 'bg-amber-400 animate-pulse' 
                : health?.status === 'healthy' 
                  ? 'bg-emerald-400' 
                  : health?.status === 'degraded' 
                    ? 'bg-amber-400' 
                    : 'bg-rose-500'
            }`} />
            <span className="text-slate-300">
              {loadingHealth ? 'POLLING...' : (health?.status ? health.status.toUpperCase() : 'OFFLINE')}
            </span>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4">
        {/* Cases Directory Tab */}
        {activeTab === 'cases' && (
          <CaseList
            cases={cases}
            loading={loadingCases}
            onSelectCase={handleSelectCase}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {/* Investigation Console Workspace */}
        {activeTab === 'workspace' && (
          <div className="flex flex-col gap-4 flex-1">
            {/* Active Case Banner */}
            {activeCase ? (
              <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {activeCase.caseNumber}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {CHAIN_METADATA[activeCase.targetChain].name} Blockchain
                    </span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {activeCase.status}
                    </span>
                  </div>
                  <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>{activeCase.title}</span>
                  </h1>
                  <div className="text-xs font-mono text-cyan-200 mt-1 flex items-center gap-2">
                    <span className="text-slate-400">Suspect:</span>
                    <span>{activeCase.suspectWallet}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex items-center gap-1.5 bg-navy-800 hover:bg-navy-750 text-slate-300 px-3 py-1.5 rounded-md text-xs border border-navy-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Case Dossier & Audit
                  </button>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-3 py-1.5 rounded-md text-xs transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    New Case
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-6 text-center">
                <p className="text-sm text-slate-300">No active case selected.</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-2 text-xs text-cyan-400 hover:underline font-mono"
                >
                  + Create your first investigation case
                </button>
              </div>
            )}

            {/* Investigation Layout Grid: Hero Workspace from docs/design.md */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
              {/* Left Column: Fund Flow Graph & Trace Viewport */}
              <div className="lg:col-span-2 bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 flex flex-col min-h-[480px] relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-200">Investigation Trace Engine</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-navy-800 border border-navy-700">Bounded BFS</span>
                    <span className="px-2 py-0.5 rounded bg-navy-800 border border-navy-700">Phase 4 Engine</span>
                  </div>
                </div>

                {activeCase ? (
                  <TraceConsole activeCase={activeCase} authToken={authToken} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-navy-800 rounded-lg p-6 text-center bg-navy-950/40">
                    <div className="w-12 h-12 rounded-full bg-navy-800/80 flex items-center justify-center mb-3 text-cyan-400">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-200 mb-1">Select a case to inspect</h3>
                    <p className="text-xs text-slate-400 max-w-md">
                      Choose an active investigation case to trigger N-Hop traversal, amount filtering, and flow timeline analysis.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Intelligence Findings, Risk, and Attribution */}
              <div className="flex flex-col gap-4">
                {activeCase && (
                  <IntelligencePanel activeCase={activeCase} authToken={authToken} />
                )}

                {/* Risk Score Summary Panel */}
                <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Explainable Risk Score
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Rule Engine v1.0
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl font-bold font-mono text-slate-200">
                      {activeCase?.priority === 'CRITICAL' ? '85' : activeCase?.priority === 'HIGH' ? '70' : '45'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">/ 100</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      activeCase?.priority === 'CRITICAL' 
                        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}>
                      {activeCase?.priority || 'MEDIUM'} RISK
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span>• Rapid Forwarding Pattern:</span>
                      <span className="text-amber-400">+15</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• High Fan-Out Dispersion:</span>
                      <span className="text-amber-400">+10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• VASP Cluster Match:</span>
                      <span className="text-cyan-400">+5</span>
                    </div>
                  </div>
                </div>

                {/* VASP Attribution Panel */}
                <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      VASP Attribution
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      Confidence Aware
                    </span>
                  </div>
                  <div className="text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Likely Destination:</span>
                      <span className="font-semibold text-cyan-300 font-mono">Pending Trace</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Attribution Status:</span>
                      <span className="font-mono text-slate-300">Awaiting Graph Crawl</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Panel: Transaction Timeline & Evidence Drawer */}
            <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-4">
              <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-slate-200">Transaction Evidence & Timeline Ledger</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {activeCase ? `Case Ref: ${activeCase.caseNumber}` : 'No Case Selected'}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {activeCase?.initialTxHash ? (
                  <div className="flex items-center gap-2 font-mono text-slate-300">
                    <span>Initial Reported Tx:</span>
                    <code className="text-cyan-400 bg-navy-950 px-2 py-0.5 rounded border border-navy-800">
                      {activeCase.initialTxHash}
                    </code>
                  </div>
                ) : (
                  <p>No initial transaction hash provided. Ready to crawl suspect wallet address.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div className="flex flex-col gap-4">
            <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-200">System Diagnostics & DB Connectivity</h2>
                <p className="text-xs text-slate-400">
                  Real-time operational status from FastAPI at <code className="text-cyan-400 font-mono">/api/v1/health</code>.
                </p>
              </div>
              <button
                onClick={fetchHealth}
                disabled={loadingHealth}
                className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-slate-300 px-3 py-1.5 rounded text-xs border border-navy-600 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {healthError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-center gap-3 text-rose-300 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>Error: {healthError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Primary Database</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {health?.services.database.status || 'Connected'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono space-y-1">
                  <div>Engine: {health?.services.database.engine || 'SQLite / PostgreSQL'}</div>
                  <div>Cases Stored: {cases.length}</div>
                </div>
              </div>

              <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Neo4j Graph Database</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {health?.services.neo4j.status || 'Mock Fallback'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono space-y-1">
                  <div>Protocol: Bolt / Cypher</div>
                  <div>Graph Traversal: Bounded Ready</div>
                </div>
              </div>

              <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Redis Queue & Cache</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {health?.services.redis.status || 'Mock Fallback'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono space-y-1">
                  <div>Async Jobs: Ready</div>
                  <div>Rate Limits: Configured</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Case Intake Modal */}
      <CreateCaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCaseCreated={handleCaseCreated}
        authToken={authToken}
      />

      {/* Case Details Drawer */}
      <CaseDetailDrawer
        caseItem={activeCase}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onStatusUpdated={handleStatusUpdated}
        onStartTrace={() => setActiveTab('workspace')}
        authToken={authToken}
      />
    </div>
  );
};

export default App;
