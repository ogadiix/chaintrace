import React from 'react';
import { X, Copy, ExternalLink, ShieldCheck, Target, Building2, AlertOctagon, Check } from 'lucide-react';
import type { GraphCanvasNode } from '@chaintrace/types';

interface WalletDetailModalProps {
  node: GraphCanvasNode | null;
  onClose: () => void;
  onRecenterTrace?: (address: string) => void;
}

export const WalletDetailModal: React.FC<WalletDetailModalProps> = ({
  node,
  onClose,
  onRecenterTrace,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!node) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleBadge = () => {
    switch (node.role) {
      case 'SUSPECT':
        return {
          icon: <Target className="w-5 h-5" style={{ color: 'var(--ct-danger)' }} />,
          bg: 'var(--ct-danger-subtle)',
          badge: <span className="ct-badge ct-badge-danger">{node.role}</span>,
        };
      case 'VICTIM':
        return {
          icon: <ShieldCheck className="w-5 h-5" style={{ color: 'var(--ct-success)' }} />,
          bg: 'var(--ct-success-subtle)',
          badge: <span className="ct-badge ct-badge-success">{node.role}</span>,
        };
      case 'VASP':
        return {
          icon: <Building2 className="w-5 h-5" style={{ color: 'var(--ct-info)' }} />,
          bg: 'var(--ct-info-subtle)',
          badge: <span className="ct-badge ct-badge-info">{node.role}</span>,
        };
      case 'SANCTIONED':
        return {
          icon: <AlertOctagon className="w-5 h-5" style={{ color: 'var(--ct-danger)' }} />,
          bg: 'var(--ct-danger-subtle)',
          badge: <span className="ct-badge ct-badge-danger">{node.role}</span>,
        };
      default:
        return {
          icon: <Target className="w-5 h-5" style={{ color: 'var(--ct-text-secondary)' }} />,
          bg: 'var(--ct-bg-subtle)',
          badge: <span className="ct-badge ct-badge-neutral">{node.role || 'WALLET'}</span>,
        };
    }
  };

  const roleMeta = getRoleBadge();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-xl border p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto space-y-4 shadow-2xl animate-fade-in"
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
              style={{ backgroundColor: roleMeta.bg }}
            >
              {roleMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                  {node.entityName || `${node.role} Wallet Forensics`}
                </h3>
                {roleMeta.badge}
              </div>
              <p className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                Hop Traversal Level: {node.hopLevel}
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

        {/* Address & Copy */}
        <div className="space-y-1.5">
          <label
            className="text-[10px] font-mono font-bold uppercase tracking-wider block"
            style={{ color: 'var(--ct-text-tertiary)' }}
          >
            Blockchain Address
          </label>
          <div
            className="flex items-center justify-between p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <code className="text-xs font-mono break-all select-all font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
              {node.address}
            </code>
            <button
              onClick={() => copyToClipboard(node.address)}
              className="ct-btn-icon ml-2 shrink-0 p-1.5"
              title="Copy Address"
            >
              {copied ? (
                <Check className="w-4 h-4" style={{ color: 'var(--ct-success)' }} />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: 'var(--ct-bg-subtle)',
              borderColor: 'var(--ct-border)',
            }}
          >
            <span className="text-[10px] font-mono uppercase block" style={{ color: 'var(--ct-text-tertiary)' }}>
              Network Chain
            </span>
            <p className="font-semibold uppercase mt-1" style={{ color: 'var(--ct-text)' }}>
              {node.chain}
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
              Attribution Status
            </span>
            <p className="font-semibold mt-1" style={{ color: node.entityName ? 'var(--ct-accent-text)' : 'var(--ct-text-secondary)' }}>
              {node.entityName ? 'Matched Entity' : 'Unlabelled'}
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
              Connected Edges
            </span>
            <p className="font-semibold mt-1" style={{ color: 'var(--ct-text)' }}>
              {node.txCount || 1} Transactions
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
              Provenance
            </span>
            <p className="font-semibold mt-1" style={{ color: node.isDemo ? 'var(--ct-warning-text)' : 'var(--ct-accent-text)' }}>
              {node.isDemo ? 'Demo Scenario' : 'Graph Adapter'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t"
          style={{ borderColor: 'var(--ct-border)' }}
        >
          <button
            onClick={onClose}
            className="ct-btn ct-btn-secondary ct-btn-sm justify-center"
          >
            Close
          </button>
          {onRecenterTrace && (
            <button
              onClick={() => {
                onRecenterTrace(node.address);
                onClose();
              }}
              className="ct-btn ct-btn-primary ct-btn-sm inline-flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Re-center Trace on Wallet</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
