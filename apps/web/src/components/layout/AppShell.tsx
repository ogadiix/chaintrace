import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  FolderGit2,
  GitFork,
  FileText,
  Building2,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Clock,
  Menu,
  X,
  FolderOpen,
} from 'lucide-react';
import type { Case, SystemHealth } from '@chaintrace/types';
import { useAuth } from '../../context/AuthContext';
import { navigate, useRouter } from '../../router';

interface AppShellProps {
  children: React.ReactNode;
  cases: Case[];
  activeCase: Case | null;
  onSelectCase: (c: Case) => void;
  onOpenCreateCaseModal: () => void;
  health: SystemHealth | null;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  cases,
  activeCase,
  onSelectCase,
  onOpenCreateCaseModal,
  health,
}) => {
  const { currentUser, logout } = useAuth();
  const { path } = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [caseDropdownOpen, setCaseDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [currentTimeUtc, setCurrentTimeUtc] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeUtc(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'cases',
      label: 'Cases',
      path: '/cases',
      icon: FolderGit2,
      badge: cases.length ? String(cases.length) : undefined,
    },
    {
      id: 'investigations',
      label: 'Investigation',
      path: '/investigations',
      icon: GitFork,
    },
    {
      id: 'reports',
      label: 'Reports & Dossiers',
      path: '/reports',
      icon: FileText,
    },
    {
      id: 'integrations',
      label: 'Agency Gateway',
      path: '/integrations',
      icon: Building2,
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: Settings,
    },
  ];

  const isActive = (itemPath: string) => {
    if (itemPath === '/dashboard') return path === '/dashboard' || path === '/';
    return path.startsWith(itemPath);
  };

  const getBreadcrumb = () => {
    if (path.startsWith('/cases')) return 'Case Management';
    if (path.startsWith('/investigations')) return 'Investigation Workspace';
    if (path.startsWith('/reports')) return 'Evidentiary Dossiers';
    if (path.startsWith('/integrations')) return 'Agency Gateway (NCRP / SAHYOG)';
    if (path.startsWith('/settings')) return 'System Settings & Audit Logs';
    return 'Forensic Overview';
  };

  return (
    <div className="flex h-screen bg-[#06090e] text-slate-100 font-sans overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-800/80 bg-[#070c16] transition-all duration-200 z-30 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between">
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="font-bold tracking-wider text-sm text-slate-100 font-mono">CHAINTRACE</div>
                <div className="text-[9px] text-cyan-400 font-mono tracking-wider uppercase">Forensic OS</div>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800/60 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Health Status Indicator */}
        {!sidebarCollapsed && (
          <div className="px-3 py-2.5 mx-2 mb-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Node Cluster</span>
              </span>
              <span className="text-emerald-400 text-[10px]">HEALTHY</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {health?.services?.neo4j?.status === 'connected' ? 'Neo4j Connected' : 'Graph Engine Active'}
            </div>
          </div>
        )}

        {/* Officer Profile & Sign Out Bar */}
        <div className="border-t border-slate-800/80 p-2.5 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => navigate('/settings')}
              className={`flex items-center gap-2.5 cursor-pointer rounded-lg p-1.5 hover:bg-slate-800/60 transition-colors truncate ${
                sidebarCollapsed ? 'justify-center w-full' : ''
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-cyan-400 shrink-0">
                {currentUser?.fullName?.charAt(0) || 'O'}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate text-left">
                  <div className="text-xs font-semibold text-slate-200 truncate leading-tight">
                    {currentUser?.fullName || 'Investigator'}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 truncate">
                    {currentUser?.role || 'OFFICER'}
                  </div>
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main App Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Header Bar */}
        <header className="h-14 border-b border-slate-800/80 bg-[#070c16]/90 backdrop-blur px-4 flex items-center justify-between z-20 shrink-0">
          {/* Left: Mobile Toggle + Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 hidden sm:inline">ChainTrace</span>
              <span className="text-slate-400 hidden sm:inline">/</span>
              <span className="text-slate-200 font-semibold">{getBreadcrumb()}</span>
            </div>
          </div>

          {/* Center: Active Case Context Selector Pill */}
          <div className="relative flex items-center">
            <div
              onClick={() => setCaseDropdownOpen(!caseDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/90 hover:border-slate-600 cursor-pointer transition-all max-w-[170px] sm:max-w-xs md:max-w-md select-none"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate text-xs">
                {activeCase ? (
                  <span className="truncate flex items-center">
                    <strong className="text-white font-medium truncate">{activeCase.title}</strong>
                    <span className="text-slate-400 ml-1.5 font-mono text-[11px] hidden sm:inline">
                      ({activeCase.targetChain.toUpperCase()})
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400 italic text-xs">Select Case</span>
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5 sm:ml-1" />
            </div>

            {/* Case Dropdown Menu */}
            {caseDropdownOpen && (
              <div className="absolute top-full left-0 sm:left-auto sm:right-0 lg:left-0 mt-1 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-2 z-50 animate-fadeIn">
                <div className="text-[10px] font-mono text-slate-400 uppercase px-2 py-1 flex items-center justify-between border-b border-slate-800">
                  <span>Assigned Investigation Cases</span>
                  <span className="text-cyan-400 font-bold">{cases.length} Total</span>
                </div>
                <div className="max-h-60 overflow-y-auto my-1 space-y-1">
                  {cases.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No cases found. Create a new case to begin tracing.
                    </div>
                  ) : (
                    cases.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectCase(c);
                          setCaseDropdownOpen(false);
                          navigate('/investigations');
                        }}
                        className={`p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          activeCase?.id === c.id
                            ? 'bg-cyan-500/10 border border-cyan-500/30 text-white'
                            : 'hover:bg-slate-800/70 text-slate-300'
                        }`}
                      >
                        <div className="font-semibold truncate">{c.title}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
                          <span className="uppercase text-cyan-400 font-bold">{c.targetChain}</span>
                          <span>&bull;</span>
                          <span className="truncate">{c.suspectWallet}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-1 border-t border-slate-800 flex justify-between">
                  <button
                    onClick={() => {
                      setCaseDropdownOpen(false);
                      navigate('/cases');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 px-2 py-1"
                  >
                    View All Cases &rarr;
                  </button>
                  <button
                    onClick={() => {
                      setCaseDropdownOpen(false);
                      onOpenCreateCaseModal();
                    }}
                    className="text-[11px] text-white bg-cyan-600 hover:bg-cyan-500 px-2.5 py-1 rounded font-semibold"
                  >
                    + New Case
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions, UTC Clock, New Case, Profile */}
          <div className="flex items-center gap-3">
            {/* Live UTC Clock */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentTimeUtc || 'UTC'}</span>
            </div>

            {/* Quick New Case Button */}
            <button
              onClick={onOpenCreateCaseModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Case</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/80 border border-slate-700/60 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-xs font-mono font-bold text-white">
                  {currentUser?.fullName?.charAt(0) || 'U'}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-800 text-xs">
                    <div className="font-semibold text-white">{currentUser?.fullName}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{currentUser?.email}</div>
                    <div className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                      ROLE: {currentUser?.role}
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Security & Preferences</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/integrations');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Agency Gateways</span>
                    </button>
                  </div>
                  <div className="pt-1 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-72 max-w-[85vw] h-full bg-[#070c16] border-r border-slate-800 p-4 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 font-mono font-bold text-cyan-400">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    <span>CHAINTRACE</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-md"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate(item.path);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          active
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Profile & Logout Footer */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-cyan-400">
                    {currentUser?.fullName?.charAt(0) || 'O'}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-200 truncate">
                      {currentUser?.fullName || 'Investigator'}
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400">
                      {currentUser?.role || 'OFFICER'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-800/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
};
