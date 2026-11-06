from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user, get_current_team, require_role
from backend.app.database.connection import get_db
from backend.app.database.models import Incident, Resolution, Team, User
from backend.app.schemas.resolution import ResolutionCreate, ResolutionResponse
from backend.app.services.incident_service import incident_service

router = APIRouter()


@router.post("/{incident_id}/resolve", response_model=ResolutionResponse)
async def resolve_incident(
    incident_id: str,
    resolution_in: ResolutionCreate,
    current_team: Team = Depends(get_current_team),
    current_user: User = Depends(get_current_user),
    _role=Depends(require_role(["Admin", "Engineer"])),
    db: Session = Depends(get_db),
):
    """
    POST /api/incidents/{incident_id}/resolve
    Records the engineer's confirmed resolution, marks incident as resolved,
    and triggers Hindsight Retain for continuous organizational learning.
    """
    try:
        resolution = await incident_service.resolve_incident(
            db=db,
            team_id=current_team.id,
            incident_id=incident_id,
            user_id=current_user.id,
            data=resolution_in,
        )
        confirmer_name = current_user.name if resolution.confirmed_by == current_user.id else "Engineer"
        return ResolutionResponse(
            id=resolution.id,
            incident_id=resolution.incident_id,
            actual_root_cause=resolution.actual_root_cause,
            actions_taken=resolution.actions_taken,
            final_resolution=resolution.final_resolution,
            resolution_status=resolution.resolution_status,
            confirmed_by=resolution.confirmed_by,
            confirmer_name=confirmer_name,
            confirmed_at=resolution.confirmed_at,
            retained_in_hindsight=resolution_in.retain_in_memory,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get("/{incident_id}/resolution", response_model=ResolutionResponse)
def get_incident_resolution(
    incident_id: str,
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    GET /api/incidents/{incident_id}/resolution
    Retrieves the confirmed resolution record for an incident.
    """
    incident = incident_service.get_incident_by_id(db, current_team.id, incident_id)
    if not incident or not incident.resolution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resolution record found for this incident."
        )

    res = incident.resolution
    confirmer_name = res.confirmer.name if res.confirmer else "Engineer"
    return ResolutionResponse(
        id=res.id,
        incident_id=res.incident_id,
        actual_root_cause=res.actual_root_cause,
        actions_taken=res.actions_taken,
        final_resolution=res.final_resolution,
        resolution_status=res.resolution_status,
        confirmed_by=res.confirmed_by,
        confirmer_name=confirmer_name,
        confirmed_at=res.confirmed_at,
        retained_in_hindsight=True,
    )

