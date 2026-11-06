from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user, get_current_team, require_role
from backend.app.database.connection import get_db
from backend.app.database.models import User, Team, Incident, Investigation, Resolution
from backend.app.schemas.incident import (
    IncidentCreate,
    IncidentDetailResponse,
    IncidentResponse,
    IncidentUpdate,
)
from backend.app.services.incident_service import incident_service

router = APIRouter()


def _map_incident_response(incident: Incident, db: Session) -> IncidentResponse:
    reporter_name = incident.reporter.name if incident.reporter else "Anonymous"
    has_inv = bool(incident.investigations)
    res = incident.resolution
    
    # Generate clean tags for frontend pills
    tags = [
        incident.environment.lower().replace(" ", "-"),
        incident.affected_service.lower().replace(" ", "-"),
    ]
    if "database" in incident.description.lower() or "lock" in incident.description.lower():
        tags.append("database")
    if "latency" in incident.title.lower() or "latency" in incident.description.lower():
        tags.append("latency")
    if "deploy" in incident.description.lower() or "release" in incident.description.lower():
        tags.append("deploy")

    return IncidentResponse(
        id=incident.id,
        team_id=incident.team_id,
        reported_by=incident.reported_by,
        reporter_name=reporter_name,
        title=incident.title,
        description=incident.description,
        affected_service=incident.affected_service,
        severity=incident.severity,
        environment=incident.environment,
        error_logs=incident.error_logs,
        status=incident.status,
        confidence=88 if has_inv else 70,
        tags=list(set(tags)),
        has_investigation=has_inv,
        has_resolution=res is not None,
        resolution_text=res.final_resolution if res else None,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
    )


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    current_team: Team = Depends(get_current_team),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    POST /api/incidents
    Accepts: title, description, affected_service, severity, environment, error_logs.
    Validates, sanitizes logs, assigns unique ID, and persists incident.
    """
    incident = incident_service.create_incident(
        db=db,
        team_id=current_team.id,
        user_id=current_user.id,
        data=incident_in,
    )
    return _map_incident_response(incident, db)


@router.get("/", response_model=List[IncidentResponse])
def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status (Investigating, Monitoring, Resolved)"),
    severity: Optional[str] = Query(None, description="Filter by severity (Critical, High, Medium, Low)"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    search: Optional[str] = Query(None, description="Search term for title or description"),
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    GET /api/incidents
    Returns workspace incidents with optional filtering.
    """
    incidents = incident_service.get_incidents(
        db=db,
        team_id=current_team.id,
        status=status,
        severity=severity,
        service=service,
        search=search,
    )
    return [_map_incident_response(inc, db) for inc in incidents]


@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident(
    incident_id: str,
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    GET /api/incidents/{incident_id}
    Retrieves full details of a specific incident.
    """
    incident = incident_service.get_incident_by_id(db, current_team.id, incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    base = _map_incident_response(incident, db)
    latest_inv = (
        db.query(Investigation)
        .filter(Investigation.incident_id == incident.id)
        .order_by(Investigation.created_at.desc())
        .first()
    )
    res = incident.resolution

    return IncidentDetailResponse(
        **base.model_dump(),
        investigation_id=latest_inv.id if latest_inv else None,
        resolution_id=res.id if res else None,
    )


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    incident_update: IncidentUpdate,
    current_team: Team = Depends(get_current_team),
    _role=Depends(require_role(["Admin", "Engineer"])),
    db: Session = Depends(get_db),
):
    """
    PATCH /api/incidents/{incident_id}
    Updates an incident.
    """
    incident = incident_service.update_incident(
        db=db,
        team_id=current_team.id,
        incident_id=incident_id,
        data=incident_update,
    )
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )
    return _map_incident_response(incident, db)


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident(
    incident_id: str,
    current_team: Team = Depends(get_current_team),
    _role=Depends(require_role(["Admin"])),
    db: Session = Depends(get_db),
):
    """
    DELETE /api/incidents/{incident_id}
    Deletes an incident (Admin only).
    """
    success = incident_service.delete_incident(db, current_team.id, incident_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )
    return None

