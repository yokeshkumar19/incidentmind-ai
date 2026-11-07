from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user, get_current_team
from backend.app.database.connection import get_db
from backend.app.database.models import MemoryRecord, Team, User
from backend.app.schemas.memory import (
    MemoryRecallRequest,
    MemoryRecallResponse,
    MemoryRecordResponse,
    MemoryReflectRequest,
    MemoryReflectResponse,
    RecalledMemoryItem,
)
from backend.app.services.hindsight_service import hindsight_service

router = APIRouter()


@router.get("/", response_model=List[MemoryRecordResponse])
def list_workspace_memories(
    service: Optional[str] = Query(None, description="Filter by service name"),
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    GET /api/memory
    Lists confirmed organizational memories stored for the active workspace.
    """
    query = (
        db.query(MemoryRecord)
        .filter(MemoryRecord.team_id == current_team.id)
        .order_by(MemoryRecord.created_at.desc())
    )
    records = query.all()

    if service and service != "All services":
        filtered = []
        for r in records:
            meta = r.metadata_json or {}
            if meta.get("service") == service:
                filtered.append(r)
        records = filtered

    return [
        MemoryRecordResponse(
            id=r.id,
            team_id=r.team_id,
            incident_id=r.incident_id,
            hindsight_memory_reference=r.hindsight_memory_reference,
            memory_type=r.memory_type,
            content=r.content,
            metadata=r.metadata_json or {},
            created_at=r.created_at,
        )
        for r in records
    ]


@router.post("/recall", response_model=MemoryRecallResponse)
async def recall_memories(
    recall_in: MemoryRecallRequest,
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    POST /api/memory/recall
    Retrieves similar incidents and confirmed resolutions from the team's Hindsight memory bank.
    Enforces strict workspace isolation.
    """
    memories = await hindsight_service.recall(
        team_id=current_team.id,
        query=recall_in.query,
        service=recall_in.service,
        limit=recall_in.limit,
        db=db,
    )
    items = [
        RecalledMemoryItem(
            id=m.get("id"),
            title=m.get("title", "Past Incident Resolution"),
            service=m.get("service"),
            root_cause=m.get("root_cause"),
            resolution=m.get("resolution"),
            match_score=m.get("match_score"),
            summary=m.get("summary", ""),
            memory_type=m.get("memory_type", "confirmed_resolution"),
        )
        for m in memories
    ]
    return MemoryRecallResponse(
        team_id=current_team.id,
        query=recall_in.query,
        memories=items,
        count=len(items),
    )


@router.post("/reflect", response_model=MemoryReflectResponse)
async def reflect_on_memories(
    reflect_in: MemoryReflectRequest = MemoryReflectRequest(),
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    POST /api/memory/reflect
    Synthesizes recurring incident patterns, recurring bottlenecks, and strategic resolutions.
    Distinguishes synthesized insights from individual incident records.
    """
    result = await hindsight_service.reflect(
        team_id=current_team.id,
        query=reflect_in.query or "Analyze recurring failure patterns across past incidents.",
        db=db,
    )
    return MemoryReflectResponse(**result)


@router.delete("/{memory_id}")
def delete_memory(
    memory_id: str,
    current_team: Team = Depends(get_current_team),
    db: Session = Depends(get_db),
):
    """
    DELETE /api/memory/{memory_id}
    Deletes an organizational memory record from the database.
    """
    record = (
        db.query(MemoryRecord)
        .filter(
            (MemoryRecord.id == memory_id)
            | (MemoryRecord.incident_id == memory_id)
            | (MemoryRecord.hindsight_memory_reference == memory_id),
            MemoryRecord.team_id == current_team.id,
        )
        .first()
    )
    if not record:
        # Fallback search without team_id
        record = (
            db.query(MemoryRecord)
            .filter(
                (MemoryRecord.id == memory_id)
                | (MemoryRecord.incident_id == memory_id)
                | (MemoryRecord.hindsight_memory_reference == memory_id)
            )
            .first()
        )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory record not found.",
        )

    db.delete(record)
    db.commit()
    return {"message": "Memory record deleted successfully.", "status": "ok"}


