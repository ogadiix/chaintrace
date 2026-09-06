# ChainTrace 🔍⛓️

> **Investigator-oriented cryptocurrency fraud intelligence platform (SIH 2026 Problem Statement 183)**

ChainTrace turns a victim-reported suspect wallet address or complaint into an explainable investigation:

```text
Wallet → Fund Flow → Suspicious Patterns → VASP Attribution → Evidence
```

---

## 📚 Documentation

The core specifications and architectural designs for ChainTrace are documented in the [`docs/`](./docs) directory:

| Document | Description |
| :--- | :--- |
| **[Product Requirements Document (PRD)](./docs/PRD.md)** | Product overview, user stories, functional requirements, and success metrics. |
| **[System Architecture](./docs/architecture.md)** | Technical design, service topology, data flow, Neo4j graph model, and API specs. |
| **[Product & UX Design](./docs/design.md)** | UX vision, color system, typography, component layout, and investigation workflows. |
| **[Implementation Phases](./docs/phases.md)** | 14-phase roadmap from foundational monorepo setup to production-ready MVP. |
| **[Security Architecture & Threat Model](./docs/security.md)** | Threat modeling (STRIDE), cryptographic evidence hashing, RBAC, and audit logging. |

---

## 🏛️ System Overview

- **Core Goal**: Accept suspect wallets, trace transactions across configurable hops, build interactive visual graphs, detect laundering patterns (peeling chains, dispersion, aggregation), match destinations against known VASP entities, compute explainable risk scores, and generate court-ready evidence dossiers.
- **Tech Stack**:
  - **Frontend**: Next.js / TypeScript, TailwindCSS, Cytoscape.js / React Flow
  - **Backend**: FastAPI (Python 3.11+), Celery / Redis worker queues
  - **Databases**: PostgreSQL (cases, evidence, users), Neo4j (graph analytics), Redis (caching & jobs)
  - **Infrastructure**: Docker Compose, GitHub Actions CI/CD
