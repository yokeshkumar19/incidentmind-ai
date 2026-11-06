from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=15)
    affected_service: str = Field(..., min_length=2, max_length=128)
    severity: str = Field(default="High", pattern="^(Critical|High|Medium|Low)$")
    environment: str = Field(default="Production", min_length=2, max_length=64)
    error_logs: Optional[str] = Field(default="")


class IncidentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=15)
    affected_service: Optional[str] = None
    severity: Optional[str] = Field(None, pattern="^(Critical|High|Medium|Low)$")
    environment: Optional[str] = None
    error_logs: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(Investigating|Monitoring|Resolved)$")


class IncidentResponse(BaseModel):
    id: str
    team_id: str
    reported_by: Optional[str] = None
    reporter_name: Optional[str] = "Anonymous"
    title: str
    description: str
    affected_service: str
    severity: str
    environment: str
    error_logs: Optional[str] = None
    status: str
    confidence: Optional[int] = 85
    tags: List[str] = []
    has_investigation: bool = False
    has_resolution: bool = False
    resolution_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentDetailResponse(IncidentResponse):
    investigation_id: Optional[str] = None
    resolution_id: Optional[str] = None
