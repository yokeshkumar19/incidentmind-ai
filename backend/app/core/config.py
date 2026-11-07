import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "IncidentMind AI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database (Supabase Cloud PostgreSQL or local SQLite)
    DATABASE_URL: str = "sqlite:///./incidentmind.db"

    # Supabase Integration
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # JWT & Auth
    SECRET_KEY: str = "incidentmind-development-secret-key-32chars-minimum!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Groq API
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # Hindsight Memory Engine
    HINDSIGHT_API_KEY: str = ""
    HINDSIGHT_API_URL: str = "https://api.hindsight.vectorize.io"

    # Email / SMTP / Resend Configuration
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "IncidentMind AI <noreply@incidentmind.ai>"
    SMTP_USE_TLS: bool = True
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "IncidentMind AI <onboarding@resend.dev>"
    BREVO_API_KEY: str = ""
    BREVO_FROM_EMAIL: str = ""
    APP_URL: str = os.getenv("APP_URL", "https://incidentmind-ai-alpha.vercel.app")

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:8443",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8443",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    model_config = SettingsConfigDict(
        env_file=["backend/.env", ".env"],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

