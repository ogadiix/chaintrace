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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="bg-navy-900 border border-navy-700 rounded-lg p-5 max-w-lg w-full font-mono space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase">
                Transaction Evidence Detail
              </h3>
              <p className="text-[11px] text-slate-400">Hop #{edge.hopNumber} Flow Edge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-navy-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tx Hash */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider">Transaction Hash</label>
          <div className="flex items-center justify-between bg-navy-950 p-2.5 rounded border border-navy-800">
            <code className="text-xs text-cyan-300 break-all select-all">{edge.txHash}</code>
            <button
              onClick={() => copyToClipboard(edge.txHash)}
              className="ml-2 p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-navy-900 rounded shrink-0 transition-colors"
              title="Copy Transaction Hash"
            >
              {copiedHash ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sender & Recipient */}
        <div className="bg-navy-950/70 p-3 rounded border border-navy-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase">From (Sender):</span>
            <code className="text-slate-200 truncate max-w-[280px]">{edge.source}</code>
          </div>
          <div className="flex justify-center my-0.5">
            <ArrowRight className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase">To (Recipient):</span>
            <code className="text-slate-200 truncate max-w-[280px]">{edge.target}</code>
          </div>
        </div>

        {/* Financial & Time Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-navy-950/60 p-2.5 rounded border border-navy-800/80">
            <span className="text-[10px] text-slate-400 uppercase">Transfer Amount</span>
            <p className="text-emerald-400 font-bold text-sm mt-0.5">
              {edge.amount} {edge.asset}
            </p>
          </div>
          <div className="bg-navy-950/60 p-2.5 rounded border border-navy-800/80">
            <span className="text-[10px] text-slate-400 uppercase">Blockchain</span>
            <p className="text-slate-200 font-bold uppercase mt-0.5">{edge.chain}</p>
          </div>
          <div className="bg-navy-950/60 p-2.5 rounded border border-navy-800/80 col-span-2">
            <span className="text-[10px] text-slate-400 uppercase">Timestamp (UTC)</span>
            <p className="text-slate-300 font-mono mt-0.5">{edge.timestamp}</p>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-navy-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-navy-800 hover:bg-navy-700 text-slate-200 rounded font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
