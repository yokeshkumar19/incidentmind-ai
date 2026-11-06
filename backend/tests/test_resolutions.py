def test_resolve_incident_and_retain_memory(client, test_team, test_admin, admin_token):
    # 1. Create incident
    res = client.post(
        "/api/incidents/",
        json={
            "title": "Auth Token Redis Outage",
            "description": "Redis cluster failover caused 500s on login verification.",
            "affected_service": "Identity",
            "severity": "High",
            "environment": "Production",
            "error_logs": "ERROR: RedisConnectionClosed during token lookup",
        },
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    incident_id = res.json()["id"]

    # 2. Confirm resolution with retain=True
    resolve_res = client.post(
        f"/api/incidents/{incident_id}/resolve",
        json={
            "actual_root_cause": "Sentinel misconfiguration during node promotion.",
            "actions_taken": "Fixed sentinel quorum and restarted standby node.",
            "final_resolution": "Restored redis quorum and flushed stale connection handles.",
            "resolution_status": "Resolved",
            "retain_in_memory": True,
        },
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    assert resolve_res.status_code == 200
    res_data = resolve_res.json()
    assert res_data["resolution_status"] == "Resolved"
    assert res_data["retained_in_hindsight"] is True

    # 3. Verify memory record is stored in workspace
    mem_res = client.get(
        "/api/memory/",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Team-ID": test_team.id,
        },
    )
    assert mem_res.status_code == 200
    memories = mem_res.json()
    assert any(m["incident_id"] == incident_id for m in memories)

