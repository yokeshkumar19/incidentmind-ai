import pytest
from backend.app.core.security import create_access_token, get_password_hash
from backend.app.database.models import User, Team, TeamMember


def test_memory_and_incident_isolation_between_teams(client, db_session):
    # Team A & User A
    user_a = User(name="User A", email="usera@test.com", password_hash=get_password_hash("pass"))
    db_session.add(user_a)
    db_session.commit()

    team_a = Team(name="Team Alpha", created_by=user_a.id, invite_code="INV-ALPHA")
    db_session.add(team_a)
    db_session.commit()

    db_session.add(TeamMember(user_id=user_a.id, team_id=team_a.id, role="Admin"))
    db_session.commit()
    token_a = create_access_token(user_a.id)

    # Team B & User B
    user_b = User(name="User B", email="userb@test.com", password_hash=get_password_hash("pass"))
    db_session.add(user_b)
    db_session.commit()

    team_b = Team(name="Team Beta", created_by=user_b.id, invite_code="INV-BETA")
    db_session.add(team_b)
    db_session.commit()

    db_session.add(TeamMember(user_id=user_b.id, team_id=team_b.id, role="Admin"))
    db_session.commit()
    token_b = create_access_token(user_b.id)

    # Create incident in Team A
    res = client.post(
        "/api/incidents/",
        json={
            "title": "Alpha Confidential Leak Incident",
            "description": "Team Alpha specific failure that must never appear in Team Beta.",
            "affected_service": "SecretService",
            "severity": "Critical",
            "environment": "Production",
            "error_logs": "alpha logs",
        },
        headers={"Authorization": f"Bearer {token_a}", "X-Team-ID": team_a.id},
    )
    assert res.status_code == 201
    inc_a_id = res.json()["id"]

    # Resolve incident in Team A to retain memory
    client.post(
        f"/api/incidents/{inc_a_id}/resolve",
        json={
            "actual_root_cause": "Alpha Secret Bug",
            "actions_taken": "Alpha Fix",
            "final_resolution": "Alpha Patched",
            "resolution_status": "Resolved",
            "retain_in_memory": True,
        },
        headers={"Authorization": f"Bearer {token_a}", "X-Team-ID": team_a.id},
    )

    # Attempt to list incidents from Team B — must NOT see Team A's incident
    res_b = client.get(
        "/api/incidents/",
        headers={"Authorization": f"Bearer {token_b}", "X-Team-ID": team_b.id},
    )
    assert res_b.status_code == 200
    assert not any(i["id"] == inc_a_id for i in res_b.json())

    # Attempt to access Team A's memories from Team B — must NOT see Team A's memories
    mem_b = client.get(
        "/api/memory/",
        headers={"Authorization": f"Bearer {token_b}", "X-Team-ID": team_b.id},
    )
    assert mem_b.status_code == 200
    assert len(mem_b.json()) == 0

    # Attempt unauthorized access by forging X-Team-ID header of Team A with User B's token
    unauthorized_res = client.get(
        "/api/incidents/",
        headers={"Authorization": f"Bearer {token_b}", "X-Team-ID": team_a.id},
    )
    assert unauthorized_res.status_code == 403

