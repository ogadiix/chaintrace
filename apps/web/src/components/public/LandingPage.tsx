import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  GitFork,
  Cpu,
  Building2,
  FileCheck2,
  Lock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Globe2,
  Activity,
  Award,
  AlertOctagon,
  X,
  Send,
  Menu,
} from 'lucide-react';
import { navigate } from '../../router';

export const LandingPage: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubmitted, setModalSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    officialEmail: '',
    agencyName: '',
    agencyType: 'LAW_ENFORCEMENT',
    jurisdiction: '',
    badgeId: '',
    purpose: '',
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setModalSubmitted(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Background Subtle Gradient & Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(255,255,255,0))] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0b1120_1px,transparent_1px),linear-gradient(to_bottom,#0b1120_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      {/* Top Enterprise Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#050811]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-wider text-base text-slate-100 font-mono">CHAINTRACE</span>
              <span className="ml-2 text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
                FORENSICS PLATFORM
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#capabilities" className="hover:text-cyan-400 transition-colors">
              Capabilities
            </a>
            <a href="#workflow" className="hover:text-cyan-400 transition-colors">
              Investigation Lifecycle
            </a>
            <a href="#preview" className="hover:text-cyan-400 transition-colors">
              Graph Workspace
            </a>
            <a href="#compliance" className="hover:text-cyan-400 transition-colors">
              Statutory Compliance
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 bg-slate-900/50 transition-all"
            >
              Sign In
            </button>
            <button
              onClick={handleOpenModal}
              className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-900/30 transition-all flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Request Agency Access</span>
              <span className="sm:hidden">Clearance</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#050811]/98 backdrop-blur-xl px-4 py-5 space-y-4 animate-fadeIn">
            <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
              <a
                href="#capabilities"
                onClick={() => setMobileNavOpen(false)}
                className="hover:text-cyan-400 py-1 transition-colors"
              >
                Capabilities
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileNavOpen(false)}
                className="hover:text-cyan-400 py-1 transition-colors"
              >
                Investigation Lifecycle
              </a>
              <a
                href="#preview"
                onClick={() => setMobileNavOpen(false)}
                className="hover:text-cyan-400 py-1 transition-colors"
              >
                Graph Workspace
              </a>
              <a
                href="#compliance"
                onClick={() => setMobileNavOpen(false)}
                className="hover:text-cyan-400 py-1 transition-colors"
              >
                Statutory Compliance
              </a>
            </nav>
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/login');
                }}
                className="w-full py-2.5 rounded-lg text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900"
              >
                Officer Portal Sign In
              </button>
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  handleOpenModal();
                }}
                className="w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-cyan-600"
              >
                Request Agency Clearance
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-mono mb-8 tracking-wide">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>NATIONAL BLOCKCHAIN CRIME ATTRIBUTION & SEIZURE PLATFORM</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight max-w-4xl mx-auto">
            Deterministic Blockchain Forensics for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              Law Enforcement & FIUs
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            De-anonymize complex multi-hop crypto laundering, map mule distribution rings across Tron & Ethereum,
            attribute illicit wallets to VASPs, and automatically generate Section 91 CrPC freeze requisitions.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-base text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-xl shadow-cyan-900/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Request Clearance / Pilot</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-base text-slate-300 hover:text-white border border-slate-700 bg-slate-900/80 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Officer Portal Login</span>
            </button>
          </div>

          {/* Trust / Metric Banner */}
          <div className="mt-16 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="text-2xl font-extrabold text-cyan-400 font-mono">100%</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">Deterministic Evidence</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Court-admissible cryptographic audit logs</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="text-2xl font-extrabold text-blue-400 font-mono">&lt; 350ms</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">Hop Traversal</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Multi-hop recursive graph query engine</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">Sec. 91</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">CrPC & BNSS Aligned</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Automated exchange freeze notices</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="text-2xl font-extrabold text-purple-400 font-mono">NCRP / FIU</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">Direct Ingestion</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Bilateral cybercrime portal integration</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Workspace Preview Section */}
      <section id="preview" className="py-16 bg-[#070c18] border-y border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
              Live Investigation Workspace
            </span>
            <h2 className="text-3xl font-bold text-white mt-2">
              From Victim Transaction to Exchange Freeze in One Screen
            </h2>
            <p className="text-slate-400 mt-3 text-sm">
              Unified canvas showing recursive fund tracing, ML risk scoring, identified mule clusters, and real-time VASP counterparty attribution.
            </p>
          </div>

          {/* Interactive Mockup Graphic */}
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/90 shadow-2xl shadow-cyan-950/20 overflow-hidden">
            {/* Fake Window Header */}
            <div className="h-10 bg-slate-900 px-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-slate-400">
                  CASE-2026-NCRP-89421 / Operation CryptoShield (USDT Tron TR7NHq...Lj6t)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 text-rose-400 border border-rose-800/60 font-semibold">
                  HIGH RISK (SCORE: 89/100)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  6 HOPS DEEP
                </span>
              </div>
            </div>

            {/* Diagram Content */}
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#040711]">
              {/* Left Graph Visualization Preview */}
              <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-950/80 p-6 flex flex-col justify-between min-h-[360px] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <GitFork className="w-4 h-4" /> Fund Flow Graph (Deterministic DAG)
                  </span>
                  <span>Filtered: &gt; 5,000 USDT</span>
                </div>

                {/* Simulated Graph Nodes & Connections with Horizontal Scroll on Mobile */}
                <div className="overflow-x-auto pb-3 my-4 -mx-2 px-2">
                  <div className="relative flex items-center justify-between gap-4 py-8 min-w-[560px]">
                    {/* Victim Node */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-14 h-14 rounded-xl border-2 border-emerald-500/80 bg-emerald-950/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
                        <div className="text-center font-mono">
                          <div className="text-[10px] font-bold">VICTIM</div>
                          <div className="text-[8px] opacity-75">T9zP...8x</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1.5">100,000 USDT</span>
                    </div>

                    <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-500 to-amber-500 relative">
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-amber-400">
                        Hop 1
                      </span>
                    </div>

                    {/* Primary Mule Node */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-14 h-14 rounded-xl border-2 border-amber-500/80 bg-amber-950/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/50">
                        <div className="text-center font-mono">
                          <div className="text-[10px] font-bold">MULE 1</div>
                          <div className="text-[8px] opacity-75">TLj6...4p</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 mt-1.5">Layered Mule</span>
                    </div>

                    <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-500 to-rose-500 relative">
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-rose-400">
                        Mixer Split
                      </span>
                    </div>

                    {/* Mixer / High Risk Node */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-14 h-14 rounded-xl border-2 border-rose-500/80 bg-rose-950/50 flex items-center justify-center text-rose-400 animate-pulse shadow-lg shadow-rose-950/50">
                        <div className="text-center font-mono">
                          <div className="text-[10px] font-bold">MIXER</div>
                          <div className="text-[8px] opacity-75">High Risk</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-rose-400 mt-1.5">Sanctioned</span>
                    </div>

                    <div className="h-0.5 flex-1 bg-gradient-to-r from-rose-500 to-cyan-500 relative">
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400">
                        Exit Hop
                      </span>
                    </div>

                    {/* VASP Destination Node */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-14 h-14 rounded-xl border-2 border-cyan-400 bg-cyan-950/60 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-950/60">
                        <div className="text-center font-mono">
                          <div className="text-[10px] font-bold">BINANCE</div>
                          <div className="text-[8px] opacity-75">Identified</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300 mt-1.5 font-bold">Freezable Deposit</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono border-t border-slate-800/80 pt-3 text-slate-400">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Victim Origin
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Layering Cluster
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Illicit Service
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" /> Attributed Exchange
                    </span>
                  </div>
                  <span className="text-cyan-400 font-semibold">1-Click Freeze Action Ready</span>
                </div>
              </div>

              {/* Right Side Intelligence & Attribution Summary */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" /> VASP Attribution
                  </div>
                  <div className="text-sm font-semibold text-white">Binance Hot Wallet Cluster</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">Cluster Confidence: 99.4%</div>
                  <div className="mt-3 p-2.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
                    <div className="text-slate-400 text-[11px]">Deposit Address:</div>
                    <div className="text-cyan-400 font-bold truncate">TXd7Q9...99a12V</div>
                    <div className="text-slate-300 mt-1">Stolen Inflow: 48,250 USDT</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" /> Statutory Requisition
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed">
                    Section 91 CrPC requisition auto-drafted. Ready for LEA digital signature and direct transmission to Binance Compliance Desk.
                  </div>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full mt-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Launch Investigation Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section id="capabilities" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            Forensic Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
            Engineered for Modern Cybercrime Enforcement
          </h2>
          <p className="text-slate-400 mt-3 text-base">
            ChainTrace solves the four bottlenecks of digital asset investigation: speed of traversal, false positive
            mule filtering, exchange attribution latency, and court admissibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
              <GitFork className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Deterministic Multi-Hop Graph Traversal</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cypher graph queries running over Neo4j trace fund flows across up to 10 hops in under 400 milliseconds,
              preserving exact cryptographic lineage without probabilistic guesswork.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-blue-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Automated Heuristic & ML Risk Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Detects peeling chains, tumbler interactions, smart contract wash trades, and mule ring dispersion patterns.
              Outputs explainable risk score breakdowns with override audits.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">National Agency Gateways (NCRP & SAHYOG)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Direct ingestion bridge for National Cyber Crime Reporting Portal (NCRP) complaints. Bilateral integration
              with SAHYOG for exchange coordination and victim record synchronization.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-purple-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-110 transition-transform">
              <ExternalLink className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Exchange Counterparty Attribution</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Instantly distinguishes intermediate transit addresses from VASP hot wallets, identifying exactly which
              regulated exchange received the terminal laundered funds.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Statutory Emergency Freezes</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Generate ready-to-issue Section 91 CrPC and BNSS formal requisition notices with pre-filled transaction
              hashes, timestamped hops, and receiving exchange compliance details.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-rose-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-5 group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Tamper-Evident Court Dossiers</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Export high-resolution forensic investigation dossiers with SHA-256 digital signatures, chain of custody logs,
              and examiner certification ready for judicial presentation.
            </p>
          </div>
        </div>
      </section>

      {/* 6-Stage Investigation Lifecycle */}
      <section id="workflow" className="py-20 bg-[#070c18] border-y border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
              Operational Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              The 6-Stage Forensic Lifecycle
            </h2>
            <p className="text-slate-400 mt-3 text-base">
              Standardized investigation methodology ensuring reproducible evidence from initial complaint to asset freeze.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Complaint Ingestion & Intake',
                desc: 'Intake victim report from NCRP, exchange notice, or manual entry. Target chain and suspect wallet indexed.',
              },
              {
                step: '02',
                title: 'Recursive Graph Construction',
                desc: 'Neo4j traversal reconstructs directional fund transfer DAG, mapping intermediary mule wallets and volume splits.',
              },
              {
                step: '03',
                title: 'Automated Risk & Heuristic Scoring',
                desc: 'Multi-factor ML models score transaction speed, dispersion velocity, sanctioned entity proximity, and wash patterns.',
              },
              {
                step: '04',
                title: 'VASP Identification & Profiling',
                desc: 'Deposit clustering identifies licensed VASPs holding laundered balances, resolving exchange jurisdiction.',
              },
              {
                step: '05',
                title: 'Emergency Freeze Requisition',
                desc: 'Automated compilation of CrPC Section 91 statutory freeze orders dispatched via secure agency gateway.',
              },
              {
                step: '06',
                title: 'Court-Admissible Evidence Export',
                desc: 'Tamper-evident forensic PDF export with SHA-256 checksums, investigator sign-off, and custody logs.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-3xl font-extrabold text-cyan-500/40">{item.step}</span>
                  <h4 className="text-base font-bold text-white mt-2 mb-2">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900 flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Stage Validated
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Regulatory Compliance */}
      <section id="compliance" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            Security & Governance
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
            Institutional Trust & Sovereign Data Sovereignty
          </h2>
          <p className="text-slate-400 mt-3 text-base">
            Engineered from the ground up for strict law-enforcement compliance, auditability, and air-gapped agency deployments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30">
            <Lock className="w-6 h-6 text-cyan-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1.5">RBAC & Data Isolation</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-tier permissions (Investigator, Supervisor, Admin, Auditor) ensuring compartmentalized case access.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30">
            <Award className="w-6 h-6 text-blue-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1.5">Statutory Legal Alignment</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Formal requisition workflows conforming to Section 91 CrPC and Bharatiya Nagarik Suraksha Sanhita (BNSS).
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30">
            <Shield className="w-6 h-6 text-emerald-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1.5">Tamper-Evident Audit Trails</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographically hashed action logs record every query, export, and override for courtroom scrutiny.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30">
            <Globe2 className="w-6 h-6 text-purple-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1.5">Sovereign Deployment</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fully containerized on Docker & Kubernetes, capable of running on sovereign government cloud or offline networks.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-gradient-to-b from-[#070c18] to-[#050811] border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to Accelerate Your Digital Asset Investigations?
          </h2>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Request an institutional clearance review or sign in to your authorized agency workstation.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-900/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Request Agency Access</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-slate-300 hover:text-white border border-slate-700 bg-slate-900/80 hover:bg-slate-800 transition-all"
            >
              Sign In to Investigator Portal
            </button>
          </div>
        </div>
      </section>

      {/* Enterprise Footer */}
      <footer className="border-t border-slate-800/80 bg-[#03060c] py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold font-mono text-slate-200 tracking-wider">CHAINTRACE</span>
              <span className="text-[11px] text-slate-400 font-mono">| National Blockchain Intelligence</span>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs">
              <button onClick={() => navigate('/login')} className="hover:text-cyan-400 transition-colors">
                Investigator Portal
              </button>
              <button onClick={() => navigate('/register')} className="hover:text-cyan-400 transition-colors">
                Agency Clearance
              </button>
              <a href="#compliance" className="hover:text-cyan-400 transition-colors">
                Statutory Guidelines
              </a>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Operational (99.98%)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-mono">
            <div>
              &copy; {new Date().getFullYear()} ChainTrace Technologies. Developed for National Cybercrime & Financial Intelligence Workflows.
            </div>
            <div className="text-slate-400">
              RESTRICTED USE — AUTHORIZED LAW ENFORCEMENT & COMPLIANCE PERSONNEL ONLY
            </div>
          </div>
        </div>
      </footer>

      {/* Request Access Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {modalSubmitted ? (
              <div className="text-center py-6 sm:py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Clearance Request Received</h3>
                <p className="text-sm text-slate-300 max-w-sm mx-auto mb-6 leading-relaxed">
                  Thank you, <strong className="text-white">{formData.fullName}</strong>. Your agency request for{' '}
                  <strong className="text-cyan-400">{formData.agencyName || 'your department'}</strong> has been
                  logged in the institutional review queue.
                </p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 mb-6 text-left">
                  <div>Reference Ticket: <span className="text-cyan-400 font-bold">REQ-SEC-{Math.floor(100000 + Math.random() * 900000)}</span></div>
                  <div>Verification Contact: <span className="text-slate-300">{formData.officialEmail}</span></div>
                  <div>Status: <span className="text-amber-400 font-semibold">Pending Supervisor Clearance</span></div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors"
                  >
                    Close Window
                  </button>
                  <button
                    onClick={() => {
                      handleCloseModal();
                      navigate('/login');
                    }}
                    className="flex-1 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1 text-cyan-400 text-xs font-mono font-semibold">
                  <Shield className="w-4 h-4" />
                  <span>INSTITUTIONAL ONBOARDING</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Request Agency Access</h3>
                <p className="text-xs text-slate-400 mb-5">
                  Clearance is granted strictly to verified law-enforcement, regulatory bodies, and licensed VASPs.
                </p>

                <form onSubmit={handleFormSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Inspector / Analyst Name"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Official Govt/Work Email</label>
                      <input
                        type="email"
                        required
                        placeholder="officer@police.gov.in"
                        value={formData.officialEmail}
                        onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Organization / Agency</label>
                      <input
                        type="text"
                        required
                        placeholder="State Police / FIU / Cyber Cell"
                        value={formData.agencyName}
                        onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Agency Type</label>
                      <select
                        value={formData.agencyType}
                        onChange={(e) => setFormData({ ...formData, agencyType: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="LAW_ENFORCEMENT">Law Enforcement / Police</option>
                        <option value="FIU">Financial Intelligence Unit (FIU)</option>
                        <option value="VASP_COMPLIANCE">Licensed VASP / Exchange</option>
                        <option value="JUDICIARY">Judiciary / Prosecution</option>
                        <option value="DEFENSE_CYBER">Cyber Command / Defense</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Jurisdiction / State</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maharashtra, India"
                        value={formData.jurisdiction}
                        onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Badge ID / Officer Ref</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MH-CYBER-8841"
                        value={formData.badgeId}
                        onChange={(e) => setFormData({ ...formData, badgeId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Primary Investigation Need</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Tracing mule bank & crypto dispersal rings in high-priority cyber scam cases..."
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold shadow-md shadow-cyan-900/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Clearance Application</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
