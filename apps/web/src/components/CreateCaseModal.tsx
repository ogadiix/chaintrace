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
    <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-navy-900 border border-navy-700/80 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-navy-700/80 flex items-center justify-between bg-navy-950/40">
          <div className="flex items-center gap-2 text-cyan-400">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-100">Intake New Investigation Case</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Case Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Operation Titan: Fake Tether Arbitrage Scam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                External Complaint ID <span className="text-slate-500 font-normal">(NCRP)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. NCRP-2026-09871"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Blockchain & Suspect Wallet */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Blockchain Target *
              </label>
              <select
                value={targetChain}
                onChange={(e) => setTargetChain(e.target.value as BlockchainType)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="tron">TRON (TRX / USDT-TRC20)</option>
                <option value="ethereum">Ethereum (ETH / ERC-20)</option>
                <option value="bitcoin">Bitcoin (BTC / UTXO)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Suspect Wallet Address *</span>
                {isAddressTouched && (
                  <span className={`text-[10px] flex items-center gap-1 font-mono ${isAddressValid ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                className={`w-full bg-navy-950 border rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none transition-colors ${
                  isAddressTouched
                    ? isAddressValid
                      ? 'border-emerald-500/60 focus:border-emerald-500'
                      : 'border-rose-500/60 focus:border-rose-500'
                    : 'border-navy-700 focus:border-cyan-500'
                }`}
              />
            </div>
          </div>

          {/* Fraud Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Fraud Category
              </label>
              <select
                value={fraudCategory}
                onChange={(e) => setFraudCategory(e.target.value as FraudCategory)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {FRAUD_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Investigation Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
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
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Reported Loss
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={reportedAmount}
                onChange={(e) => setReportedAmount(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Currency Asset
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Incident Date
              </label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Initial Tx Hash (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Initial Transfer Transaction Hash <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 0x... or 64-char transaction ID"
              value={initialTxHash}
              onChange={(e) => setInitialTxHash(e.target.value)}
              className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Investigator Narrative / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Detail the complaint allegations, victim statement, or law enforcement handover notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-navy-700/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isAddressValid || !title.trim()}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-lg shadow-cyan-900/30"
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
