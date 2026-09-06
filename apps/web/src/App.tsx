import React, { useEffect, useState } from 'react';
import {
  Shield,
  Activity,
  FolderOpen,
  FileText,
  UserCheck,
  ChevronDown,
  LayoutDashboard,
  Target,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { Case, SystemHealth, User } from '@chaintrace/types';
import { CaseList } from './components/CaseList';
import { CreateCaseModal } from './components/CreateCaseModal';
import { CaseDetailDrawer } from './components/CaseDetailDrawer';
import { InvestigatorDashboard } from './components/InvestigatorDashboard';
import { InvestigationWorkspace } from './components/InvestigationWorkspace';


export const App: React.FC = () => {
  // Navigation: Dashboard | Cases | Investigate | Reports | Diagnostics
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cases' | 'investigate' | 'reports' | 'diagnostics'>('dashboard');

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Case Management State
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState<boolean>(false);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);

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
        const loadedCases: Case[] = data.cases || [];
        setCases(loadedCases);
        if (!activeCase && loadedCases.length > 0) {
          setActiveCase(loadedCases[0]);
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
    setActiveTab('investigate');
  };

  const handleSelectCase = (caseItem: Case) => {
    setActiveCase(caseItem);
    setActiveTab('investigate');
  };

  const handleStatusUpdated = (updatedCase: Case) => {
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    if (activeCase?.id === updatedCase.id) {
      setActiveCase(updatedCase);
    }
  };

  // One-click demo seeder
  const handleSeedDemoScenario = async () => {
    if (!authToken) return;
    setLoadingDemo(true);
    try {
      // 1. Ingest demo fraud network into Neo4j graph
      await fetch('/api/v1/graph/demo-risk-scenario?chain=tron', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // 2. Create demo investigation case if none exists
      const demoWallet = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
      let targetCase = cases.find((c) => c.suspectWallet === demoWallet);

      if (!targetCase) {
        const createRes = await fetch('/api/v1/cases', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            title: 'Operation CryptoShield — Multi-Hop Investment Fraud',
            description: 'Stolen USDT traced through layered mule dispersal network into sanctioned mixer destination.',
            complaintId: 'NCRP-2026-89421',
            fraudCategory: 'INVESTMENT_FRAUD',
            reportedAmount: '100000.00',
            currency: 'USDT',
            incidentDate: '2026-03-01',
            targetChain: 'tron',
            suspectWallet: demoWallet,
            initialTxHash: 'demo_risk_tx_01_victim_to_suspect',
            priority: 'CRITICAL',
          }),
        });

        if (createRes.ok) {
          targetCase = await createRes.json();
          if (targetCase) {
            setCases((prev) => [targetCase!, ...prev]);
          }
        }
      }

      if (targetCase) {
        setActiveCase(targetCase);
        setActiveTab('investigate');
      }
    } catch {
      // Handled silently
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-navy-950 text-slate-100 selection:bg-cyan-500/20 font-mono">
      {/* Top Application Header */}
      <header className="h-14 border-b border-navy-700/80 bg-navy-900/95 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider text-base select-none">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span>CHAINTRACE</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-navy-800 text-slate-300 font-mono font-medium border border-navy-700">
            SIH-183
          </span>
        </div>

        {/* Global Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('cases')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'cases'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Cases Directory ({cases.length})
          </button>

          <button
            onClick={() => setActiveTab('investigate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'investigate'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Investigation Workspace
            {activeCase && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-navy-800 text-cyan-300 border border-cyan-500/20">
                {activeCase.caseNumber}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Reports (Phase 9)
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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
            <span
              className={`w-2 h-2 rounded-full ${
                loadingHealth
                  ? 'bg-amber-400 animate-pulse'
                  : health?.status === 'healthy'
                  ? 'bg-emerald-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300">
              {loadingHealth ? 'POLLING...' : health?.status ? health.status.toUpperCase() : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full gap-4">
        {/* 1. Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <InvestigatorDashboard
            cases={cases}
            onOpenCase={handleSelectCase}
            onNewCase={() => setIsCreateModalOpen(true)}
            onSeedDemo={handleSeedDemoScenario}
            loadingDemo={loadingDemo}
          />
        )}

        {/* 2. Cases Directory Tab */}
        {activeTab === 'cases' && (
          <CaseList
            cases={cases}
            loading={loadingCases}
            onSelectCase={handleSelectCase}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {/* 3. Investigation Workspace Tab */}
        {activeTab === 'investigate' && (
          activeCase ? (
            <InvestigationWorkspace
              activeCase={activeCase}
              authToken={authToken}
              onStatusUpdated={handleStatusUpdated}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-navy-800 rounded-lg p-12 text-center bg-navy-950/40">
              <Target className="w-10 h-10 text-cyan-400 mb-3" />
              <h3 className="text-sm font-bold text-slate-200 mb-1">No Active Investigation Selected</h3>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                Choose an existing investigation case from the Cases Directory or launch the deterministic demo scenario.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSeedDemoScenario}
                  className="px-4 py-2 bg-navy-800 hover:bg-navy-750 text-amber-300 border border-amber-500/30 rounded text-xs"
                >
                  Load Demo Scenario
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs"
                >
                  Create Case
                </button>
              </div>
            </div>
          )
        )}

        {/* 4. Reports Tab (Phase 9 Preview) */}
        {activeTab === 'reports' && (
          <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-navy-800 pb-3">
              <FileText className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase">
                  Investigation Reports & Statutory Filing (Phase 9)
                </h2>
                <p className="text-xs text-slate-400">
                  Court-admissible PDF dossiers, NCRP evidence exports, and Section 91 CrPC VASP freezing requests.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-navy-950 p-4 rounded border border-navy-800 space-y-2">
                <span className="text-cyan-400 font-bold">1. Evidentiary PDF Dossier</span>
                <p className="text-slate-400 text-[11px]">
                  Generates an immutable, cryptographic hash-verified case report including graph topologies, intelligence findings, and risk scoring provenance.
                </p>
                <span className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] border border-cyan-500/20">
                  Phase 9 Engine
                </span>
              </div>

              <div className="bg-navy-950 p-4 rounded border border-navy-800 space-y-2">
                <span className="text-emerald-400 font-bold">2. NCRP Evidence Package</span>
                <p className="text-slate-400 text-[11px]">
                  Standardized JSON & CSV formatted ledger for export directly into National Cybercrime Reporting Portal systems.
                </p>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                  Phase 9 Engine
                </span>
              </div>

              <div className="bg-navy-950 p-4 rounded border border-navy-800 space-y-2">
                <span className="text-amber-400 font-bold">3. VASP Freezing Notice</span>
                <p className="text-slate-400 text-[11px]">
                  Formal requisition notice generated for FIU-registered cryptocurrency exchanges for immediate deposit account freezing.
                </p>
                <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20">
                  Phase 9 Engine
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5. Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div className="flex flex-col gap-4">
            <div className="bg-navy-900 border border-navy-700/80 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-200">System Diagnostics & Infrastructure</h2>
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
                Refresh Health
              </button>
            </div>

            {healthError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Diagnostics Error: {healthError}</span>
              </div>
            )}

            {health && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-navy-900 border border-navy-800 rounded-lg p-4 space-y-2">
                  <span className="text-xs text-slate-400 uppercase">PostgreSQL Database</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-sm font-bold text-slate-100">{health.services.database.status}</span>
                  </div>
                </div>

                <div className="bg-navy-900 border border-navy-800 rounded-lg p-4 space-y-2">
                  <span className="text-xs text-slate-400 uppercase">Redis Cache & Queues</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-sm font-bold text-slate-100">{health.services.redis.status}</span>
                  </div>
                </div>

                <div className="bg-navy-900 border border-navy-800 rounded-lg p-4 space-y-2">
                  <span className="text-xs text-slate-400 uppercase">Neo4j Graph Database</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-sm font-bold text-slate-100">{health.services.neo4j.status}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Case Creation Modal */}
      {isCreateModalOpen && (
        <CreateCaseModal
          authToken={authToken}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCaseCreated={handleCaseCreated}
        />
      )}

      {/* Case Detail Drawer */}
      {isDrawerOpen && activeCase && (
        <CaseDetailDrawer
          caseItem={activeCase}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onStatusUpdated={handleStatusUpdated}
          onStartTrace={() => {
            setIsDrawerOpen(false);
            setActiveTab('investigate');
          }}
          authToken={authToken}
        />
      )}
    </div>
  );
};

export default App;

