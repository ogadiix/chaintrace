# ChainTrace 🔍⛓️

> **Investigator-Oriented Blockchain Intelligence & Cryptocurrency Fraud Investigation Platform**
> *Smart India Hackathon (SIH 2026) — Problem Statement 183*

ChainTrace empowers law enforcement investigators, cybercrime cells, and financial analysts to transform victim-reported crypto transactions into explainable, court-admissible forensic intelligence.

```text
NCRP Complaint / Suspect Wallet
             ↓
    Bounded Graph Trace
             ↓
Forensic Pattern Detection (Intelligence)
             ↓
    VASP / Entity Attribution
             ↓
Explainable Risk Prioritization Scoring
             ↓
   Court-Admissible PDF Dossier
             ↓
SAHYOG Intermediary / VASP Requisition
```

---

## 🌟 Key Capabilities & Architectural Pillars

| Capability | Technical Details |
| :--- | :--- |
| **Multi-Chain Tracing** | Native support for **TRON (TRC-20 & Native TRX)**, **Ethereum (EVM)**, and **Bitcoin** with exact decimal precision and cycle detection. |
| **Interactive Graph Studio** | Visual canvas with Cytoscape.js & React Flow layouts, directional fund-flow particles, and terminal node badge tags. |
| **Intelligence Rule Engine** | Deterministic detection of peel-chains, rapid forwarding (<30m), fan-out dispersion, fan-in consolidation, and structuring. |
| **VASP Attribution** | Evidence-based labeling with strict confidence scores (*Known Label* vs *Probable Attribution* vs *Unknown*). |
| **Holistic Risk Scoring** | Multi-dimensional risk score [0–100] with factor category caps, manual override tracking, and strict anti-double-counting. |
| **PDF Dossier Generation** | High-fidelity, tamper-evident investigation reports with SHA-256 integrity verification hashes. |
| **NCRP & SAHYOG Workflows** | Simulated statutory requisition workflow for Indian Cybercrime Coordination Centre (I4C) and NCRP intake. |
| **Defense-in-Depth Security** | Object-level authorization (IDOR/BOLA prevention), rate limiting, CSP/HSTS defensive headers, and zero client error leaking. |

---

## 🚀 Turnkey Local Quickstart

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm
- Docker & Docker Compose (optional for local SQLite/mock mode)

### 1. Backend Setup
```bash
# Clone repository
git clone https://github.com/ogadiix/chaintrace.git
cd chaintrace

# Setup Python Virtual Environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt

# Run FastAPI Server (port 8000)
PYTHONPATH=. uvicorn apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
# In a new terminal window:
cd apps/web
npm install
npm run dev
# Web application available at http://localhost:5173
```

---

## 🔐 Default Demo Accounts (Development Mode)

| Role | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Senior Investigator** | `investigator@chaintrace.internal` | `Investigator123!` | Create cases, execute traces, run intelligence, draft SAHYOG requests, generate reports. |
| **Admin Director** | `admin@chaintrace.internal` | `AdminSecure123!` | Full supervision across all cases, team management, global audit review. |
| **Cyber Analyst** | `analyst@chaintrace.internal` | `AnalystSecure123!` | Case analytics, attribution inspection, risk evaluation. |
| **Observer Viewer** | `viewer@chaintrace.internal` | `ViewerSecure123!` | Read-only access to assigned investigation records. |

---

## 🧪 Comprehensive Test Suite (100% Passing — 85/85 Tests)

ChainTrace features a comprehensive automated test suite covering unit, integration, security, E2E demonstration scenarios, and system reliability:

```bash
# Unified test runner (Pytest + Typecheck + Production Build)
npm run test:all
# Or directly via bash script:
bash scripts/test_all.sh

# Turnkey Safe Demo Reset & Seeder
npm run demo:reset
# Or directly via python:
./.venv/bin/python scripts/reset_demo.py

# Run Phase 12 Reliability & Consistency Suite
PYTHONPATH=. ./.venv/bin/pytest apps/api/tests/test_system_reliability.py -v

# Run Phase 12 5-Canonical Scenario Suite
PYTHONPATH=. ./.venv/bin/pytest apps/api/tests/test_phase12_e2e_scenarios.py -v

# Run Phase 11 Security Suite
PYTHONPATH=. ./.venv/bin/pytest apps/api/tests/test_security.py -v
```

### Test Coverage Highlights:
- **System Reliability**: Parity check (Database == API == PDF), transaction rollback on mid-operation failure, background job lifecycle (`QUEUED` -> `RUNNING` -> `COMPLETED`/`FAILED`), large graph bounding (10, 100, 1000 nodes in <1.5s), external provider error sanitization.
- **Blockchain Adapters**: Address validation, TRC-20 normalization, transient RPC retries, cache immutability.
- **Trace Engine**: Cycle detection, diamond convergence, decimal math precision, hop limits.
- **Intelligence Engine**: Rapid forwarding, peeling chains, dispersion/aggregation algorithms.
- **VASP Attribution**: Known exchange exact match, unknown address isolation, sanction categorization.
- **Risk Engine**: Score capping at 100, false-positive protection for benign exchange flows.
- **Security & Hardening**: Authentication, IDOR/BOLA cross-user isolation, SQL/Cypher/XSS injection defense, sliding-window rate limiting.
- **Reports**: PDF binary dossier compilation, cryptographic hash validation, download streaming.

---

## 📖 Canonical Demonstration Scenarios

1. **High-Risk Phishing Syndicate (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`)**:
   - Ingest simulated NCRP complaint → Trace multi-hop flow → Detect rapid peel-chains → Match exchange cluster → Risk Score 85 (High) → Generate court-ready PDF dossier → Submit SAHYOG freezing requisition.
2. **Exchange Deposit Flow (`0x71C7656EC7ab88b098defB751B7401B5f6d8976F`)**:
   - Ingest unauthorized transfer → Attribution identifies exchange deposit address → Risk Engine scores medium risk → Submit SAHYOG Section 91 CrPC KYC requisition.
3. **Benign Unlabeled P2P Transfer (`TLLM2kdMA5pFaLNSURivcqFZS7ReErWN1x`)**:
   - Pure peer-to-peer flow → Terminal nodes remain strictly UNKNOWN (zero hallucinated tags) → Baseline low risk maintained.
4. **Deep Multi-Hop Diamond Convergence**:
   - 5-hop complex fund dispersion and reconsolidation with cycle loop avoidance.
5. **Provider Failure Resilience**:
   - Graceful fallback and normalized transaction caching under provider degraded state.

---

## 📚 Specification Documents

- [Product Requirements Document (PRD)](./docs/PRD.md)
- [System Architecture Specification](./docs/architecture.md)
- [Product & UX Design System](./docs/design.md)
- [Implementation Phases Roadmap](./docs/phases.md)
- [Security Architecture & Threat Model](./docs/security.md)

---

## ⚖️ Evidentiary Integrity & Disclaimers
*ChainTrace produces analytical intelligence based on publicly observable blockchain transaction records and curated label datasets. Analytical risk scores, pattern detections, and attributions represent investigative leads rather than legal determinations. Government integrations (NCRP, SAHYOG) operate in simulated demonstration sandbox mode for hackathon evaluation.*
