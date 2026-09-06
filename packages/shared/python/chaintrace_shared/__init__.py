"""
ChainTrace Shared Python Constants, Enums, and Validators
Corresponds directly to @chaintrace/shared and @chaintrace/types
"""
import re
from enum import Enum


class BlockchainType(str, Enum):
    TRON = "tron"
    ETHEREUM = "ethereum"
    BITCOIN = "bitcoin"
    BINANCE_SMART_CHAIN = "bsc"
    POLYGON = "polygon"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AttributionConfidence(str, Enum):
    CONFIRMED = "CONFIRMED"
    PROBABLE = "PROBABLE"
    POSSIBLE = "POSSIBLE"
    UNKNOWN = "UNKNOWN"


class EntityType(str, Enum):
    EXCHANGE = "EXCHANGE"
    VASP = "VASP"
    CUSTODIAN = "CUSTODIAN"
    MIXER = "MIXER"
    BRIDGE = "BRIDGE"
    SCAM = "SCAM"
    SANCTIONED_ENTITY = "SANCTIONED_ENTITY"
    OTHER = "OTHER"


class AttributionStatus(str, Enum):
    MATCHED = "MATCHED"
    CONFLICTING_LABELS = "CONFLICTING_LABELS"
    UNKNOWN = "UNKNOWN"


class CaseStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    UNDER_REVIEW = "UNDER_REVIEW"
    CLOSED = "CLOSED"


class CasePriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    INVESTIGATOR = "INVESTIGATOR"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class TraceDirection(str, Enum):
    FORWARD = "FORWARD"
    BACKWARD = "BACKWARD"
    BOTH = "BOTH"


class TerminalReason(str, Enum):
    NO_OUTGOING_TRANSFERS = "NO_OUTGOING_TRANSFERS"
    MAX_HOPS_REACHED = "MAX_HOPS_REACHED"
    BELOW_AMOUNT_THRESHOLD = "BELOW_AMOUNT_THRESHOLD"
    OUTSIDE_TIME_WINDOW = "OUTSIDE_TIME_WINDOW"
    SAFETY_LIMIT_REACHED = "SAFETY_LIMIT_REACHED"
    CYCLE_DETECTED = "CYCLE_DETECTED"


class FindingType(str, Enum):
    RAPID_FORWARDING = "RAPID_FORWARDING"
    HIGH_FAN_OUT = "HIGH_FAN_OUT"
    HIGH_FAN_IN = "HIGH_FAN_IN"
    PEEL_CHAIN = "PEEL_CHAIN"
    CONSOLIDATION = "CONSOLIDATION"
    ROUND_AMOUNT_PATTERN = "ROUND_AMOUNT_PATTERN"
    REPEATED_DESTINATION = "REPEATED_DESTINATION"
    SUSPICIOUS_VELOCITY = "SUSPICIOUS_VELOCITY"
    KNOWN_RISK_INTERACTION = "KNOWN_RISK_INTERACTION"


class FindingSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


ADDRESS_VALIDATION_PATTERNS = {
    BlockchainType.TRON: re.compile(r"^T[1-9A-HJ-NP-za-km-z]{33}$"),
    BlockchainType.ETHEREUM: re.compile(r"^0x[a-fA-F0-9]{40}$"),
    BlockchainType.BITCOIN: re.compile(r"^(bc1[a-zA-HJ-NP-Z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$"),
    BlockchainType.BINANCE_SMART_CHAIN: re.compile(r"^0x[a-fA-F0-9]{40}$"),
    BlockchainType.POLYGON: re.compile(r"^0x[a-fA-F0-9]{40}$"),
}


def is_valid_address(chain: str | BlockchainType, address: str) -> bool:
    if not address or not isinstance(address, str):
        return False
    try:
        chain_enum = BlockchainType(chain.lower())
    except ValueError:
        return False

    pattern = ADDRESS_VALIDATION_PATTERNS.get(chain_enum)
    return bool(pattern and pattern.match(address.strip()))
