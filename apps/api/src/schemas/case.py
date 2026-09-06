"""
Case & Complaint Pydantic Schemas
"""
from chaintrace_shared import BlockchainType, CasePriority, CaseStatus, is_valid_address
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CreateCaseSchema(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    complaintId: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=5000)
    fraudCategory: str = Field(default="OTHER")
    reportedAmount: str = Field(default="0")
    currency: str = Field(default="USD", max_length=10)
    incidentDate: str = Field(..., min_length=4, max_length=50)
    targetChain: BlockchainType
    suspectWallet: str = Field(..., min_length=10, max_length=255)
    initialTxHash: str | None = Field(default=None, max_length=255)
    priority: CasePriority = CasePriority.MEDIUM

    @field_validator("suspectWallet")
    @classmethod
    def validate_wallet(cls, value: str, info) -> str:
        chain = info.data.get("targetChain")
        if chain and not is_valid_address(chain, value):
            raise ValueError(f"Invalid wallet address '{value}' for chain '{chain}'")
        return value.strip()


class UpdateCaseSchema(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    complaintId: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=5000)
    status: CaseStatus | None = None
    priority: CasePriority | None = None
    assignedToId: str | None = None


class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    caseNumber: str
    complaintId: str | None
    title: str
    description: str | None
    fraudCategory: str
    reportedAmount: str
    currency: str
    incidentDate: str
    targetChain: str
    suspectWallet: str
    initialTxHash: str | None
    status: str
    priority: str
    assignedToId: str | None
    createdById: str
    createdAt: str
    updatedAt: str


class CaseListResponse(BaseModel):
    cases: list[CaseResponse]
    total: int
