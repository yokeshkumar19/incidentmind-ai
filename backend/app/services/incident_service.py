import logging
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from backend.app.database.models import Incident, Investigation, Resolution, User
from backend.app.schemas.incident import IncidentCreate, IncidentUpdate
from backend.app.schemas.resolution import ResolutionCreate
from backend.app.services.log_processor import LogProcessor
from backend.app.services.hindsight_service import hindsight_service
from backend.app.services.groq_service import groq_service

logger = logging.getLogger(__name__)


class IncidentService:
    @staticmethod
    def generate_incident_id(db: Session) -> str:
        """Generates a sequential human-readable incident ID, e.g. INC-2049."""
        count = db.query(Incident).count()
        return f"INC-{2049 + count}"

    @staticmethod
    def create_incident(
        db: Session,
        team_id: str,
        user_id: Optional[str],
        data: IncidentCreate,
    ) -> Incident:
        incident_id = IncidentService.generate_incident_id(db)
        
        # Sanitize logs before storage
        sanitized_logs = LogProcessor.sanitize(data.error_logs) if data.error_logs else ""

        incident = Incident(
            id=incident_id,
            team_id=team_id,
            reported_by=user_id,
            title=data.title,
            description=data.description,
            affected_service=data.affected_service,
            severity=data.severity,
            environment=data.environment,
            error_logs=sanitized_logs,
            status="Investigating",
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        return incident

    @staticmethod
    def get_incidents(
        db: Session,
        team_id: str,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        service: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Incident]:
        query = db.query(Incident).filter(Incident.team_id == team_id)

        if status:
            query = query.filter(Incident.status == status)
        if severity:
            query = query.filter(Incident.severity == severity)
        if service and service != "All services":
            query = query.filter(Incident.affected_service == service)
        if search:
            pattern = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    Incident.id.ilike(pattern),
                    Incident.title.ilike(pattern),
                    Incident.description.ilike(pattern),
                    Incident.affected_service.ilike(pattern),
                )
            )

        return query.order_by(desc(Incident.created_at)).all()

    @staticmethod
    def get_incident_by_id(db: Session, team_id: str, incident_id: str) -> Optional[Incident]:
        return (
            db.query(Incident)
            .filter(Incident.team_id == team_id, Incident.id == incident_id)
            .first()
        )

    @staticmethod
    def update_incident(
        db: Session,
        team_id: str,
        incident_id: str,
        data: IncidentUpdate,
    ) -> Optional[Incident]:
        incident = IncidentService.get_incident_by_id(db, team_id, incident_id)
        if not incident:
            return None

        update_data = data.model_dump(exclude_unset=True)
        if "error_logs" in update_data and update_data["error_logs"]:
            update_data["error_logs"] = LogProcessor.sanitize(update_data["error_logs"])

        for field, value in update_data.items():
            setattr(incident, field, value)

        db.commit()
        db.refresh(incident)
        return incident

    @staticmethod
    def delete_incident(db: Session, team_id: str, incident_id: str) -> bool:
        incident = IncidentService.get_incident_by_id(db, team_id, incident_id)
        if not incident:
            return False
        db.delete(incident)
        db.commit()
        return True

    @staticmethod
    async def investigate_incident(
        db: Session,
        team_id: str,
        incident_id: str,
    ) -> Investigation:
        incident = IncidentService.get_incident_by_id(db, team_id, incident_id)
        if not incident:
            raise ValueError(f"Incident {incident_id} not found in workspace.")

        # 1. Sanitize and extract diagnostic signals from logs
        log_signals = LogProcessor.analyze_logs(incident.error_logs)
        sanitized_logs = log_signals.get("sanitized_logs", "")

        # 2. Recall similar incidents and solutions from Hindsight
        recalled = await hindsight_service.recall(
            team_id=team_id,
            query=f"{incident.title} {incident.description} {incident.affected_service}",
            service=incident.affected_service,
            limit=4,
            db=db,
        )

        # 3. Trigger Groq AI investigation pass
        analysis = await groq_service.investigate_incident(
            incident_id=incident.id,
            title=incident.title,
            description=incident.description,
            service=incident.affected_service,
            severity=incident.severity,
            environment=incident.environment,
            sanitized_logs=sanitized_logs,
            log_signals=log_signals,
            recalled_memories=recalled,
        )

        # 4. Save Investigation in database
        investigation = Investigation(
            incident_id=incident.id,
            summary=analysis.get("incident_summary", incident.description),
            potential_root_causes=analysis.get("potential_root_causes", []),
            recommendations=analysis.get("recommended_actions", []),
            confidence=analysis.get("confidence", 85),
            memory_references=recalled,
            historical_connections=analysis.get("historical_connections", []),
            uncertainties=analysis.get("uncertainties", []),
            raw_ai_response=analysis,
        )
        db.add(investigation)
        db.commit()
        db.refresh(investigation)
        return investigation

    @staticmethod
    async def resolve_incident(
        db: Session,
        team_id: str,
        incident_id: str,
        user_id: Optional[str],
        data: ResolutionCreate,
    ) -> Resolution:
        incident = IncidentService.get_incident_by_id(db, team_id, incident_id)
        if not incident:
            # Fallback search by ID across database in case workspace context transitioned
            incident = db.query(Incident).filter(Incident.id == incident_id).first()
            if not incident:
                raise ValueError(f"Incident {incident_id} not found.")

        # Check existing resolution (idempotency)
        existing_res = db.query(Resolution).filter(Resolution.incident_id == incident_id).first()
        if existing_res:
            existing_res.actual_root_cause = data.actual_root_cause
            existing_res.actions_taken = data.actions_taken
            existing_res.final_resolution = data.final_resolution
            existing_res.resolution_status = data.resolution_status
            existing_res.confirmed_by = user_id
            existing_res.confirmed_at = datetime.now(timezone.utc)
            resolution = existing_res
        else:
            resolution = Resolution(
                incident_id=incident_id,
                actual_root_cause=data.actual_root_cause,
                actions_taken=data.actions_taken,
                final_resolution=data.final_resolution,
                resolution_status=data.resolution_status,
                confirmed_by=user_id,
                confirmed_at=datetime.now(timezone.utc),
            )
            db.add(resolution)

        # Update incident status if marked resolved
        if data.resolution_status.lower() == "resolved":
            incident.status = "Resolved"
        db.commit()
        db.refresh(resolution)

        # Retain confirmed organizational memory in Hindsight
        if data.retain_in_memory:
            await hindsight_service.retain(
                team_id=team_id,
                incident_id=incident.id,
                service=incident.affected_service,
                actual_root_cause=data.actual_root_cause,
                final_resolution=data.final_resolution,
                actions_taken=data.actions_taken,
                db=db,
            )

        return resolution


incident_service = IncidentService()

