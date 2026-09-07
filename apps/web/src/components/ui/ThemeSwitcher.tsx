import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  const currentOption = options.find((o) => o.value === theme) || options[2];
  const CurrentIcon = currentOption.icon;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ct-btn-icon"
        aria-label={`Theme: ${currentOption.label}`}
        title={`Theme: ${currentOption.label}`}
      >
        <CurrentIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-36 py-1 ct-animate-fade-in-up"
          style={{
            background: 'var(--ct-surface)',
            border: '1px solid var(--ct-border)',
            borderRadius: 'var(--ct-radius-lg)',
            boxShadow: 'var(--ct-shadow-lg)',
            zIndex: 50,
          }}
        >
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;

            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{
                  color: isActive ? 'var(--ct-accent-text)' : 'var(--ct-text)',
                  background: isActive ? 'var(--ct-accent-subtle)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--ct-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
