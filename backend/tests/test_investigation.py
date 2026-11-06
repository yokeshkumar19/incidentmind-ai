def test_investigate_incident(client, test_team, test_admin, admin_token):
    # 1. Report incident
    res = client.post(
        "/api/incidents/",
        json={
            "title": "Checkout DB Connection Spike",
            "description": "Postgres primary active connections reached max_connections pool limit after inventory deploy.",
            "affected_service": "Checkout API",
            "severity": "Critical",
            "environment": "Production",
            "error_logs": "FATAL: sorry, too many clients already. Lock wait timeout exceeded.",
        },
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    assert res.status_code == 201
    incident_id = res.json()["id"]

    # 2. Trigger Investigation
    inv_res = client.post(
        f"/api/incidents/{incident_id}/investigate",
        json={},
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    assert inv_res.status_code == 200
    inv = inv_res.json()
    assert inv["incident_id"] == incident_id
    assert len(inv["potential_root_causes"]) >= 1
    assert len(inv["recommended_actions"]) >= 1
    assert "confidence" in inv
    assert "uncertainties" in inv

    # 3. Submit Feedback on finding
    fb_res = client.post(
        f"/api/investigations/{inv['id']}/feedback",
        json={
            "finding_reference": inv["potential_root_causes"][0]["cause"],
            "feedback_type": "accepted",
            "correction": "Verified via pg_stat_activity.",
        },
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    assert fb_res.status_code == 201
    assert fb_res.json()["feedback_type"] == "accepted"

