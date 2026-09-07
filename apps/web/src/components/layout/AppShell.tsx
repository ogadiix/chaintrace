import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  GitFork,
  FileText,
  Building2,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Menu,
  X,
  Search,
} from 'lucide-react';
import type { Case, SystemHealth } from '@chaintrace/types';
import { useAuth } from '../../context/AuthContext';
import { navigate, useRouter } from '../../router';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { CommandPalette } from '../ui/CommandPalette';

interface AppShellProps {
  children: React.ReactNode;
  cases: Case[];
  activeCase: Case | null;
  onSelectCase: (c: Case) => void;
  onOpenCreateCaseModal: () => void;
  health: SystemHealth | null;
}

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Investigations',
    items: [
      { id: 'cases', label: 'Cases', path: '/cases', icon: FolderOpen },
      { id: 'investigations', label: 'Investigations', path: '/investigations', icon: GitFork },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'reports', label: 'Reports', path: '/reports', icon: FileText },
      { id: 'integrations', label: 'Integrations', path: '/integrations', icon: Building2 },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

export const AppShell: React.FC<AppShellProps> = ({
  children,
  cases,
  activeCase: _activeCase,
  onSelectCase,
  onOpenCreateCaseModal,
  health,
}) => {
  const { currentUser, logout } = useAuth();
  const { path } = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileDropdownOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [path]);

  const isActive = (itemPath: string) => {
    if (itemPath === '/dashboard') return path === '/dashboard' || path === '/';
    return path.startsWith(itemPath);
  };

  const getBreadcrumb = () => {
    if (path.startsWith('/cases')) return 'Cases';
    if (path.startsWith('/investigations')) return 'Investigations';
    if (path.startsWith('/reports')) return 'Reports';
    if (path.startsWith('/integrations')) return 'Integrations';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  };

  const NavItems = ({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) => (
    <nav className="flex-1 py-3 px-2 overflow-y-auto">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="mb-4">
          {!collapsed && (
            <div className="ct-section-label">{section.label}</div>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const badge = item.id === 'cases' && cases.length > 0 ? String(cases.length) : undefined;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    onNavigate?.();
                  }}
                  title={collapsed ? item.label : undefined}
                  className="w-full flex items-center gap-3 rounded-ct-md transition-colors relative group"
                  style={{
                    padding: collapsed ? '10px' : '8px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    color: active ? 'var(--ct-sidebar-text-active)' : 'var(--ct-sidebar-text)',
                    background: active ? 'var(--ct-sidebar-active)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'var(--ct-surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Active indicator */}
                  {active && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                      style={{
                        height: '20px',
                        background: 'var(--ct-accent)',
                      }}
                    />
                  )}
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      {badge && (
                        <span
                          className="text-xs font-mono px-1.5 py-0.5 rounded-ct-sm"
                          style={{
                            background: 'var(--ct-bg-subtle)',
                            color: 'var(--ct-text-tertiary)',
                            border: '1px solid var(--ct-border)',
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--ct-bg)', color: 'var(--ct-text)' }}>
      {/* ═══ Desktop Sidebar ═══ */}
      <aside
        className="hidden md:flex flex-col shrink-0 transition-all duration-200"
        style={{
          width: sidebarCollapsed ? '56px' : '240px',
          background: 'var(--ct-sidebar-bg)',
          borderRight: '1px solid var(--ct-sidebar-border)',
        }}
      >
        {/* Brand */}
        <div
          className="h-14 flex items-center justify-between px-3 shrink-0"
          style={{ borderBottom: '1px solid var(--ct-sidebar-border)' }}
        >
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none overflow-hidden"
          >
            <div
              className="w-8 h-8 rounded-ct-md flex items-center justify-center shrink-0 font-bold text-sm"
              style={{
                background: 'var(--ct-accent)',
                color: '#FFFFFF',
              }}
            >
              CT
            </div>
            {!sidebarCollapsed && (
              <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--ct-text)' }}>
                ChainTrace
              </span>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="ct-btn-icon"
              style={{ padding: '4px' }}
              title="Collapse sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>

        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="ct-btn-icon mx-auto mt-2"
            style={{ padding: '6px' }}
            title="Expand sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Navigation */}
        <NavItems collapsed={sidebarCollapsed} />

        {/* System health (collapsed: dot only) */}
        {!sidebarCollapsed && (
          <div
            className="mx-2 mb-2 px-3 py-2 rounded-ct-md"
            style={{
              background: 'var(--ct-bg-subtle)',
              border: '1px solid var(--ct-border-subtle)',
            }}
          >
            <div className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: health?.status === 'healthy' || health?.services?.neo4j?.status === 'connected'
                    ? 'var(--ct-success)'
                    : 'var(--ct-warning)',
                }}
              />
              <span style={{ color: 'var(--ct-text-secondary)' }}>System</span>
              <span className="ml-auto font-medium" style={{ color: 'var(--ct-success-text)' }}>
                Healthy
              </span>
            </div>
          </div>
        )}

        {/* User profile */}
        <div
          className="shrink-0 p-2"
          style={{ borderTop: '1px solid var(--ct-sidebar-border)' }}
        >
          <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2.5 cursor-pointer rounded-ct-md p-1.5 transition-colors flex-1 min-w-0"
              style={{ maxWidth: sidebarCollapsed ? '40px' : undefined }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ct-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div
                className="w-7 h-7 rounded-ct-md flex items-center justify-center text-xs font-semibold shrink-0"
                style={{
                  background: 'var(--ct-accent-subtle)',
                  color: 'var(--ct-accent-text)',
                  border: '1px solid var(--ct-accent-muted)',
                }}
              >
                {currentUser?.fullName?.charAt(0) || 'U'}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--ct-text)' }}>
                    {currentUser?.fullName || 'User'}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--ct-text-tertiary)' }}>
                    {currentUser?.role || 'Investigator'}
                  </div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={logout}
                title="Sign Out"
                className="ct-btn-icon shrink-0"
                style={{ padding: '6px' }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header
          className="h-14 flex items-center justify-between px-4 shrink-0 backdrop-blur-sm z-20"
          style={{
            background: 'var(--ct-header-bg)',
            borderBottom: '1px solid var(--ct-header-border)',
          }}
        >
          {/* Left: mobile menu + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden ct-btn-icon"
              style={{ padding: '6px' }}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 text-sm">
              <span style={{ color: 'var(--ct-text-tertiary)' }} className="hidden sm:inline">
                ChainTrace
              </span>
              <span style={{ color: 'var(--ct-text-tertiary)' }} className="hidden sm:inline">/</span>
              <span className="font-medium" style={{ color: 'var(--ct-text)' }}>
                {getBreadcrumb()}
              </span>
            </div>
          </div>

          {/* Center: search trigger */}
          <button
            onClick={() => {
              // Trigger ⌘K
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-ct-md text-sm transition-colors"
            style={{
              background: 'var(--ct-bg-subtle)',
              border: '1px solid var(--ct-border)',
              color: 'var(--ct-text-tertiary)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ct-border-strong)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--ct-border)'}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd
              className="ml-4 text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--ct-surface)',
                border: '1px solid var(--ct-border)',
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5">
            <ThemeSwitcher />

            <button
              onClick={onOpenCreateCaseModal}
              className="ct-btn ct-btn-primary ct-btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Case</span>
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 p-1.5 rounded-ct-md transition-colors"
                style={{
                  border: '1px solid var(--ct-border)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ct-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div
                  className="w-6 h-6 rounded-ct-sm flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: 'var(--ct-accent)',
                    color: '#FFFFFF',
                  }}
                >
                  {currentUser?.fullName?.charAt(0) || 'U'}
                </div>
                <ChevronDown className="w-3 h-3 hidden sm:block" style={{ color: 'var(--ct-text-tertiary)' }} />
              </button>

              {profileDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 py-1 ct-animate-fade-in-up z-50"
                  style={{
                    background: 'var(--ct-surface)',
                    border: '1px solid var(--ct-border)',
                    borderRadius: 'var(--ct-radius-lg)',
                    boxShadow: 'var(--ct-shadow-lg)',
                  }}
                >
                  <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--ct-border)' }}>
                    <div className="text-sm font-medium" style={{ color: 'var(--ct-text)' }}>
                      {currentUser?.fullName}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--ct-text-tertiary)' }}>
                      {currentUser?.email}
                    </div>
                    <div
                      className="ct-badge ct-badge-accent mt-1.5"
                      style={{ fontSize: '10px' }}
                    >
                      {currentUser?.role}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                      style={{ color: 'var(--ct-text)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ct-surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Settings className="w-4 h-4" style={{ color: 'var(--ct-text-tertiary)' }} />
                      Settings
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid var(--ct-border)' }}>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                      style={{ color: 'var(--ct-danger-text)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ct-danger-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ═══ Mobile Navigation Drawer ═══ */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50"
            onClick={() => setMobileMenuOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            {/* Overlay */}
            <div className="absolute inset-0 ct-animate-fade-in" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />

            {/* Drawer */}
            <div
              ref={mobileDrawerRef}
              className="absolute left-0 top-0 h-full w-72 max-w-[85vw] flex flex-col"
              style={{
                background: 'var(--ct-sidebar-bg)',
                borderRight: '1px solid var(--ct-sidebar-border)',
                animation: 'ct-slide-in-left 0.25s var(--ct-ease-out)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer header */}
              <div
                className="h-14 flex items-center justify-between px-4 shrink-0"
                style={{ borderBottom: '1px solid var(--ct-sidebar-border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-ct-md flex items-center justify-center font-bold text-sm"
                    style={{ background: 'var(--ct-accent)', color: '#FFFFFF' }}
                  >
                    CT
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--ct-text)' }}>ChainTrace</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="ct-btn-icon"
                  style={{ padding: '4px' }}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav items */}
              <NavItems collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />

              {/* User footer */}
              <div className="shrink-0 p-3" style={{ borderTop: '1px solid var(--ct-sidebar-border)' }}>
                <div className="flex items-center gap-2.5 mb-3 p-2 rounded-ct-md" style={{ background: 'var(--ct-bg-subtle)' }}>
                  <div
                    className="w-8 h-8 rounded-ct-md flex items-center justify-center text-xs font-semibold"
                    style={{
                      background: 'var(--ct-accent-subtle)',
                      color: 'var(--ct-accent-text)',
                    }}
                  >
                    {currentUser?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--ct-text)' }}>
                      {currentUser?.fullName || 'User'}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--ct-text-tertiary)' }}>
                      {currentUser?.role || 'Investigator'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="ct-btn ct-btn-secondary w-full ct-btn-sm"
                  style={{ color: 'var(--ct-danger-text)' }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Main Content ═══ */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>

      {/* ═══ Command Palette ═══ */}
      <CommandPalette cases={cases} onSelectCase={onSelectCase} />
    </div>
  );
};
