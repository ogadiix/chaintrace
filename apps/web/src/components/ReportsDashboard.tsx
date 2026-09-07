import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  Shield,
  RefreshCw,
  Search,
  Plus,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';
import type { Case, InvestigationReport } from '@chaintrace/types';
import { ReportGenerationModal } from './ReportGenerationModal';

interface ReportsDashboardProps {
  cases: Case[];
  activeCase: Case | null;
  authToken: string;
  onSelectCase?: (c: Case) => void;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  cases,
  activeCase,
  authToken,
  onSelectCase: _onSelectCase,
}) => {
  const [reports, setReports] = useState<InvestigationReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCaseForReport, setSelectedCaseForReport] = useState<Case | null>(activeCase);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/reports', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [authToken]);

  useEffect(() => {
    if (activeCase) {
      setSelectedCaseForReport(activeCase);
    } else if (cases.length > 0) {
      setSelectedCaseForReport(cases[0]);
    }
  }, [activeCase, cases]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredReports = reports.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      r.reportNumber.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      (r.sha256Hash && r.sha256Hash.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Top Header Card */}
      <div
        className="p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition-colors"
        style={{
          backgroundColor: 'var(--ct-surface)',
          borderColor: 'var(--ct-border)',
          boxShadow: 'var(--ct-shadow-sm)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--ct-accent-subtle)' }}
          >
            <FileText className="w-5 h-5" style={{ color: 'var(--ct-accent)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold" style={{ color: 'var(--ct-text)' }}>
                Forensic Investigation Reports & Evidentiary Dossiers
              </h2>
              <span className="ct-badge ct-badge-info text-[10px]">
                Admissible PDF
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ct-text-secondary)' }}>
              Court-admissible PDF dossiers compiled with cryptographic SHA-256 chain-of-custody digests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="ct-btn ct-btn-secondary ct-btn-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {selectedCaseForReport && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="ct-btn ct-btn-primary ct-btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Dossier</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: 'var(--ct-surface)',
          borderColor: 'var(--ct-border)',
        }}
      >
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5" style={{ color: 'var(--ct-text-tertiary)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by report number, case title, or SHA-256 hash..."
              className="ct-input pl-9 text-xs"
              style={{ height: '32px' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--ct-text-secondary)' }}>
          <span>
            Total Reports: <strong style={{ color: 'var(--ct-text)' }}>{reports.length}</strong>
          </span>
          <span>
            Completed: <strong style={{ color: 'var(--ct-success-text)' }}>{reports.filter((r) => r.status === 'COMPLETED').length}</strong>
          </span>
        </div>
      </div>

      {/* Reports Table / List */}
      {loading ? (
        <div
          className="p-12 text-center text-xs rounded-xl border"
          style={{
            backgroundColor: 'var(--ct-surface)',
            borderColor: 'var(--ct-border)',
          }}
        >
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" style={{ color: 'var(--ct-accent)' }} />
          <span style={{ color: 'var(--ct-text-secondary)' }}>Loading generated evidentiary dossiers...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            backgroundColor: 'var(--ct-surface)',
            borderColor: 'var(--ct-border)',
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--ct-accent-subtle)' }}
          >
            <Shield className="w-6 h-6" style={{ color: 'var(--ct-accent)' }} />
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--ct-text)' }}>
            No Investigation Reports Generated
          </h3>
          <p className="text-xs max-w-md mx-auto mb-4" style={{ color: 'var(--ct-text-secondary)' }}>
            Generate an official court-admissible PDF dossier with forensic provenance directly from the investigation workspace.
          </p>
          {selectedCaseForReport && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="ct-btn ct-btn-primary ct-btn-sm"
            >
              Generate Dossier for {selectedCaseForReport.caseNumber}
            </button>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden transition-colors"
          style={{
            backgroundColor: 'var(--ct-surface)',
            borderColor: 'var(--ct-border)',
            boxShadow: 'var(--ct-shadow-sm)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className="text-[11px] font-semibold uppercase tracking-wider border-b"
                style={{
                  backgroundColor: 'var(--ct-bg-subtle)',
                  borderColor: 'var(--ct-border)',
                  color: 'var(--ct-text-secondary)',
                }}
              >
                <tr>
                  <th className="py-3 px-4">Dossier / Case</th>
                  <th className="py-3 px-4">Report Title</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cryptographic Digest</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Generated (UTC)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--ct-border-subtle)' }}>
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="transition-colors hover:opacity-90"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold" style={{ color: 'var(--ct-accent-text)' }}>
                        {report.reportNumber}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                        UUID: {report.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold block" style={{ color: 'var(--ct-text)' }}>
                        {report.title}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--ct-text-tertiary)' }}>
                        {report.filename}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="ct-badge ct-badge-info text-[10px] font-mono">
                        v{report.version}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {report.status === 'COMPLETED' ? (
                        <span className="ct-badge ct-badge-success text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          COMPLETED
                        </span>
                      ) : (
                        <span className="ct-badge ct-badge-warning text-[10px]">
                          {report.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {report.sha256Hash ? (
                        <div className="flex items-center gap-1.5">
                          <code
                            className="text-[10px] px-1.5 py-0.5 rounded border font-mono"
                            style={{
                              backgroundColor: 'var(--ct-bg-subtle)',
                              borderColor: 'var(--ct-border)',
                              color: 'var(--ct-text-secondary)',
                            }}
                          >
                            {report.sha256Hash.slice(0, 10)}...{report.sha256Hash.slice(-6)}
                          </code>
                          <button
                            onClick={() => handleCopyHash(report.sha256Hash!)}
                            className="ct-btn-icon p-1"
                            title="Copy full SHA-256 digest"
                          >
                            {copiedHash === report.sha256Hash ? (
                              <Check className="w-3 h-3" style={{ color: 'var(--ct-success)' }} />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ct-text-tertiary)' }}>N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]" style={{ color: 'var(--ct-text-secondary)' }}>
                      {(report.fileSizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--ct-text-tertiary)' }}>
                      {new Date(report.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => window.open(report.downloadUrl, '_blank')}
                          className="ct-btn ct-btn-secondary ct-btn-sm inline-flex items-center gap-1 text-xs"
                          title="Download PDF dossier"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => window.open(report.previewUrl, '_blank')}
                          className="ct-btn-icon p-1.5 border"
                          style={{ borderColor: 'var(--ct-border)' }}
                          title="Inline viewer preview"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Report Generation */}
      {selectedCaseForReport && (
        <ReportGenerationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          activeCase={selectedCaseForReport}
          authToken={authToken}
          onReportGenerated={(newRep) => {
            setReports((prev) => [newRep, ...prev]);
          }}
        />
      )}
    </div>
  );
};
