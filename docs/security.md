# ChainTrace — Security Architecture & Threat Model

## 1. Security Objective

ChainTrace handles investigative case information and blockchain intelligence. Security must protect:

- Investigator accounts.
- Complaint information.
- Investigation metadata.
- Evidence references.
- Internal VASP labels.
- Reports.
- Audit records.
- API credentials.

The system must preserve confidentiality, integrity, availability, and evidentiary traceability.

## 2. Security Principles

### Least Privilege

Users receive only the permissions required for their role.

### Zero Trust Between Services

Backend services should authenticate where practical and never assume internal traffic is automatically trusted.

### Evidence Integrity

Observed blockchain data and derived findings must retain provenance.

### Secure by Default

Unsafe configuration should fail closed.

### Explainable Intelligence

Inference must not be stored as an unquestionable fact.

## 3. Threat Model

### T1 — Unauthorized Account Access

Attacker obtains investigator credentials.

Mitigations:

- Strong password policy.
- Secure session handling.
- MFA-ready architecture.
- Short-lived access tokens.
- Refresh-token rotation where applicable.
- Account lock/rate limits.

### T2 — Broken Authorization

Investigator accesses another team's case.

Mitigations:

- Server-side RBAC.
- Case-level authorization.
- Never rely on frontend hiding.
- Automated authorization tests.

### T3 — Malicious Wallet Input

Attacker submits malformed or adversarial input.

Mitigations:

- Strict schema validation.
- Chain-specific address validation.
- Length limits.
- Allowlisted chain identifiers.
- Safe query construction.
- No shell execution from input.

### T4 — API Abuse

Attacker causes excessive blockchain-provider calls.

Mitigations:

- Per-user rate limits.
- Per-case trace quotas.
- Maximum hop depth.
- Minimum amount filters.
- Request timeouts.
- Queue limits.
- Provider quotas.

### T5 — Graph Explosion / Resource Exhaustion

A highly connected wallet creates millions of candidate paths.

Mitigations:

- Maximum hop count.
- Maximum nodes/edges per job.
- Amount thresholds.
- Time windows.
- Visited sets.
- Path ranking.
- Job timeout.
- Circuit breaker.

### T6 — Provider Compromise or Bad Data

External blockchain API returns malformed or incomplete data.

Mitigations:

- Adapter isolation.
- Response validation.
- Provider metadata.
- Hash/transaction consistency checks where possible.
- Explicit partial-data state.
- Never silently treat missing data as zero.

### T7 — False Attribution

A wallet is incorrectly attributed to a VASP.

Mitigations:

- Source metadata.
- Confidence levels.
- Verification dates.
- Multiple supporting signals.
- Exact-match preference.
- Human-review workflow.
- UI language: "likely", "probable", "observed".

### T8 — False Risk Classification

An innocent wallet receives a high score.

Mitigations:

- Explainable rules.
- Evidence references.
- Versioned scoring rules.
- Human review.
- No automatic legal conclusion.
- Store score version.

### T9 — Report Tampering

Generated report is altered after investigation.

Mitigations:

- Generate from stored investigation state.
- Store report hash.
- Immutable audit event.
- Version report metadata.
- Restrict report modification.

### T10 — Secret Leakage

API keys appear in source control or logs.

Mitigations:

- Environment/secret manager.
- Secret scanning.
- No secrets in frontend bundles.
- Redacted logs.
- Key rotation.

## 4. Authentication

Recommended:

```text
Frontend
   ↓ HTTPS
Auth
   ↓
Access Token
   ↓
FastAPI
```

Passwords:

- Argon2id/bcrypt.
- Never plaintext.
- Never reversible encryption.

Session security:

- Secure cookies where cookie sessions are used.
- HttpOnly.
- SameSite.
- CSRF protection for cookie-authenticated state-changing operations.

## 5. Authorization

Example permission matrix:

| Capability | Admin | Investigator | Analyst | Viewer |
|---|---:|---:|---:|---:|
| View cases | ✓ | ✓ | ✓ | ✓ |
| Create cases | ✓ | ✓ | ✓ | - |
| Run trace | ✓ | ✓ | ✓ | - |
| View evidence | ✓ | ✓ | ✓ | ✓ |
| Generate report | ✓ | ✓ | ✓ | - |
| Manage users | ✓ | - | - | - |
| Manage labels | ✓ | - | ✓ | - |
| Submit VASP request | ✓ | ✓ | - | - |

Authorization is enforced on the backend.

## 6. Data Protection

### In Transit

Use HTTPS/TLS for:

- Browser → API.
- API → providers.
- Service → service.
- Database connections where supported.

### At Rest

Production should encrypt:

- PostgreSQL.
- Neo4j.
- Redis where persistent.
- Report/object storage.

## 7. Secrets

Never commit:

```text
API keys
JWT secrets
Database passwords
Private keys
Provider credentials
```

Use:

```text
.env.local        # development only
Secret Manager    # production
```

Add secret scanning to CI.

## 8. Input Security

Validate:

- JSON schema.
- Address.
- Transaction hash.
- Chain.
- Hop count.
- Time range.
- Amount.

Example safe limits:

```text
max_hops: 10
max_nodes_per_job: 10,000
max_edges_per_job: 25,000
max_time_window: configurable
```

These are defensive defaults and should be tuned after testing.

