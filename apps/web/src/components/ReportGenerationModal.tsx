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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-xl border max-w-lg w-full shadow-2xl overflow-hidden animate-fade-in transition-all"
        style={{
          backgroundColor: 'var(--ct-surface)',
          borderColor: 'var(--ct-border)',
        }}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
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
              <FileText className="w-4 h-4" style={{ color: 'var(--ct-accent)' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ct-text)' }}>
                Generate Evidentiary Report
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                Case: <span className="font-mono font-medium" style={{ color: 'var(--ct-accent-text)' }}>{activeCase.caseNumber}</span>
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

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div
              className="mb-4 p-3 rounded-lg border text-xs flex items-center gap-2"
              style={{
                backgroundColor: 'var(--ct-danger-subtle)',
                borderColor: 'var(--ct-danger)',
                color: 'var(--ct-danger-text)',
              }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {generatedReport ? (
            <div className="space-y-4">
              <div
                className="p-4 rounded-xl border flex items-start gap-3"
                style={{
                  backgroundColor: 'var(--ct-success-subtle)',
                  borderColor: 'var(--ct-success)',
                }}
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--ct-success)' }} />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold" style={{ color: 'var(--ct-success-text)' }}>
                    Evidentiary Dossier Successfully Generated
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                    Compiled complete multi-hop trace, heuristic rule findings, VASP attributions,
                    and bounded risk assessment into a certified package.
                  </p>
                </div>
              </div>

              <div
                className="rounded-xl p-4 border space-y-2.5 text-xs"
                style={{
                  backgroundColor: 'var(--ct-bg-subtle)',
                  borderColor: 'var(--ct-border)',
                }}
              >
                <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                  <span style={{ color: 'var(--ct-text-tertiary)' }}>Report Dossier No:</span>
                  <span className="font-mono font-bold" style={{ color: 'var(--ct-text)' }}>
                    {generatedReport.reportNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                  <span style={{ color: 'var(--ct-text-tertiary)' }}>Version:</span>
                  <span className="ct-badge ct-badge-info text-[10px] font-mono">
                    v{generatedReport.version}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                  <span style={{ color: 'var(--ct-text-tertiary)' }}>File Size:</span>
                  <span className="font-mono" style={{ color: 'var(--ct-text)' }}>
                    {(generatedReport.fileSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="py-1">
                  <span className="block mb-1.5 flex items-center gap-1 text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                    <Hash className="w-3 h-3" style={{ color: 'var(--ct-accent)' }} />
                    Cryptographic SHA-256 Digest:
                  </span>
                  <code
                    className="text-[10px] p-2 rounded block truncate font-mono border"
                    style={{
                      backgroundColor: 'var(--ct-surface)',
                      borderColor: 'var(--ct-border)',
                      color: 'var(--ct-accent-text)',
                    }}
                  >
                    {generatedReport.sha256Hash || 'N/A'}
                  </code>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="ct-btn ct-btn-primary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  className="ct-btn ct-btn-secondary inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inline Preview</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold block" style={{ color: 'var(--ct-text)' }}>
                  Custom Report Title <span style={{ color: 'var(--ct-text-tertiary)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Investigation Dossier: ${activeCase.title}`}
                  className="ct-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="p-3 rounded-lg border space-y-1.5"
                  style={{
                    backgroundColor: 'var(--ct-bg-subtle)',
                    borderColor: 'var(--ct-border)',
                  }}
                >
                  <label className="flex items-center gap-2 cursor-pointer font-medium" style={{ color: 'var(--ct-text)' }}>
                    <input
                      type="checkbox"
                      checked={includeAppendix}
                      onChange={(e) => setIncludeAppendix(e.target.checked)}
                      className="rounded"
                    />
                    <span>Include Tx Appendix</span>
                  </label>
                  <p className="text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                    Appends chronological table of traced transactions.
                  </p>
                </div>

                <div
                  className="p-3 rounded-lg border space-y-1.5"
                  style={{
                    backgroundColor: 'var(--ct-bg-subtle)',
                    borderColor: 'var(--ct-border)',
                  }}
                >
                  <label className="font-medium block" style={{ color: 'var(--ct-text)' }}>Max Appendix Txs</label>
                  <select
                    value={maxTxs}
                    disabled={!includeAppendix}
                    onChange={(e) => setMaxTxs(Number(e.target.value))}
                    className="ct-input text-xs"
                    style={{ height: '32px' }}
                  >
                    <option value={25}>25 Transactions</option>
                    <option value={50}>50 Transactions</option>
                    <option value={100}>100 Transactions</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block" style={{ color: 'var(--ct-text)' }}>Investigator Remarks / Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add confidential investigative context or statutory filing references..."
                  className="ct-input text-xs"
                  style={{ height: 'auto' }}
                />
              </div>

              <div
                className="p-3 rounded-lg border flex items-center gap-2 text-[11px]"
                style={{
                  backgroundColor: 'var(--ct-accent-subtle)',
                  borderColor: 'var(--ct-border-subtle)',
                  color: 'var(--ct-accent-text)',
                }}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>
                  Generates an immutable ReportLab PDF with SHA-256 chain-of-custody verification.
                </span>
              </div>

              <div
                className="flex items-center justify-end gap-2.5 pt-3 border-t"
                style={{ borderColor: 'var(--ct-border)' }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="ct-btn ct-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ct-btn ct-btn-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Compiling Dossier...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Generate Dossier</span>
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
