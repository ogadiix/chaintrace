/**
 * ChainTrace Shared Type Definitions
 * Source of truth: docs/PRD.md, docs/architecture.md, docs/security.md
 */

export type BlockchainType = 'tron' | 'ethereum' | 'bitcoin';

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

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

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
