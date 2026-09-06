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

  const getRoleIcon = () => {
    switch (node.role) {
      case 'SUSPECT':
        return <Target className="w-5 h-5 text-rose-400" />;
      case 'VICTIM':
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'VASP':
        return <Building2 className="w-5 h-5 text-cyan-400" />;
      case 'SANCTIONED':
        return <AlertOctagon className="w-5 h-5 text-red-400" />;
      default:
        return <Target className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="bg-navy-900 border border-navy-700 rounded-lg p-5 max-w-lg w-full font-mono space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div className="flex items-center gap-2.5">
            {getRoleIcon()}
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase">
                {node.entityName || `${node.role} WALLET FORENSICS`}
              </h3>
              <p className="text-[11px] text-slate-400">Hop Level: {node.hopLevel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-navy-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Address & Copy */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Blockchain Address</label>
          <div className="flex items-center justify-between bg-navy-950 p-2.5 rounded border border-navy-800">
            <code className="text-xs text-cyan-300 break-all select-all">{node.address}</code>
            <button
              onClick={() => copyToClipboard(node.address)}
              className="ml-2 p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-navy-900 rounded shrink-0 transition-colors"
              title="Copy Address"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-navy-950/60 p-2.5 rounded border border-navy-800/80">
            <span className="text-[10px] text-slate-400 uppercase">Network Chain</span>
            <p className="text-slate-200 font-bold uppercase mt-0.5">{node.chain}</p>
          </div>
          <div className="bg-navy-950/60 p-2.5 rounded border border-navy-800/80">
            <span className="text-[10px] text-slate-400 uppercase">Attribution Status</span>
            <p className={`font-bold mt-0.5 ${node.entityName ? 'text-cyan-400' : 'text-slate-400'}`}>
              {node.entityName ? 'MATCHED ENTITY' : 'UNLABELLED'}
            </p>
          </div>
          <div className="bg-navy-950/60 p-2.5 rounded border border-navy-800/80">
            <span className="text-[10px] text-slate-400 uppercase">Connected Edges</span>
            <p className="text-slate-200 font-bold mt-0.5">{node.txCount || 1} Transactions</p>
          </div>
          <div className="bg-navy-950/60 p-2.5 rounded border border-navy-800/80">
            <span className="text-[10px] text-slate-400 uppercase">Provenance</span>
            <p className="text-amber-400 font-bold mt-0.5">{node.isDemo ? '[DEMO SCENARIO]' : 'GRAPH ADAPTER'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-navy-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            Close
          </button>
          {onRecenterTrace && (
            <button
              onClick={() => {
                onRecenterTrace(node.address);
                onClose();
              }}
              className="px-3.5 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded flex items-center gap-1.5 transition-colors shadow-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Re-center Trace on Wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
