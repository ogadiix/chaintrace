# ChainTrace — Implementation Phases

## Phase 0 — Project Foundation

### Goal

Create a clean monorepo and development environment.

### Deliverables

```text
apps/
  web/
  api/
  worker/

packages/
  shared/
  types/

infra/
  docker/
  scripts/

docs/
```

Set up:

- TypeScript frontend.
- FastAPI backend.
- PostgreSQL.
- Neo4j.
- Redis.
- Docker Compose.
- Environment configuration.
- Linting/formatting.
- Basic CI.

### Exit Criteria

- One command starts the local stack.
- Frontend can call backend.
- Backend can reach databases.
- Health endpoints work.

---

## Phase 1 — Case Management

### Build

- Login/session foundation.
- Roles.
- Case creation.
- Case listing.
- Case details.
- Complaint metadata.
- Audit events.

### APIs

```text
POST /cases
GET /cases
GET /cases/{id}
PATCH /cases/{id}
```

### Exit Criteria

An investigator can create and reopen a case without blockchain functionality.

---

## Phase 2 — Blockchain Adapters

### Priority

1. TRON
2. Ethereum/EVM
3. Bitcoin

### Build

Common adapter interface:

```python
validate_address()
get_transactions()
get_transaction()
get_balance()
```

Normalize all provider data.

### Exit Criteria

Given a supported address, the backend can retrieve and normalize transactions.

---

## Phase 3 — Graph Construction

### Build

- Wallet nodes.
- Transfer edges.
- Transaction metadata.
- Graph persistence.
- Bounded traversal.

Example:

```text
GET /investigations/{id}/graph
```

Return graph JSON:

```json
{
  "nodes": [],
  "edges": []
}
```

### Exit Criteria

A real wallet can be rendered as a transaction graph.

---

## Phase 4 — N-Hop Trace Engine

### Build

Inputs:

```text
wallet
chain
max_hops
time_window
min_amount
asset_filter
```

Traversal rules:

- Maximum hop limit.
- Duplicate prevention.
- Amount threshold.
- Time cutoff.
- Visited-set tracking.
- Rate limits.

### Exit Criteria

System can trace a wallet through several hops and return ranked paths.

---

## Phase 5 — Intelligence Engine

### Build

### Clustering

- Common input for BTC.
- Funding-source relationships.
- Repeated destination.
- Consolidation.
- Temporal forwarding.

### Pattern detection

- Peel chain.
- Fan-in.
- Fan-out.
- Rapid forwarding.
- Consolidation.

### Exit Criteria

Investigation returns explainable signals with evidence references.

---

## Phase 6 — VASP Attribution

### Build

Seed label database.

Schema:

```text
address
chain
entity
entity_type
confidence
source
source_url
verified_at
```

Attribution pipeline:

```text
Destination Wallet
      ↓
Exact Match
      ↓
Known Cluster Match
      ↓
Path Evidence
      ↓
Confidence
```

### Exit Criteria

Known seed addresses can be attributed correctly and unknown addresses remain unknown.

---

## Phase 7 — Risk Engine

### Build

Start deterministic.

Example:

```text
scam interaction      +30
sanction interaction  +40
mixer interaction     +25
rapid forwarding      +15
fan-out               +10
```

Output:

```text
score
level
reasons
evidence_refs
```

### Exit Criteria

Every score is reproducible from stored signals.

---

## Phase 8 — Investigator UI

### Build

- Dashboard.
- Case workspace.
- Graph.
- Timeline.
- Risk panel.
- Attribution panel.
- Evidence drawer.
- Search/filter.

### Exit Criteria

A judge can understand a complete investigation without developer assistance.

---

## Phase 9 — Reports

### Build

Generate PDF containing:

- Case information.
- Wallets.
- Fund-flow summary.
- Graph snapshot.
- Transaction timeline.
- Attribution.
- Risk score.
- Detection reasons.
- Evidence references.

### Exit Criteria

One click produces a professional investigation report.

---

## Phase 10 — NCRP / SAHYOG Demo Integrations

### NCRP

Create mock endpoint:

```text
POST /api/v1/ncrp/complaints
```

Automatically create case.

### SAHYOG

Create mock request workflow:

```text
Draft → Review → Demo Submitted → Pending
```

Clearly distinguish mock integration from real government connectivity.

---

## Phase 11 — Security Hardening

Implement:

- RBAC.
- Input validation.
- Rate limiting.
- Secure secrets.
- Audit logs.
- Encryption in transit.
- Restricted database access.
- Safe report handling.
- Dependency scanning.
- Error sanitization.

---

## Phase 12 — Testing

### Unit

- Address validation.
- Normalization.
- Risk scoring.
- Attribution.
- Heuristics.

### Integration

- Blockchain adapter.
- Database.
- Graph.
- Queue.

### End-to-End

```text
Complaint
→ Case
→ Trace
→ Graph
→ Attribution
→ Risk
→ Report
```

### Demo testing

Prepare at least:

1. High-risk case.
2. Medium-risk case.
3. Unknown/no-attribution case.
4. Multi-hop case.
5. Failed provider case.

---

## Phase 13 — SIH Demo Polish

Freeze features.

Optimize:

- UI consistency.
- Graph animation.
- Loading states.
- Error states.
- Demo dataset.
- Report quality.
- Pitch narrative.

### Final demo

```text
Complaint
→ Wallet
→ Trace
→ Graph
→ Suspicious pattern
→ VASP attribution
→ Risk
→ Evidence
→ Report
```

---

## Recommended MVP Cut

If time is limited:

### Must ship

- TRON.
- Ethereum.
- Case management.
- N-hop tracing.
- Graph.
- Seed VASP labels.
- Rule-based risk.
- Evidence.
- PDF.
- Mock NCRP/SAHYOG.

### Defer

- GNN.
- Advanced ML.
- Full Bitcoin clustering.
- Cross-chain bridges.
- Large-scale production infrastructure.

---

## Definition of Done

The project is MVP-complete when:

> An investigator can enter a suspect wallet, run a bounded blockchain trace, visually inspect the fund flow, see explainable suspicious signals, receive a confidence-aware VASP attribution when supported by the label database, inspect the underlying transaction evidence, and generate a report.
