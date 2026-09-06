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
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                Forensic Investigation Reports & Evidentiary Dossiers
              </h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
                Phase 9 Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Court-admissible PDF dossiers compiled with ReportLab and secured with SHA-256 cryptographic chain-of-custody digests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-750 text-slate-300 border border-navy-700 rounded text-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {selectedCaseForReport && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate Dossier
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-navy-900/70 border border-navy-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by report number, case title, or SHA-256 hash..."
              className="w-full bg-navy-950 border border-navy-700 rounded pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400 text-xs">
          <span>
            Total Reports: <strong className="text-slate-200">{reports.length}</strong>
          </span>
          <span>
            Completed: <strong className="text-emerald-400">{reports.filter((r) => r.status === 'COMPLETED').length}</strong>
          </span>
        </div>
      </div>

      {/* Reports Table / List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs bg-navy-900/40 rounded-lg border border-navy-800">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
          Loading generated evidentiary dossiers...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-navy-900/40 border border-navy-800 rounded-lg p-12 text-center">
          <Shield className="w-10 h-10 text-cyan-400/60 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-200 mb-1">No Investigation Reports Generated</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Generate an official court-admissible PDF dossier from the active investigation workspace or click below.
          </p>
          {selectedCaseForReport && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition-colors"
            >
              Generate Dossier for {selectedCaseForReport.caseNumber}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-navy-900/80 border border-navy-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
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
            <tbody className="divide-y divide-navy-800/60">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-navy-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-cyan-400">{report.reportNumber}</div>
                    <div className="text-[11px] text-slate-400">UUID: {report.id.slice(0, 8)}...</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-200 font-medium block">{report.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{report.filename}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-[10px]">
                      v{report.version}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {report.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        COMPLETED
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold text-[11px]">
                        {report.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {report.sha256Hash ? (
                      <div className="flex items-center gap-1.5">
                        <code className="text-[10px] text-slate-400 bg-navy-950 px-1.5 py-0.5 rounded border border-navy-800 font-mono">
                          {report.sha256Hash.slice(0, 10)}...{report.sha256Hash.slice(-6)}
                        </code>
                        <button
                          onClick={() => handleCopyHash(report.sha256Hash!)}
                          className="text-slate-400 hover:text-cyan-400 p-1 rounded"
                          title="Copy full SHA-256 digest"
                        >
                          {copiedHash === report.sha256Hash ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {(report.fileSizeBytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-3 px-4 text-slate-400">
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
                        className="flex items-center gap-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded text-xs transition-colors"
                        title="Download PDF attachment"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                      <button
                        onClick={() => window.open(report.previewUrl, '_blank')}
                        className="flex items-center gap-1 bg-navy-800 hover:bg-navy-750 text-slate-300 border border-navy-700 px-2 py-1 rounded text-xs transition-colors"
                        title="Inline viewer preview"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
