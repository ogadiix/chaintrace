/**
 * ChainTrace Shared Type Definitions
 * Source of truth: docs/PRD.md, docs/architecture.md, docs/security.md
 */

export type BlockchainType = 'tron' | 'ethereum' | 'bitcoin' | 'bsc' | 'polygon';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AttributionConfidence = 'CONFIRMED' | 'PROBABLE' | 'POSSIBLE' | 'UNKNOWN';

export type CaseStatus = 'DRAFT' | 'ACTIVE' | 'UNDER_REVIEW' | 'CLOSED';

export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FraudCategory = 
  | 'INVESTMENT_FRAUD'
  | 'PIG_BUTCHERING'
  | 'IMPERSONATION'
  | 'RANSOMWARE'
  | 'PHISHING'
  | 'EXTORTION'
  | 'UNAUTHORIZED_TRANSFER'
  | 'OTHER';

export type UserRole = 'ADMIN' | 'INVESTIGATOR' | 'ANALYST' | 'VIEWER';

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export type TraceDirection = 'FORWARD' | 'BACKWARD' | 'BOTH';

export type TerminalReason = 
  | 'NO_OUTGOING_TRANSFERS'
  | 'MAX_HOPS_REACHED'
  | 'BELOW_AMOUNT_THRESHOLD'
  | 'OUTSIDE_TIME_WINDOW'
  | 'SAFETY_LIMIT_REACHED'
  | 'CYCLE_DETECTED';

export interface TraceHop {
  hopNumber: number;
  fromWallet: string;
  toWallet: string;
  txHash: string;
  chain: BlockchainType;
  asset: string;
  tokenContract?: string | null;
  amount: string;
  fee: string;
  timestamp: string;
  // Python FastAPI snake_case compatibility
  hop_number?: number;
  from_wallet?: string;
  to_wallet?: string;
  tx_hash?: string;
  token_contract?: string | null;
}

export interface TracePath {
  pathId: string;
  hops: TraceHop[];
  totalAmount: string;
  terminalWallet: string;
  terminalReason: TerminalReason;
  // Python FastAPI snake_case compatibility
  path_id?: string;
  total_amount?: string;
  terminal_wallet?: string;
  terminal_reason?: TerminalReason;
}

export interface TraceRequest {
  chain: BlockchainType;
  seedWallet: string;
  maxHops?: number;
  minimumAmount?: string;
  startTime?: string;
  endTime?: string;
  asset?: string;
  direction?: TraceDirection;
}

export interface TraceResult {
  investigationId?: string;
  jobId?: string;
  seed: {
    chain: BlockchainType;
    address: string;
  };
  configuration: TraceRequest;
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: TracePath[];
  terminals: Array<{ wallet: string; reason: TerminalReason }>;
  statistics: {
    nodes: number;
    edges: number;
    paths: number;
    maxHopReached: number;
    durationMs: number;
    max_hop_reached?: number;
    duration_ms?: number;
  };
  status: JobStatus;
  message?: string | null;
}

