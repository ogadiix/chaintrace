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
        // Fetch created case details
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
    <div className="flex-1 flex flex-col min-h-0 bg-navy-950 text-slate-100 overflow-y-auto">
      {/* Top Banner & Header */}
      <div className="px-6 py-4 bg-navy-900 border-b border-navy-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-100 tracking-wide flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              National Intelligence Integrations
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider font-semibold">
              AGENCY GATEWAY SANDBOX
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Interoperability sandbox connecting NCRP complaint intake with I4C SAHYOG VASP requisitions
          </p>
        </div>

        {/* Global SubTab Switcher */}
        <div className="flex items-center bg-navy-950 p-1 rounded-md border border-navy-800 gap-1">
          <button
            onClick={() => setSubTab('ncrp')}
            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
              subTab === 'ncrp'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            NCRP Complaint Intake
          </button>
          <button
            onClick={() => setSubTab('sahyog')}
            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
              subTab === 'sahyog'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            SAHYOG VASP Requisitions ({sahyogRequests.length})
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory Simulation Banner */}
      <div className="px-6 py-2 bg-amber-950/20 border-b border-amber-800/40 text-[11px] text-amber-300/90 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>
          <strong>SIMULATION NOTICE:</strong> Zero live government or financial exchange requests are dispatched. All returned account records and complaint intakes operate on sandboxed synthetic mock data for SIH evaluation.
        </span>
      </div>

      {/* Main Content Area */}
      <div className="p-6 flex-1 min-h-0 space-y-6">
        {subTab === 'ncrp' ? (
          /* =========================================================================
             NCRP COMPLAINT INTAKE TAB
             ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Complaint Submission Form */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-navy-900 border border-navy-800 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-cyan-400" />
                      Ingest NCRP Complaint
                    </h3>
                    <p className="text-xs text-slate-400">
                      Standardized intake with wallet validation & automatic case setup
                    </p>
                  </div>
                  {/* Preset Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadPreset('tron')}
                      className="px-2 py-1 text-[10px] rounded bg-navy-800 hover:bg-navy-700 text-cyan-300 border border-cyan-500/20 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> TRON Template
                    </button>
                    <button
                      type="button"
                      onClick={() => loadPreset('eth')}
                      className="px-2 py-1 text-[10px] rounded bg-navy-800 hover:bg-navy-700 text-purple-300 border border-purple-500/20 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> ETH Template
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                {ingestError && (
                  <div className="mb-4 p-3 rounded bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                    <span>{ingestError}</span>
                  </div>
                )}

                {ingestSuccess && (
                  <div className="mb-4 p-3 rounded bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {ingestSuccess.isDuplicate
                        ? 'Idempotency Alert: Existing Complaint Found (Zero Duplicate Creation)'
                        : 'Complaint Successfully Ingested & Registered!'}
                    </div>
                    <div className="font-mono text-[11px] text-slate-300">
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
                        className="mt-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-[11px] flex items-center gap-1.5"
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
                      <label className="block text-xs text-slate-400 mb-1">NCRP Complaint ID</label>
                      <input
                        type="text"
                        required
                        value={complaintId}
                        onChange={(e) => setComplaintId(e.target.value)}
                        className="w-full bg-navy-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Fraud Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-navy-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
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
                      <label className="block text-xs text-slate-400 mb-1">Target Blockchain</label>
                      <select
                        value={blockchain}
                        onChange={(e) => setBlockchain(e.target.value)}
                        className="w-full bg-navy-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
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
                      <label className="block text-xs text-slate-400 mb-1">Victim Anonymous Reference</label>
                      <input
                        type="text"
                        value={victimRef}
                        onChange={(e) => setVictimRef(e.target.value)}
                        placeholder="e.g. VIC-DEMO-001"
                        className="w-full bg-navy-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Target Suspect Wallet */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Suspect Receiving Wallet Address
                    </label>
                    <input
                      type="text"
                      required
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="TRON (T...) or EVM (0x...)"
                      className="w-full bg-navy-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Amount & Currency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Reported Amount</label>
                      <input
                        type="text"
                        required
                        value={reportedAmount}
                        onChange={(e) => setReportedAmount(e.target.value)}
                        className="w-full bg-navy-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Asset Currency</label>
                      <input
                        type="text"
                        required
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-navy-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Transaction Hash */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Initial Transfer Transaction Hash (Optional)
                    </label>
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Incident Summary</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-navy-950 border border-navy-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Auto Create Case Checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="autoCreateCase"
                      checked={autoCreateCase}
                      onChange={(e) => setAutoCreateCase(e.target.checked)}
                      className="rounded bg-navy-950 border-navy-700 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="autoCreateCase" className="text-xs text-slate-300 cursor-pointer">
                      Automatically establish active ChainTrace Case upon intake validation
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={ingesting}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded text-xs transition-colors disabled:opacity-50"
                    >
                      {ingesting ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          Validating Complaint...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Ingest NCRP Complaint & Validate Address
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Ingested NCRP Complaints Ledger */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-navy-900 border border-navy-800 rounded-lg p-5 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-cyan-400" />
                      Ingested NCRP Complaints Ledger
                    </h3>
                    <p className="text-xs text-slate-400">
                      Synchronized simulated feed from NCRP portal
                    </p>
                  </div>
                  <button
                    onClick={fetchComplaints}
                    disabled={loadingComplaints}
                    className="p-1.5 rounded bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 text-xs"
                    title="Refresh complaints"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingComplaints ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {ncrpComplaints.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs">
                    <ShieldAlert className="w-8 h-8 text-slate-600 mb-2" />
                    No complaints ingested yet. Submit the form or load a demo preset.
                  </div>
                ) : (
                  <div className="space-y-2.5 overflow-y-auto max-h-[560px] pr-1">
                    {ncrpComplaints.map((c: NcrpComplaint) => (
                      <div
                        key={c.id}
                        className="p-3 bg-navy-950 border border-navy-800 rounded-md hover:border-cyan-500/30 transition-colors text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-cyan-400">{c.complaint_id}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 uppercase">
                            {c.blockchain}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          <span className="text-slate-400">Category:</span> {c.category} |{' '}
                          <span className="text-slate-400">Amount:</span>{' '}
                          <strong className="text-emerald-400">
                            {c.reported_amount} {c.currency}
                          </strong>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 truncate">
                          Wallet: <span className="text-slate-200">{c.wallet_address}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-navy-800/80 text-[10px]">
                          <span className="text-slate-500">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                          {c.case_id ? (
                            <button
                              onClick={() => {
                                const matched = cases.find((item) => item.id === c.case_id);
                                if (matched) onOpenCase(matched);
                              }}
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                            >
                              Case #{c.case_number || 'Linked'} <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-500">No linked case</span>
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
          /* =========================================================================
             SAHYOG REQUISITIONS TAB
             ========================================================================= */
          <div className="space-y-4">
            <div className="bg-navy-900 border border-navy-800 rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    I4C SAHYOG VASP Coordination Portal
                  </h3>
                  <p className="text-xs text-slate-400">
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
                      className="bg-navy-950 border border-navy-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none"
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
                    className="p-1.5 rounded bg-navy-800 hover:bg-navy-750 text-slate-300 border border-navy-700 text-xs"
                    title="Refresh requests"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSahyog ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsSahyogModalOpen(true)}
                    disabled={!selectedCaseForSahyog}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New SAHYOG Requisition
                  </button>
                </div>
              </div>

              {/* SAHYOG Requests Table */}
              {sahyogRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  No SAHYOG requests dispatched yet. Click "New SAHYOG Requisition" to test the simulation.
                </div>
              ) : (
                <div className="overflow-x-auto border border-navy-800 rounded-md">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
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
                    <tbody className="divide-y divide-navy-800/60 text-slate-200">
                      {sahyogRequests.map((req: SahyogRequest) => (
                        <tr key={req.id} className="hover:bg-navy-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-cyan-400 font-semibold">{req.request_number}</td>
                          <td className="py-2.5 px-3 text-slate-300 text-[11px]">{req.request_type}</td>
                          <td className="py-2.5 px-3 text-slate-100 font-sans">{req.recipient_entity}</td>
                          <td className="py-2.5 px-3 text-slate-400 max-w-[140px] truncate" title={req.target_wallet}>
                            {req.target_wallet}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                                req.status === 'RESPONSE_RECEIVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : req.status === 'NO_MATCH'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : req.status === 'FREEZE_REQUEST_DEMO'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {req.response?.evidence_id ? (
                              <span className="text-cyan-400 font-mono text-[11px]">
                                {req.response.evidence_id}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                            {new Date(req.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setInspectingRequest(req)}
                              className="px-2 py-1 rounded bg-navy-800 hover:bg-navy-700 text-cyan-300 text-[11px] border border-cyan-500/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-lg max-w-xl w-full p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-100">{inspectingRequest.request_number}</h4>
                <p className="text-xs text-slate-400">{inspectingRequest.recipient_entity}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                SIMULATED DATA
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-400">Target Wallet:</span>{' '}
                <span className="text-slate-200">{inspectingRequest.target_wallet}</span>
              </div>
              <div>
                <span className="text-slate-400">Authority Ref:</span>{' '}
                <span className="text-slate-200">{inspectingRequest.authority_reference}</span>
              </div>
              <div>
                <span className="text-slate-400">Information Scope:</span>
                <p className="text-slate-300 font-sans mt-0.5 p-2 bg-navy-950 rounded border border-navy-800">
                  {inspectingRequest.requested_information}
                </p>
              </div>

              {inspectingRequest.response && (
                <div>
                  <span className="text-slate-400">Simulated VASP Response:</span>
                  <pre className="text-[11px] text-emerald-300 bg-navy-950 p-2.5 rounded border border-navy-800 overflow-x-auto mt-1 max-h-48">
                    {JSON.stringify(inspectingRequest.response.account_details, null, 2)}
                  </pre>
                  {inspectingRequest.response.evidence_id && (
                    <div className="mt-2 text-cyan-300 text-[11px]">
                      Evidence Ref: <strong>{inspectingRequest.response.evidence_id}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectingRequest(null)}
                className="px-4 py-1.5 rounded bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs"
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
