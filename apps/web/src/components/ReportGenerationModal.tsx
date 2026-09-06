import React, { useState } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  FileCheck,
  Hash,
} from 'lucide-react';
import type { Case, InvestigationReport } from '@chaintrace/types';

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: Case;
  authToken: string;
  onReportGenerated?: (report: InvestigationReport) => void;
}

export const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({
  isOpen,
  onClose,
  activeCase,
  authToken,
  onReportGenerated,
}) => {
  const [title, setTitle] = useState('');
  const [includeAppendix, setIncludeAppendix] = useState(true);
  const [maxTxs, setMaxTxs] = useState(50);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<InvestigationReport | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: title.trim() || undefined,
        include_tx_appendix: includeAppendix,
        max_appendix_txs: maxTxs,
        notes: notes.trim() || undefined,
      };

      const res = await fetch(`/api/v1/investigations/${activeCase.id}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to generate investigation report');
      }

      const report: InvestigationReport = await res.json();
      setGeneratedReport(report);
      onReportGenerated?.(report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedReport) return;
    window.open(generatedReport.downloadUrl, '_blank');
  };

  const handlePreview = () => {
    if (!generatedReport) return;
    window.open(generatedReport.previewUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-navy-900 border border-navy-700/80 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-navy-950 px-6 py-4 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Generate Evidentiary Report
              </h3>
              <p className="text-[11px] text-slate-400">
                Case: <span className="font-mono text-cyan-400">{activeCase.caseNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-800/80 rounded-lg flex items-start gap-2 text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {generatedReport ? (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-300">
                    Evidentiary Dossier Successfully Generated
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Compiled complete multi-hop trace, heuristic rule findings, VASP attributions,
                    and bounded risk assessment.
                  </p>
                </div>
              </div>

              <div className="bg-navy-950 rounded-lg p-3 border border-navy-800 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-navy-900">
                  <span className="text-slate-400">Report Dossier No:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {generatedReport.reportNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-navy-900">
                  <span className="text-slate-400">Version:</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 text-[10px]">
                    v{generatedReport.version}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-navy-900">
                  <span className="text-slate-400">File Size:</span>
                  <span className="text-slate-300">
                    {(generatedReport.fileSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="py-1">
                  <span className="text-slate-400 block mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-cyan-400" />
                    Cryptographic SHA-256 Digest:
                  </span>
                  <code className="text-[10px] text-cyan-300 bg-navy-900 px-2 py-1 rounded block truncate font-mono border border-navy-800">
                    {generatedReport.sha256Hash || 'N/A'}
                  </code>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2.5 px-4 rounded text-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Dossier
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  className="flex items-center gap-1.5 bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 py-2.5 px-4 rounded text-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Inline Preview
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">Custom Report Title (Optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Investigation Dossier: ${activeCase.title}`}
                  className="w-full bg-navy-950 border border-navy-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-navy-950 p-3 rounded border border-navy-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={includeAppendix}
                      onChange={(e) => setIncludeAppendix(e.target.checked)}
                      className="rounded border-navy-700 bg-navy-900 text-cyan-500 focus:ring-0"
                    />
                    <span>Include Tx Appendix</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Appends chronological table of traced transactions to the report.
                  </p>
                </div>

                <div className="bg-navy-950 p-3 rounded border border-navy-800 space-y-2">
                  <label className="text-slate-300 font-medium block">Max Appendix Txs</label>
                  <select
                    value={maxTxs}
                    disabled={!includeAppendix}
                    onChange={(e) => setMaxTxs(Number(e.target.value))}
                    className="w-full bg-navy-900 border border-navy-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                  >
                    <option value={25}>25 Transactions</option>
                    <option value={50}>50 Transactions</option>
                    <option value={100}>100 Transactions</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">Investigator Remarks / Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add confidential investigative context or statutory filing references..."
                  className="w-full bg-navy-950 border border-navy-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="bg-navy-950 p-3 rounded border border-navy-800 flex items-center gap-2 text-[11px] text-slate-400">
                <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>
                  Generates an immutable ReportLab PDF with SHA-256 chain-of-custody verification.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-navy-800 hover:bg-navy-750 text-slate-300 rounded text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded text-xs transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Compiling Dossier...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      Generate Dossier
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
