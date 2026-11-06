from datetime import datetime
from typing import Any, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class PotentialRootCause(BaseModel):
    cause: str
    explanation: str
    evidence: List[str] = []
    confidence: Union[int, str] = 75


class RecommendedAction(BaseModel):
    action: str
    reason: str
    priority: str = "high"  # high, medium, low
    safety: Optional[str] = "Safe / read-only"


class HistoricalConnection(BaseModel):
    incident_id: Optional[str] = None
    title: Optional[str] = None
    similarity: Optional[Union[str, int]] = "High"
    lesson: Optional[str] = None


class InvestigationTrigger(BaseModel):
    custom_context: Optional[str] = None


class InvestigationResponse(BaseModel):
    id: str
    incident_id: str
    incident_summary: str
    potential_root_causes: List[PotentialRootCause]
    recommended_actions: List[RecommendedAction]
    historical_connections: List[HistoricalConnection] = []
    confidence: int = 85
    memory_used: bool = True
    memory_references: List[Any] = []
    uncertainties: List[str] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
