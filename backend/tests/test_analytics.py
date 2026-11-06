def test_get_analytics_summary(client, test_team, test_admin, admin_token):
    # 1. Create incidents
    client.post(
        "/api/incidents/",
        json={
            "title": "Checkout Latency Outage",
            "description": "High latency in checkout service.",
            "affected_service": "Checkout API",
            "severity": "Critical",
            "environment": "Production",
            "error_logs": "500 Internal Server Error",
        },
        headers={"Authorization": f"Bearer {admin_token}", "X-Team-ID": test_team.id},
    )

    # 2. Get analytics
    response = client.get(
        "/api/analytics/summary",
        headers={"Authorization": f"Bearer {admin_token}", "X-Team-ID": test_team.id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_incidents"] >= 1
    assert data["critical_incidents"] >= 1
    assert "severity_distribution" in data
    assert "service_breakdown" in data
    assert "frequency_trend" in data
    assert "resolution_trend" in data

