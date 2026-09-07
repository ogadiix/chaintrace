import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import { navigate } from '../../router';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ct-bg)', color: 'var(--ct-text)' }}>
      {/* Header */}
      <header
        className="h-14 flex items-center justify-between px-6 shrink-0"
        style={{ borderBottom: '1px solid var(--ct-border)' }}
      >
        <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-ct-md flex items-center justify-center font-bold text-sm" style={{ background: 'var(--ct-accent)', color: '#FFFFFF' }}>
            CT
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--ct-text)' }}>ChainTrace</span>
        </div>
        <button onClick={() => navigate('/login')} className="ct-btn ct-btn-ghost ct-btn-sm">
          <ChevronLeft className="w-4 h-4" /> Sign In
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm">
          {submitted ? (
            <div className="text-center ct-animate-fade-in-up">
              <div
                className="w-14 h-14 rounded-ct-lg flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--ct-success-subtle)', color: 'var(--ct-success-text)' }}
              >
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--ct-text)' }}>
                Check your email
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--ct-text-secondary)' }}>
                If an account exists for <strong>{email}</strong>, password reset instructions have been sent.
              </p>
              <button onClick={() => navigate('/login')} className="ct-btn ct-btn-primary">
                Return to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--ct-text)' }}>
                  Reset password
                </h1>
                <p className="text-sm" style={{ color: 'var(--ct-text-secondary)' }}>
                  Enter your email address and we'll send you instructions to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="ct-label">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ color: 'var(--ct-text-tertiary)' }}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@organization.com"
                      className="ct-input" style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <button type="submit" className="ct-btn ct-btn-primary w-full" style={{ padding: '10px 16px', fontWeight: 600 }}>
                  Send Reset Instructions
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="text-center mt-6 text-sm" style={{ color: 'var(--ct-text-secondary)' }}>
                <button
                  onClick={() => navigate('/login')}
                  className="font-medium transition-colors"
                  style={{ color: 'var(--ct-accent-text)' }}
                >
                  Back to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