## 9. Database Security

PostgreSQL:

- Separate application user.
- No superuser application credentials.
- Parameterized queries/ORM.
- Backups encrypted.
- Restricted network access.

Neo4j:

- Separate credentials.
- Parameterized Cypher.
- Query timeouts.
- Restricted network exposure.

Redis:

- Never publicly expose.
- Authentication where supported.
- Network isolation.

## 10. Audit Logging

Audit important actions:

```text
LOGIN
LOGOUT
CASE_CREATED
CASE_VIEWED
CASE_UPDATED
TRACE_STARTED
TRACE_COMPLETED
REPORT_GENERATED
LABEL_UPDATED
VASP_REQUEST_CREATED
PERMISSION_CHANGED
```

Audit event fields:

```text
event_id
actor_id
action
case_id
timestamp
source_ip
result
metadata
```

Do not log sensitive secrets or unnecessary personal data.

## 11. Evidence Provenance

Every derived finding should maintain:

```text
finding_id
source_transaction
source_wallet
rule_id
rule_version
created_at
engine_version
```

This allows investigators to reconstruct why a finding was produced.

## 12. Risk Engine Security

Risk rules must be versioned.

Example:

```text
risk_ruleset: v1.3
rule:
  id: MIXER_INTERACTION
  weight: 25
```

When a score is generated, store the exact ruleset version.

Do not silently change historical scores.

## 13. Attribution Security

Address labels are high-impact intelligence.

Each label should have:

```text
entity
address
chain
label_type
confidence
source
source_url
verified_at
verified_by
status
```

Changes should create audit events.

No single unverified source should automatically become a high-confidence attribution.

## 14. External Provider Security

Use:

- HTTPS.
- Timeouts.
- Retry with backoff.
- Rate limiting.
- Response schema validation.
- Provider health checks.

Never trust external API content as executable data.

## 15. Report Security

Generated PDFs should:

- Be stored with access control.
- Use unpredictable identifiers.
- Avoid public URLs.
- Have short-lived download links where applicable.
- Include report ID and generation timestamp.
- Include provenance metadata.
- Optionally include a SHA-256 hash.

## 16. Privacy

Only collect information necessary for the investigation.

Avoid collecting:

- Unnecessary victim personal data.
- Passwords.
- Private keys.
- Seed phrases.
- Wallet credentials.

**Never ask a user to provide a private key or seed phrase.**

## 17. Government Integration Security

For real NCRP/SAHYOG connectivity:

- Use only officially authorized APIs.
- Follow government authentication requirements.
- Use mTLS/signing if mandated.
- Maintain request/response audit trails.
- Apply strict access controls.
- Do not fabricate successful government submissions.

For the SIH MVP, use a clearly labeled mock/sandbox integration.

## 18. Dependency Security

CI should include:

- Dependency vulnerability scanning.
- Secret scanning.
- Static analysis.
- Container image scanning.
- Lockfiles.
- Regular dependency updates.

## 19. Incident Response

If compromise is suspected:

```text
Detect
 ↓
Contain
 ↓
Revoke credentials
 ↓
Preserve audit logs
 ↓
Investigate
 ↓
Rotate secrets
 ↓
Recover
 ↓
Review
```

Maintain a security incident runbook.

## 20. Security Testing

Before demo:

### Authentication

- Invalid credentials.
- Session expiry.
- Token replay.
- Brute-force limits.

### Authorization

- Cross-case access.
- Role escalation.
- Direct API access to restricted resources.

### Input

- Invalid addresses.
- Oversized payloads.
- Injection attempts.
- Extreme hop values.

### Infrastructure

- Exposed databases.
- Open Redis.
- Debug mode.
- Default passwords.
- Missing TLS in production.

## 21. Security Definition of Done & Phase 11 Verification

The system has undergone comprehensive Phase 11 Security Hardening & Threat Testing:

- **Secret Validation**: Refuses to start in non-development mode with default/placeholder JWT secrets.
- **Credential Sourcing**: Demo passwords sourced from environment variables (`DEMO_*_PASSWORD`).
- **Object-Level Authorization (IDOR/BOLA)**: Centralized `verify_case_access` and `verify_report_access` enforced across all case, report, intelligence, attribution, risk, and integration endpoints. Returns 404 to prevent ID enumeration.
- **Rate Limiting**: Sliding-window in-memory limiter enforcing configurable per-minute thresholds on login, traces, reports, and API mutations.
- **Defensive HTTP Headers**: Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and strict `Content-Security-Policy`.
- **CORS Restriction**: Restricted to allowed origins with explicit allowed methods (`GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`) and headers.
- **Input Validation**: Strict Pydantic validators on wallet formats across chains (TRON, EVM, BTC), length bounds, and enumerated scenario inputs.
- **Error Sanitization**: Global exception handler prevents exposure of stack traces, SQL, Cypher, or filesystem paths to API clients.
- **Container Hardening**: Dockerfiles enforce non-root `appuser` execution; docker-compose binds database ports exclusively to `127.0.0.1` with environment variable substitution.
- **Automated Security Test Suite**: 11 dedicated security tests in `test_security.py` validating authentication bypass rejection, IDOR prevention, SQL/Cypher/XSS injection resilience, rate limiting, and defensive headers. All 75 test cases passing.
