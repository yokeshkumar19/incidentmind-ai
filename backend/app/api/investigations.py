from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user, get_current_team
from backend.app.database.connection import get_db
from backend.app.database.models import Incident, Investigation, Team, User
from backend.app.schemas.investigation import (
    InvestigationResponse,
    InvestigationTrigger,
    PotentialRootCause,
    RecommendedAction,
    HistoricalConnection,
)
from backend.app.services.incident_service import incident_service

router = APIRouter()


def _map_investigation_response(inv: Investigation) -> InvestigationResponse:
    causes = [PotentialRootCause(**c) if isinstance(c, dict) else c for c in inv.potential_root_causes]
    actions = [RecommendedAction(**a) if isinstance(a, dict) else a for a in inv.recommendations]
    connections = [
        HistoricalConnection(**h) if isinstance(h, dict) else h
        for h in (inv.historical_connections or [])
    ]

    return InvestigationResponse(
        id=inv.id,
        incident_id=inv.incident_id,
        incident_summary=inv.summary,
        potential_root_causes=causes,
        recommended_actions=actions,
        historical_connections=connections,
        confidence=inv.confidence,
        memory_used=bool(inv.memory_references),
        memory_references=inv.memory_references or [],
        uncertainties=inv.uncertainties or [],
        created_at=inv.created_at,
    )


@router.post("/{incident_id}/investigate", response_model=InvestigationResponse)
async def investigate_incident(
    incident_id: str,
    trigger: InvestigationTrigger = InvestigationTrigger(),
    current_team: Team = Depends(get_current_team),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    POST /api/incidents/{incident_id}/investigate
    Executes the complete investigation pipeline:
    1. Retrieve incident & sanitize logs
    2. Hindsight Memory Recall
    3. Groq AI reasoning
    4. Validate structured output
    5. Save investigation to database
    """
    try:
        investigation = await incident_service.investigate_incident(
            db=db,
            team_id=current_team.id,
            incident_id=incident_id,
        )
        return _map_investigation_response(investigation)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Investigation pipeline failed: {str(e)}",
        )


@router.get("/{incident_id}/investigations", response_model=List[InvestigationResponse])
def get_incident_investigations(
    incident_id: str,
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    GET /api/incidents/{incident_id}/investigations
    Returns previous investigation runs for the incident.
    """
    incident = incident_service.get_incident_by_id(db, current_team.id, incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    investigations = (
        db.query(Investigation)
        .filter(Investigation.incident_id == incident.id)
        .order_by(Investigation.created_at.desc())
        .all()
    )
    return [_map_investigation_response(inv) for inv in investigations]

