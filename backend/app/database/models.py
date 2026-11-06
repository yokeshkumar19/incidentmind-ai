import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Index,
)
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base


def utcnow():
    return datetime.now(timezone.utc)


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    teams_created = relationship("Team", back_populates="creator")
    team_memberships = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    reported_incidents = relationship("Incident", back_populates="reporter")
    resolutions_confirmed = relationship("Resolution", back_populates="confirmer")
    feedbacks = relationship("Feedback", back_populates="reviewer")


class Team(Base):
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invite_code = Column(String(64), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    creator = relationship("User", back_populates="teams_created")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="team", cascade="all, delete-orphan")
    memory_records = relationship("MemoryRecord", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="Engineer", nullable=False)  # Admin, Engineer, Viewer
    joined_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="team_memberships")
    team = relationship("Team", back_populates="members")

    __table_args__ = (
        Index("idx_team_user", "team_id", "user_id", unique=True),
    )


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True)  # e.g., INC-2049
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    reported_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    affected_service = Column(String(128), nullable=False, index=True)
    severity = Column(String(32), default="High", nullable=False, index=True)  # Critical, High, Medium, Low
    environment = Column(String(64), default="Production", nullable=False)
    error_logs = Column(Text, nullable=True)
    status = Column(String(32), default="Investigating", nullable=False, index=True)  # Investigating, Monitoring, Resolved
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    team = relationship("Team", back_populates="incidents")
    reporter = relationship("User", back_populates="reported_incidents")
    investigations = relationship("Investigation", back_populates="incident", cascade="all, delete-orphan")
    resolution = relationship("Resolution", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    memory_records = relationship("MemoryRecord", back_populates="incident")


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    summary = Column(Text, nullable=False)
    potential_root_causes = Column(JSON, nullable=False, default=list)
    recommendations = Column(JSON, nullable=False, default=list)
    confidence = Column(Integer, default=70, nullable=False)
    memory_references = Column(JSON, nullable=False, default=list)
    historical_connections = Column(JSON, nullable=False, default=list)
    uncertainties = Column(JSON, nullable=False, default=list)
    raw_ai_response = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", back_populates="investigations")
    feedbacks = relationship("Feedback", back_populates="investigation", cascade="all, delete-orphan")


class Resolution(Base):
    __tablename__ = "resolutions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    actual_root_cause = Column(Text, nullable=False)
    actions_taken = Column(Text, nullable=False)
    final_resolution = Column(Text, nullable=False)
    resolution_status = Column(String(32), default="Resolved", nullable=False)
    confirmed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    incident = relationship("Incident", back_populates="resolution")
    confirmer = relationship("User", back_populates="resolutions_confirmed")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_reference = Column(String(255), nullable=False)  # identifier / title of finding
    feedback_type = Column(String(32), nullable=False)  # accepted, rejected, corrected
    correction = Column(Text, nullable=True)
    reviewer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    investigation = relationship("Investigation", back_populates="feedbacks")
    reviewer = relationship("User", back_populates="feedbacks")


class MemoryRecord(Base):
    __tablename__ = "memory_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    hindsight_memory_reference = Column(String(255), nullable=False)
    memory_type = Column(String(64), default="confirmed_resolution", nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    team = relationship("Team", back_populates="memory_records")
    incident = relationship("Incident", back_populates="memory_records")

