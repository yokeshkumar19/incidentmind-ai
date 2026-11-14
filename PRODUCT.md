# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are on-call engineers, Site Reliability Engineers (SREs), DevOps practitioners, and platform engineers triaging high-stakes production outages and recurring service disruptions. They operate under time pressure, seeking fast, trustworthy diagnostics and institutional precedent rather than generic troubleshooting advice.

## Product Purpose

IncidentMind AI is an incident investigation and organizational memory platform. It bridges the gap between acute incident response and institutional knowledge retention by sanitizing error logs, extracting diagnostic signals, recalling relevant historical resolutions from a persistent memory engine, and structuring AI-assisted root cause hypotheses. Success means cutting Mean Time to Resolution (MTTR) while ensuring every verified incident resolution persists to educate future rotations.

## Positioning

Persistent organizational memory with human-verified retention. Unlike stateless observability chat tools or ungrounded LLMs, IncidentMind AI grounds its reasoning in the team's verified operational history via Vectorize Hindsight, while enforcing that AI suggestions are never committed to organizational memory without explicit engineer validation.

## Operating Context

- **Triage & Response:** Real-time incident reporting, raw error log ingestion, credential redaction, and rapid diagnostic reasoning.
- **Investigation:** Structured hypothesis review with confidence scores, log evidence quotes, safety-classified actions, and historical precedent matching.
- **Resolution & Post-Incident:** Formal root cause confirmation, remediation action tracking, and one-click retention into team-isolated memory banks.
- **Workspace Isolation:** Multi-tenant workspace boundaries enforcing strict team access control via `X-Team-ID` headers.

## Capabilities and Constraints

- **Capabilities:**
  - Automated log sanitization (redacting JWTs, AWS keys, database URIs, API tokens).
  - Diagnostic signal extraction (exception types, timestamps, high-signal log lines).
  - Semantic historical incident recall and organizational reflection via Vectorize Hindsight.
  - High-speed structured inference via Groq (`openai/gpt-oss-120b`).
  - Dual-layer persistence with local database fallback for offline fidelity and complete audit trails.
  - Role-based access control (`Admin`, `Engineer`, `Viewer`).
- **Constraints:**
  - Human-in-the-loop authority is non-negotiable: AI hypotheses cannot self-retain into memory.
  - Untrusted log inputs are isolated and guarded against prompt injection.
  - Deployed across Vercel (React 19 SPA frontend) and Render (FastAPI backend with Supabase PostgreSQL).

## Brand Commitments

- **Name:** IncidentMind AI
- **Voice & Tone:** Authoritative, high-density SRE command console, technical, disciplined, zero AI hand-waving or conversational filler.
- **Color Identity:**
  - Primary Accent: Flame Orange (`#FF5A1F`)
  - Warm Canvas: Cream Light Mode (`#FFF7E8`) / Deep Console Dark Mode (`#0B0F19`)
  - Accent Blue: Console Blue (`#3155E7`)
  - Metric Highlight: Electric Lime (`#D6FF45`)
- **Visual Motif:** Tilted flame-orange squircle housing the neural brain-circuit icon.

## Evidence on Hand

- Live, working application on Vercel (`https://incidentmind-ai-alpha.vercel.app`).
- Live backend on Render (`https://incidentmind-ai-pgxr.onrender.com`).
- Comprehensive backend test suite verifying memory isolation, log sanitization, and resolution lifecycle.

## Product Principles

1. **Human Authority Above Machine Suggestion:** AI accelerates hypothesis generation; only verified engineers confirm root causes and commit institutional knowledge.
2. **Context Over Parametric Guesswork:** Investigations grounded in the team's actual resolution history consistently beat generic LLM speculation.
3. **Pristine Memory Discipline:** An organizational memory system that learns from unverified hypotheses compounds errors; strict gating preserves high signal-to-noise.
4. **Safety-First Diagnostics:** Every recommended operational action must be safety-classified (read-only inspections first) before suggesting invasive remediation.

## Accessibility & Inclusion

- Adherence to WCAG 2.1 AA standards for high contrast in both light and dark operational modes.
- Keyboard-accessible incident investigation workflows, explicit focus states, and zero reliance on color alone for severity status.

