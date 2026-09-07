import React, { useState } from 'react';
import {
  Shield,
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

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500/25 relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.08),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold tracking-wider text-sm text-slate-100 font-mono">CHAINTRACE</div>
            <div className="text-[10px] text-slate-400 font-mono">INSTITUTIONAL CLEARANCE REGISTRY</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 bg-slate-900/60 transition-colors"
          >
            Existing Officer Sign In &rarr;
          </button>
        </div>
      </header>

      {/* Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10">
        <div className="w-full max-w-2xl">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Agency Clearance Application Logged</h2>
                <p className="text-sm text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
                  Your credentials and verification request for <strong className="text-white">{formData.agencyName}</strong>{' '}
                  have been securely submitted to the ChainTrace Security Clearance Division.
                </p>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-left space-y-2 mb-6 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Application Reference:</span>
                    <span className="text-cyan-400 font-bold">{ticketId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Officer Name:</span>
                    <span className="text-slate-200">{formData.fullName} ({formData.designation})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registered Email:</span>
                    <span className="text-slate-200">{formData.officialEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verification Status:</span>
                    <span className="text-amber-400 font-semibold">Under Manual Verification (SLA 4-12 hrs)</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                  <button
                    onClick={() => navigate('/')}
                    className="px-5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
                  >
                    Return to Platform Home
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
                  >
                    Proceed to Officer Sign In
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to Platform Overview
                </button>

                <div className="mb-6">
                  <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
                    OFFICIAL APPLICATION
                  </span>
                  <h1 className="text-2xl font-bold text-white mt-1">Agency Clearance & Workstation Provisioning</h1>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    ChainTrace access is restricted to verified law enforcement officials, financial intelligence officers,
                    and licensed VASP compliance departments.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Full Name & Rank</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dy. SP Vikram Deshmukh"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Official Designation</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Cyber Crime Unit Head"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Govt / Institutional Email <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="officer@police.gov.in"
                        value={formData.officialEmail}
                        onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Official Phone / Ext.</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 (022) 2202-XXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Agency / Department Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. State Cyber Cell / ED / FIU-IND"
                        value={formData.agencyName}
                        onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Institutional Category</label>
                      <select
                        value={formData.agencyType}
                        onChange={(e) => setFormData({ ...formData, agencyType: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="POLICE_CYBER_CRIME">State Police / Cyber Crime Cell</option>
                        <option value="CENTRAL_LAW_ENFORCEMENT">Central LEA / Federal Agency</option>
                        <option value="FINANCIAL_INTELLIGENCE">Financial Intelligence Unit (FIU)</option>
                        <option value="VASP_COMPLIANCE">VASP / Crypto Exchange Compliance Desk</option>
                        <option value="JUDICIAL_PROSECUTION">Judicial / Public Prosecutor Office</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Jurisdiction / Zone</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mumbai Cyber Zone 1"
                        value={formData.jurisdiction}
                        onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Supervisory Officer Email</label>
                      <input
                        type="email"
                        required
                        placeholder="sp.cyber@police.gov.in"
                        value={formData.supervisorEmail}
                        onChange={(e) => setFormData({ ...formData, supervisorEmail: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Investigation Scope & Case Justification
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Briefly state ongoing investigations requiring crypto tracing (e.g. NCRP cyber scam cases, multi-mule bank account money laundering)..."
                      value={formData.justification}
                      onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Official Clearance Requisition</span>
                    </button>
                  </div>
                </form>

                <div className="mt-5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 font-mono flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Applications are cross-checked with government agency directories. False submission of official credentials constitutes an offense under national penal laws.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-[11px] text-slate-400 font-mono">
        Official Clearance Registry &bull; National Forensic Intelligence Network
      </footer>
    </div>
  );
};
