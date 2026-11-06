import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.api import api_router
from backend.app.core.config import settings
from backend.app.core.security import get_password_hash
from backend.app.database.connection import init_db, SessionLocal
from backend.app.database.models import User, Team, TeamMember, Incident, Resolution, MemoryRecord

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("incidentmind")


def seed_initial_data():
    """Seeds foundational demo team and verified memories if database is fresh."""
    db = SessionLocal()
    try:
        # Check if users already exist
        if db.query(User).first():
            return

        logger.info("Seeding initial workspace, team members, and confirmed organizational memories...")

        # 1. Create Core Users
        maya = User(
            name="Maya Chen",
            email="maya@atlas.dev",
            password_hash=get_password_hash("incidentmind123"),
        )
        jon = User(
            name="Jon Bell",
            email="jon@atlas.dev",
            password_hash=get_password_hash("incidentmind123"),
        )
        priya = User(
            name="Priya Rao",
            email="priya@atlas.dev",
            password_hash=get_password_hash("incidentmind123"),
        )
        theo = User(
            name="Theo Grant",
            email="theo@atlas.dev",
            password_hash=get_password_hash("incidentmind123"),
        )
        db.add_all([maya, jon, priya, theo])
        db.commit()

        # 2. Create Atlas SRE Team
        team = Team(
            id="team_atlas_sre",
            name="Atlas SRE & Platform",
            created_by=maya.id,
            invite_code="ATLAS-2026",
        )
        db.add(team)
        db.commit()

        # 3. Add Members
        members = [
            TeamMember(user_id=maya.id, team_id=team.id, role="Admin"),
            TeamMember(user_id=jon.id, team_id=team.id, role="Engineer"),
            TeamMember(user_id=priya.id, team_id=team.id, role="Engineer"),
            TeamMember(user_id=theo.id, team_id=team.id, role="Engineer"),
        ]
        db.add_all(members)
        db.commit()

        # All workspaces start clean at 0 incidents. Numbers increase strictly with user activity.
        logger.info("Workspace ready with zero initial incidents.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables if not in test environment
    if settings.ENVIRONMENT != "testing":
        init_db()
        seed_initial_data()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for IncidentMind AI: incident intake, safe log sanitization, Groq reasoning, and Hindsight organizational memory.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    allow_private_network=True,
)


# Mount API routers
app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    db_url = settings.DATABASE_URL.lower()
    is_supabase = "supabase" in db_url or "postgres" in db_url
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "supabase_postgresql" if is_supabase else "sqlite",
        "database_provider": "Supabase Cloud PostgreSQL" if is_supabase else "Local SQLite",
        "supabase_configured": is_supabase or bool(settings.SUPABASE_URL),
        "groq_configured": bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY != "gsk_your_groq_api_key_here"),
        "hindsight_configured": bool(settings.HINDSIGHT_API_KEY and settings.HINDSIGHT_API_KEY != "hs_your_hindsight_api_key_here"),
        "resend_configured": bool(settings.RESEND_API_KEY and settings.RESEND_API_KEY.startswith("re_")),
        "smtp_configured": bool(settings.SMTP_HOST and settings.SMTP_USER),
    }


# Production Static Files & SPA Routing
dist_dir = os.path.abspath("dist")
if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Do not catch API or documentation routes
        if full_path.startswith("api/") or full_path in ("api", "docs", "redoc", "openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        target_path = os.path.join(dist_dir, full_path)
        if os.path.isfile(target_path):
            return FileResponse(target_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))

