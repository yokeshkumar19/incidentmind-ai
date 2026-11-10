# IncidentMind AI — Backend

A high-performance Python & FastAPI backend powering the **IncidentMind AI** platform: an AI-driven incident investigation and persistent organizational memory engine.

"Every incident teaches. Every confirmed solution makes the team smarter."

---

## 1. System Architecture

```
Frontend (React 19 + TypeScript + Tailwind CSS)
                   |
                   v (REST APIs)
FastAPI Backend (Python 3.11)
  ├── Authentication & RBAC (JWT, bcrypt, Admin/Engineer/Viewer roles)
  ├── Team & Workspace Isolation (Isolated memory banks: team_{team_id})
  ├── Incident Management (CRUD, triage, state machine)
  ├── Log Processing & Sanitization (Regex redaction of JWTs, keys, credentials)
  ├── Hindsight Memory Engine
  │     ├── Retain: Ingests confirmed incident resolutions & actions
  │     ├── Recall: Recalls relevant troubleshooting experiences
  │     └── Reflect: Synthesizes cross-incident failure patterns
  ├── Groq AI Investigation Service
  │     └── LLM reasoning over sanitized logs + recalled memories (JSON structured output)
  ├── Feedback & Confirmation Workflow (Human-in-the-loop review)
  ├── Real Analytics Engine (Aggregated directly from stored database records)
  └── Database (PostgreSQL / SQLite via SQLAlchemy ORM)
```

---

## 2. Directory Structure

```
backend/
├── app/
│   ├── main.py                     # FastAPI application, CORS, lifespan & initial seeding
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings (Groq, Hindsight, DB, JWT)
│   │   ├── security.py             # Password hashing (bcrypt) & JWT token creation
│   │   └── dependencies.py         # Workspace isolation & role-based access control
│   ├── database/
│   │   ├── connection.py           # SQLAlchemy database engine & session provider
│   │   └── models.py               # User, Team, TeamMember, Incident, Investigation, etc.
│   ├── schemas/                    # Pydantic v2 schemas for all requests & responses
│   ├── api/
│   │   ├── auth.py                 # Registration, login, profile
│   │   ├── teams.py                # Workspace management, invite codes, members
│   │   ├── incidents.py            # Incident intake & CRUD
│   │   ├── investigations.py       # Groq AI investigation pipeline
│   │   ├── resolutions.py          # Engineer confirmation & Hindsight Retain trigger
│   │   ├── feedback.py             # Accept/reject/correct AI findings
│   │   ├── memory.py               # Hindsight recall & reflect endpoints
│   │   └── analytics.py            # Live computed reliability intelligence
│   └── services/
│       ├── log_processor.py        # Safe log parsing, exception extraction & redaction
│       ├── hindsight_service.py    # Retain, Recall, Reflect with strict team isolation
│       ├── groq_service.py         # Grounded prompt building & structured LLM reasoning
│       ├── incident_service.py     # Incident lifecycle orchestration
│       └── analytics_service.py    # Metric aggregation
├── tests/                          # 17 Automated pytest unit and integration tests
├── requirements.txt
├── .env.example
├── .env
└── README.md
```

---

## 3. Quick Start & Setup

### Prerequisites
- Python 3.10+ (tested with Python 3.11)
- Node.js & pnpm/npm (for the frontend)

### Installation

1. Navigate to the backend directory and activate the virtual environment:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Configure environment variables in `backend/.env`:
```env

```
*(If no external API keys are set, IncidentMind AI gracefully runs its evidence-grounded local reasoning and database memory engine so all flows work out-of-the-box).*

3. Start the FastAPI development server:
```powershell
uvicorn backend.app.main:app --reload --port 8000
```

The API documentation will be available at:
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc UI: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/api/health`

---

## 4. Running the Automated Test Suite

Run the full pytest suite:
```powershell
$env:PYTHONPATH="."
.\backend\.venv\Scripts\python -m pytest backend/tests -v
```

All 17 automated tests verify:
- User registration and login
- Team creation and invite-code joining
- Team permission checks and workspace access control
- Incident reporting and retrieval
- Safe log sanitization (JWT, bearer token, and credential redactions)
- AI investigation schema validation
- Hindsight memory recall
- Hindsight memory retention upon confirmed resolution
- Strict cross-workspace memory and incident isolation
- Resolution confirmation and feedback auditing
- Real analytics aggregation

---

## 5. Security & Isolation Highlights

1. **Untrusted Data & Log Sanitization**: Uploaded error logs are treated strictly as untrusted text. Obvious JWTs, Bearer tokens, passwords, database connection strings, and AWS keys are redacted before storage and external reasoning.
2. **Strict Multi-Tenant Workspace Isolation**: Every Hindsight operation uses an isolated bank ID `team_{team_id}`. A user in Team A cannot query or read memories belonging to Team B.
3. **Human-in-the-Loop Confirmation**: Machine suggestions never become organizational memories without engineer review and confirmation. Only confirmed resolutions are retained in Hindsight.
