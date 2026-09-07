import React, { useEffect, useState, useCallback } from 'react';
import type { Case, SystemHealth } from '@chaintrace/types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRouter, navigate } from './router';

// Public Pages
import { LandingPage } from './components/public/LandingPage';
import { ProductionLogin } from './components/public/ProductionLogin';
import { RegisterPage } from './components/public/RegisterPage';
import { ForgotPasswordPage } from './components/public/ForgotPasswordPage';

// Protected Enterprise App Shell & Views
import { AppShell } from './components/layout/AppShell';
import { InvestigatorDashboard } from './components/InvestigatorDashboard';
import { CaseList } from './components/CaseList';
import { InvestigationWorkspace } from './components/InvestigationWorkspace';
import { ReportsDashboard } from './components/ReportsDashboard';
import { IntegrationsCenter } from './components/IntegrationsCenter';
import { SettingsPage } from './components/SettingsPage';

// Modals
import { CreateCaseModal } from './components/CreateCaseModal';
import { CaseDetailDrawer } from './components/CaseDetailDrawer';
import { FolderOpen, GitFork, ArrowRight } from 'lucide-react';

const MainApp: React.FC = () => {
  const { path, params } = useRouter();
  const { authToken, isAuthenticated } = useAuth();

  // Case Management State
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState<boolean>(false);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Case Detail Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerCase, setDrawerCase] = useState<Case | null>(null);

  // Diagnostics State
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);

  // Health fetcher
  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const response = await fetch('/api/v1/health');
      if (response.ok) {
        const data: SystemHealth = await response.json();
        setHealth(data);
      }
    } catch {
      // Handled silently
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Fetch Cases when authenticated
  const fetchCases = useCallback(async () => {
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
  }, [authToken, activeCase]);

  useEffect(() => {
    if (authToken) {
      fetchCases();
    } else {
      setCases([]);
      setActiveCase(null);
    }
  }, [authToken, fetchCases]);

  // Sync route param /cases/:caseId or /investigations/:investigationId to active case
  useEffect(() => {
    if (params.caseId && cases.length > 0) {
      const match = cases.find((c) => c.id === params.caseId);
      if (match) {
        setActiveCase(match);
        setDrawerCase(match);
        setIsDrawerOpen(true);
      }
    } else if (params.investigationId && cases.length > 0) {
      const match = cases.find((c) => c.id === params.investigationId);
      if (match) {
        setActiveCase(match);
      }
    }
  }, [params.caseId, params.investigationId, cases]);

  // Handlers
  const handleCaseCreated = (newCase: Case) => {
    setCases((prev) => [newCase, ...prev]);
    setActiveCase(newCase);
    setIsCreateModalOpen(false);
    navigate('/investigations');
  };

  const handleSelectCase = (caseItem: Case) => {
    setActiveCase(caseItem);
    navigate('/investigations');
  };

  const handleOpenCaseDetail = (caseItem: Case) => {
    setDrawerCase(caseItem);
    setIsDrawerOpen(true);
  };

  const handleStartTraceFromDrawer = (caseItem: Case) => {
    setActiveCase(caseItem);
    setIsDrawerOpen(false);
    navigate('/investigations');
  };

  const handleStatusUpdated = (updatedCase: Case) => {
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    if (activeCase?.id === updatedCase.id) {
      setActiveCase(updatedCase);
    }
    if (drawerCase?.id === updatedCase.id) {
      setDrawerCase(updatedCase);
    }
  };

  // Route Dispatching

  // 1. Public Marketing Landing Page
  if (path === '/') {
    return <LandingPage />;
  }

  // 2. Authentication Flow
  if (path === '/login') {
    if (isAuthenticated) {
      navigate('/dashboard', true);
      return null;
    }
    return <ProductionLogin />;
  }

  if (path === '/register') {
    return <RegisterPage />;
  }

  if (path === '/forgot-password') {
    return <ForgotPasswordPage />;
  }

  // 3. Protected Routes Gate
  if (!isAuthenticated) {
    navigate('/login', true);
    return <ProductionLogin />;
  }

  // Render Protected Application Views inside persistent AppShell
  return (
    <AppShell
      cases={cases}
      activeCase={activeCase}
      onSelectCase={setActiveCase}
      onOpenCreateCaseModal={() => setIsCreateModalOpen(true)}
      health={health}
    >
      {/* Route Switcher */}
      {(() => {
        if (path === '/dashboard') {
          return (
            <div className="ct-container py-6">
              <InvestigatorDashboard
                cases={cases}
                onOpenCase={handleSelectCase}
                onNewCase={() => setIsCreateModalOpen(true)}
                onNavigateTab={(tab) => {
                  if (tab === 'cases') navigate('/cases');
                  else if (tab === 'investigate') navigate('/investigations');
                  else if (tab === 'reports') navigate('/reports');
                  else if (tab === 'integrations') navigate('/integrations');
                  else if (tab === 'diagnostics') navigate('/settings');
                  else navigate('/dashboard');
                }}
              />
            </div>
          );
        }

        if (path.startsWith('/cases')) {
          return (
            <div className="ct-container py-6">
              <CaseList
                cases={cases}
                loading={loadingCases}
                onSelectCase={handleOpenCaseDetail}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
              />
            </div>
          );
        }

        if (path.startsWith('/investigations')) {
          if (!activeCase) {
            return (
              <div className="ct-empty-state" style={{ minHeight: '60vh' }}>
                <div
                  className="w-14 h-14 rounded-ct-lg flex items-center justify-center mb-4"
                  style={{
                    background: 'var(--ct-accent-subtle)',
                    border: '1px solid var(--ct-accent-muted)',
                    color: 'var(--ct-accent-text)',
                  }}
                >
                  <GitFork className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                  No Active Investigation
                </h2>
                <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--ct-text-secondary)' }}>
                  Select an existing case or create a new one to start investigating.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="ct-btn ct-btn-primary"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Create Case
                  </button>
                  <button
                    onClick={() => navigate('/cases')}
                    className="ct-btn ct-btn-secondary"
                  >
                    Browse Cases
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="p-3 sm:p-6 min-h-[calc(100vh-3.5rem)] overflow-y-auto">
              <InvestigationWorkspace
                activeCase={activeCase}
                authToken={authToken}
                onStatusUpdated={handleStatusUpdated}
              />
            </div>
          );
        }

        if (path.startsWith('/reports')) {
          return (
            <div className="ct-container py-6">
              <ReportsDashboard
                cases={cases}
                activeCase={activeCase}
                authToken={authToken}
                onSelectCase={handleSelectCase}
              />
            </div>
          );
        }

        if (path.startsWith('/integrations')) {
          return (
            <div className="ct-container py-6">
              <IntegrationsCenter
                cases={cases}
                authToken={authToken}
                onOpenCase={handleSelectCase}
                onCaseCreated={handleCaseCreated}
              />
            </div>
          );
        }

        if (path.startsWith('/settings')) {
          return (
            <SettingsPage
              health={health}
              onRefreshHealth={fetchHealth}
              loadingHealth={loadingHealth}
            />
          );
        }

        // Fallback for unknown protected paths
        return (
          <div className="ct-container py-6">
            <InvestigatorDashboard
              cases={cases}
              onOpenCase={handleSelectCase}
              onNewCase={() => setIsCreateModalOpen(true)}
            />
          </div>
        );
      })()}

      {/* Persistent Modals */}
      <CreateCaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCaseCreated={handleCaseCreated}
        authToken={authToken}
      />

      <CaseDetailDrawer
        caseItem={drawerCase}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onStatusUpdated={handleStatusUpdated}
        onStartTrace={handleStartTraceFromDrawer}
        authToken={authToken}
      />
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
