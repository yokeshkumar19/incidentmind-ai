from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ResolutionCreate(BaseModel):
    actual_root_cause: str = Field(..., min_length=5)
    actions_taken: str = Field(..., min_length=5)
    final_resolution: str = Field(..., min_length=5)
    resolution_status: str = Field(default="Resolved", pattern="^(Resolved|Active|Monitoring)$")
    retain_in_memory: bool = Field(default=True)


class ResolutionResponse(BaseModel):
    id: str
    incident_id: str
    actual_root_cause: str
    actions_taken: str
    final_resolution: str
    resolution_status: str
    confirmed_by: Optional[str] = None
    confirmer_name: Optional[str] = None
    confirmed_at: datetime
    retained_in_hindsight: bool = False

    model_config = ConfigDict(from_attributes=True)
