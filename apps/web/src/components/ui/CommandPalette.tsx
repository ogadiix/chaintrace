import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, GitFork, FolderOpen, Settings, BarChart3, Building2, ArrowRight } from 'lucide-react';
import { navigate } from '../../router';
import type { Case } from '@chaintrace/types';

interface CommandPaletteProps {
  cases: Case[];
  onSelectCase?: (c: Case) => void;
}

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
  detail?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ cases, onSelectCase }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command items
  const commands: CommandItem[] = [
    // Pages
    { id: 'nav-dashboard', label: 'Dashboard', category: 'Navigation', icon: <BarChart3 className="w-4 h-4" />, action: () => navigate('/dashboard') },
    { id: 'nav-cases', label: 'Cases', category: 'Navigation', icon: <FolderOpen className="w-4 h-4" />, action: () => navigate('/cases') },
    { id: 'nav-investigations', label: 'Investigations', category: 'Navigation', icon: <GitFork className="w-4 h-4" />, action: () => navigate('/investigations') },
    { id: 'nav-reports', label: 'Reports', category: 'Navigation', icon: <FileText className="w-4 h-4" />, action: () => navigate('/reports') },
    { id: 'nav-integrations', label: 'Integrations', category: 'Navigation', icon: <Building2 className="w-4 h-4" />, action: () => navigate('/integrations') },
    { id: 'nav-settings', label: 'Settings', category: 'Navigation', icon: <Settings className="w-4 h-4" />, action: () => navigate('/settings') },
    // Cases
    ...cases.map((c) => ({
      id: `case-${c.id}`,
      label: c.title,
      category: 'Cases',
      icon: <FolderOpen className="w-4 h-4" />,
      detail: `${c.caseNumber} · ${c.targetChain.toUpperCase()}`,
      action: () => {
        onSelectCase?.(c);
        navigate('/investigations');
      },
    })),
  ];

  const filteredCommands = query.trim()
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          (cmd.detail && cmd.detail.toLowerCase().includes(query.toLowerCase()))
      )
    : commands;

  // Group by category
  const grouped = filteredCommands.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const flatItems = filteredCommands;

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation within palette
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
        e.preventDefault();
        flatItems[selectedIndex].action();
        setIsOpen(false);
      }
    },
    [flatItems, selectedIndex]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let itemIndex = -1;

  return (
    <div
      className="ct-overlay flex items-start justify-center pt-[15vh]"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="ct-modal w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--ct-border)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--ct-text-tertiary)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search cases, pages, wallets..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--ct-text)' }}
            autoComplete="off"
          />
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono"
            style={{
              background: 'var(--ct-bg-subtle)',
              color: 'var(--ct-text-tertiary)',
              border: '1px solid var(--ct-border)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {Object.keys(grouped).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ct-text-tertiary)' }}>
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="ct-section-label px-4 pt-2 pb-1">{category}</div>
                {items.map((item) => {
                  itemIndex++;
                  const idx = itemIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={() => {
                        item.action();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                      style={{
                        color: selectedIndex === idx ? 'var(--ct-accent-text)' : 'var(--ct-text)',
                        background: selectedIndex === idx ? 'var(--ct-accent-subtle)' : 'transparent',
                      }}
                    >
                      <span style={{ color: selectedIndex === idx ? 'var(--ct-accent-text)' : 'var(--ct-text-tertiary)' }}>
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.detail && (
                        <span className="text-xs font-mono truncate" style={{ color: 'var(--ct-text-tertiary)' }}>
                          {item.detail}
                        </span>
                      )}
                      {selectedIndex === idx && (
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ct-accent-text)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs border-t"
          style={{ borderColor: 'var(--ct-border)', color: 'var(--ct-text-tertiary)' }}
        >
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate · <kbd className="font-mono">↵</kbd> select · <kbd className="font-mono">esc</kbd> close
          </span>
          <span className="font-mono">{filteredCommands.length} results</span>
        </div>
      </div>
    </div>
  );
};
