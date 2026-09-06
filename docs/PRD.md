# ChainTrace — Product Requirements Document

## 1. Product Overview

### Product

ChainTrace

### Problem

Investigators receiving cryptocurrency-fraud complaints often begin with only a suspect wallet address. Manually following blockchain transactions across multiple hops is time-consuming, difficult to document, and difficult to translate into actionable intelligence.

### Product Goal

Turn a wallet address into an explainable investigation:

```text
Wallet → Fund Flow → Suspicious Patterns → VASP Attribution → Evidence
```

## 2. Target Users

### Primary

Law-enforcement investigators and cybercrime analysts.

### Secondary

Financial-intelligence teams, compliance analysts, authorized VASP investigators, and incident-response teams.

## 3. User Stories

### US-01 — Create Case

As an investigator, I want to create a case from a complaint so that the investigation has a structured record.

### US-02 — Submit Wallet

As an investigator, I want to submit a suspect wallet so that the system can analyze its blockchain activity.

### US-03 — Trace Funds

As an investigator, I want to trace funds for a configurable number of hops so that I can identify downstream destinations.

### US-04 — Visualize Flow

As an investigator, I want to see transactions as a graph so that complex fund movement is easier to understand.

### US-05 — Detect Patterns

As an investigator, I want suspicious fund-flow patterns automatically highlighted so that I can prioritize relevant transactions.

### US-06 — Attribute Destination

As an investigator, I want the system to match destination wallets against known VASP/entity labels so that I can identify likely exchange destinations.

### US-07 — Understand Risk

As an investigator, I want an explainable risk score so that I understand why an investigation is prioritized.

### US-08 — Inspect Evidence

As an investigator, I want every finding linked to blockchain transactions so that I can verify it.

### US-09 — Generate Report

As an investigator, I want to generate a standardized report so that I can share investigation results.

### US-10 — Intake Integration

As an investigator, I want complaint data to enter the platform in a structured format so that manual re-entry is reduced.

## 4. Functional Requirements

### FR-01 Authentication

System shall authenticate users and assign roles.

Roles:

```text
Admin
Investigator
Analyst
Viewer
```

### FR-02 Case Management

System shall support:

- Create.
- View.
- Update.
- Assign.
- Search.
- Filter.
- Archive.

### FR-03 Wallet Validation

System shall validate addresses according to chain-specific format rules.

### FR-04 Blockchain Ingestion

System shall retrieve supported transaction data through pluggable providers.

### FR-05 Trace

System shall support bounded N-hop tracing.

Configuration:

- Max hops.
- Minimum amount.
- Time window.
- Asset/token.
- Direction.

### FR-06 Graph

System shall visualize:

- Wallets.
- Transactions.
- Clusters.
- Known entities.
- VASPs.

### FR-07 Attribution

System shall compare observed addresses with an internally maintained label database.

Attribution must include:

- Entity.
- Confidence.
- Basis.
- Source.
- Verification date.

### FR-08 Risk

System shall produce:

```text
Score: 0–100
Level: LOW/MEDIUM/HIGH/CRITICAL
Reasons
Evidence references
```

### FR-09 Pattern Detection

Minimum patterns:

- Fan-in.
- Fan-out.
- Rapid forwarding.
- Consolidation.
- Peel-chain-like behavior.
- Known-risk interaction.

### FR-10 Evidence

Each finding shall reference:

- Wallet.
- Transaction hash.
- Timestamp.
- Block.
- Rule/heuristic.
- Data source.

### FR-11 Reporting

System shall generate a PDF investigation report.

### FR-12 Mock Integrations

System shall provide demo-compatible NCRP intake and SAHYOG-style VASP request workflows.

## 5. Non-Functional Requirements

### Performance

- Dashboard initial API requests target <2 seconds excluding blockchain jobs.
- Trace jobs should execute asynchronously.
- Graph rendering must remain usable for bounded investigation graphs.

### Availability

MVP should recover gracefully from provider failures.

### Security

- RBAC.
- Secure authentication.
- TLS.
- Secret management.
- Audit logging.
- Input validation.
- Rate limiting.

### Explainability

No risk score without reasons.

### Accuracy

The system must distinguish:

```text
Observed fact
Heuristic inference
Attribution
Risk prioritization
```

## 6. Data Model

### Case

```text
case_id
complaint_id
title
fraud_type
amount
incident_date
status
priority
created_by
assigned_to
created_at
updated_at
```

### Wallet

```text
address
chain
first_seen
last_seen
balance_snapshot
risk_score
```

### Transaction

```text
tx_hash
chain
from
to
asset
amount
timestamp
block_number
provider
```

### Attribution

```text
wallet
entity
confidence
basis
source
verified_at
```

### Risk Finding

```text
rule_id
score
severity
description
evidence_refs
```

## 7. API Requirements

```text
POST /api/v1/cases
GET /api/v1/cases
GET /api/v1/cases/{id}

POST /api/v1/cases/{id}/trace
GET /api/v1/investigations/{id}
GET /api/v1/investigations/{id}/graph
GET /api/v1/investigations/{id}/timeline
GET /api/v1/investigations/{id}/risk
GET /api/v1/investigations/{id}/attribution

POST /api/v1/reports/{case_id}

POST /api/v1/ncrp/complaints
POST /api/v1/sahyog/requests
```

## 8. Acceptance Criteria

### AC-01

Given a valid supported wallet, the investigator can start an investigation.

### AC-02

The system retrieves transactions and shows their status.

### AC-03

The system produces a bounded graph.

### AC-04

The investigator can expand or filter graph paths.

### AC-05

Known seed addresses are attributed correctly.

### AC-06

Unknown addresses are not falsely attributed.

### AC-07

Risk scores display their component reasons.

### AC-08

Evidence can be traced from a finding to a transaction.

### AC-09

PDF reports contain investigation findings and evidence references.

### AC-10

Mock complaint ingestion creates a case automatically.

## 9. Out of Scope for MVP

- Definitive identification of a person's real-world identity.
- Unlawful access to exchange customer records.
- Automated legal decisions.
- Fully autonomous law-enforcement action.
- Guaranteed attribution for unlabeled wallets.
- Production SAHYOG/NCRP access without official authorization.
- Universal blockchain coverage.

## 10. Success Metrics

### Product

- Time from wallet input to first useful graph.
- Percentage of traces completing successfully.
- Attribution precision on validated seed cases.
- Report generation success rate.
- Investigator task completion time.

### Hackathon

A judge should be able to see:

```text
Wallet
→ Trace
→ Graph
→ Suspicion
→ VASP
→ Evidence
→ Report
```

within the live demo.

## 11. Demo Scenario

Example:

```text
Complaint:
Crypto investment fraud

Reported amount:
₹8,50,000

Suspect wallet:
[demo address]

Action:
Trace Funds

Result:
Multiple-hop movement

Detection:
Rapid forwarding + suspicious consolidation

Destination:
Known VASP cluster

Risk:
87/100 — HIGH

Action:
Generate Investigation Report
```

All demo data must be clearly identified as demo/test data where appropriate.
