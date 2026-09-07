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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-xl border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-auto animate-fade-in transition-all"
        style={{
          backgroundColor: 'var(--ct-surface)',
          borderColor: 'var(--ct-border)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-4 border-b flex items-center justify-between"
          style={{
            backgroundColor: 'var(--ct-bg-subtle)',
            borderColor: 'var(--ct-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--ct-accent-subtle)' }}
            >
              <Building2 className="w-5 h-5" style={{ color: 'var(--ct-accent)' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                  SAHYOG VASP Coordination Portal
                </h3>
                <span className="ct-badge ct-badge-warning text-[10px]">
                  Simulated
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
                Statutory Intermediary Requisition Workflow (I4C SAHYOG Standard)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ct-btn-icon"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Disclaimer Banner */}
        <div
          className="px-4 sm:px-6 py-2.5 border-b flex items-center gap-2.5 text-xs"
          style={{
            backgroundColor: 'var(--ct-warning-subtle)',
            borderColor: 'var(--ct-warning)',
            color: 'var(--ct-warning-text)',
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--ct-warning)' }} />
          <span>
            <strong>SIMULATION NOTICE:</strong> Zero live government or financial exchange requests are dispatched. All returned account records are synthetic data generated for demonstration.
          </span>
        </div>

        {!submittedResult ? (
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
            {error && (
              <div
                className="p-3 rounded-lg border text-xs flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--ct-danger-subtle)',
                  borderColor: 'var(--ct-danger)',
                  color: 'var(--ct-danger-text)',
                }}
              >
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Linked Case Reference */}
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                  Investigation Case
                </label>
                <input
                  type="text"
                  disabled
                  value={`${activeCase.caseNumber} — ${activeCase.title}`}
                  className="ct-input text-xs font-mono truncate"
                  style={{ opacity: 0.8 }}
                />
              </div>

              {/* Statutory Authority Reference */}
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                  Statutory Reference / Court Order
                </label>
                <input
                  type="text"
                  required
                  value={authorityRef}
                  onChange={(e) => setAuthorityRef(e.target.value)}
                  placeholder="e.g. SEC-91-CrPC-DEMO-XXXX"
                  className="ct-input text-xs font-mono"
                />
              </div>
            </div>

            {/* Recipient Entity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                  Recipient VASP / Entity
                </label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="ct-input text-xs"
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
                <label className="block font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                  Requisition Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as SahyogRequestType)}
                  className="ct-input text-xs font-mono"
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
              <label className="block font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Target Wallet Address
              </label>
              <input
                type="text"
                required
                value={targetWallet}
                onChange={(e) => setTargetWallet(e.target.value)}
                placeholder="0x... or T..."
                className="ct-input text-xs font-mono"
              />
            </div>

            {/* Requested Information Text */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Scope of Information Required
              </label>
              <textarea
                rows={2}
                value={requestedInfo}
                onChange={(e) => setRequestedInfo(e.target.value)}
                className="ct-input text-xs"
                style={{ height: 'auto' }}
              />
            </div>

            {/* Simulation Scenario Selector */}
            <div
              className="p-3.5 rounded-lg border space-y-2"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--ct-accent-text)' }}>
                  <HelpCircle className="w-3.5 h-3.5" />
                  Demonstration Simulation Scenario:
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--ct-text-tertiary)' }}>Sandbox Test Mode</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setScenario('SUCCESS')}
                  className="p-2.5 rounded-lg text-left border transition-all"
                  style={{
                    backgroundColor: scenario === 'SUCCESS' ? 'var(--ct-success-subtle)' : 'var(--ct-surface)',
                    borderColor: scenario === 'SUCCESS' ? 'var(--ct-success)' : 'var(--ct-border)',
                  }}
                >
                  <div className="text-xs font-semibold" style={{ color: scenario === 'SUCCESS' ? 'var(--ct-success-text)' : 'var(--ct-text)' }}>
                    1. SUCCESS
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>KYC Match Found</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScenario('NO_MATCH')}
                  className="p-2.5 rounded-lg text-left border transition-all"
                  style={{
                    backgroundColor: scenario === 'NO_MATCH' ? 'var(--ct-warning-subtle)' : 'var(--ct-surface)',
                    borderColor: scenario === 'NO_MATCH' ? 'var(--ct-warning)' : 'var(--ct-border)',
                  }}
                >
                  <div className="text-xs font-semibold" style={{ color: scenario === 'NO_MATCH' ? 'var(--ct-warning-text)' : 'var(--ct-text)' }}>
                    2. NO MATCH
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>Unregistered Deposit</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScenario('FREEZE_REQUEST_DEMO')}
                  className="p-2.5 rounded-lg text-left border transition-all"
                  style={{
                    backgroundColor: scenario === 'FREEZE_REQUEST_DEMO' ? 'var(--ct-accent-subtle)' : 'var(--ct-surface)',
                    borderColor: scenario === 'FREEZE_REQUEST_DEMO' ? 'var(--ct-accent)' : 'var(--ct-border)',
                  }}
                >
                  <div className="text-xs font-semibold" style={{ color: scenario === 'FREEZE_REQUEST_DEMO' ? 'var(--ct-accent-text)' : 'var(--ct-text)' }}>
                    3. FREEZE DEMO
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>Emergency Hold</div>
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div
              className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t"
              style={{ borderColor: 'var(--ct-border)' }}
            >
              <button
                type="button"
                onClick={onClose}
                className="ct-btn ct-btn-secondary justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="ct-btn ct-btn-primary inline-flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching Requisition...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Requisition via SAHYOG</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Result View */
          <div className="p-4 sm:p-6 space-y-4">
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: 'var(--ct-bg-subtle)',
                borderColor: 'var(--ct-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {submittedResult.status === 'RESPONSE_RECEIVED' ? (
                    <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--ct-success)' }} />
                  ) : submittedResult.status === 'NO_MATCH' ? (
                    <AlertTriangle className="w-5 h-5" style={{ color: 'var(--ct-warning)' }} />
                  ) : (
                    <Snowflake className="w-5 h-5" style={{ color: 'var(--ct-accent)' }} />
                  )}
                  <span className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                    Requisition Result: {submittedResult.status}
                  </span>
                </div>
                <span className="ct-badge ct-badge-info text-xs font-mono">
                  {submittedResult.request_number}
                </span>
              </div>

              {submittedResult.response && (
                <>
                  <div
                    className="text-xs p-3.5 rounded-lg border space-y-2"
                    style={{
                      backgroundColor: 'var(--ct-surface)',
                      borderColor: 'var(--ct-border)',
                      color: 'var(--ct-text)',
                    }}
                  >
                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                      <div>
                        <span style={{ color: 'var(--ct-text-tertiary)' }}>VASP Intermediary: </span>
                        <span className="font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
                          {submittedResult.response.recipient_entity}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--ct-text-tertiary)' }}>Response Status: </span>
                        <span className="font-semibold" style={{ color: 'var(--ct-success-text)' }}>
                          {submittedResult.response.status}
                        </span>
                      </div>
                    </div>

                    {/* Account Details */}
                    {Object.keys(submittedResult.response.account_details || {}).length > 0 && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                        <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ct-text-secondary)' }}>
                          Simulated Intermediary KYC Data:
                        </div>
                        <pre
                          className="text-[11px] font-mono p-2.5 rounded-lg border overflow-x-auto"
                          style={{
                            backgroundColor: 'var(--ct-bg-subtle)',
                            borderColor: 'var(--ct-border)',
                            color: 'var(--ct-success-text)',
                          }}
                        >
                          {JSON.stringify(submittedResult.response.account_details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Evidence Attachment */}
                    {submittedResult.response.evidence_id && (
                      <div
                        className="mt-3 p-2.5 rounded-lg border flex items-center justify-between"
                        style={{
                          backgroundColor: 'var(--ct-accent-subtle)',
                          borderColor: 'var(--ct-border-subtle)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4" style={{ color: 'var(--ct-accent)' }} />
                          <span className="text-xs" style={{ color: 'var(--ct-accent-text)' }}>
                            Attached Investigation Evidence:{' '}
                            <strong className="font-mono">{submittedResult.response.evidence_id}</strong>
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy(submittedResult.response?.evidence_id || '')}
                          className="ct-btn ct-btn-secondary ct-btn-sm text-[11px] inline-flex items-center gap-1"
                        >
                          {copiedEvidence ? <Check className="w-3 h-3" style={{ color: 'var(--ct-success)' }} /> : <Copy className="w-3 h-3" />}
                          <span>{copiedEvidence ? 'Copied' : 'Copy Ref'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className="text-[11px] p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--ct-warning-subtle)',
                      borderColor: 'var(--ct-warning)',
                      color: 'var(--ct-warning-text)',
                    }}
                  >
                    {submittedResult.response.disclaimer}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                onClick={resetForm}
                className="ct-btn ct-btn-secondary justify-center"
              >
                Submit Another Requisition
              </button>
              <button
                onClick={onClose}
                className="ct-btn ct-btn-primary justify-center"
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
