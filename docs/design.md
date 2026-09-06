# ChainTrace — Product & UX Design

## 1. Design Vision

ChainTrace should feel like a professional investigation console, not a generic crypto dashboard.

The interface should answer five questions immediately:

1. What case am I investigating?
2. Where did the funds move?
3. Where did they end up?
4. Why is this activity suspicious?
5. What evidence can I act on?

## 2. Design Principles

### Evidence First

Every claim should have a visible evidence trail.

### Progressive Disclosure

Show the high-level conclusion first, then allow investigators to drill into transactions and heuristics.

### Explainability

Never show a risk score without the reasons behind it.

### Density With Clarity

Investigators need lots of information, but hierarchy must prevent visual overload.

### Confidence-Aware UI

Use:

- Confirmed / observed
- High-confidence attribution
- Probable
- Possible
- Unknown

Avoid presenting inference as fact.

## 3. Visual Direction

Recommended visual language:

- Dark investigation-console theme.
- Neutral surfaces.
- Strong typography.
- Restrained accent color.
- High contrast for risk states.
- Subtle motion.
- Minimal gradients.
- No excessive glassmorphism.

Use animation for:

- Trace progress.
- Graph expansion.
- Case transitions.
- Risk score reveal.
- Evidence drawer.

Do not animate evidence in ways that make reading difficult.

## 4. Information Architecture

```text
Dashboard
├── Cases
│   ├── All Cases
│   ├── High Risk
│   └── My Cases
├── Investigations
├── Wallet Intelligence
├── VASP Intelligence
├── Reports
├── NCRP Intake
├── SAHYOG Requests
└── Audit Log
```

## 5. Dashboard

Top metrics:

```text
Active Cases
High Risk
Critical
Investigations Running
VASP Attributions
```

Recent cases table:

```text
Case ID | Fraud Type | Chain | Amount | Risk | Status | Updated
```

Include quick actions:

- New Investigation
- Search Wallet
- NCRP Intake

## 6. Case Creation

Fields:

- Case ID / external complaint ID.
- Fraud category.
- Reported amount.
- Incident date.
- Blockchain.
- Suspect wallet.
- Notes.
- Optional transaction hash.

Validation:

- Chain-aware address validation.
- Transaction hash format validation.
- Amount and date validation.
- Duplicate-case warning.

## 7. Investigation Workspace

Primary layout:

```text
┌─────────────────────────────────────────────────────────┐
│ Case Header | Status | Risk | Export                    │
├───────────────────────┬─────────────────────────────────┤
│                       │                                 │
│                       │  Investigation Summary          │
│      FUND FLOW        │  Risk / Attribution             │
│       GRAPH           │                                 │
│                       │                                 │
│                       │                                 │
├───────────────────────┴─────────────────────────────────┤
│ Timeline / Transactions / Evidence                      │
└─────────────────────────────────────────────────────────┘
```

## 8. Fund Flow Graph

Node types:

```text
Source
Suspect
Unknown
Cluster
VASP
Scam
Mixer
Sanctioned
```

Node click opens:

- Address.
- Chain.
- Balance snapshot.
- First/last observed activity.
- Transaction count.
- Risk.
- Labels.
- Evidence.

Edge click opens:

- Transaction hash.
- Amount.
- Asset.
- Timestamp.
- From/to.
- Block.
- Provider/source.

Graph controls:

- Hop depth.
- Minimum amount.
- Token.
- Time window.
- Hide low-value transfers.
- Show only suspicious paths.
- Search address.
- Fit graph.
- Reset.

## 9. Timeline

Display chronological activity:

```text
10:31:22  Suspect → Wallet A    1200 USDT
10:33:09  Wallet A → Wallet B    1180 USDT
10:34:12  Wallet B → Wallet C    1175 USDT
10:35:01  Wallet C → VASP        1170 USDT
```

Allow sorting and filtering.

## 10. Risk Panel

Example:

```text
87 / 100
HIGH RISK

Reasons
+30 Known scam interaction
+25 Mixer interaction
+15 Rapid forwarding
+10 High fan-out
+07 Other signals
```

Each reason should link to supporting transactions.

## 11. Attribution Panel

```text
Likely Destination
Example VASP

Confidence
92%

Basis
• Known labeled address
• Fund path terminates in labeled cluster
• Multiple matching transactions

Source
Address Label Database
Last Verified
YYYY-MM-DD
```

If no attribution exists:

```text
No reliable VASP attribution found.
```

Do not force an answer.

## 12. Evidence Drawer

Evidence should be immutable in the investigation context.

Display:

- Transaction hash.
- Address.
- Block.
- Timestamp.
- Asset.
- Amount.
- Source/provider.
- Detection rule.
- Evidence ID.

Provide copy buttons and explorer navigation where permitted.

## 13. Report UX

Button:

**Generate Investigation Report**

Options:

- Full report.
- Executive summary.
- Evidence appendix.

Report status:

```text
Queued → Generating → Ready
```

## 14. NCRP Mock Intake

Create an intake form representing a future authorized integration.

Flow:

```text
Complaint received
      ↓
Extract suspect wallet
      ↓
Create case
      ↓
Start investigation
```

Clearly label the demo integration as **Mock / Sandbox**.

## 15. SAHYOG Mock Workflow

Provide:

**Request VASP Information**

Then show:

```text
Draft
→ Review
→ Submitted (Demo)
→ Pending Response
```

Never imply a real government request was sent unless an authorized integration exists.

## 16. Responsive Behavior

Desktop-first because investigator workflows are information dense.

Tablet:

- Collapse side navigation.
- Stack summary panels.
- Keep graph usable.

Mobile:

- Read-only investigation view.
- Simplified graph.
- No assumption that full analyst workflow happens on mobile.

## 17. Accessibility

- Keyboard navigation.
- Visible focus states.
- Sufficient contrast.
- Text labels alongside risk indicators.
- Do not use color as the only signal.
- Screen-reader labels for graph controls.
