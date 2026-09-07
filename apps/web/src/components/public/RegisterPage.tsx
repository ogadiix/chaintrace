import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { navigate } from '../../router';

export const RegisterPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    designation: '',
    officialEmail: '',
    phone: '',
    agencyName: '',
    agencyType: 'POLICE_CYBER_CRIME',
    jurisdiction: '',
    supervisorEmail: '',
    justification: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = `CT-LEA-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(ref);
    setSubmitted(true);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      <main className="flex-1 flex items-start justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg">
          {submitted ? (
            <div className="text-center py-12 ct-animate-fade-in-up">
              <div
                className="w-14 h-14 rounded-ct-lg flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--ct-success-subtle)', color: 'var(--ct-success-text)' }}
              >
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--ct-text)' }}>
                Access Request Submitted
              </h2>
              <p className="text-sm mb-4 max-w-sm mx-auto" style={{ color: 'var(--ct-text-secondary)' }}>
                Your clearance application has been submitted for review. You will be notified at your official email.
              </p>
              <div
                className="inline-block px-3 py-1.5 rounded-ct-md font-mono text-sm mb-6"
                style={{ background: 'var(--ct-bg-subtle)', border: '1px solid var(--ct-border)', color: 'var(--ct-accent-text)' }}
              >
                Reference: {ticketId}
              </div>
              <div>
                <button onClick={() => navigate('/login')} className="ct-btn ct-btn-primary">
                  Return to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                  Request Access
                </h1>
                <p className="text-sm" style={{ color: 'var(--ct-text-secondary)' }}>
                  Submit your organization details for platform access clearance.
                </p>
              </div>

              <div
                className="p-3 rounded-ct-md mb-6 flex items-start gap-2 text-sm"
                style={{
                  background: 'var(--ct-warning-subtle)',
                  color: 'var(--ct-warning-text)',
                  border: '1px solid transparent',
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Access is restricted to authorized law enforcement and regulatory personnel.</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ct-label">Full Name</label>
                    <input
                      type="text" required value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      className="ct-input" placeholder="Full legal name"
                    />
                  </div>
                  <div>
                    <label className="ct-label">Designation</label>
                    <input
                      type="text" required value={formData.designation}
                      onChange={(e) => handleChange('designation', e.target.value)}
                      className="ct-input" placeholder="e.g. Sub-Inspector"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ct-label">Official Email</label>
                    <input
                      type="email" required value={formData.officialEmail}
                      onChange={(e) => handleChange('officialEmail', e.target.value)}
                      className="ct-input" placeholder="name@agency.gov.in"
                    />
                  </div>
                  <div>
                    <label className="ct-label">Phone</label>
                    <input
                      type="tel" value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="ct-input" placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ct-label">Agency / Organization</label>
                    <input
                      type="text" required value={formData.agencyName}
                      onChange={(e) => handleChange('agencyName', e.target.value)}
                      className="ct-input" placeholder="Agency name"
                    />
                  </div>
                  <div>
                    <label className="ct-label">Agency Type</label>
                    <select
                      value={formData.agencyType}
                      onChange={(e) => handleChange('agencyType', e.target.value)}
                      className="ct-select w-full"
                    >
                      <option value="POLICE_CYBER_CRIME">Police — Cyber Crime</option>
                      <option value="ECONOMIC_OFFENCES">Economic Offences Wing</option>
                      <option value="FIU">Financial Intelligence Unit</option>
                      <option value="REGULATORY">Regulatory Authority</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="ct-label">Jurisdiction</label>
                  <input
                    type="text" required value={formData.jurisdiction}
                    onChange={(e) => handleChange('jurisdiction', e.target.value)}
                    className="ct-input" placeholder="State / District"
                  />
                </div>

                <div>
                  <label className="ct-label">Supervisor Email</label>
                  <input
                    type="email" value={formData.supervisorEmail}
                    onChange={(e) => handleChange('supervisorEmail', e.target.value)}
                    className="ct-input" placeholder="supervisor@agency.gov.in"
                  />
                </div>

                <div>
                  <label className="ct-label">Purpose / Justification</label>
                  <textarea
                    rows={3} required value={formData.justification}
                    onChange={(e) => handleChange('justification', e.target.value)}
                    className="ct-input" style={{ resize: 'vertical' }}
                    placeholder="Brief description of investigative use case"
                  />
                </div>

                <button type="submit" className="ct-btn ct-btn-primary w-full" style={{ padding: '10px 16px', fontWeight: 600 }}>
                  <Send className="w-4 h-4" />
                  Submit Access Request
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
