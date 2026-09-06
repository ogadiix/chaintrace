import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ALLOWED_SCENARIOS = {"SUCCESS", "NO_MATCH", "PROCESSING", "REQUEST_FAILED", "FREEZE_REQUEST_DEMO"}
ALLOWED_REQUEST_TYPES = {
    "ACCOUNT_IDENTIFICATION",
    "TRANSACTION_INFORMATION",
    "KYC_INFORMATION",
    "ACCOUNT_ACTIVITY",
    "FREEZE_REQUEST_DEMO",
}


class NcrpComplaintCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    complaint_id: str = Field(..., min_length=1, max_length=64, description="External NCRP complaint identifier")
    category: str = Field(default="CRYPTO_FRAUD", max_length=64, description="Incident taxonomy")
    reported_amount: str = Field(default="50000", max_length=32, description="Victim reported loss")
    currency: str = Field(default="INR", min_length=1, max_length=16, description="Fiat or crypto currency symbol")
    blockchain: str = Field(..., min_length=3, max_length=32, description="Blockchain network (e.g. tron, ethereum)")
    wallet_address: str = Field(..., min_length=10, max_length=128, description="Suspect/destination wallet address")
    transaction_hash: str | None = Field(default=None, max_length=128, description="Initial transfer hash")
    description: str | None = Field(default=None, max_length=2048, description="Complaint factual narrative")
    victim_reference: str | None = Field(default=None, max_length=128, description="Synthetic victim reference")
    auto_create_case: bool = Field(
        default=True, description="Automatically generate a ChainTrace investigation case"
    )

    @field_validator("wallet_address")
    @classmethod
    def validate_wallet_format(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^(0x[a-fA-F0-9]{40}|T[A-Za-z1-9]{33}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}|[a-zA-Z0-9_-]{10,128})$", v):
            raise ValueError("Invalid wallet address format")
        return v


class NcrpComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    complaintId: str
    source: str
    category: str
    reportedAmount: str
    currency: str
    blockchain: str
    walletAddress: str
    transactionHash: str | None = None
    description: str | None = None
    victimReference: str | None = None
    status: str
    caseId: str | None = None
    caseNumber: str | None = None
    createdAt: str
    disclaimer: str = "SIMULATED NCRP INTEGRATION — HACKATHON DEMO ONLY"


class NcrpComplaintListResponse(BaseModel):
    complaints: list[NcrpComplaintResponse]
    total: int


class SahyogRequestCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request_type: str = Field(
        default="ACCOUNT_IDENTIFICATION",
        description="ACCOUNT_IDENTIFICATION, TRANSACTION_INFORMATION, KYC_INFORMATION, ACCOUNT_ACTIVITY, FREEZE_REQUEST_DEMO",
    )
    recipient_entity: str = Field(..., min_length=2, max_length=128, description="Target VASP or Exchange name")
    target_wallet: str = Field(..., min_length=10, max_length=128, description="Blockchain address for inquiry")
    transaction_hash: str | None = Field(default=None, max_length=128, description="Related transfer hash")
    authority_reference: str = Field(
        default="SEC-91-CrPC-DEMO-2026-441", max_length=128, description="Statutory authority reference"
    )
    requested_information: str = Field(
        default="Account identification, registration KYC records, and recent deposit activity.",
        max_length=2048,
        description="Factual information requested",
    )
    simulated_scenario: str = Field(
        default="SUCCESS",
        description="Deterministic response mode: SUCCESS, NO_MATCH, PROCESSING, REQUEST_FAILED, FREEZE_REQUEST_DEMO",
    )

    @field_validator("request_type")
    @classmethod
    def validate_request_type(cls, v: str) -> str:
        if v not in ALLOWED_REQUEST_TYPES:
            raise ValueError(f"Invalid request_type '{v}'. Allowed: {sorted(ALLOWED_REQUEST_TYPES)}")
        return v

    @field_validator("simulated_scenario")
    @classmethod
    def validate_scenario(cls, v: str) -> str:
        if v not in ALLOWED_SCENARIOS:
            raise ValueError(f"Invalid simulated_scenario '{v}'. Allowed: {sorted(ALLOWED_SCENARIOS)}")
        return v

    @field_validator("target_wallet")
    @classmethod
    def validate_target_wallet(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^(0x[a-fA-F0-9]{40}|T[A-Za-z1-9]{33}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}|[a-zA-Z0-9_-]{10,128})$", v):
            raise ValueError("Invalid target wallet format")
        return v


class SahyogResponseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    requestId: str
    caseId: str
    status: str
    source: str
    recipientEntity: str
    accountDetails: dict[str, Any] = Field(default_factory=dict)
    transactions: list[dict[str, Any]] = Field(default_factory=list)
    evidenceId: str | None = None
    disclaimer: str = "SIMULATED RESPONSE — FOR HACKATHON DEMONSTRATION ONLY"
    receivedAt: str


class SahyogRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    requestNumber: str
    caseId: str
    investigationId: str
    requestType: str
    recipientEntity: str
    targetWallet: str
    transactionHash: str | None = None
    authorityReference: str
    requestedInformation: str
    status: str
    simulatedScenario: str
    createdById: str
    createdAt: str
    submittedAt: str | None = None
    completedAt: str | None = None
    response: SahyogResponseModel | None = None
    disclaimer: str = "SIMULATED SAHYOG COORDINATION — HACKATHON DEMO ONLY"


class SahyogRequestListResponse(BaseModel):
    requests: list[SahyogRequestResponse]
    total: int
