# ChainTrace — System Architecture

## 1. Purpose

ChainTrace is an investigator-oriented cryptocurrency fraud intelligence platform for SIH 2026 Problem Statement 183. It accepts a victim-reported suspect wallet address or complaint, traces fund movement across supported blockchains, builds a transaction graph, identifies suspicious patterns, attributes destination wallets to known exchanges/VASPs where evidence permits, calculates an explainable risk score, and produces an investigation-ready report.

> **Design principle:** every important conclusion must be traceable back to blockchain evidence, a deterministic heuristic, or a documented attribution source.

## 2. Architecture Goals

- Fast wallet-to-destination tracing.
- Explainable, evidence-backed intelligence.
- Multi-chain architecture without coupling the core system to one provider.
- Investigator-first workflow.
- Secure handling of complaint and investigative data.
- Async processing for expensive blockchain/graph jobs.
- Extensible attribution and risk engines.
- Clear separation between observed facts, heuristics, and inferred conclusions.

## 3. High-Level Architecture

```text
                         ┌──────────────────────────┐
                         │      Investigator UI     │
                         │ React + TypeScript       │
                         │ Tailwind + Cytoscape     │
                         └────────────┬─────────────┘
                                      │ HTTPS
                                      ▼
                         ┌──────────────────────────┐
                         │       API Gateway        │
                         │ FastAPI + Auth/RBAC      │
                         └────────────┬─────────────┘
                                      │
               ┌──────────────────────┼──────────────────────┐
               ▼                      ▼                      ▼
        ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
        │ Case Service│       │ Trace Service│      │ Report Svc  │
        └──────┬──────┘       └──────┬──────┘       └──────┬──────┘
               │                     │                     │
               ▼                     ▼                     ▼
        ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
        │ PostgreSQL  │       │ Redis/Queue │       │ PDF Engine  │
        └─────────────┘       └──────┬──────┘       └─────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ Trace Worker     │
                            └────────┬─────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
             ┌────────────┐  ┌────────────┐  ┌────────────┐
             │ TRON Adapter│  │ EVM Adapter│  │ BTC Adapter│
             └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
                    └────────────────┼────────────────┘
                                     ▼
                            ┌──────────────────┐
                            │ Normalization    │
                            │ + Deduplication  │
                            └────────┬─────────┘
                                     ▼
                            ┌──────────────────┐
                            │ Graph Engine     │
                            │ Neo4j            │
                            └────────┬─────────┘
                                     │
                     ┌───────────────┼────────────────┐
                     ▼               ▼                ▼
              ┌────────────┐ ┌────────────┐ ┌──────────────┐
              │ Heuristics │ │ Attribution│ │ Risk Engine  │
              └────────────┘ └────────────┘ └──────────────┘
                     └───────────────┬────────────────┘
                                     ▼
                              Evidence Store
```

## 4. Core Components

### 4.1 Frontend

Responsibilities:

- Authentication and role-aware navigation.
- Case creation and intake.
- Wallet search.
- Investigation controls.
- Interactive transaction graph.
- Transaction timeline.
- Risk explanation.
- VASP attribution view.
- Evidence viewer.
- Report generation/download.
- Mock NCRP/SAHYOG workflow.

Recommended stack:

- React
- TypeScript
- Tailwind CSS
- Cytoscape.js or Sigma.js
- TanStack Query
- Framer Motion

### 4.2 API Layer

FastAPI services expose:

```text
POST   /api/v1/cases
GET    /api/v1/cases
GET    /api/v1/cases/{case_id}
POST   /api/v1/cases/{case_id}/trace
GET    /api/v1/investigations/{id}
GET    /api/v1/investigations/{id}/graph
GET    /api/v1/investigations/{id}/timeline
GET    /api/v1/investigations/{id}/risk
GET    /api/v1/investigations/{id}/attribution
POST   /api/v1/reports/{case_id}
POST   /api/v1/ncrp/complaints
POST   /api/v1/sahyog/requests
```

The API should never block on long blockchain traversal. It creates a job and returns an investigation/job identifier.

### 4.3 Job Queue

Redis + Celery/RQ handles:

- Blockchain fetching.
- Address expansion.
- Graph construction.
- Risk calculation.
- Attribution.
- Report generation.

Job states:

```text
QUEUED → RUNNING → COMPLETED
                 ↘ FAILED
```

### 4.4 Blockchain Adapter Layer

Use an adapter interface so providers can be replaced.

