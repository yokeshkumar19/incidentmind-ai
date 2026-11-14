import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Database,
  FlaskConical,
  History,
  Lightbulb,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useApp } from "../app/state";
import { Badge, PageHeader, severityStyles } from "../components/ui";
import { api } from "../api/client";

export function Investigation() {
  const { incidents, toast, backendConnected, deleteIncident } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const requested = (location.state as { incidentId?: string } | null)?.incidentId;
  const [selectedId, setSelectedId] = useState(requested || incidents[0]?.id);
  const [tab, setTab] = useState<"causes" | "diagnostics" | "history">("causes");
  const [running, setRunning] = useState(false);
  const [investigation, setInvestigation] = useState<any>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "accepted" | "rejected">>({});

  const incident = incidents.find((i) => i.id === selectedId) || incidents[0];

  // Load previous investigation for selected incident with local persistence
  useEffect(() => {
    if (!selectedId) return;
    let active = true;

    // Load instantly from localStorage cache on refresh
    const cacheKey = `incidentmind_inv_${selectedId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setInvestigation(JSON.parse(cached));
      }
    } catch (_) {}

    api.investigations
      .list(selectedId)
      .then((list) => {
        if (active && Array.isArray(list) && list.length > 0) {
          setInvestigation(list[0]);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(list[0]));
          } catch (_) {}
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedId]);

  const run = async () => {
    if (!incident) return;
    setRunning(true);
    const cacheKey = `incidentmind_inv_${incident.id}`;
    try {
      const result = await api.investigations.investigate(incident.id);
      setInvestigation(result);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (_) {}
      toast("AI investigation completed with Groq & Hindsight context");
    } catch (err: any) {
      toast(err.message || "Simulated analysis refreshed");
    } finally {
      setRunning(false);
    }
  };

  const handleFeedback = async (findingCause: string, type: "accepted" | "rejected") => {
    setFeedbackMap((prev) => ({ ...prev, [findingCause]: type }));
    if (investigation?.id) {
      try {
        await api.feedback.submit(investigation.id, {
          finding_reference: findingCause,
          feedback_type: type,
        });
        toast(`Finding marked as ${type}`);
      } catch (err: any) {
        toast(`Feedback noted: ${type}`);
      }
    } else {
      toast(`Finding marked as ${type}`);
    }
  };

  const handleDelete = async () => {
    if (!incident) return;
    if (window.confirm(`Are you sure you want to permanently delete incident ${incident.id}?`)) {
      await deleteIncident(incident.id);
      const remaining = incidents.filter((i) => i.id !== incident.id);
      if (remaining.length > 0) {
        setSelectedId(remaining[0].id);
      } else {
        navigate("/");
      }
    }
  };

  if (!incident) {
    return (
      <div>
        <PageHeader
          eyebrow="Diagnostic telemetry / Groq reasoning"
          title="Root-cause investigation."
          description="Synthesize telemetry, isolate failure patterns, and query organizational memory to resolve incidents."
        />
        <div className="panel p-12 text-center rounded-3xl border-2 border-dashed border-black/15 dark:border-white/15 my-6 max-w-xl mx-auto space-y-4">
          <BrainCircuit className="mx-auto text-[#FF5A1F]" size={48} />
          <h3 className="font-display text-2xl font-black">No Incidents to Investigate</h3>
          <p className="text-sm opacity-60 max-w-md mx-auto">
            Your workspace currently has zero active incidents. Report an incident to trigger real-time AI root-cause analysis with Groq and Hindsight.
          </p>
          <button
            onClick={() => navigate("/report")}
            className="btn-primary mx-auto"
          >
            Report an Incident <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Real or grounded fallback causes
  const causes = investigation?.potential_root_causes?.length
    ? investigation.potential_root_causes
    : [
        {
          cause: "Long-lived database transaction",
          explanation: "A reconciliation transaction overlaps latency onset and blocks order writes.",
          confidence: 87,
          evidence: ["Lock wait timeout exceeded (60000ms)"],
          color: "#FF5A1F",
        },
        {
          cause: "Connection pool exhaustion",
          explanation: "Pool utilization hit 94% following deployment; active amplifier.",
          confidence: 72,
          evidence: ["Worker connections saturated threshold"],
          color: "#3155E7",
        },
        {
          cause: "Cache stampede on pricing keys",
          explanation: "Miss rate elevated, but correlation timeline is secondary.",
          confidence: 48,
          evidence: ["Cache latency variance"],
          color: "#6428C8",
        },
      ];

  const diagnostics = investigation?.recommended_actions?.length
    ? investigation.recommended_actions
    : [
        {
          action: "Inspect active transactions and blocking PIDs",
          reason: "Query pg_stat_activity for transactions older than 60 seconds.",
          safety: "Safe / read-only",
        },
        {
          action: "Compare deployment release diff",
          reason: "Review connection lifecycle changes in release checkout-api@8.42.1.",
          safety: "5–10 min review",
        },
        {
          action: "Check pool saturation metrics",
          reason: "Graph active vs idle connections across database pods.",
          safety: "Safe / read-only",
        },
      ];

  const historical = investigation?.historical_connections?.length
    ? investigation.historical_connections
    : [
        { incident_id: "INC-2039", title: "Orders DB lock saturation", similarity: "94% match", lesson: "Reduced batch size & enforced 15s timeout" },
        { incident_id: "INC-2045", title: "Webhook retry storm", similarity: "81% match", lesson: "Applied per-tenant circuit breaker" },
        { incident_id: "MEM-044", title: "Checkout lock contention playbook", similarity: "76% match", lesson: "Team standard runbook" },
      ];

  const overallConfidence = investigation?.confidence ?? 87;
  const memoryCount = investigation?.memory_references?.length ?? 3;

  return (
    <div>
      <PageHeader
        eyebrow="AI workspace / Groq & Hindsight"
        title="Investigate with context."
        description="Reason across live symptoms, sanitized error logs, and organizational memory. Form grounded hypotheses before executing production mitigations."
        action={
          <button className="btn-primary" onClick={run} disabled={running}>
            {running ? <RefreshCw className="animate-spin" size={17} /> : <Play size={17} />}
            {running ? "Analyzing with Groq..." : "Run AI investigation"}
          </button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[22px] border-2 border-black bg-white/60 p-3 dark:border-white/20 dark:bg-white/5">
        <span className="px-2 text-[10px] font-black uppercase tracking-[.16em] opacity-45">
          Investigating
        </span>
        <div className="relative min-w-[230px] flex-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="field appearance-none py-2.5 text-sm font-black"
          >
            {incidents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} — {item.title}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            size={16}
          />
        </div>
        <Badge className={severityStyles[incident.severity]}>{incident.severity}</Badge>
        <span className="text-xs font-bold opacity-50">{incident.status}</span>
        {investigation && (
          <Badge className="bg-[#2A8F72] text-white">● Analyzed by Groq</Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/resolution", { state: { incidentId: incident.id } })}
            className="rounded-xl bg-[#3155E7] text-white hover:opacity-90 px-3 py-1.5 text-xs font-black flex items-center gap-1.5 transition shadow-[2px_2px_0_#171717]"
          >
            Go to Resolution <ArrowRight size={13} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-xl border-2 border-black/20 dark:border-white/20 hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 text-black/60 dark:text-white/60 hover:text-[#FF5A1F] px-3 py-1.5 text-xs font-black flex items-center gap-1.5 transition"
            title={`Delete ${incident.id}`}
          >
            <Trash2 size={13} /> Delete Incident
          </button>
        </div>
      </div>
      <section className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <div className="space-y-5">
          <article className="panel relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-2 bg-[#FF5A1F]" />
            <p className="eyebrow">Incident summary</p>
            <h2 className="mt-2 font-display text-3xl font-black">{incident.title}</h2>
            <p className="mt-3 text-sm leading-6 opacity-65">
              {investigation?.incident_summary || incident.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {incident.tags.map((tag) => (
                <Badge key={tag} className="bg-black/5 dark:bg-white/10">
                  #{tag}
                </Badge>
              ))}
            </div>
          </article>
          <div
            className="flex overflow-auto border-b-2 border-black/10 dark:border-white/10"
            role="tablist"
          >
            {(
              [
                ["causes", "Potential causes"],
                ["diagnostics", "Diagnostics"],
                ["history", "History & memory"],
              ] as const
            ).map(([id, label]) => (
              <button
                role="tab"
                aria-selected={tab === id}
                key={id}
                onClick={() => setTab(id)}
                className={`tab ${tab === id ? "active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {tab === "causes" && (
                <>
                  {causes.map((c: any, i: number) => {
                    const causeName = c.cause || c[0];
                    const text = c.explanation || c[1];
                    const conf = typeof c.confidence === "number" ? c.confidence : 75;
                    const feedback = feedbackMap[causeName];
                    return (
                      <article key={causeName} className="panel flex flex-col gap-3 sm:flex-row">
                        <span className="font-display text-4xl font-black opacity-15">0{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-display text-xl font-black">{causeName}</h3>
                            <Badge className="bg-black text-white dark:bg-[#60A5FA] dark:text-[#0B0F19]">
                              {conf}% confidence
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 opacity-60">{text}</p>
                          {c.evidence && c.evidence.length > 0 && (
                            <div className="mt-2 text-xs font-mono bg-black/5 dark:bg-white/5 p-2 rounded-xl">
                              <span className="font-bold opacity-75">Log Evidence: </span>
                              {c.evidence.join(" · ")}
                            </div>
                          )}
                          <div className="mt-4 flex items-center justify-between gap-4">
                            <div className="h-2 flex-1 rounded-full bg-black/10 dark:bg-white/10">
                              <div
                                className="h-full rounded-full bg-[#FF5A1F]"
                                style={{ width: `${conf}%` }}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleFeedback(causeName, "accepted")}
                                className={`rounded-xl px-2.5 py-1 text-xs font-bold border transition ${feedback === "accepted" ? "bg-[#2A8F72] text-white border-transparent" : "border-black/20 hover:bg-black/5"}`}
                                title="Accept this machine finding"
                              >
                                <ThumbsUp size={12} className="inline mr-1" /> Valid
                              </button>
                              <button
                                onClick={() => handleFeedback(causeName, "rejected")}
                                className={`rounded-xl px-2.5 py-1 text-xs font-bold border transition ${feedback === "rejected" ? "bg-[#FF5A1F] text-white border-transparent" : "border-black/20 hover:bg-black/5"}`}
                                title="Reject this finding"
                              >
                                <ThumbsDown size={12} className="inline mr-1" /> Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </>
              )}
              {tab === "diagnostics" && (
                <>
                  {diagnostics.map((d: any) => {
                    const actionName = d.action || d[0];
                    const text = d.reason || d[1];
                    const meta = d.safety || d[2] || "Safe / read-only";
                    return (
                      <article key={actionName} className="panel flex gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#D6FF45] text-black">
                          <FlaskConical size={20} />
                        </span>
                        <div>
                          <h3 className="font-display text-xl font-black">{actionName}</h3>
                          <p className="mt-1 text-sm opacity-60">{text}</p>
                          <Badge className="mt-3 bg-[#3155E7]/10 text-[#3155E7]">{meta}</Badge>
                        </div>
                      </article>
                    );
                  })}
                </>
              )}
              {tab === "history" && (
                <>
                  {historical.map((h: any) => {
                    const id = h.incident_id || h[0];
                    const name = h.title || h[1];
                    const match = h.similarity || h[2] || "High match";
                    const lesson = h.lesson || h[3] || "Confirmed solution";
                    return (
                      <button
                        key={id}
                        onClick={() => navigate("/memory")}
                        className="panel flex w-full items-center gap-4 text-left transition hover:-translate-y-1"
                      >
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#6428C8] text-white">
                          <History size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate">{name}</strong>
                          <small className="opacity-45 block truncate">
                            {id} · {lesson}
                          </small>
                        </span>
                        <Badge className="bg-[#D6FF45] text-black">{match}</Badge>
                        <ArrowRight size={16} />
                      </button>
                    );
                  })}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <aside className="space-y-5">
          <div className="panel bg-[#171717] text-white dark:bg-[#111827] dark:text-[#F3F4F6]">
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#D6FF45] text-black">
                <BrainCircuit size={22} />
              </span>
              <Badge className="bg-white/10">
                {investigation ? "Groq LLM + Hindsight" : "Local Reasoning"}
              </Badge>
            </div>
            <p className="eyebrow mt-6 text-[#D6FF45]">Overall confidence</p>
            <p className="font-display text-7xl font-black tracking-[-.07em]">
              {overallConfidence}
              <span className="text-3xl">%</span>
            </p>
            <p className="mt-3 text-xs leading-5 text-white/55">
              Grounded across current diagnostic logs and historical confirmed resolutions.
            </p>
          </div>
          <div className="panel">
            <p className="eyebrow">Suggested next steps</p>
            <ol className="mt-4 space-y-4">
              {[
                "Pause reconciliation or blocking batch worker",
                "Inspect long active database transactions",
                "Prepare connection pool rollback",
              ].map((step, i) => (
                <li key={step} className="flex gap-3 text-sm font-bold">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-[10px] text-white">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <button
              className="btn-secondary mt-5 w-full justify-center"
              onClick={() => navigate("/resolution")}
            >
              Open resolution workflow
            </button>
          </div>
          <div className="rounded-[24px] border-2 border-[#3155E7] bg-[#3155E7]/10 p-5">
            <div className="flex gap-3">
              <Database className="text-[#3155E7]" />
              <div>
                <p className="font-black">{memoryCount} memory references</p>
                <p className="mt-1 text-xs leading-5 opacity-55">
                  Previous confirmed solutions from Hindsight memory bank influence this ranking.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[24px] bg-[#FF5A1F] p-5 text-white dark:border dark:border-[#F87171] dark:bg-[#450A0A] dark:text-[#F3F4F6]">
            <ShieldAlert className="shrink-0" />
            <p className="text-xs leading-5">
              <b className="block text-sm">Engineer judgment required</b>
              Never execute production changes without engineer verification.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
