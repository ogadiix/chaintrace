import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  GitFork,
  Cpu,
  Building2,
  FileCheck2,
  Lock,
  CheckCircle2,
  X,
  Send,
  Menu,
  Shield,
  BarChart3,
} from 'lucide-react';
import { navigate } from '../../router';

/* ─────────────────────────────── Network Visualization ─────────────────────────────── */
const NetworkCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number }[]>([]);

  const initNodes = useCallback((w: number, h: number) => {
    const count = Math.min(Math.floor((w * h) / 25000), 40);
    nodesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 2 + Math.random() * 2,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      initNodes(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const nodes = nodesRef.current;
      const dark = isDark();
      const dotColor = dark ? 'rgba(108, 140, 255, 0.35)' : 'rgba(49, 87, 213, 0.2)';
      const lineColor = dark ? 'rgba(108, 140, 255, 0.08)' : 'rgba(49, 87, 213, 0.06)';

      // Update positions
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > rect.width) n.vx *= -1;
        if (n.y < 0 || n.y > rect.height) n.vy *= -1;
      });

      // Draw connections
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      ctx.fillStyle = dotColor;
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [initNodes]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
};

/* ─────────────────────────────── Scroll Reveal Hook ─────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('ct-visible');
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ─────────────────────────────── Landing Page ─────────────────────────────── */
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
    purpose: '',
  });

  const capabilitiesRef = useScrollReveal();
  const workflowRef = useScrollReveal();
  const complianceRef = useScrollReveal();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitted(true);
  };

  const capabilities = [
    {
      icon: GitFork,
      title: 'Fund Flow Tracing',
      desc: 'Multi-hop recursive graph traversal across blockchain networks to trace asset movement.',
    },
    {
      icon: Cpu,
      title: 'Intelligence Engine',
      desc: 'Automated pattern detection, clustering analysis, and behavioral heuristics.',
    },
    {
      icon: BarChart3,
      title: 'Risk Attribution',
      desc: 'Explainable risk scoring with factor breakdown and confidence levels.',
    },
    {
      icon: Building2,
      title: 'VASP Identification',
      desc: 'Entity attribution against known exchanges, services, and sanctioned addresses.',
    },
    {
      icon: FileCheck2,
      title: 'Forensic Reports',
      desc: 'Court-admissible evidentiary dossiers with cryptographic integrity verification.',
    },
    {
      icon: Lock,
      title: 'Secure Platform',
      desc: 'End-to-end encrypted sessions, role-based access control, and comprehensive audit trails.',
    },
  ];

  const workflow = [
    { step: '01', title: 'Intake', desc: 'Register complaint with NCRP reference, suspect wallet, and blockchain network.' },
    { step: '02', title: 'Trace', desc: 'Execute multi-hop fund flow traversal with configurable depth and filters.' },
    { step: '03', title: 'Analyze', desc: 'Review intelligence findings, risk scores, and entity attributions.' },
    { step: '04', title: 'Report', desc: 'Generate verified forensic dossiers for prosecution and asset freeze requisitions.' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--ct-bg)', color: 'var(--ct-text)' }}>
      {/* ═══ Navigation ═══ */}
      <header
        className="sticky top-0 z-50 backdrop-blur-sm"
        style={{ background: 'var(--ct-header-bg)', borderBottom: '1px solid var(--ct-border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-ct-md flex items-center justify-center font-bold text-sm" style={{ background: 'var(--ct-accent)', color: '#FFFFFF' }}>
              CT
            </div>
            <span className="font-semibold text-base tracking-tight" style={{ color: 'var(--ct-text)' }}>ChainTrace</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: 'var(--ct-text-secondary)' }}>
            {['Capabilities', 'Workflow', 'Compliance'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="transition-colors hover:no-underline"
                style={{ textDecoration: 'none' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ct-text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ct-text-secondary)'}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="ct-btn ct-btn-ghost text-sm hidden sm:inline-flex">
              Sign In
            </button>
            <button onClick={() => setIsModalOpen(true)} className="ct-btn ct-btn-primary ct-btn-sm sm:text-sm">
              Request Access <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button className="md:hidden ct-btn-icon" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileNavOpen && (
          <div
            className="md:hidden py-3 px-4 space-y-2"
            style={{ borderTop: '1px solid var(--ct-border)', background: 'var(--ct-surface)' }}
          >
            {['Capabilities', 'Workflow', 'Compliance'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="block py-2 text-sm"
                style={{ color: 'var(--ct-text-secondary)', textDecoration: 'none' }}
                onClick={() => setMobileNavOpen(false)}
              >
                {item}
              </a>
            ))}
            <button onClick={() => { navigate('/login'); setMobileNavOpen(false); }} className="block w-full text-left py-2 text-sm" style={{ color: 'var(--ct-accent-text)' }}>
              Sign In
            </button>
          </div>
        )}
      </header>

      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden">
        <NetworkCanvas />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            <h1 className="font-semibold tracking-tight mb-6" style={{ fontSize: 'var(--ct-text-display)', lineHeight: 1.1, color: 'var(--ct-text)' }}>
              Blockchain Intelligence
              <br />
              <span style={{ color: 'var(--ct-text-secondary)' }}>for Digital Investigations.</span>
            </h1>
            <p className="text-lg mb-8 leading-relaxed max-w-xl" style={{ color: 'var(--ct-text-secondary)' }}>
              Trace assets. Connect evidence. Understand risk.
              <br className="hidden sm:block" />
              A forensic intelligence platform for cryptocurrency fraud investigation.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <button onClick={() => setIsModalOpen(true)} className="ct-btn ct-btn-primary ct-btn-lg">
                Request Access <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/login')} className="ct-btn ct-btn-secondary ct-btn-lg">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Capabilities ═══ */}
      <section id="capabilities" className="py-20 sm:py-28">
        <div ref={capabilitiesRef} className="ct-scroll-reveal max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-h1 font-semibold tracking-tight mb-3" style={{ color: 'var(--ct-text)' }}>
              Investigation Capabilities
            </h2>
            <p className="text-base max-w-xl" style={{ color: 'var(--ct-text-secondary)' }}>
              Purpose-built tools for blockchain forensics, from initial complaint intake to court-ready evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="ct-card group"
                >
                  <div
                    className="w-10 h-10 rounded-ct-md flex items-center justify-center mb-4"
                    style={{ background: 'var(--ct-accent-subtle)', color: 'var(--ct-accent-text)' }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--ct-text)' }}>{cap.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ct-text-secondary)' }}>{cap.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ Workflow ═══ */}
      <section id="workflow" className="py-20 sm:py-28" style={{ background: 'var(--ct-bg-subtle)' }}>
        <div ref={workflowRef} className="ct-scroll-reveal max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-h1 font-semibold tracking-tight mb-3" style={{ color: 'var(--ct-text)' }}>
              Investigation Lifecycle
            </h2>
            <p className="text-base max-w-xl" style={{ color: 'var(--ct-text-secondary)' }}>
              A structured workflow from complaint registration through prosecution-ready reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map((step) => (
              <div key={step.step} className="relative">
                <div
                  className="text-4xl font-bold mb-3"
                  style={{ color: 'var(--ct-accent-muted)' }}
                >
                  {step.step}
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--ct-text)' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ct-text-secondary)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Compliance ═══ */}
      <section id="compliance" className="py-20 sm:py-28">
        <div ref={complianceRef} className="ct-scroll-reveal max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div
              className="w-12 h-12 rounded-ct-lg flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--ct-accent-subtle)', color: 'var(--ct-accent-text)' }}
            >
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-h1 font-semibold tracking-tight mb-4" style={{ color: 'var(--ct-text)' }}>
              Statutory Compliance
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--ct-text-secondary)' }}>
              ChainTrace is designed for integration with India's I4C ecosystem including NCRP complaint intake
              and SAHYOG intermediary requisitions. All evidence artifacts include cryptographic integrity
              verification for court admissibility.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {['NCRP Integration', 'SAHYOG Gateway', 'SHA-256 Verification', 'Audit Trails', 'RBAC'].map((tag) => (
                <span
                  key={tag}
                  className="ct-badge ct-badge-default"
                  style={{ fontSize: '0.8125rem', padding: '4px 12px' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--ct-success)' }} />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 sm:py-28" style={{ background: 'var(--ct-bg-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-h1 font-semibold tracking-tight mb-4" style={{ color: 'var(--ct-text)' }}>
            Ready to investigate?
          </h2>
          <p className="text-base mb-8 max-w-md mx-auto" style={{ color: 'var(--ct-text-secondary)' }}>
            Request platform access for your organization to begin blockchain forensic analysis.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setIsModalOpen(true)} className="ct-btn ct-btn-primary ct-btn-lg">
              Request Access <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/login')} className="ct-btn ct-btn-secondary ct-btn-lg">
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer style={{ borderTop: '1px solid var(--ct-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs" style={{ background: 'var(--ct-accent)', color: '#FFFFFF' }}>
              CT
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--ct-text-secondary)' }}>ChainTrace</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--ct-text-tertiary)' }}>
            Blockchain Intelligence Platform · Encrypted · Audited
          </p>
        </div>
      </footer>

      {/* ═══ Access Request Modal ═══ */}
      {isModalOpen && (
        <div className="ct-overlay flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="ct-modal w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--ct-text)' }}>
                {modalSubmitted ? 'Request Submitted' : 'Request Access'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="ct-btn-icon" style={{ padding: '4px' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalSubmitted ? (
              <div className="text-center py-6 ct-animate-fade-in-up">
                <div className="w-12 h-12 rounded-ct-lg flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--ct-success-subtle)', color: 'var(--ct-success-text)' }}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--ct-text-secondary)' }}>
                  Your request has been submitted. We'll reach out to verify your credentials.
                </p>
                <button onClick={() => setIsModalOpen(false)} className="ct-btn ct-btn-primary">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="ct-label">Full Name</label>
                  <input type="text" required value={formData.fullName} onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))} className="ct-input" placeholder="Full name" />
                </div>
                <div>
                  <label className="ct-label">Official Email</label>
                  <input type="email" required value={formData.officialEmail} onChange={(e) => setFormData(p => ({ ...p, officialEmail: e.target.value }))} className="ct-input" placeholder="name@agency.gov.in" />
                </div>
                <div>
                  <label className="ct-label">Organization</label>
                  <input type="text" required value={formData.agencyName} onChange={(e) => setFormData(p => ({ ...p, agencyName: e.target.value }))} className="ct-input" placeholder="Agency / Organization" />
                </div>
                <div>
                  <label className="ct-label">Purpose</label>
                  <textarea rows={2} value={formData.purpose} onChange={(e) => setFormData(p => ({ ...p, purpose: e.target.value }))} className="ct-input" style={{ resize: 'vertical' }} placeholder="Brief description" />
                </div>
                <button type="submit" className="ct-btn ct-btn-primary w-full" style={{ padding: '10px', fontWeight: 600 }}>
                  <Send className="w-4 h-4" /> Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
