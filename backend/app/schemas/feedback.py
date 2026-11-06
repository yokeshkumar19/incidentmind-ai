from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    finding_reference: str = Field(..., min_length=2, max_length=255)
    feedback_type: str = Field(..., pattern="^(accepted|rejected|corrected)$")
    correction: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    investigation_id: str
    finding_reference: str
    feedback_type: str
    correction: Optional[str] = None
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
