from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MemoryRecordResponse(BaseModel):
    id: str
    team_id: str
    incident_id: Optional[str] = None
    hindsight_memory_reference: str
    memory_type: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemoryRecallRequest(BaseModel):
    query: str = Field(..., min_length=2)
    service: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=20)


class RecalledMemoryItem(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    service: Optional[str] = None
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    match_score: Optional[float] = None
    time_ago: Optional[str] = None
    summary: str
    memory_type: str = "confirmed_resolution"


class MemoryRecallResponse(BaseModel):
    team_id: str
    query: str
    memories: List[RecalledMemoryItem]
    count: int


class MemoryReflectRequest(BaseModel):
    query: Optional[str] = Field(default="Analyze recurring failure patterns, bottlenecks, and resolution themes across past incidents.")


class MemoryReflectResponse(BaseModel):
    team_id: str
    reflection: str
    patterns_identified: List[str] = []
    recurring_services: List[str] = []
    strategic_recommendations: List[str] = []
    grounded_memory_count: int = 0
