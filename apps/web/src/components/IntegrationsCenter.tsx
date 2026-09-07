import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building2,
  AlertTriangle,
  FileCheck,
  Send,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  FolderOpen,
  X,
} from 'lucide-react';
import type { Case, NcrpComplaint, SahyogRequest } from '@chaintrace/types';
import { SahyogRequestModal } from './SahyogRequestModal';

interface IntegrationsCenterProps {
  cases: Case[];
  authToken: string;
  onOpenCase: (c: Case) => void;
  onCaseCreated: (c: Case) => void;
}

export const IntegrationsCenter: React.FC<IntegrationsCenterProps> = ({
  cases,
  authToken,
  onOpenCase,
  onCaseCreated,
}) => {
  // Tabs: NCRP Intake | SAHYOG Requisitions
  const [subTab, setSubTab] = useState<'ncrp' | 'sahyog'>('ncrp');

  // NCRP Form State
  const [complaintId, setComplaintId] = useState<string>('NCRP-DEMO-2026-TRON-8891');
  const [category, setCategory] = useState<string>('INVESTMENT_FRAUD');
  const [blockchain, setBlockchain] = useState<string>('tron');
  const [walletAddress, setWalletAddress] = useState<string>('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
  const [reportedAmount, setReportedAmount] = useState<string>('50000.00');
  const [currency, setCurrency] = useState<string>('USDT');
  const [txHash, setTxHash] = useState<string>('c408544bbcebc8e5cfba8ff799be5f12acbb415cfda20b8b20148b1115de62a1');
  const [victimRef, setVictimRef] = useState<string>('VIC-DEMO-2026-0914');
  const [description, setDescription] = useState<string>(
    'Victim induced to transfer USDT savings to fraudulent high-yield staking pool on Tron network.'
  );
  const [autoCreateCase, setAutoCreateCase] = useState<boolean>(true);

  // Status & lists
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [ingestSuccess, setIngestSuccess] = useState<{
    complaint: NcrpComplaint;
    isDuplicate: boolean;
    caseId?: string | null;
  } | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const [ncrpComplaints, setNcrpComplaints] = useState<NcrpComplaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState<boolean>(false);

  // SAHYOG state
  const [sahyogRequests, setSahyogRequests] = useState<SahyogRequest[]>([]);
  const [loadingSahyog, setLoadingSahyog] = useState<boolean>(false);
  const [isSahyogModalOpen, setIsSahyogModalOpen] = useState<boolean>(false);
  const [selectedCaseForSahyog, setSelectedCaseForSahyog] = useState<Case | null>(
    cases.length > 0 ? cases[0] : null
  );

  // Selected response view
  const [inspectingRequest, setInspectingRequest] = useState<SahyogRequest | null>(null);

  const fetchComplaints = async () => {
    if (!authToken) return;
    setLoadingComplaints(true);
    try {
      const res = await fetch('/api/v1/integrations/ncrp/complaints', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNcrpComplaints(data.complaints || []);
      }
    } catch {
      // Handled silently
    } finally {
      setLoadingComplaints(false);
    }
  };

  const fetchSahyogRequests = async () => {
    if (!authToken) return;
    setLoadingSahyog(true);
    try {
      const res = await fetch('/api/v1/integrations/sahyog/requests', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSahyogRequests(data.requests || []);
      }
    } catch {
      // Handled silently
    } finally {
      setLoadingSahyog(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchComplaints();
      fetchSahyogRequests();
    }
  }, [authToken]);

  // Load Presets
  const loadPreset = (preset: 'tron' | 'eth') => {
    if (preset === 'tron') {
      setComplaintId(`NCRP-DEMO-${new Date().getFullYear()}-TRON-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('INVESTMENT_FRAUD');
      setBlockchain('tron');
      setWalletAddress('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
      setReportedAmount('75000.00');
      setCurrency('USDT');
      setTxHash('c408544bbcebc8e5cfba8ff799be5f12acbb415cfda20b8b20148b1115de62a1');
      setVictimRef('VIC-DEMO-MUMBAI-771');
      setDescription('Victim lured by Telegram fraud group into sending USDT funds to suspect Tron staking contract.');
    } else {
      setComplaintId(`NCRP-DEMO-${new Date().getFullYear()}-ETH-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('RUGPULL');
      setBlockchain('ethereum');
      setWalletAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
      setReportedAmount('12.5');
      setCurrency('ETH');
      setTxHash('0x98f82638890cf282f6e9bcff0434b9d52084c8a58a70ebda83dc6ff6570624db');
      setVictimRef('VIC-DEMO-BLR-402');
      setDescription('Unregistered DeFi token pool liquidation drain resulting in total investor fund loss.');
    }
    setIngestSuccess(null);
    setIngestError(null);
  };

  // Submit Complaint Intake
  const handleNcrpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    setIngestSuccess(null);
    setIngestError(null);

    try {
      const payload = {
        complaint_id: complaintId.trim(),
        category,
        reported_amount: reportedAmount,
        currency,
        blockchain: blockchain.toLowerCase(),
        wallet_address: walletAddress.trim(),
        transaction_hash: txHash.trim() || null,
        description: description.trim() || null,
        victim_reference: victimRef.trim() || null,
        auto_create_case: autoCreateCase,
      };

      const res = await fetch('/api/v1/integrations/ncrp/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to ingest NCRP complaint');
      }

      const result: NcrpComplaint = await res.json();
      const isDuplicate = result.status === 'DUPLICATE_INGESTED';
      setIngestSuccess({
        complaint: result,
        isDuplicate,
        caseId: result.case_id,
      });

      // Refresh complaints and notify parent
      fetchComplaints();

      if (result.case_id) {
        const caseRes = await fetch(`/api/v1/cases/${result.case_id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (caseRes.ok) {
          const freshCase: Case = await caseRes.json();
          onCaseCreated(freshCase);
        }
      }
    } catch (err: any) {
      setIngestError(err.message || 'Intake failed');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ color: 'var(--ct-text)' }}>
      {/* Top Banner & Header */}
      <div
        className="p-5 border-b flex flex-wrap items-center justify-between gap-4 transition-colors"
        style={{
          backgroundColor: 'var(--ct-surface)',
          borderColor: 'var(--ct-border)',
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-2" style={{ color: 'var(--ct-text)' }}>
              <ShieldAlert className="w-5 h-5" style={{ color: 'var(--ct-accent)' }} />
              National Intelligence Integrations
            </h2>
            <span className="ct-badge ct-badge-info text-[10px] font-mono">
              Agency Gateway Sandbox
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--ct-text-secondary)' }}>
            Interoperability sandbox connecting NCRP complaint intake with I4C SAHYOG VASP requisitions
          </p>
        </div>

        {/* Global SubTab Switcher */}
        <div
          className="flex items-center p-1 rounded-lg border gap-1 overflow-x-auto whitespace-nowrap max-w-full scrollbar-none"
          style={{
            backgroundColor: 'var(--ct-bg-subtle)',
            borderColor: 'var(--ct-border)',
          }}
        >
          <button
            onClick={() => setSubTab('ncrp')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 shrink-0 ${
              subTab === 'ncrp' ? 'shadow-sm' : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: subTab === 'ncrp' ? 'var(--ct-surface)' : 'transparent',
              color: subTab === 'ncrp' ? 'var(--ct-accent-text)' : 'var(--ct-text-secondary)',
            }}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>NCRP Complaint Intake</span>
          </button>
          <button
            onClick={() => setSubTab('sahyog')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 shrink-0 ${
              subTab === 'sahyog' ? 'shadow-sm' : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: subTab === 'sahyog' ? 'var(--ct-surface)' : 'transparent',
              color: subTab === 'sahyog' ? 'var(--ct-accent-text)' : 'var(--ct-text-secondary)',
            }}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>SAHYOG VASP Requisitions ({sahyogRequests.length})</span>
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory Simulation Banner */}
      <div
        className="px-4 sm:px-6 py-2.5 border-b text-xs flex items-center gap-2"
        style={{
          backgroundColor: 'var(--ct-warning-subtle)',
          borderColor: 'var(--ct-warning)',
          color: 'var(--ct-warning-text)',
        }}
      >
        <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--ct-warning)' }} />
        <span>
          <strong>SIMULATION NOTICE:</strong> Zero live government or financial exchange requests are dispatched. All returned account records and complaint intakes operate on sandboxed synthetic mock data for SIH evaluation.
        </span>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 flex-1 min-h-0 space-y-6">
        {subTab === 'ncrp' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Complaint Submission Form */}
            <div className="lg:col-span-6 space-y-4">
              <div
                className="rounded-xl border p-4 sm:p-5 space-y-4 shadow-sm"
                style={{
                  backgroundColor: 'var(--ct-surface)',
                  borderColor: 'var(--ct-border)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ct-text)' }}>
                      <FileCheck className="w-4 h-4" style={{ color: 'var(--ct-accent)' }} />
                      Ingest NCRP Complaint
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                      Standardized intake with wallet validation & automatic case setup
                    </p>
                  </div>
                  {/* Preset Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadPreset('tron')}
                      className="ct-btn ct-btn-secondary ct-btn-sm text-[11px]"
                    >
                      <Sparkles className="w-3 h-3" /> TRON Template
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset('eth')}
                      className="ct-btn ct-btn-secondary ct-btn-sm text-[11px]"
                    >
                      <Sparkles className="w-3 h-3" /> ETH Template
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                {ingestError && (
                  <div
                    className="p-3 rounded-lg border text-xs flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--ct-danger-subtle)',
                      borderColor: 'var(--ct-danger)',
                      color: 'var(--ct-danger-text)',
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{ingestError}</span>
                  </div>
                )}

                {ingestSuccess && (
                  <div
                    className="p-3 rounded-lg border text-xs space-y-2"
                    style={{
                      backgroundColor: 'var(--ct-success-subtle)',
                      borderColor: 'var(--ct-success)',
                      color: 'var(--ct-success-text)',
                    }}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--ct-success)' }} />
                      {ingestSuccess.isDuplicate
                        ? 'Idempotency Alert: Existing Complaint Found (Zero Duplicate Creation)'
                        : 'Complaint Successfully Ingested & Registered!'}
                    </div>
                    <div className="font-mono text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                      <div>Complaint ID: {ingestSuccess.complaint.complaint_id}</div>
                      {ingestSuccess.complaint.case_number && (
                        <div>Linked Case: {ingestSuccess.complaint.case_number}</div>
                      )}
                    </div>
                    {ingestSuccess.caseId && (
                      <button
                        onClick={() => {
                          const matchedCase = cases.find((c) => c.id === ingestSuccess.caseId);
                          if (matchedCase) {
                            onOpenCase(matchedCase);
                          }
                        }}
                        className="ct-btn ct-btn-primary ct-btn-sm text-[11px] inline-flex items-center gap-1.5 mt-1"
                      >
                        <FolderOpen className="w-3 h-3" /> Open Linked Case in Investigation Workspace
                      </button>
                    )}
                  </div>
                )}

                {/* Intake Form */}
                <form onSubmit={handleNcrpSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                        NCRP Complaint ID
                      </label>
                      <input
                        type="text"
                        required
                        value={complaintId}
                        onChange={(e) => setComplaintId(e.target.value)}
                        className="ct-input text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                        Fraud Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="ct-input text-xs"
                      >
                        <option value="INVESTMENT_FRAUD">INVESTMENT_FRAUD</option>
                        <option value="EXTORTION">EXTORTION</option>
                        <option value="RUGPULL">RUGPULL</option>
                        <option value="RANSOMWARE">RANSOMWARE</option>
                        <option value="PHISHING">PHISHING</option>
                        <option value="PIG_BUTCHERING">PIG_BUTCHERING</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                        Target Blockchain
                      </label>
                      <select
                        value={blockchain}
                        onChange={(e) => setBlockchain(e.target.value)}
                        className="ct-input text-xs font-mono"
                      >
                        <option value="tron">TRON</option>
                        <option value="ethereum">ETHEREUM</option>
                        <option value="bsc">BSC (Binance Smart Chain)</option>
                        <option value="polygon">POLYGON</option>
                        <option value="arbitrum">ARBITRUM</option>
                        <option value="optimism">OPTIMISM</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                        Victim Reference
                      </label>
                      <input
                        type="text"
                        value={victimRef}
                        onChange={(e) => setVictimRef(e.target.value)}
                        placeholder="e.g. VIC-DEMO-001"
                        className="ct-input text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Target Suspect Wallet */}
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                      Suspect Receiving Wallet Address
                    </label>
                    <input
                      type="text"
                      required
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="TRON (T...) or EVM (0x...)"
                      className="ct-input text-xs font-mono"
                    />
                  </div>

                  {/* Amount & Currency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                        Reported Amount
                      </label>
                      <input
                        type="text"
                        required
                        value={reportedAmount}
                        onChange={(e) => setReportedAmount(e.target.value)}
                        className="ct-input text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                        Asset Currency
                      </label>
                      <input
                        type="text"
                        required
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="ct-input text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Transaction Hash */}
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                      Initial Transfer Transaction Hash <span style={{ color: 'var(--ct-text-tertiary)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      className="ct-input text-xs font-mono"
                    />
                  </div>

                  {/* Incident Summary */}
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                      Incident Summary
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="ct-input text-xs"
                      style={{ height: 'auto' }}
                    />
                  </div>

                  {/* Auto Create Case Checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="autoCreateCase"
                      checked={autoCreateCase}
                      onChange={(e) => setAutoCreateCase(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="autoCreateCase" className="text-xs cursor-pointer" style={{ color: 'var(--ct-text)' }}>
                      Automatically establish active ChainTrace Case upon intake validation
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={ingesting}
                      className="ct-btn ct-btn-primary w-full py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-2"
                    >
                      {ingesting ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>Validating Complaint...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Ingest NCRP Complaint & Validate Address</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Ingested NCRP Complaints Ledger */}
            <div className="lg:col-span-6 space-y-4">
              <div
                className="rounded-xl border p-5 flex flex-col h-full shadow-sm"
                style={{
                  backgroundColor: 'var(--ct-surface)',
                  borderColor: 'var(--ct-border)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ct-text)' }}>
                      <ShieldAlert className="w-4 h-4" style={{ color: 'var(--ct-accent)' }} />
                      Ingested NCRP Complaints Ledger
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                      Synchronized simulated feed from NCRP portal
                    </p>
                  </div>
                  <button
                    onClick={fetchComplaints}
                    disabled={loadingComplaints}
                    className="ct-btn ct-btn-secondary ct-btn-sm"
                    title="Refresh complaints"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingComplaints ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {ncrpComplaints.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                    <ShieldAlert className="w-8 h-8 mb-2 opacity-50" />
                    No complaints ingested yet. Submit the form or load a demo preset.
                  </div>
                ) : (
                  <div className="space-y-2.5 overflow-y-auto max-h-[560px] pr-1">
                    {ncrpComplaints.map((c: NcrpComplaint) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-lg border transition-all text-xs space-y-2"
                        style={{
                          backgroundColor: 'var(--ct-bg-subtle)',
                          borderColor: 'var(--ct-border)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold" style={{ color: 'var(--ct-accent-text)' }}>
                            {c.complaint_id}
                          </span>
                          <span className="ct-badge ct-badge-info text-[10px] uppercase font-mono">
                            {c.blockchain}
                          </span>
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                          <span>Category:</span> <strong style={{ color: 'var(--ct-text)' }}>{c.category}</strong> |{' '}
                          <span>Amount:</span>{' '}
                          <strong style={{ color: 'var(--ct-success-text)' }}>
                            {c.reported_amount} {c.currency}
                          </strong>
                        </div>
                        <div className="font-mono text-[11px] truncate" style={{ color: 'var(--ct-text-secondary)' }}>
                          Wallet: <span style={{ color: 'var(--ct-text)' }}>{c.wallet_address}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t text-[11px]" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                          <span style={{ color: 'var(--ct-text-tertiary)' }}>
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                          {c.case_id ? (
                            <button
                              onClick={() => {
                                const matched = cases.find((item) => item.id === c.case_id);
                                if (matched) onOpenCase(matched);
                              }}
                              className="inline-flex items-center gap-1 font-semibold text-xs transition-colors"
                              style={{ color: 'var(--ct-accent-text)' }}
                            >
                              <span>Case #{c.case_number || 'Linked'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span style={{ color: 'var(--ct-text-tertiary)' }}>No linked case</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* SAHYOG REQUISITIONS TAB */
          <div className="space-y-4">
            <div
              className="rounded-xl border p-5 shadow-sm space-y-4"
              style={{
                backgroundColor: 'var(--ct-surface)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ct-text)' }}>
                    <Building2 className="w-4 h-4" style={{ color: 'var(--ct-accent)' }} />
                    I4C SAHYOG VASP Coordination Portal
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                    Dispatched intermediary requests, account KYC records, and emergency freezing requisitions
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {cases.length > 0 && (
                    <select
                      value={selectedCaseForSahyog?.id || ''}
                      onChange={(e) => {
                        const found = cases.find((c) => c.id === e.target.value);
                        if (found) setSelectedCaseForSahyog(found);
                      }}
                      className="ct-input text-xs"
                      style={{ height: '34px', width: 'auto' }}
                    >
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.caseNumber} — {c.title.substring(0, 24)}...
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={fetchSahyogRequests}
                    disabled={loadingSahyog}
                    className="ct-btn ct-btn-secondary ct-btn-sm"
                    title="Refresh requests"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSahyog ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsSahyogModalOpen(true)}
                    disabled={!selectedCaseForSahyog}
                    className="ct-btn ct-btn-primary ct-btn-sm inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New SAHYOG Requisition</span>
                  </button>
                </div>
              </div>

              {/* SAHYOG Requests Table */}
              {sahyogRequests.length === 0 ? (
                <div className="p-12 text-center text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No SAHYOG requests dispatched yet. Click "New SAHYOG Requisition" to test the simulation.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--ct-border)' }}>
                  <table className="w-full text-left text-xs">
                    <thead
                      className="text-[11px] font-semibold uppercase tracking-wider border-b"
                      style={{
                        backgroundColor: 'var(--ct-bg-subtle)',
                        borderColor: 'var(--ct-border)',
                        color: 'var(--ct-text-secondary)',
                      }}
                    >
                      <tr>
                        <th className="py-2.5 px-3">Req Number</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Recipient VASP</th>
                        <th className="py-2.5 px-3">Target Wallet</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Evidence ID</th>
                        <th className="py-2.5 px-3">Dispatched</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                      {sahyogRequests.map((req: SahyogRequest) => (
                        <tr
                          key={req.id}
                          className="transition-colors hover:opacity-90"
                          style={{ backgroundColor: 'transparent' }}
                        >
                          <td className="py-2.5 px-3 font-mono font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
                            {req.request_number}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                            {req.request_type}
                          </td>
                          <td className="py-2.5 px-3 font-semibold" style={{ color: 'var(--ct-text)' }}>
                            {req.recipient_entity}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] max-w-[140px] truncate" style={{ color: 'var(--ct-text-secondary)' }} title={req.target_wallet}>
                            {req.target_wallet}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={
                                req.status === 'RESPONSE_RECEIVED'
                                  ? 'ct-badge ct-badge-success'
                                  : req.status === 'NO_MATCH'
                                  ? 'ct-badge ct-badge-warning'
                                  : 'ct-badge ct-badge-info'
                              }
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {req.response?.evidence_id ? (
                              <span className="font-mono text-[11px] font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
                                {req.response.evidence_id}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--ct-text-tertiary)' }}>—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                            {new Date(req.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setInspectingRequest(req)}
                              className="ct-btn ct-btn-secondary ct-btn-sm text-[11px]"
                            >
                              View Payload
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Requisition Creation Modal */}
      {selectedCaseForSahyog && (
        <SahyogRequestModal
          isOpen={isSahyogModalOpen}
          onClose={() => setIsSahyogModalOpen(false)}
          activeCase={selectedCaseForSahyog}
          authToken={authToken}
          onRequestSubmitted={(_req) => {
            fetchSahyogRequests();
          }}
        />
      )}

      {/* Inspect Requisition Payload Modal */}
      {inspectingRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-xl border max-w-xl w-full p-6 space-y-4 shadow-2xl animate-fade-in"
            style={{
              backgroundColor: 'var(--ct-surface)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'var(--ct-border)' }}
            >
              <div>
                <h4 className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                  {inspectingRequest.request_number}
                </h4>
                <p className="text-xs" style={{ color: 'var(--ct-text-secondary)' }}>
                  {inspectingRequest.recipient_entity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="ct-badge ct-badge-warning text-[10px]">
                  Simulated Data
                </span>
                <button
                  onClick={() => setInspectingRequest(null)}
                  className="ct-btn-icon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div
                className="p-3 rounded-lg border space-y-1 font-mono text-[11px]"
                style={{
                  backgroundColor: 'var(--ct-bg-subtle)',
                  borderColor: 'var(--ct-border)',
                }}
              >
                <div>
                  <span style={{ color: 'var(--ct-text-tertiary)' }}>Target Wallet: </span>
                  <span className="font-semibold" style={{ color: 'var(--ct-accent-text)' }}>{inspectingRequest.target_wallet}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--ct-text-tertiary)' }}>Authority Ref: </span>
                  <span style={{ color: 'var(--ct-text)' }}>{inspectingRequest.authority_reference}</span>
                </div>
              </div>

              <div>
                <span className="font-semibold block mb-1" style={{ color: 'var(--ct-text-secondary)' }}>Information Scope:</span>
                <p
                  className="p-2.5 rounded-lg border leading-relaxed"
                  style={{
                    backgroundColor: 'var(--ct-bg-subtle)',
                    borderColor: 'var(--ct-border)',
                    color: 'var(--ct-text)',
                  }}
                >
                  {inspectingRequest.requested_information}
                </p>
              </div>

              {inspectingRequest.response && (
                <div>
                  <span className="font-semibold block mb-1" style={{ color: 'var(--ct-text-secondary)' }}>Simulated VASP Response:</span>
                  <pre
                    className="text-[11px] font-mono p-3 rounded-lg border overflow-x-auto max-h-48"
                    style={{
                      backgroundColor: 'var(--ct-bg-subtle)',
                      borderColor: 'var(--ct-border)',
                      color: 'var(--ct-success-text)',
                    }}
                  >
                    {JSON.stringify(inspectingRequest.response.account_details, null, 2)}
                  </pre>
                  {inspectingRequest.response.evidence_id && (
                    <div className="mt-2 text-xs font-mono" style={{ color: 'var(--ct-accent-text)' }}>
                      Evidence Ref: <strong>{inspectingRequest.response.evidence_id}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="flex justify-end pt-3 border-t"
              style={{ borderColor: 'var(--ct-border)' }}
            >
              <button
                onClick={() => setInspectingRequest(null)}
                className="ct-btn ct-btn-secondary ct-btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
