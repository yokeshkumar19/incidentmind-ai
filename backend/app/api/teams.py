import secrets
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user, get_current_team, require_role
from backend.app.core.config import settings
from backend.app.database.connection import get_db
from backend.app.database.models import User, Team, TeamMember
from backend.app.schemas.team import (
    TeamCreate,
    TeamJoin,
    TeamMemberResponse,
    TeamMemberUpdate,
    TeamResponse,
    TeamInviteRequest,
    TeamInviteResponse,
)
from backend.app.services.email_service import email_service

router = APIRouter()


@router.get("/", response_model=List[TeamResponse])
def list_user_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all teams/workspaces the authenticated user belongs to."""
    memberships = (
        db.query(TeamMember)
        .filter(TeamMember.user_id == current_user.id)
        .all()
    )
    result = []
    for m in memberships:
        team = m.team
        member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
        result.append(
            TeamResponse(
                id=team.id,
                name=team.name,
                created_by=team.created_by,
                invite_code=team.invite_code,
                role=m.role,
                created_at=team.created_at,
                member_count=member_count,
            )
        )
    return result


@router.get("/current", response_model=TeamResponse)
def get_active_team(
    current_team: Team = Depends(get_current_team),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the currently active workspace."""
    membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == current_team.id, TeamMember.user_id == current_user.id)
        .first()
    )
    member_count = db.query(TeamMember).filter(TeamMember.team_id == current_team.id).count()
    return TeamResponse(
        id=current_team.id,
        name=current_team.name,
        created_by=current_team.created_by,
        invite_code=current_team.invite_code,
        role=membership.role if membership else "Viewer",
        created_at=current_team.created_at,
        member_count=member_count,
    )


@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    team_in: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new workspace. The creator automatically becomes the Admin."""
    invite_code = f"ATLAS-{secrets.token_hex(3).upper()}"
    team = Team(
        name=team_in.name,
        created_by=current_user.id,
        invite_code=invite_code,
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    membership = TeamMember(
        user_id=current_user.id,
        team_id=team.id,
        role="Admin",
    )
    db.add(membership)
    db.commit()

    return TeamResponse(
        id=team.id,
        name=team.name,
        created_by=team.created_by,
        invite_code=team.invite_code,
        role="Admin",
        created_at=team.created_at,
        member_count=1,
    )


@router.delete("/{team_id}")
def delete_workspace(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    DELETE /api/teams/{team_id}
    Deletes a team workspace (Only the workspace creator or Admin).
    """
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
        .first()
    )
    if team.created_by != current_user.id and (not membership or membership.role != "Admin"):
        raise HTTPException(
            status_code=403,
            detail="Only the workspace creator can delete this workspace."
        )

    db.delete(team)
    db.commit()
    return {"message": f"Workspace '{team.name}' has been deleted.", "status": "ok"}



@router.post("/join", response_model=TeamResponse)
def join_team(
    join_in: TeamJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Joins an existing workspace using its unique invite code."""
    team = db.query(Team).filter(Team.invite_code == join_in.invite_code.strip()).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid workspace invite code."
        )

    # Check if already a member
    existing = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team.id, TeamMember.user_id == current_user.id)
        .first()
    )
    if existing:
        member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
        return TeamResponse(
            id=team.id,
            name=team.name,
            created_by=team.created_by,
            invite_code=team.invite_code,
            role=existing.role,
            created_at=team.created_at,
            member_count=member_count,
        )

    membership = TeamMember(
        user_id=current_user.id,
        team_id=team.id,
        role="Engineer",
    )
    db.add(membership)
    db.commit()

    member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
    return TeamResponse(
        id=team.id,
        name=team.name,
        created_by=team.created_by,
        invite_code=team.invite_code,
        role="Engineer",
        created_at=team.created_at,
        member_count=member_count,
    )


@router.post("/invite", response_model=TeamInviteResponse)
def invite_team_member(
    invite_in: TeamInviteRequest,
    current_team: Team = Depends(get_current_team),
    current_user: User = Depends(get_current_user),
    _role=Depends(require_role(["Admin", "Engineer"])),
):
    """
    POST /api/teams/invite
    Sends a team invitation email with the workspace invite code.
    """
    email_clean = invite_in.email.strip().lower()
    invite_link = f"{settings.APP_URL}/login?invite={current_team.invite_code}&email={email_clean}"

    dispatch = email_service.send_team_invite(
        to_email=email_clean,
        inviter_name=current_user.name,
        team_name=current_team.name,
        invite_code=current_team.invite_code,
        role=invite_in.role,
        invite_link=invite_link,
    )

    return TeamInviteResponse(
        message=f"Invitation successfully dispatched to {email_clean}",
        email=email_clean,
        team_name=current_team.name,
        invite_code=current_team.invite_code,
        channel=dispatch.get("channel", "smtp"),
    )


@router.get("/members", response_model=List[TeamMemberResponse])
def list_team_members(
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """Lists all members of the active workspace."""
    members = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == current_team.id)
        .all()
    )
    return [
        TeamMemberResponse(
            id=m.id,
            user_id=m.user_id,
            user_name=m.user.name,
            user_email=m.user.email,
            role=m.role,
            joined_at=m.joined_at,
        )
        for m in members
    ]


@router.patch("/members/{member_id}", response_model=TeamMemberResponse)
def update_member_role(
    member_id: str,
    update_in: TeamMemberUpdate,
    current_team: Team = Depends(get_current_team),
    _role=Depends(require_role(["Admin"])),
    db: Session = Depends(get_db),
):
    """Updates a team member's role (Admin only)."""
    membership = (
        db.query(TeamMember)
        .filter(TeamMember.id == member_id, TeamMember.team_id == current_team.id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in workspace."
        )

    membership.role = update_in.role
    db.commit()
    db.refresh(membership)
    return TeamMemberResponse(
        id=membership.id,
        user_id=membership.user_id,
        user_name=membership.user.name,
        user_email=membership.user.email,
        role=membership.role,
        joined_at=membership.joined_at,
    )


@router.delete("/members/{member_id}")
def remove_team_member(
    member_id: str,
    current_team: Team = Depends(get_current_team),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    DELETE /api/teams/members/{member_id}
    Removes a member from the active workspace (Admins only or self-removal).
    """
    membership = (
        db.query(TeamMember)
        .filter(
            (TeamMember.id == member_id) | (TeamMember.user_id == member_id),
            TeamMember.team_id == current_team.id
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in workspace."
        )

    # Check caller role: must be Admin or leaving team themselves
    caller_membership = (
        db.query(TeamMember)
        .filter(TeamMember.team_id == current_team.id, TeamMember.user_id == current_user.id)
        .first()
    )
    is_admin = caller_membership and caller_membership.role == "Admin"
    is_self = membership.user_id == current_user.id

    if not is_admin and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace Admins can remove other team members."
        )

    # Prevent removing the workspace creator if they are the sole admin
    if membership.user_id == current_team.created_by:
        admin_count = (
            db.query(TeamMember)
            .filter(TeamMember.team_id == current_team.id, TeamMember.role == "Admin")
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the workspace creator and primary admin."
            )

    user_name = membership.user.name if membership.user else "Member"
    db.delete(membership)
    db.commit()
    return {"message": f"{user_name} has been removed from {current_team.name}.", "status": "ok"}

