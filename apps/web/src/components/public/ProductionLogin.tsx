import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../router';

export const ProductionLogin: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    setError(null);
    const result = await login(email.trim(), password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--ct-bg)', color: 'var(--ct-text)' }}
    >
      {/* Top bar */}
      <header
        className="h-14 flex items-center justify-between px-6 shrink-0"
        style={{ borderBottom: '1px solid var(--ct-border)' }}
      >
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div
            className="w-8 h-8 rounded-ct-md flex items-center justify-center font-bold text-sm"
            style={{ background: 'var(--ct-accent)', color: '#FFFFFF' }}
          >
            CT
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--ct-text)' }}>
            ChainTrace
          </span>
        </div>

        <button
          onClick={() => navigate('/')}
          className="text-sm transition-colors"
          style={{ color: 'var(--ct-text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ct-text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ct-text-secondary)'}
        >
          ← Back
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-semibold tracking-tight mb-2"
              style={{ color: 'var(--ct-text)' }}
            >
              Sign in
            </h1>
            <p className="text-sm" style={{ color: 'var(--ct-text-secondary)' }}>
              Blockchain Intelligence Platform
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 p-3 rounded-ct-md flex items-start gap-2.5 text-sm ct-animate-fade-in-up"
              style={{
                background: 'var(--ct-danger-subtle)',
                color: 'var(--ct-danger-text)',
                border: '1px solid var(--ct-danger-subtle)',
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ct-label">Work email</label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  style={{ color: 'var(--ct-text-tertiary)' }}
                >
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ct-input"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="ct-label" style={{ marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--ct-accent-text)' }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  style={{ color: 'var(--ct-text-tertiary)' }}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ct-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors"
                  style={{ color: 'var(--ct-text-tertiary)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="ct-btn ct-btn-primary w-full"
              style={{ padding: '10px 16px', fontSize: '0.875rem', fontWeight: 600 }}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full ct-animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-6 text-sm" style={{ color: 'var(--ct-text-secondary)' }}>
            <span>Need access for your organization? </span>
            <button
              onClick={() => navigate('/register')}
              className="font-medium transition-colors"
              style={{ color: 'var(--ct-accent-text)' }}
            >
              Request access
            </button>
          </div>

          <div
            className="mt-8 pt-5 text-center text-xs"
            style={{ borderTop: '1px solid var(--ct-border)', color: 'var(--ct-text-tertiary)' }}
          >
            All sessions are encrypted and audited.
          </div>
        </div>
      </main>
    </div>
  );
};
