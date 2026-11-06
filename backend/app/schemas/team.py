from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, EmailStr


class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)


class TeamJoin(BaseModel):
    invite_code: str = Field(..., min_length=4, max_length=64)


class TeamMemberResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeamMemberUpdate(BaseModel):
    role: str = Field(..., pattern="^(Admin|Engineer|Viewer)$")


class TeamResponse(BaseModel):
    id: str
    name: str
    created_by: str
    invite_code: str
    role: Optional[str] = None
    created_at: datetime
    member_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class TeamInviteRequest(BaseModel):
    email: EmailStr
    role: str = Field(default="Engineer", pattern="^(Admin|Engineer|Viewer)$")


class TeamInviteResponse(BaseModel):
    message: str
    email: str
    team_name: str
    invite_code: str
    channel: str