export interface TraceJob {
  id: string;
  investigationId?: string;
  chain: BlockchainType;
  seedWallet: string;
  status: JobStatus;
  progress?: {
    nodesProcessed?: number;
    edgesProcessed?: number;
    pathsFound?: number;
    maxHopReached?: number;
    elapsedMs?: number;
    nodes_processed?: number;
    edges_processed?: number;
    paths_found?: number;
    max_hop_reached?: number;
    elapsed_ms?: number;
  };
  result?: TraceResult | null;
  errorMessage?: string | null;
  error_message?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface Case {
  id: string;
  caseNumber: string; // e.g. CT-2026-0001
  complaintId?: string | null;
  title: string;
  description?: string | null;
  fraudCategory: FraudCategory;
  reportedAmount: string; // Stored as string to preserve precision
  currency: string;
  incidentDate: string;
  targetChain: BlockchainType;
  suspectWallet: string;
  initialTxHash?: string | null;
  status: CaseStatus;
  priority: CasePriority;
  assignedToId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseRequest {
  title: string;
  complaintId?: string;
  description?: string;
  fraudCategory: FraudCategory;
  reportedAmount: string;
  currency?: string;
  incidentDate: string;
  targetChain: BlockchainType;
  suspectWallet: string;
  initialTxHash?: string;
  priority?: CasePriority;
}

export interface UpdateCaseRequest {
  title?: string;
  description?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  assignedToId?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  caseId?: string | null;
  timestamp: string;
  sourceIp?: string | null;
  result: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown>;
}

export interface NormalizedTransaction {
  chain: BlockchainType;
  txHash: string;
  blockNumber: number;
  timestamp: string; // ISO 8601
  fromAddress: string;
  toAddress: string;
  asset: string; // e.g., 'USDT', 'TRX', 'ETH', 'BTC'
  tokenContract?: string | null;
  amount: string; // Decimal string to avoid precision loss
  fee: string;
  direction: 'INCOMING' | 'OUTGOING';
  provider: string;
  rawReference: Record<string, unknown>;
}

export interface GraphNode {
  id: string; // Wallet address
  label: string;
  chain: BlockchainType;
  nodeType: 'SOURCE' | 'SUSPECT' | 'INTERMEDIARY' | 'VASP' | 'MIXER' | 'SCAM' | 'UNKNOWN';
  balanceSnapshot?: string;
  transactionCount?: number;
  riskScore?: number;
  tags: string[];
}

export interface GraphEdge {
  id: string;
  source: string; // From address
  target: string; // To address
  txHash: string;
  asset: string;
  amount: string;
  timestamp: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  timestamp: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'fallback_mode';
      engine: string;
    };
    neo4j: {
      status: 'connected' | 'disconnected' | 'mock_mode';
    };
    redis: {
      status: 'connected' | 'disconnected' | 'mock_mode';
    };
  };
}

export type FindingType =
  | 'RAPID_FORWARDING'
  | 'HIGH_FAN_OUT'
  | 'HIGH_FAN_IN'
  | 'PEEL_CHAIN'
  | 'CONSOLIDATION'
  | 'ROUND_AMOUNT_PATTERN'
  | 'REPEATED_DESTINATION'
  | 'SUSPICIOUS_VELOCITY'
  | 'KNOWN_RISK_INTERACTION';

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EvidenceReference {
  type: 'TRANSACTION' | 'WALLET' | 'PATH' | 'GRAPH_EDGE';
  refId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  // Snake_case aliases
  ref_id?: string;
}

export interface IntelligenceFinding {
  findingId: string;
  investigationId?: string | null;
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  description: string;
  observedFact: string;
  interpretation: string;
  confidence: number; // 0.0 to 1.0 (Pattern match confidence)
  evidenceRefs: EvidenceReference[];
  ruleId: string;
  ruleVersion: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  // Snake_case aliases
  finding_id?: string;
  investigation_id?: string | null;
  observed_fact?: string;
  evidence_refs?: EvidenceReference[];
  rule_id?: string;
  rule_version?: string;
  created_at?: string;
}

export interface IntelligenceAnalysisResult {
  investigationId?: string | null;
  findings: IntelligenceFinding[];
  statistics: {
    totalFindings: number;
    severityCounts: Record<FindingSeverity, number>;
    rulesExecuted: number;
    walletsAnalyzed: number;
    transactionsAnalyzed: number;
    durationMs: number;
  };
  rulesExecuted: string[];
  analysisTimestamp: string;
  engineVersion: string;
}

export type EntityType =
  | 'EXCHANGE'
  | 'VASP'
  | 'CUSTODIAN'
  | 'MIXER'
  | 'BRIDGE'
  | 'SCAM'
  | 'SANCTIONED_ENTITY'
  | 'OTHER';

export type AttributionStatus = 'MATCHED' | 'CONFLICTING_LABELS' | 'UNKNOWN';

