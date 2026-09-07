import React from 'react';
import { X, Copy, ArrowRight, Check, Hash } from 'lucide-react';
import type { GraphCanvasEdge } from '@chaintrace/types';

interface TransactionDetailModalProps {
  edge: GraphCanvasEdge | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ edge, onClose }) => {
  const [copiedHash, setCopiedHash] = React.useState(false);

  if (!edge) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-xl border p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in"
        style={{
          backgroundColor: 'var(--ct-surface)',
          borderColor: 'var(--ct-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b pb-4"
          style={{ borderColor: 'var(--ct-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--ct-accent-subtle)' }}
            >
              <Hash className="w-5 h-5" style={{ color: 'var(--ct-accent)' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                  Transaction Evidence Detail
                </h3>
                <span className="ct-badge ct-badge-info text-[10px] font-mono">
                  Hop #{edge.hopNumber}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                Directed fund flow transfer edge
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

        {/* Tx Hash */}
        <div className="space-y-1.5">
          <label
            className="text-[10px] font-mono font-bold uppercase tracking-wider block"
            style={{ color: 'var(--ct-text-tertiary)' }}
          >
            Transaction Hash
          </label>
          <div
            className="flex items-center justify-between p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <code className="text-xs font-mono break-all select-all font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
              {edge.txHash}
            </code>
            <button
              onClick={() => copyToClipboard(edge.txHash)}
              className="ct-btn-icon ml-2 shrink-0 p-1.5"
              title="Copy Transaction Hash"
            >
              {copiedHash ? (
                <Check className="w-4 h-4" style={{ color: 'var(--ct-success)' }} />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Sender & Recipient */}
        <div
          className="p-3.5 rounded-lg border space-y-2 text-xs"
          style={{
            backgroundColor: 'var(--ct-bg-subtle)',
            borderColor: 'var(--ct-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--ct-text-tertiary)' }}>
              From (Sender):
            </span>
            <code className="font-mono text-[11px] truncate max-w-[280px]" style={{ color: 'var(--ct-text)' }}>
              {edge.source}
            </code>
          </div>
          <div className="flex justify-center my-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--ct-surface)', border: '1px solid var(--ct-border)' }}
            >
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--ct-accent)' }} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--ct-text-tertiary)' }}>
              To (Recipient):
            </span>
            <code className="font-mono text-[11px] truncate max-w-[280px]" style={{ color: 'var(--ct-text)' }}>
              {edge.target}
            </code>
          </div>
        </div>

        {/* Financial & Time Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <span className="text-[10px] font-mono uppercase block" style={{ color: 'var(--ct-text-tertiary)' }}>
              Transfer Amount
            </span>
            <p className="font-mono font-bold text-sm mt-1" style={{ color: 'var(--ct-success-text)' }}>
              {edge.amount} {edge.asset}
            </p>
          </div>
          <div
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <span className="text-[10px] font-mono uppercase block" style={{ color: 'var(--ct-text-tertiary)' }}>
              Blockchain
            </span>
            <p className="font-semibold uppercase mt-1" style={{ color: 'var(--ct-text)' }}>
              {edge.chain}
            </p>
          </div>
          <div
            className="p-3 rounded-lg border col-span-2"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <span className="text-[10px] font-mono uppercase block" style={{ color: 'var(--ct-text-tertiary)' }}>
              Timestamp (UTC)
            </span>
            <p className="font-mono text-xs mt-1" style={{ color: 'var(--ct-text-secondary)' }}>
              {edge.timestamp}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div
          className="flex justify-end pt-3 border-t"
          style={{ borderColor: 'var(--ct-border)' }}
        >
          <button
            onClick={onClose}
            className="ct-btn ct-btn-secondary ct-btn-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
