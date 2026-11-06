from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

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
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    POST /api/auth/forgot-password
    Generates a secure, user-friendly 6-digit verification code and sends it via email.
    """
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if user:
        # Generate intuitive 6-digit reset code
        code = generate_password_reset_code()
        user.reset_code = code
        user.reset_code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        db.commit()

        reset_link = f"{settings.APP_URL}/login?reset_token={code}&email={user.email}"
        email_service.send_password_reset(
            to_email=user.email,
            user_name=user.name,
            reset_token=code,
            reset_link=reset_link,
        )

    return MessageResponse(
        message="If an account exists with this email address, password reset instructions have been sent to your inbox."
    )


@router.post("/reset-password", response_model=MessageResponse)
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
        if found_user.reset_code_expires_at and found_user.reset_code_expires_at.replace(tzinfo=timezone.utc) < now_utc:
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

