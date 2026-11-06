from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.security import (
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
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
    Generates a secure 15-minute reset token and emails the password reset instructions.
    """
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if user:
        token = create_password_reset_token(user.email, user.id)
        reset_link = f"{settings.APP_URL}/login?reset_token={token}&email={user.email}"
        email_service.send_password_reset(
            to_email=user.email,
            user_name=user.name,
            reset_token=token,
            reset_link=reset_link,
        )

    return MessageResponse(
        message="If an account exists with this email address, password reset instructions have been sent to your inbox."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    POST /api/auth/reset-password
    Verifies the reset token and updates the user's password.
    """
    payload = verify_password_reset_token(req.token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The password reset link is invalid or has expired. Please request a new one."
        )

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    user.password_hash = get_password_hash(req.new_password)
    db.commit()

    return MessageResponse(
        message="Your password has been successfully updated. You can now sign in with your new credentials."
    )