export interface VaspEntity {
  entityId: string;
  name: string;
  entityType: EntityType;
  jurisdiction?: string | null;
  status: string;
  source: string;
  sourceUrl?: string | null;
  confidence: AttributionConfidence;
  website?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // snake_case
  entity_id?: string;
  entity_type?: EntityType;
  source_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WalletLabel {
  chain: BlockchainType;
  address: string;
  entityId: string;
  labelType: string;
  confidence: AttributionConfidence;
  source: string;
  sourceReference?: string | null;
  isDemo?: boolean;
  notes?: string | null;
  // snake_case
  entity_id?: string;
  label_type?: string;
  source_reference?: string | null;
  is_demo?: boolean;
}

export interface WalletAttribution {
  wallet: string;
  chain: BlockchainType;
  status: AttributionStatus;
  entity?: VaspEntity | null;
  confidence: AttributionConfidence;
  confidenceScore: number;
  confidenceReasons: string[];
  evidence: EvidenceReference[];
  labels: WalletLabel[];
  datasetVersion: string;
  attributedVia: 'EXACT_MATCH' | 'PATH_ENDPOINT' | 'CLUSTER' | 'NONE';
  // snake_case
  confidence_score?: number;
  confidence_reasons?: string[];
  dataset_version?: string;
  attributed_via?: string;
}

export interface AttributionAnalysisResult {
  investigationId?: string | null;
  seedWallet: string;
  matchedCount: number;
  unknownCount: number;
  conflictCount: number;
  attributions: WalletAttribution[];
  terminalAttributions: WalletAttribution[];
  datasetVersion: string;
  engineVersion: string;
  analyzedAt: string;
  // snake_case
  investigation_id?: string | null;
  seed_wallet?: string;
  matched_count?: number;
  unknown_count?: number;
  conflict_count?: number;
  terminal_attributions?: WalletAttribution[];
  dataset_version?: string;
  engine_version?: string;
  analyzed_at?: string;
}

export interface RiskSignalContribution {
  signal: string;
  category: string;
  rawWeight: number;
  effectiveWeight: number;
  weight?: number;
  reason: string;
  source?: string;
  evidenceRefs: EvidenceReference[];
  metadata?: Record<string, unknown>;
  // snake_case
  raw_weight?: number;
  effective_weight?: number;
  evidence_refs?: EvidenceReference[];
}


export interface RiskAssessment {
  assessmentId: string;
  investigationId: string;
  seedWallet: string;
  score: number; // 0 to 100
  riskLevel: RiskLevel;
  contributions: RiskSignalContribution[];
  reasons: string[];
  evidence: EvidenceReference[];
  evidenceRefs?: EvidenceReference[];
  manualOverride?: {
    overriddenBy: string;
    overriddenAt: string;
    originalLevel: RiskLevel;
    overrideLevel: RiskLevel;
    reason: string;
  } | null;
  engineVersion: string;
  intelligenceEngineVersion: string;
  attributionDatasetVersion: string;
  createdAt: string;
  updatedAt: string;
  // snake_case
  assessment_id?: string;
  investigation_id?: string;
  seed_wallet?: string;
  risk_level?: RiskLevel;
  evidence_refs?: EvidenceReference[];
  manual_override?: {

    overridden_by: string;
    overridden_at: string;
    original_level: RiskLevel;
    override_level: RiskLevel;
    reason: string;
  } | null;
  engine_version?: string;
  intelligence_engine_version?: string;
  attribution_dataset_version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RiskAnalysisRequest {
  maxHops?: number;
  config?: Record<string, unknown>;
  // snake_case
  max_hops?: number;
}

export type CanvasNodeRole = 'VICTIM' | 'SUSPECT' | 'MULE' | 'CONSOLIDATOR' | 'VASP' | 'MIXER' | 'SANCTIONED' | 'SCAM' | 'UNKNOWN';

export interface GraphCanvasNode {
  id: string;
  address: string;
  chain: string;
  label: string;
  role: CanvasNodeRole;
  hopLevel: number;
  entityName?: string | null;
  entityType?: EntityType | null;
  riskScore?: number;
  isDemo?: boolean;
  totalInflow?: string;
  totalOutflow?: string;
  txCount?: number;
  x?: number;
  y?: number;
}

export interface GraphCanvasEdge {
  id: string;
  source: string;
  target: string;
  txHash: string;
  chain: string;
  asset: string;
  amount: string;
  timestamp: string;
  hopNumber: number;
  isDemo?: boolean;
  highlighted?: boolean;
}

export interface GraphSelectionState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  highlightedPathIds: string[];
}

export interface InvestigationTimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface InvestigationReport {
  id: string;
  caseId: string;
  investigationId: string;
  reportNumber: string;
  version: string;
  title: string;
  filename: string;
  fileSizeBytes: number;
  sha256Hash: string | null;
  status: 'QUEUED' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string | null;
  createdById: string;
  createdAt: string;
  completedAt?: string | null;
  downloadUrl: string;
  previewUrl: string;
  summarySnapshot?: Record<string, any>;
}

export interface ReportGenerateRequest {
  title?: string;
  include_tx_appendix?: boolean;
  max_appendix_txs?: number;
  notes?: string;
  async_mode?: boolean;
}

export interface ReportListResponse {
  reports: InvestigationReport[];
  total: number;
}

// ---------------------------------------------------------------------------
// Phase 10: NCRP & SAHYOG Integration Types
// ---------------------------------------------------------------------------

export type SahyogRequestType =
  | 'ACCOUNT_IDENTIFICATION'
  | 'TRANSACTION_INFORMATION'
  | 'KYC_INFORMATION'
  | 'ACCOUNT_ACTIVITY'
  | 'FREEZE_REQUEST_DEMO';

export type SahyogScenario =
  | 'SUCCESS'
  | 'NO_MATCH'
  | 'PROCESSING'
  | 'REQUEST_FAILED'
  | 'FREEZE_REQUEST_DEMO';

export interface NcrpComplaint {
  id: string;
  complaint_id: string;
  source: string;
  category: string;
  reported_amount: string;
  currency: string;
  blockchain: string;
  wallet_address: string;
  transaction_hash?: string | null;
  description?: string | null;
  victim_reference?: string | null;
  status: string;
  case_id?: string | null;
  case_number?: string | null;
  created_at: string;
  updated_at: string;
  disclaimer: string;
}

export interface NcrpComplaintCreate {
  complaint_id: string;
  category: string;
  reported_amount: string;
  currency?: string;
  blockchain: string;
  wallet_address: string;
  transaction_hash?: string | null;
  description?: string | null;
  victim_reference?: string | null;
  auto_create_case?: boolean;
}

export interface SahyogResponse {
  id: string;
  request_id: string;
  case_id: string;
  status: string;
  source: string;
  recipient_entity: string;
  account_details: Record<string, unknown>;
  transactions: Array<Record<string, unknown>>;
  evidence_id?: string | null;
  disclaimer: string;
  received_at: string;
}

export interface SahyogRequest {
  id: string;
  request_number: string;
  case_id: string;
  investigation_id: string;
  request_type: SahyogRequestType;
  recipient_entity: string;
  target_wallet: string;
  transaction_hash?: string | null;
  authority_reference: string;
  requested_information: string;
  status: string;
  simulated_scenario: SahyogScenario;
  created_by_id: string;
  created_at: string;
  submitted_at?: string | null;
  completed_at?: string | null;
  disclaimer: string;
  response?: SahyogResponse | null;
}

export interface SahyogRequestCreate {
  case_id: string;
  request_type: SahyogRequestType;
  recipient_entity: string;
  target_wallet: string;
  transaction_hash?: string | null;
  authority_reference?: string;
  requested_information?: string;
  simulated_scenario?: SahyogScenario;
}



