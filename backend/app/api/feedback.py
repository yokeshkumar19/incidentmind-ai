from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user, get_current_team
from backend.app.database.connection import get_db
from backend.app.database.models import Feedback, Investigation, Team, User
from backend.app.schemas.feedback import FeedbackCreate, FeedbackResponse

router = APIRouter()


@router.post("/{investigation_id}/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_investigation_feedback(
    investigation_id: str,
    feedback_in: FeedbackCreate,
    current_team: Team = Depends(get_current_team),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    POST /api/investigations/{investigation_id}/feedback
    Records engineer feedback (accepted, rejected, corrected) on AI findings.
    Ensures machine hypotheses do not become institutional knowledge without human confirmation.
    """
    investigation = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not investigation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation '{investigation_id}' not found."
        )

    # Verify workspace isolation
    if investigation.incident.team_id != current_team.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Investigation does not belong to your active workspace."
        )

    feedback = Feedback(
        investigation_id=investigation.id,
        finding_reference=feedback_in.finding_reference,
        feedback_type=feedback_in.feedback_type,
        correction=feedback_in.correction,
        reviewer_id=current_user.id,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return FeedbackResponse(
        id=feedback.id,
        investigation_id=feedback.investigation_id,
        finding_reference=feedback.finding_reference,
        feedback_type=feedback.feedback_type,
        correction=feedback.correction,
        reviewer_id=feedback.reviewer_id,
        reviewer_name=current_user.name,
        created_at=feedback.created_at,
    )


@router.get("/{investigation_id}/feedback", response_model=List[FeedbackResponse])
def get_investigation_feedback(
    investigation_id: str,
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    GET /api/investigations/{investigation_id}/feedback
    Lists all engineer feedback entries for this investigation.
    """
    feedbacks = (
        db.query(Feedback)
        .filter(Feedback.investigation_id == investigation_id)
        .order_by(Feedback.created_at.desc())
        .all()
    )
    return [
        FeedbackResponse(
            id=f.id,
            investigation_id=f.investigation_id,
            finding_reference=f.finding_reference,
            feedback_type=f.feedback_type,
            correction=f.correction,
            reviewer_id=f.reviewer_id,
            reviewer_name=f.reviewer.name if f.reviewer else "Engineer",
            created_at=f.created_at,
        )
        for f in feedbacks
    ]