```python
class BlockchainAdapter:
    def validate_address(self, address): ...
    def get_transactions(self, address, cursor=None): ...
    def get_transaction(self, tx_hash): ...
    def get_balance(self, address): ...
```

Implement:

- `TronAdapter`
- `EvmAdapter`
- `BitcoinAdapter`

Do not let provider-specific response formats leak into the rest of the application.

### 4.5 Normalization Layer

Convert all provider responses into a common schema:

```text
Transaction
- chain
- tx_hash
- block_number
- timestamp
- from_address
- to_address
- asset
- token_contract
- amount
- fee
- direction
- provider
- raw_reference
```

Keep raw provider references for auditability.

### 4.6 Graph Layer

Neo4j represents:

```text
(:Wallet)
(:Transaction)
(:VASP)
(:Entity)
(:RiskTag)
```

Relationships:

```text
(Wallet)-[:SENT]->(Transaction)
(Transaction)-[:TO]->(Wallet)
(Wallet)-[:ATTRIBUTED_TO]->(VASP)
(Wallet)-[:TAGGED_AS]->(Entity)
```

For performance, an alternative transaction-edge representation can be used:

```text
(Wallet)-[:TRANSFER {
    tx_hash,
    timestamp,
    asset,
    amount
}]->(Wallet)
```

The graph should support bounded traversal, shortest paths, amount/time filters, and destination searches.

### 4.7 Clustering Engine

Use chain-specific heuristics.

Bitcoin:

- Common-input heuristic.
- Change-address heuristic.
- Peel-chain detection.

EVM/TRON:

- Repeated funding source.
- Repeated destination.
- Rapid forwarding.
- Consolidation patterns.
- Temporal and amount similarity.

Every cluster must store:

```text
cluster_id
member_wallets
heuristic
confidence
evidence_refs
```

Use wording such as **"likely related"**, not "same owner confirmed".

### 4.8 Attribution Engine

Inputs:

- Destination wallet.
- Chain.
- Transaction path.
- Internal VASP/address label database.
- Source and freshness metadata.

Output:

```json
{
  "entity": "Example VASP",
  "confidence": 0.92,
  "basis": [
    "Known deposit address",
    "Path terminates at labeled cluster"
  ]
}
```

Confidence must never be presented as legal certainty.

### 4.9 Risk Engine

Start with deterministic scoring.

Example signals:

```text
Known scam interaction       +30
Mixer interaction            +25
Sanctioned interaction       +40
Rapid forwarding             +15
High fan-out                  +10
High fan-in                   +10
Suspicious peel chain         +10
Known VASP destination         +5
```

Cap at 100 and retain individual reasons.

Future ML models can consume the same feature interface.

## 5. Data Architecture

### PostgreSQL

Primary transactional data:

- users
- roles
- cases
- complaints
- investigations
- investigation_jobs
- reports
- evidence
- audit_logs
- vasp_entities
- address_labels
- risk_rules

### Neo4j

Blockchain relationship data:

- wallets
- transactions/transfers
- VASPs
- tagged entities
- clusters

### Redis

- Job queue.
- Short-lived cache.
- Rate-limit counters.
- Distributed locks.

Object storage can be introduced for generated reports and evidence artifacts.

## 6. Data Flow

### Case Intake

```text
Complaint
  ↓
Validate
  ↓
Create Case
  ↓
Extract Wallet
  ↓
Select Chain
  ↓
Create Trace Job
```

### Investigation

```text
Trace Job
  ↓
Fetch Transactions
  ↓
Normalize
  ↓
Deduplicate
  ↓
Persist
  ↓
Build Graph
  ↓
Traverse N hops
  ↓
Run Heuristics
  ↓
Attribution
  ↓
Risk Scoring
  ↓
Evidence Bundle
```

## 7. Scalability

For the SIH MVP:

- One API service.
- One worker service.
- PostgreSQL.
- Neo4j.
- Redis.

Production evolution:

```text
API replicas
Worker pool
Read replicas
Managed graph database
Object storage
Observability stack
Message broker
```

Use bounded graph traversal to avoid explosive fan-out.

## 8. Reliability

- Provider timeout and retry.
- Exponential backoff.
- Idempotent ingestion.
- Job retry limits.
- Provider fallback where available.
- Partial-result states.
- Explicit "data unavailable" status.
- No silent substitution of missing data.

## 9. Observability

Track:

- API latency.
- Trace duration.
- Transactions fetched.
- Provider errors.
- Queue depth.
- Attribution confidence distribution.
- Failed jobs.
- Report generation time.

Use structured logs with case IDs but never log secrets or unnecessary personal data.
