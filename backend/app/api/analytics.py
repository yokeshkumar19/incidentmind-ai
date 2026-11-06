from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_team
from backend.app.database.connection import get_db
from backend.app.database.models import Team
from backend.app.schemas.analytics import AnalyticsSummaryResponse
from backend.app.services.analytics_service import analytics_service

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    GET /api/analytics/summary
    Calculates live incident intelligence and recovery metrics from actual stored database records.
    """
    return analytics_service.get_summary(db=db, team_id=current_team.id)

