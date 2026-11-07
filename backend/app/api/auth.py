import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

logger = logging.getLogger("incidentmind.auth")

from backend.app.core.security import (
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
    generate_password_reset_code,
    get_password_hash,
    verify_password,
)
from backend.app.core.dependencies import get_current_user
from backend.app.core.config import settings
from backend.app.database.connection import get_db
from backend.app.database.models import User, Team, TeamMember
from backend.app.schemas.auth import (
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from backend.app.services.email_service import email_service

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@router.post("/register/", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new user and provisions their personal workspace."""
    email_clean = user_in.email.strip().lower()
    existing = db.query(User).filter(User.email.ilike(email_clean)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = User(
        name=user_in.name.strip(),
        email=email_clean,
        password_hash=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Provision initial workspace for the user
    import secrets
    team = Team(
        name=f"{user.name.split()[0]}'s Team",
        created_by=user.id,
        invite_code=f"TEAM-{secrets.token_hex(3).upper()}",
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    membership = TeamMember(
        user_id=user.id,
        team_id=team.id,
        role="Admin"
    )
    db.add(membership)
    db.commit()

    token = create_access_token(user.id)
    return Token(access_token=token, token_type="bearer", user=user)


@router.post("/login", response_model=Token)
@router.post("/login/", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticates a user and returns a JWT token."""
    email_clean = credentials.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(user.id)
    return Token(access_token=token, token_type="bearer", user=user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return current_user


@router.post("/forgot-password", response_model=MessageResponse)
@router.post("/forgot-password/", response_model=MessageResponse)
def forgot_password(
    req: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    POST /api/auth/forgot-password
    Generates a secure, user-friendly 6-digit verification code and sends it via email in the background.
    """
    try:
        email_clean = req.email.strip().lower()
        user = db.query(User).filter(User.email.ilike(email_clean)).first()
        if user:
            # Generate intuitive 6-digit reset code
            code = generate_password_reset_code()
            user.reset_code = code
            user.reset_code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
            db.commit()

            reset_link = f"{settings.APP_URL}/login?reset_token={code}&email={user.email}"
            
            # Send email asynchronously in background so request returns instantly without SMTP timeout
            background_tasks.add_task(
                email_service.send_password_reset,
                to_email=user.email,
                user_name=user.name,
                reset_token=code,
                reset_link=reset_link,
            )
            logger.info(f"Password reset code {code} dispatched for {user.email}")

        return MessageResponse(
            message="Password reset instructions have been sent to your email inbox. Please check your inbox and spam folder."
        )
    except Exception as e:
        logger.error(f"Error in forgot_password: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to process password reset request: {str(e)}"
        )


@router.post("/reset-password", response_model=MessageResponse)
@router.post("/reset-password/", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    POST /api/auth/reset-password
    Verifies the 6-digit code or JWT token and updates the user's password.
    """
    token_clean = req.token.strip().replace(" ", "")
    now_utc = datetime.now(timezone.utc)
    user: Optional[User] = None

    # 1. First check by 6-digit reset code
    query = db.query(User).filter(User.reset_code == token_clean)
    if req.email:
        query = query.filter(User.email.ilike(req.email.strip().lower()))
    found_user = query.first()

    if found_user:
        if found_user.reset_code_expires_at:
            exp = found_user.reset_code_expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < now_utc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The 6-digit reset code has expired. Please request a new one."
                )
        user = found_user
    else:
        # 2. Fallback check for JWT token (backward compatibility)
        payload = verify_password_reset_token(req.token)
        if payload and payload.get("sub"):
            user = db.query(User).filter(User.id == payload["sub"]).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The reset code is invalid or has expired. Please check your email or request a new code."
        )

    user.password_hash = get_password_hash(req.new_password)
    user.reset_code = None
    user.reset_code_expires_at = None
    db.commit()

    return MessageResponse(
        message="Your password has been successfully updated. You can now sign in with your new credentials."
    )


@router.get("/test-email")
def test_email(to: str = "yokeshkumar192007@gmail.com"):
    """Diagnostic endpoint to test live email delivery and surface exact SMTP/Resend status."""
    import smtplib
    from email.mime.text import MIMEText

    results = {
        "SMTP_HOST": settings.SMTP_HOST,
        "SMTP_PORT": settings.SMTP_PORT,
        "SMTP_USER": settings.SMTP_USER,
        "SMTP_PASSWORD_SET": bool(settings.SMTP_PASSWORD),
        "SMTP_PASSWORD_LENGTH": len(settings.SMTP_PASSWORD) if settings.SMTP_PASSWORD else 0,
        "RESEND_API_KEY_SET": bool(settings.RESEND_API_KEY),
        "target": to,
    }

    # Test via email_service
    res = email_service.send_password_reset(
        to_email=to,
        user_name="Yokesh Kumar",
        reset_token="482915",
        reset_link=f"{settings.APP_URL}/login?reset_token=482915&email={to}"
    )
    results["dispatch_result"] = res

    # Direct Resend API probe
    if settings.RESEND_API_KEY:
        try:
            import httpx
            with httpx.Client(timeout=10) as client:
                resend_resp = client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY.strip()}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": settings.RESEND_FROM_EMAIL or "IncidentMind AI <onboarding@resend.dev>",
                        "to": [to],
                        "subject": "IncidentMind AI — Direct Verification Test",
                        "html": f"<p>Hello! Your verification code is <b>482915</b>.</p>",
                    }
                )
                results["resend_status_code"] = resend_resp.status_code
                try:
                    results["resend_body"] = resend_resp.json()
                except Exception:
                    results["resend_body"] = resend_resp.text
        except Exception as e:
            results["resend_error"] = str(e)

    # Direct SMTP probe to capture raw socket exceptions if any
    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_USE_TLS:
                server.starttls()
        if settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD.replace(" ", ""))
        msg = MIMEText(f"IncidentMind AI live verification test delivered to {to}.")
        msg["Subject"] = "IncidentMind AI — Email Verification Test"
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        msg["To"] = to
        server.sendmail(settings.SMTP_FROM_EMAIL or settings.SMTP_USER, [to], msg.as_string())
        server.quit()
        results["direct_smtp"] = "SUCCESS: Delivered to inbox!"
    except Exception as e:
        results["direct_smtp_error"] = f"{type(e).__name__}: {str(e)}"

    return results

