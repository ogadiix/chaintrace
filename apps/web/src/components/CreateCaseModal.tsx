import React, { useState } from 'react';
import { X, ShieldAlert, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { BlockchainType, Case, CasePriority, CreateCaseRequest, FraudCategory } from '@chaintrace/types';
import { CHAIN_METADATA, isValidAddress } from '@chaintrace/shared';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: (newCase: Case) => void;
  authToken: string;
}

const FRAUD_CATEGORIES: { value: FraudCategory; label: string }[] = [
  { value: 'PIG_BUTCHERING', label: 'Pig Butchering / Romance Scam' },
  { value: 'INVESTMENT_FRAUD', label: 'Fake Investment Platform / High-Yield Scam' },
  { value: 'IMPERSONATION', label: 'Government / Law Enforcement Impersonation' },
  { value: 'PHISHING', label: 'Phishing / Drainer Contract' },
  { value: 'RANSOMWARE', label: 'Ransomware / Extortion' },
  { value: 'UNAUTHORIZED_TRANSFER', label: 'Unauthorized Account Compromise' },
  { value: 'OTHER', label: 'Other Cryptocurrency Fraud' },
];

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({
  isOpen,
  onClose,
  onCaseCreated,
  authToken,
}) => {
  const [title, setTitle] = useState('');
  const [complaintId, setComplaintId] = useState('');
  const [description, setDescription] = useState('');
  const [fraudCategory, setFraudCategory] = useState<FraudCategory>('PIG_BUTCHERING');
  const [targetChain, setTargetChain] = useState<BlockchainType>('tron');
  const [suspectWallet, setSuspectWallet] = useState('');
  const [reportedAmount, setReportedAmount] = useState('25000');
  const [currency, setCurrency] = useState('USDT');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialTxHash, setInitialTxHash] = useState('');
  const [priority, setPriority] = useState<CasePriority>('HIGH');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time client-side address validation
  const isAddressValid = isValidAddress(targetChain, suspectWallet);
  const isAddressTouched = suspectWallet.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddressValid) {
      setError(`Invalid ${CHAIN_METADATA[targetChain].name} address format.`);
      return;
    }

    setLoading(true);
    setError(null);

    const payload: CreateCaseRequest = {
      title,
      complaintId: complaintId.trim() || undefined,
      description,
      fraudCategory,
      reportedAmount,
      currency,
      incidentDate,
      targetChain,
      suspectWallet: suspectWallet.trim(),
      initialTxHash: initialTxHash.trim() || undefined,
      priority,
    };

    try {
      const response = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create case');
      }

      const createdCase: Case = await response.json();
      onCaseCreated(createdCase);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="rounded-xl border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col my-auto transition-all animate-fade-in"
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
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--ct-accent-subtle)' }}
            >
              <ShieldAlert className="w-4 h-4" style={{ color: 'var(--ct-accent)' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                Intake New Investigation Case
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                Register primary seed suspect wallet and incident parameters
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-4">
          {error && (
            <div
              className="p-3 rounded-lg border text-xs flex items-center gap-2"
              style={{
                backgroundColor: 'var(--ct-danger-subtle)',
                borderColor: 'var(--ct-danger)',
                color: 'var(--ct-danger-text)',
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Complaint ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Case Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Operation Titan: Tether Phishing Drainer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="ct-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Complaint ID <span style={{ color: 'var(--ct-text-tertiary)', fontWeight: 400 }}>(NCRP)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. NCRP-2026-09871"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                className="ct-input text-xs font-mono"
              />
            </div>
          </div>

          {/* Blockchain & Suspect Wallet */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Blockchain Target *
              </label>
              <select
                value={targetChain}
                onChange={(e) => setTargetChain(e.target.value as BlockchainType)}
                className="ct-input text-xs font-mono"
              >
                <option value="tron">TRON (TRX / USDT-TRC20)</option>
                <option value="ethereum">Ethereum (ETH / ERC-20)</option>
                <option value="bitcoin">Bitcoin (BTC / UTXO)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1 flex items-center justify-between" style={{ color: 'var(--ct-text)' }}>
                <span>Suspect Wallet Address *</span>
                {isAddressTouched && (
                  <span
                    className="text-[10px] flex items-center gap-1 font-mono font-medium"
                    style={{ color: isAddressValid ? 'var(--ct-success-text)' : 'var(--ct-danger-text)' }}
                  >
                    {isAddressValid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Valid {CHAIN_METADATA[targetChain].name}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" /> Invalid Format
                      </>
                    )}
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                placeholder={
                  targetChain === 'tron'
                    ? 'T... (Base58, 34 chars)'
                    : targetChain === 'ethereum'
                    ? '0x... (Hex, 42 chars)'
                    : '1..., 3..., or bc1...'
                }
                value={suspectWallet}
                onChange={(e) => setSuspectWallet(e.target.value)}
                className="ct-input text-xs font-mono"
                style={{
                  borderColor: isAddressTouched
                    ? isAddressValid
                      ? 'var(--ct-success)'
                      : 'var(--ct-danger)'
                    : undefined,
                }}
              />
            </div>
          </div>

          {/* Fraud Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Fraud Category
              </label>
              <select
                value={fraudCategory}
                onChange={(e) => setFraudCategory(e.target.value as FraudCategory)}
                className="ct-input text-xs"
              >
                {FRAUD_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Investigation Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                className="ct-input text-xs font-mono"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          {/* Reported Amount, Currency, and Incident Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Reported Loss
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={reportedAmount}
                onChange={(e) => setReportedAmount(e.target.value)}
                className="ct-input text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Currency Asset
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="ct-input text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
                Incident Date
              </label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="ct-input text-xs font-mono"
              />
            </div>
          </div>

          {/* Initial Tx Hash (Optional) */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
              Initial Transfer Transaction Hash <span style={{ color: 'var(--ct-text-tertiary)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 0x... or 64-char transaction ID"
              value={initialTxHash}
              onChange={(e) => setInitialTxHash(e.target.value)}
              className="ct-input text-xs font-mono"
            />
          </div>

          {/* Narrative / Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
              Investigator Narrative / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Detail complaint allegations, victim statement, or law enforcement intake notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="ct-input text-xs"
              style={{ height: 'auto' }}
            />
          </div>

          {/* Footer buttons */}
          <div
            className="pt-4 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5"
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
              disabled={loading || !isAddressValid || !title.trim()}
              className="ct-btn ct-btn-primary justify-center"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Case Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
