import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  Trash2,
} from "lucide-react";
import { useApp } from "../app/state";
import { Badge, PageHeader, severityStyles } from "../components/ui";
import { api } from "../api/client";

type Decision = "accepted" | "rejected" | null;

export function Resolution() {
  const navigate = useNavigate();
  const { incidents, resolveIncident, deleteIncident, toast } = useApp();
  const unresolved = incidents.filter((i) => i.status !== "Resolved");
  const [selectedId, setSelectedId] = useState(unresolved[0]?.id || incidents[0]?.id);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [actualRootCause, setActualRootCause] = useState("");
  const [resolution, setResolution] = useState("");
  const [resolved, setResolved] = useState<"yes" | "no" | null>("yes");
  const [retain, setRetain] = useState(true);
  const [investigation, setInvestigation] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const incident = incidents.find((i) => i.id === selectedId) || incidents[0];

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    api.investigations
      .list(selectedId)
      .then((list) => {
        if (active && Array.isArray(list) && list.length > 0) {
          setInvestigation(list[0]);
          if (list[0].potential_root_causes?.[0]?.cause) {
            setActualRootCause(list[0].potential_root_causes[0].cause);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedId]);

  const defaultRecommendations = [
    "Pause inventory reconciliation batch worker for 10 minutes",
    "Inspect pg_stat_activity and terminate the oldest blocking transaction",
    "Roll back checkout-api@8.42.1 connection pool changes",
  ];

  const recommendations = investigation?.recommended_actions?.length
    ? investigation.recommended_actions.map((r: any) => r.action || r)
    : defaultRecommendations;

  const handleDecision = async (idx: number, type: Decision) => {
    setDecisions((d) => ({ ...d, [idx]: type }));
    const recText = recommendations[idx];
    if (investigation?.id && type) {
      try {
        await api.feedback.submit(investigation.id, {
          finding_reference: recText,
          feedback_type: type,
        });
      } catch (_) {}
    }
  };

  const save = async () => {
    if (!incident) return;
    if (!resolution.trim() || !resolved) {
      return toast("Complete the resolution summary and outcome");
    }

    setSaving(true);
    try {
      if (resolved === "yes") {
        await resolveIncident(
          incident.id,
          resolution,
          actualRootCause || "Root cause verified by on-call engineer"
        );
        toast(
          retain
            ? "Resolution saved and retained in Hindsight organizational memory"
            : "Resolution saved without memory retention"
        );
        setResolution("");
        setActualRootCause("");
      } else {
        toast("Incident marked as still active");
      }
    } catch (err: any) {
      toast("Error saving resolution record");
    } finally {
      setSaving(false);
    }
  };

  if (!incident) {
    return (
      <div>
        <PageHeader
          eyebrow="Resolution workflow / Human in control"
          title="Turn insight into certainty."
          description="Review machine suggestions, document what actually worked, and choose what the organization should retain in Hindsight."
        />
        <div className="panel p-12 text-center rounded-3xl border-2 border-dashed border-black/15 dark:border-white/15 my-6 max-w-xl mx-auto space-y-4">
          <CheckCircle2 className="mx-auto text-[#2A8F72]" size={48} />
          <h3 className="font-display text-2xl font-black">Queue is Clear</h3>
          <p className="text-sm opacity-60 max-w-md mx-auto">
            There are currently no incidents awaiting resolution in this workspace. All reported incidents have been resolved.
          </p>
          <button
            onClick={() => navigate("/report")}
            className="btn-primary mx-auto"
          >
            Report an Incident
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Resolution workflow / Human in control"
        title="Turn insight into certainty."
        description="Review machine suggestions, document what actually worked, and choose what the organization should retain in Hindsight."
      />
      <section className="grid gap-5 xl:grid-cols-[290px_1fr]">
        <aside className="panel h-fit">
          <p className="eyebrow">Open queue</p>
          <div className="mt-4 space-y-2">
            {unresolved.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setDecisions({});
                  setResolution("");
                }}
                className={`w-full rounded-2xl border-2 p-3 text-left transition ${selectedId === item.id ? "border-black bg-[#D6FF45] text-black dark:border-[#60A5FA] dark:bg-[#60A5FA]" : "border-transparent bg-black/[.035] dark:border-[#374151] dark:bg-[#1F2937] dark:text-[#D1D5DB]"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black opacity-50 dark:text-[#0B0F19]">
                    {item.id}
                  </span>
                  <ChevronRight className="ml-auto" size={14} />
                </div>
                <strong className="mt-1 block text-sm leading-5">{item.title}</strong>
              </button>
            ))}
            {unresolved.length === 0 && (
              <p className="p-4 text-xs font-bold text-center opacity-50">
                All incidents resolved!
              </p>
            )}
          </div>
        </aside>
        <div className="space-y-5">
          <article className="panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">
                  {incident.id} · {incident.service}
                </p>
                <h2 className="mt-2 font-display text-3xl font-black">{incident.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={severityStyles[incident.severity]}>{incident.severity}</Badge>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete incident ${incident.id}?`)) {
                      deleteIncident(incident.id);
                    }
                  }}
                  className="rounded-xl border border-black/20 dark:border-white/20 hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 text-black/60 dark:text-white/60 hover:text-[#FF5A1F] px-2.5 py-1 text-xs font-bold flex items-center gap-1 transition"
                  title={`Delete ${incident.id}`}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </article>
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">AI recommendations</p>
                <h2>Review proposed actions</h2>
              </div>
              <Lightbulb className="text-[#FF5A1F]" />
            </div>
            <div className="space-y-3">
              {recommendations.map((item: string, i: number) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-black/10 p-4 dark:border-white/10"
                >
                  <div className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-black text-xs font-black text-white dark:bg-[#60A5FA] dark:text-[#0B0F19]">
                      0{i + 1}
                    </span>
                    <p className="flex-1 text-sm font-bold">{item}</p>
                  </div>
                  <div className="mt-4 flex gap-2 pl-11">
                    <button
                      onClick={() => handleDecision(i, "accepted")}
                      className={`decision ${decisions[i] === "accepted" ? "accept" : ""}`}
                    >
                      <ThumbsUp size={14} /> Accept
                    </button>
                    <button
                      onClick={() => handleDecision(i, "rejected")}
                      className={`decision ${decisions[i] === "rejected" ? "reject" : ""}`}
                    >
                      <ThumbsDown size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="panel">
            <p className="eyebrow">Engineer record</p>
            <h2 className="mt-1 font-display text-2xl font-black">What actually resolved it?</h2>
            
            <div className="mt-4">
              <label className="label">Confirmed root cause *</label>
              <input
                className="field mb-3"
                value={actualRootCause}
                onChange={(e) => setActualRootCause(e.target.value)}
                placeholder="e.g. Unbounded inventory batch query held exclusive lock on orders table"
              />
            </div>

            <div>
              <label className="label">Actions taken & final resolution *</label>
              <textarea
                className="field min-h-32 resize-y"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Document the exact commands run, batch size reductions, and why the fix worked..."
              />
            </div>

            <fieldset className="mt-5">
              <legend className="label">Was the issue resolved?</legend>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setResolved("yes")}
                  className={`outcome ${resolved === "yes" ? "selected-good" : ""}`}
                >
                  <CheckCircle2 /> Yes, resolved
                </button>
                <button
                  type="button"
                  onClick={() => setResolved("no")}
                  className={`outcome ${resolved === "no" ? "selected-bad" : ""}`}
                >
                  <XCircle /> No, still active
                </button>
              </div>
            </fieldset>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-[#6428C8]/10 p-4">
              <input
                type="checkbox"
                className="mt-1 accent-[#6428C8]"
                checked={retain}
                onChange={(e) => setRetain(e.target.checked)}
              />
              <span>
                <b className="block text-sm">Retain as organizational memory (Hindsight)</b>
                <small className="opacity-50">
                  Save verified experience into the team's isolated Hindsight memory bank for future investigations.
                </small>
              </span>
            </label>

            <button
              className="btn-primary mt-5 w-full justify-center"
              onClick={save}
              disabled={saving}
            >
              <Check size={17} /> {saving ? "Saving & Retaining..." : "Confirm resolution record"}
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}
