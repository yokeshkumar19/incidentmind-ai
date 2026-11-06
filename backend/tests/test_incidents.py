def test_create_and_get_incident(client, test_team, test_admin, admin_token):
    # Report incident
    payload = {
        "title": "Payment Gateway Timeout",
        "description": "504 Gateway Timeouts on /v1/charges endpoint causing drop in successful transactions.",
        "affected_service": "Billing",
        "severity": "Critical",
        "environment": "Production",
        "error_logs": "ERROR: GatewayTimeout on stripe-api Authorization: Bearer eyJhbGciOi.secret.token",
    }
    response = client.post(
        "/api/incidents/",
        json=payload,
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"].startswith("INC-")
    assert data["title"] == payload["title"]
    assert "secret.token" not in data["error_logs"]  # Redacted
    assert "[REDACTED_JWT]" in data["error_logs"]

    incident_id = data["id"]

    # Get incident
    res = client.get(
        f"/api/incidents/{incident_id}",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    assert res.status_code == 200
    assert res.json()["id"] == incident_id


def test_list_incidents_filtering(client, test_team, test_admin, admin_token):
    # Create incident
    client.post(
        "/api/incidents/",
        json={
            "title": "Search Query Latency Spike",
            "description": "Elasticsearch cluster CPU 98% due to wildcard queries.",
            "affected_service": "Search",
            "severity": "High",
            "environment": "Production",
            "error_logs": "WARN: search cluster heavy load",
        },
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )

    # Filter by service
    res = client.get(
        "/api/incidents/?service=Search",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    assert res.status_code == 200
    incidents = res.json()
    assert len(incidents) >= 1
    assert all(i["affected_service"] == "Search" for i in incidents)

