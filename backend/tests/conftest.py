import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.core.config import settings
from backend.app.database.connection import Base, get_db
from backend.app.database.models import User, Team, TeamMember
from backend.app.main import app

settings.ENVIRONMENT = "testing"

# Shared in-memory SQLite database across all test threads
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(db_session):
    user = User(
        name="Test Engineer",
        email="engineer@test.com",
        password_hash=get_password_hash("password123"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_admin(db_session):
    admin = User(
        name="Test Admin",
        email="admin@test.com",
        password_hash=get_password_hash("password123"),
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture(scope="function")
def test_team(db_session, test_admin):
    team = Team(
        name="Platform SRE",
        created_by=test_admin.id,
        invite_code="TEST-SRE",
    )
    db_session.add(team)
    db_session.commit()
    db_session.refresh(team)

    membership = TeamMember(
        user_id=test_admin.id,
        team_id=team.id,
        role="Admin",
    )
    db_session.add(membership)
    db_session.commit()
    return team


@pytest.fixture(scope="function")
def user_token(test_user):
    return create_access_token(test_user.id)


@pytest.fixture(scope="function")
def admin_token(test_admin):
    return create_access_token(test_admin.id)
