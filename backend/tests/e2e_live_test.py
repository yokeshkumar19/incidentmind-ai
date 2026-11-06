import asyncio
import json
import sys
import httpx

from backend.app.main import app, seed_initial_data
from backend.app.database.connection import init_db

def print_step(title):
    print(f"\n{'='*70}\n[STEP] {title}\n{'='*70}")

async def run_e2e_test():
    # Ensure database is initialized and seeded
    init_db()
    seed_initial_data()

    # Determine whether to use live server or in-process ASGI transport
    use_remote = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as check_client:
            res = await check_client.get("http://127.0.0.1:8000/api/health")
            if res.status_code == 200:
                use_remote = True
    except Exception:
        use_remote = False

    if use_remote:
        print("Connected to live Uvicorn server on http://localhost:8000")
        client = httpx.AsyncClient(base_url="http://localhost:8000/api", timeout=45.0)
    else:
        print("Executing in-process ASGI pipeline against live FastAPI backend")
        transport = httpx.ASGITransport(app=app)
        client = httpx.AsyncClient(transport=transport, base_url="http://test/api", timeout=45.0)

    async with client:
        # Step 1: Health check
        print_step("1. Verifying Live Backend & API Key Integrations")
        r = await client.get("/health")
        assert r.status_code == 200, f"Health check failed: {r.text}"
        health = r.json()
        print("Health Status:\n" + json.dumps(health, indent=2))
        assert health["groq_configured"] is True, "Groq must be configured"
        assert health["hindsight_configured"] is True, "Hindsight must be configured"

        # Step 2: Authentication & Team Resolution
        print_step("2. Authenticating & Resolving Workspace")
        r = await client.post("/auth/login", json={"email": "maya@atlas.dev", "password": "incidentmind123"})
        if r.status_code != 200:
            r = await client.post("/auth/login", json={"email": "demo@incidentmind.ai", "password": "incidentmind123"})
        
        token_data = r.json()
        token = token_data.get("access_token")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        print(f"Authenticated as: {token_data.get('user', {}).get('name')} ({token_data.get('user', {}).get('email')})")

        r = await client.get("/teams/current", headers=headers)
        assert r.status_code == 200, f"Failed getting team: {r.text}"
        team = r.json()
        team_id = team["id"]
        headers["X-Team-ID"] = team_id
        print(f"Active Workspace: {team['name']} [ID: {team_id}] [Invite: {team['invite_code']}]")

        # Step 3: Reporting New Incident with Logs & Secret Redaction
        print_step("3. Reporting New Incident with Sensitive Logs")
        test_logs = (
            "FATAL: Lock wait timeout exceeded (60000ms); process_id=14201 on orders_db\n"
            "2026-11-06T18:15:00Z checkout-worker: connection refused to postgresql://admin:MySuperSecretPassword@db.internal:5432/orders\n"
            "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.super_secret_jwt_token"
        )
        incident_payload = {
            "title": "Payment Lock Contention During Inventory Sync",
            "description": "Customer order checkout endpoint latency exceeded 5.2s following inventory reconciliation batch job.",
            "affected_service": "Checkout API",
            "severity": "Critical",
            "environment": "Production",
            "error_logs": test_logs,
        }
        r = await client.post("/incidents/", json=incident_payload, headers=headers)
        assert r.status_code == 201, f"Failed creating incident: {r.text}"
        incident = r.json()
        inc_id = incident["id"]
        print(f"Created Incident: {inc_id} — {incident['title']}")
        print(f"Affected Service: {incident['affected_service']} | Severity: {incident['severity']}")
        print("\nVerifying Log Sanitization:")
        stored_logs = incident.get("error_logs", "")
        assert "MySuperSecretPassword" not in stored_logs, "Password was not redacted!"
        assert "super_secret_jwt_token" not in stored_logs, "JWT token was not redacted!"
        assert "[REDACTED_PASSWORD]" in stored_logs or "[REDACTED_CREDENTIALS]" in stored_logs
        assert "[REDACTED_JWT]" in stored_logs
        print("  -> Credential & JWT Redaction: PASSED (Secrets safely scrubbed before storage/reasoning)")

        # Step 4: AI Investigation Engine (Live Groq LLM + Hindsight Recall)
        print_step("4. Triggering Live AI Investigation (Groq openai/gpt-oss-120b + Hindsight Recall)")
        print(f"Executing investigation pipeline for {inc_id}...")
        r = await client.post(f"/incidents/{inc_id}/investigate", json={}, headers=headers)
        assert r.status_code == 200, f"Investigation failed: {r.text}"
        inv = r.json()
        inv_id = inv["id"]
        print("\n=== AI INVESTIGATION REPORT ===")
        print(f"Summary: {inv['incident_summary']}")
        print(f"Confidence Score: {inv['confidence']}%")
        print(f"Hindsight Memories Used: {inv['memory_used']} ({len(inv['memory_references'])} historical memories retrieved)")
        
        print("\nIdentified Potential Root Causes:")
        for idx, cause in enumerate(inv["potential_root_causes"], 1):
            print(f"  [{idx}] {cause['cause']} (Confidence: {cause['confidence']}%)")
            print(f"      Explanation: {cause['explanation']}")
            if cause.get("evidence"):
                print(f"      Evidence: {', '.join(cause['evidence'])}")

        print("\nRecommended Diagnostic Actions:")
        for idx, action in enumerate(inv["recommended_actions"], 1):
            print(f"  [{idx}] {action['action']} (Priority: {action['priority']}, Safety: {action.get('safety', 'Safe')})")
            print(f"      Reason: {action['reason']}")

        if inv.get("historical_connections"):
            print("\nHistorical Connections to Previous Recoveries:")
            for hc in inv["historical_connections"]:
                print(f"  * {hc.get('incident_id')} — {hc.get('title')} ({hc.get('similarity')}): {hc.get('lesson')}")

        # Step 5: Engineer Feedback on Findings
        print_step("5. Submitting Engineer Feedback on Machine Hypotheses")
        first_cause_name = inv["potential_root_causes"][0]["cause"]
        r = await client.post(
            f"/investigations/{inv_id}/feedback",
            json={
                "finding_reference": first_cause_name,
                "feedback_type": "accepted",
                "correction": "Verified through active Postgres query trace.",
            },
            headers=headers
        )
        assert r.status_code == 201
        fb = r.json()
        print(f"Engineer feedback logged: '{fb['finding_reference']}' marked as '{fb['feedback_type']}' by {fb.get('reviewer_name', 'Engineer')}")

        # Step 6: Incident Resolution Workflow & Hindsight Retain
        print_step("6. Recording Confirmed Resolution & Triggering Hindsight Retain")
        resolution_payload = {
            "actual_root_cause": "Inventory reconciliation batch query held row locks on orders table across 40,000 rows without chunking.",
            "actions_taken": "Terminated blocking PID 14201, capped batch size to 500 rows, and added statement_timeout=15s in postgres connection pool.",
            "final_resolution": "Terminated blocking worker and capped transaction duration. Orders latency normalized to 85ms.",
            "resolution_status": "Resolved",
            "retain_in_memory": True,
        }
        r = await client.post(f"/incidents/{inc_id}/resolve", json=resolution_payload, headers=headers)
        assert r.status_code == 200, f"Resolution failed: {r.text}"
        res_data = r.json()
        print(f"Incident {inc_id} status updated to: '{res_data['resolution_status']}'")
        print(f"Confirmed by: {res_data.get('confirmer_name')}")
        print(f"Retained in Hindsight Memory Bank: {res_data['retained_in_hindsight']}")

        # Step 7: Hindsight Memory Retrieval
        print_step("7. Recalling Organizational Memory from Hindsight")
        r = await client.post(
            "/memory/recall",
            json={"query": "orders database lock contention and batch queries", "limit": 3},
            headers=headers
        )
        assert r.status_code == 200, f"Memory recall failed: {r.text}"
        recall_data = r.json()
        print(f"Recalled {recall_data['count']} relevant organizational memories for workspace '{team_id}':")
        for m in recall_data["memories"]:
            print(f"  * {m['id']} [{m['service']}]: {m['root_cause']} (Match Score: {m['match_score']})")

        # Step 8: Hindsight Reflect
        print_step("8. Hindsight Reflect: Cross-Incident Pattern Synthesis")
        r = await client.post("/memory/reflect", json={}, headers=headers)
        assert r.status_code == 200, f"Reflect failed: {r.text}"
        reflect_data = r.json()
        print(f"Synthesized Reflection Grounded in {reflect_data['grounded_memory_count']} Verified Memories:")
        print(f"  {reflect_data['reflection']}")
        print("\nIdentified Recurring Failure Patterns:")
        for p in reflect_data.get("patterns_identified", []):
            print(f"  - {p}")
        print("\nStrategic Team Recommendations:")
        for rec in reflect_data.get("strategic_recommendations", []):
            print(f"  - {rec}")

        # Step 9: Real Analytics Verification
        print_step("9. Verifying Live Computed Analytics")
        r = await client.get("/analytics/summary", headers=headers)
        assert r.status_code == 200, f"Analytics failed: {r.text}"
        analytics = r.json()
        print(f"Total Stored Incidents: {analytics['total_incidents']}")
        print(f"Resolved Incidents: {analytics['resolved_incidents']}")
        print(f"Active Incidents: {analytics['active_incidents']}")
        print(f"Fleet Reliability: {analytics['fleet_reliability']}%")
        print(f"Median MTTR: {analytics['median_mttr_hours']}h")
        print("Recurring Issues Detected:", [i['name'] for i in analytics.get('recurring_issues', [])])

        print(f"\n{'='*70}\n[SUCCESS] ALL END-TO-END WORKFLOW TESTS COMPLETED SUCCESSFULLY!\n{'='*70}\n")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
