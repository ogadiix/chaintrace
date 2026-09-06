import React, { useState } from 'react';
import {
  X,
  Send,
  AlertTriangle,
  Building2,
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Snowflake,
  HelpCircle,
} from 'lucide-react';
import type { Case, SahyogRequest, SahyogRequestType, SahyogScenario } from '@chaintrace/types';

interface SahyogRequestModalProps {
  activeCase: Case;
  authToken: string;
  isOpen: boolean;
  onClose: () => void;
  initialTargetWallet?: string;
  initialRecipient?: string;
  onRequestSubmitted?: (req: SahyogRequest) => void;
}

export const SahyogRequestModal: React.FC<SahyogRequestModalProps> = ({
  activeCase,
  authToken,
  isOpen,
  onClose,
  initialTargetWallet,
  initialRecipient,
  onRequestSubmitted,
}) => {
  const [recipient, setRecipient] = useState<string>(initialRecipient || 'Binance Holdings Ltd.');
  const [targetWallet, setTargetWallet] = useState<string>(
    initialTargetWallet || activeCase.suspectWallet || ''
  );
  const [requestType, setRequestType] = useState<SahyogRequestType>('ACCOUNT_IDENTIFICATION');
  const [scenario, setScenario] = useState<SahyogScenario>('SUCCESS');
  const [authorityRef, setAuthorityRef] = useState<string>('SEC-91-CrPC-DEMO-2026-088');
  const [requestedInfo, setRequestedInfo] = useState<string>(
    'Requisition for account holder identification, KYC documentation, registered bank accounts, and complete deposit ledger for the specified wallet address.'
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<SahyogRequest | null>(null);
  const [copiedEvidence, setCopiedEvidence] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEvidence(true);
    setTimeout(() => setCopiedEvidence(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWallet.trim()) {
      setError('Target wallet address is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create request draft/record
      const createRes = await fetch('/api/v1/integrations/sahyog/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          case_id: activeCase.id,
          request_type: requestType,
          recipient_entity: recipient,
          target_wallet: targetWallet.trim(),
          transaction_hash: activeCase.initialTxHash || null,
          authority_reference: authorityRef,
          requested_information: requestedInfo,
          simulated_scenario: scenario,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create SAHYOG requisition');
      }

      const createdReq: SahyogRequest = await createRes.json();

      // 2. Submit request for simulated processing
      const submitRes = await fetch(`/api/v1/integrations/sahyog/requests/${createdReq.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          scenario_override: scenario,
        }),
      });

      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit SAHYOG requisition');
      }

      const completedReq: SahyogRequest = await submitRes.json();
      setSubmittedResult(completedReq);
      if (onRequestSubmitted) {
        onRequestSubmitted(completedReq);
      }
    } catch (err: any) {
      setError(err.message || 'Error executing requisition simulation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmittedResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-cyan-500/30 rounded-lg shadow-2xl max-w-2xl w-full text-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-navy-950 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-100">
                  SAHYOG VASP Coordination Portal
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  DEMO / SIMULATED INTEGRATION
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Statutory Intermediary Requisition Workflow (I4C SAHYOG Standard)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disclaimer Banner */}
        <div className="px-6 py-2.5 bg-amber-950/30 border-b border-amber-800/40 flex items-center gap-2.5 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>SIMULATION NOTICE:</strong> Zero live government or financial exchange requests are dispatched. All returned account records are synthetic dummy data generated for SIH demonstration.
          </span>
        </div>

        {!submittedResult ? (
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Linked Case Reference */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Investigation Case</label>
                <input
                  type="text"
                  disabled
                  value={`${activeCase.caseNumber} — ${activeCase.title}`}
                  className="w-full bg-navy-950 border border-navy-700/80 rounded px-3 py-1.5 text-xs text-slate-300 font-mono truncate"
                />
              </div>

              {/* Statutory Authority Reference */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Statutory Reference / Court Order
                </label>
                <input
                  type="text"
                  required
                  value={authorityRef}
                  onChange={(e) => setAuthorityRef(e.target.value)}
                  placeholder="e.g. SEC-91-CrPC-DEMO-XXXX"
                  className="w-full bg-navy-950 border border-navy-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Recipient Entity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Recipient VASP / Entity</label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Binance Holdings Ltd.">Binance Holdings Ltd.</option>
                  <option value="WazirX (Zanmai Labs)">WazirX (Zanmai Labs)</option>
                  <option value="CoinDCX (Neblio Technologies)">CoinDCX (Neblio Technologies)</option>
                  <option value="OKX Global">OKX Global</option>
                  <option value="Huobi / HTX">Huobi / HTX</option>
                  <option value="Tether Operations Ltd (USDT Blacklist Requisition)">Tether Operations Ltd (USDT Issuer)</option>
                </select>
              </div>

              {/* Request Type */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Requisition Type</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as SahyogRequestType)}
                  className="w-full bg-navy-950 border border-navy-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                >
                  <option value="ACCOUNT_IDENTIFICATION">ACCOUNT_IDENTIFICATION</option>
                  <option value="KYC_INFORMATION">KYC_INFORMATION</option>
                  <option value="TRANSACTION_INFORMATION">TRANSACTION_INFORMATION</option>
                  <option value="ACCOUNT_ACTIVITY">ACCOUNT_ACTIVITY</option>
                  <option value="FREEZE_REQUEST_DEMO">FREEZE_REQUEST_DEMO (Emergency Requisition)</option>
                </select>
              </div>
            </div>

            {/* Target Wallet */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Wallet Address</label>
              <input
                type="text"
                required
                value={targetWallet}
                onChange={(e) => setTargetWallet(e.target.value)}
                placeholder="0x... or T..."
                className="w-full bg-navy-950 border border-navy-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Requested Information Text */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Scope of Information Required</label>
              <textarea
                rows={2}
                value={requestedInfo}
                onChange={(e) => setRequestedInfo(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded px-3 py-1.5 text-xs text-slate-200 font-sans focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Simulation Scenario Selector */}
            <div className="p-3 rounded border border-cyan-500/20 bg-cyan-950/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Demonstration Simulation Scenario:
                </span>
                <span className="text-[10px] text-cyan-400/80 font-mono">Sandbox Test Mode</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScenario('SUCCESS')}
                  className={`px-2.5 py-1.5 rounded text-xs text-left border transition-all ${
                    scenario === 'SUCCESS'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                      : 'bg-navy-900 border-navy-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold">1. SUCCESS</div>
                  <div className="text-[10px] opacity-75">KYC Match Found</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScenario('NO_MATCH')}
                  className={`px-2.5 py-1.5 rounded text-xs text-left border transition-all ${
                    scenario === 'NO_MATCH'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                      : 'bg-navy-900 border-navy-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold">2. NO MATCH</div>
                  <div className="text-[10px] opacity-75">Unregistered Deposit</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScenario('FREEZE_REQUEST_DEMO')}
                  className={`px-2.5 py-1.5 rounded text-xs text-left border transition-all ${
                    scenario === 'FREEZE_REQUEST_DEMO'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-semibold'
                      : 'bg-navy-900 border-navy-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold">3. FREEZE DEMO</div>
                  <div className="text-[10px] opacity-75">Emergency Hold Requisition</div>
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-navy-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded text-xs transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    Dispatching Requisition...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit Requisition via SAHYOG
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Result View */
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-lg bg-navy-950 border border-navy-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {submittedResult.status === 'RESPONSE_RECEIVED' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : submittedResult.status === 'NO_MATCH' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Snowflake className="w-5 h-5 text-purple-400" />
                  )}
                  <span className="text-sm font-semibold text-slate-100">
                    Requisition Result: {submittedResult.status}
                  </span>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                  {submittedResult.request_number}
                </span>
              </div>

              {submittedResult.response && (
                <>
                  <div className="text-xs text-slate-300 font-sans bg-navy-900/80 p-3 rounded border border-navy-700/60 space-y-2">
                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400">VASP Intermediary:</span>{' '}
                        <span className="text-cyan-300">{submittedResult.response.recipient_entity}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Response Status:</span>{' '}
                        <span className="text-emerald-400">{submittedResult.response.status}</span>
                      </div>
                    </div>

                    {/* Account Details */}
                    {Object.keys(submittedResult.response.account_details || {}).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-navy-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Simulated Intermediary KYC Data:
                        </div>
                        <pre className="text-[11px] font-mono text-emerald-300/90 bg-navy-950 p-2.5 rounded overflow-x-auto">
                          {JSON.stringify(submittedResult.response.account_details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Evidence Attachment */}
                    {submittedResult.response.evidence_id && (
                      <div className="mt-3 p-2 rounded bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs text-cyan-300">
                            Attached Investigation Evidence:{' '}
                            <strong className="font-mono">{submittedResult.response.evidence_id}</strong>
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy(submittedResult.response?.evidence_id || '')}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-navy-900 px-2 py-0.5 rounded border border-cyan-500/30"
                        >
                          {copiedEvidence ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedEvidence ? 'Copied' : 'Copy Ref'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-amber-400/90 font-mono bg-amber-950/20 px-3 py-1.5 rounded border border-amber-900/40">
                    {submittedResult.response.disclaimer}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={resetForm}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Submit Another Requisition
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
