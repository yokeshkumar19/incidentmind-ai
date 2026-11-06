def test_register_user(client):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Sarah Connor",
            "email": "sarah@cyberdyne.com",
            "password": "securepassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "sarah@cyberdyne.com"
    assert data["user"]["name"] == "Sarah Connor"


def test_register_duplicate_email(client, test_user):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Duplicate User",
            "email": test_user.email,
            "password": "securepassword123",
        },
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_login_success(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


def test_login_failure(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


def test_get_current_user_profile(client, test_user, user_token):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email

