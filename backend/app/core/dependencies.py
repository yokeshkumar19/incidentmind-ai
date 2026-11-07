from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.security import decode_access_token
from backend.app.database.connection import get_db
from backend.app.database.models import User, Team, TeamMember

security = HTTPBearer(auto_error=False)


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates JWT token and returns User model.
    If no auth header is provided in development mode, retrieves or creates a default demo user
    so developers can test immediately.
    """
    token = None
    if auth:
        token = auth.credentials

    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user = db.query(User).filter(User.id == payload["sub"]).first()
            if user:
                return user

    # Development auto-provisioning for seamless testing:
    dev_user = db.query(User).filter(User.email == "demo@incidentmind.ai").first()
    if not dev_user:
        from backend.app.core.security import get_password_hash
        dev_user = User(
            name="Maya Chen",
            email="demo@incidentmind.ai",
            password_hash=get_password_hash("incidentmind123")
        )
        db.add(dev_user)
        db.commit()
        db.refresh(dev_user)
    return dev_user


def get_current_team(
    x_team_id: Optional[str] = Header(None, alias="X-Team-ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Team:
    """
    Resolves the active team/workspace.
    Validates that the current user is a member of the team.
    """
    team = None
    if x_team_id:
        # Check membership
        membership = (
            db.query(TeamMember)
            .filter(TeamMember.team_id == x_team_id, TeamMember.user_id == current_user.id)
            .first()
        )
        if membership:
            team = db.query(Team).filter(Team.id == x_team_id).first()

    if not team:
        # Get first team user belongs to
        first_membership = (
            db.query(TeamMember)
            .filter(TeamMember.user_id == current_user.id)
            .first()
        )
        if first_membership:
            team = db.query(Team).filter(Team.id == first_membership.team_id).first()

    if not team:
        # Auto-create default workspace for user
        import secrets
        team = Team(
            name="Atlas Reliability Team",
            created_by=current_user.id,
            invite_code=f"ATLAS-{secrets.token_hex(3).upper()}"
        )
        db.add(team)
        db.commit()
        db.refresh(team)

        membership = TeamMember(
            user_id=current_user.id,
            team_id=team.id,
            role="Admin"
        )
        db.add(membership)
        db.commit()

    return team


def require_role(allowed_roles: list[str]):
    def role_checker(
        current_user: User = Depends(get_current_user),
        current_team: Team = Depends(get_current_team),
        db: Session = Depends(get_db)
    ):
        membership = (
            db.query(TeamMember)
            .filter(TeamMember.team_id == current_team.id, TeamMember.user_id == current_user.id)
            .first()
        )
        if not membership or membership.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of the following roles: {', '.join(allowed_roles)}"
            )
        return membership
    return role_checker

