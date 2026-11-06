def test_create_and_list_teams(client, test_admin, admin_token):
    # Create new team
    response = client.post(
        "/api/teams/",
        json={"name": "Core Infrastructure"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Core Infrastructure"
    assert data["role"] == "Admin"
    assert "invite_code" in data

    # List teams
    res = client.get(
        "/api/teams/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    teams = res.json()
    assert len(teams) >= 1


def test_join_team_with_invite_code(client, test_team, test_user, user_token):
    response = client.post(
        "/api/teams/join",
        json={"invite_code": test_team.invite_code},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_team.id
    assert data["role"] == "Engineer"


def test_list_team_members(client, test_team, test_admin, admin_token):
    response = client.get(
        "/api/teams/members",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    assert response.status_code == 200
    members = response.json()
    assert len(members) >= 1
    assert members[0]["user_email"] == test_admin.email

