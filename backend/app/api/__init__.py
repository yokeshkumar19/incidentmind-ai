from fastapi import APIRouter
from backend.app.api.auth import router as auth_router
from backend.app.api.teams import router as teams_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.investigations import router as investigations_router
from backend.app.api.feedback import router as feedback_router
from backend.app.api.resolutions import router as resolutions_router
from backend.app.api.memory import router as memory_router
from backend.app.api.analytics import router as analytics_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(teams_router, prefix="/teams", tags=["Teams & Workspaces"])
api_router.include_router(incidents_router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(investigations_router, prefix="/incidents", tags=["AI Investigation"])
api_router.include_router(resolutions_router, prefix="/incidents", tags=["Resolutions"])
api_router.include_router(feedback_router, prefix="/investigations", tags=["Feedback"])
api_router.include_router(memory_router, prefix="/memory", tags=["Hindsight Memory"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])

