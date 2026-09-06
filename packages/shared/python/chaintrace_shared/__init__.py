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


ADDRESS_VALIDATION_PATTERNS = {
    BlockchainType.TRON: re.compile(r"^T[1-9A-HJ-NP-za-km-z]{33}$"),
    BlockchainType.ETHEREUM: re.compile(r"^0x[a-fA-F0-9]{40}$"),
    BlockchainType.BITCOIN: re.compile(r"^(bc1[a-zA-HJ-NP-Z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$"),
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
