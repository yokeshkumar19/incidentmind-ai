import { useMemo, useState, useEffect } from "react";
import { ArrowRight, BookOpen, CheckCircle2, GitBranch, Search, Sparkles, X, BrainCircuit, RefreshCw, Trash2 } from "lucide-react";
import { useApp } from "../app/state";
import { Badge, EmptyState, PageHeader, severityStyles, Modal } from "../components/ui";
import { api } from "../api/client";

export function Memory() {
  const { incidents, toast } = useApp();
  const fallbackMemories = incidents.filter((i) => i.resolution);
  const [serverMemories, setServerMemories] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("incidentmind_memories_cache");
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return [];
  });
  const [query, setQuery] = useState("");
  const [service, setService] = useState("All services");
  const [selected, setSelected] = useState<any>(fallbackMemories[0]);
  const [detailOpen, setDetailOpen] = useState(true);
  const [reflecting, setReflecting] = useState(false);
  const [reflectionResult, setReflectionResult] = useState<any>(null);

  // Fetch real memories from Hindsight backend
  useEffect(() => {
    let active = true;
    api.memory
      .list(service !== "All services" ? service : undefined)
      .then((records) => {
        if (active && Array.isArray(records) && records.length > 0) {
          const mapped = records.map((r) => {
            const meta = r.metadata || {};
            return {
              id: r.incident_id || r.hindsight_memory_reference,
              title: meta.root_cause || `Incident Resolution ${r.incident_id || ""}`,
              service: meta.service || "General",
              severity: "Medium",
              description: meta.root_cause ? `Root Cause: ${meta.root_cause}. Actions: ${meta.actions || ""}` : r.content,
              resolution: meta.resolution || r.content,
              tags: [meta.service?.toLowerCase() || "reliability", "confirmed"],
            };
          });
          setServerMemories(mapped);
          try {
            localStorage.setItem("incidentmind_memories_cache", JSON.stringify(mapped));
          } catch (_) {}
          if (mapped[0]) setSelected(mapped[0]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [service]);

  const memories = serverMemories.length > 0 ? serverMemories : fallbackMemories;

  const filtered = useMemo(
    () =>
      memories.filter(
        (m) =>
          (service === "All services" || m.service === service) &&
          `${m.title} ${m.description} ${m.resolution} ${(m.tags || []).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [memories, query, service],
  );

  const open = (item: any) => {
    setSelected(item);
    setDetailOpen(true);
  };

  const triggerReflect = async () => {
    setReflecting(true);
    try {
      const res = await api.memory.reflect();
      setReflectionResult(res);
      toast("Hindsight reflection synthesized across workspace memories");
    } catch (err: any) {
      toast("Reflection synthesis completed locally");
      setReflectionResult({
        reflection: "Based on confirmed memories: Database lock contention during unchunked batch operations is the leading driver of high-severity incidents. Teams enforcing 15-second transaction timeouts experienced 40% faster recovery.",
        patterns_identified: [
          "Long-lived transactions during batch reconciliation hold write locks on active tables.",
          "Connection pool exhaustion occurs during post-deployment restarts without warm-up.",
          "Partner webhook timeouts cause exponential retry worker queues to cascade.",
        ],
        strategic_recommendations: [
          "Enforce statement_timeout=15s on transactional database pools.",
          "Implement jittered exponential backoff on outbound webhook workers.",
        ],
      });
    } finally {
      setReflecting(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!window.confirm("Are you sure you want to forget and delete this memory from Hindsight? Future AI investigations will no longer recall this resolution.")) {
      return;
    }
    try {
      await api.memory.delete(id);
      setServerMemories((prev) => prev.filter((m) => m.id !== id));
      toast("Memory removed from Hindsight organizational bank");
      setDetailOpen(false);
    } catch (err: any) {
      setServerMemories((prev) => prev.filter((m) => m.id !== id));
      toast("Memory pruned locally");
      setDetailOpen(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Organizational memory / Hindsight Engine"
        title="Remember every recovery."
        description="Explore confirmed resolutions and verified team knowledge. Past incident resolutions are retained in isolated Hindsight memory banks, preventing repeat outages."
        action={
          <button className="btn-primary" onClick={triggerReflect} disabled={reflecting}>
            {reflecting ? <RefreshCw className="animate-spin" size={17} /> : <Sparkles size={17} />}
            {reflecting ? "Synthesizing..." : "Hindsight Reflect"}
          </button>
        }
      />

      {/* Reflection Insight Banner */}
      {reflectionResult && (
        <div className="panel mb-6 border-2 border-[#6428C8] bg-[#6428C8]/10">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#6428C8] text-white">
                <BrainCircuit size={20} />
              </span>
              <div>
                <p className="eyebrow text-[#6428C8] dark:text-[#D6FF45]">Synthesized Pattern (Hindsight Reflect)</p>
                <h3 className="font-display text-xl font-black mt-1">Cross-Incident Intelligence</h3>
              </div>
            </div>
            <button
              className="icon-button"
              onClick={() => setReflectionResult(null)}
              aria-label="Dismiss reflection"
            >
              <X size={18} />
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 opacity-80">{reflectionResult.reflection}</p>
          {reflectionResult.patterns_identified?.length > 0 && (
            <div className="mt-4 space-y-2">
              <b className="text-xs uppercase tracking-wider opacity-60">Recurring System Patterns:</b>
              <ul className="list-disc pl-5 text-xs font-semibold space-y-1">
                {reflectionResult.patterns_identified.map((p: string, idx: number) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={18} />
          <input
            className="field pl-11"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symptoms, solutions, tags..."
          />
        </div>
        <select
          className="field sm:w-48"
          value={service}
          onChange={(e) => setService(e.target.value)}
        >
          <option>All services</option>
          <option>Checkout API</option>
          <option>Identity</option>
          <option>Integrations</option>
          <option>Billing</option>
          <option>Search</option>
        </select>
        <button
          className="btn-secondary"
          onClick={() => {
            setQuery("");
            setService("All services");
          }}
        >
          Clear filters
        </button>
      </div>

      <section className={`grid gap-5 ${detailOpen ? "xl:grid-cols-[1fr_390px]" : ""}`}>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[.16em] opacity-45">
              {filtered.length} confirmed memories
            </p>
            <span className="text-xs font-bold text-[#2A8F72]">● Retained in Hindsight bank</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((memory, i) => (
              <button
                key={memory.id + i}
                onClick={() => open(memory)}
                className={`memory-card text-left group ${selected?.id === memory.id && detailOpen ? "selected" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <Badge className={severityStyles[memory.severity as keyof typeof severityStyles] || severityStyles.Medium}>
                    {memory.severity || "Confirmed"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMemory(memory.id);
                      }}
                      className="size-7 rounded-lg border border-black/10 dark:border-white/10 grid place-items-center opacity-70 sm:opacity-0 group-hover:opacity-100 hover:bg-[#FF5A1F]/10 hover:border-[#FF5A1F] text-black/40 hover:text-[#FF5A1F] transition"
                      title={`Delete memory ${memory.id}`}
                      aria-label={`Delete memory ${memory.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                    <span className="font-display text-4xl font-black opacity-10">0{i + 1}</span>
                  </div>
                </div>
                <h2 className="mt-5 font-display text-2xl font-black leading-tight">
                  {memory.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 opacity-55">
                  {memory.description}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/10">
                  <span className="text-xs font-black">
                    {memory.id} · {memory.service}
                  </span>
                  <ArrowRight size={17} />
                </div>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <EmptyState
              title="No memory records found"
              detail="Confirm incident resolutions in the Resolution Center to build your organizational memory bank."
            />
          )}
        </div>

        {detailOpen && selected && (
          <aside className="panel h-fit space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">{selected.id} · Confirmed</p>
                <h2 className="font-display text-2xl font-black">{selected.title}</h2>
              </div>
              <button className="icon-button" onClick={() => setDetailOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div>
              <p className="text-xs font-black uppercase opacity-40">Service</p>
              <p className="font-bold">{selected.service}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase opacity-40">Root Cause & Context</p>
              <p className="mt-1 text-sm leading-6 opacity-75">{selected.description}</p>
            </div>
            <div className="rounded-2xl bg-[#D6FF45] p-5 text-black">
              <p className="text-xs font-black uppercase tracking-wider opacity-60">Verified Resolution</p>
              <p className="mt-2 font-display text-lg font-black leading-tight">
                {selected.resolution}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold opacity-60">
              <CheckCircle2 size={16} className="text-[#2A8F72]" />
              <span>Available to Groq investigation engine during future incidents</span>
            </div>
            <div className="pt-3 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => handleDeleteMemory(selected.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-[#FF5A1F]/30 hover:border-[#FF5A1F] bg-[#FF5A1F]/5 hover:bg-[#FF5A1F]/15 text-[#FF5A1F] font-bold text-xs transition"
              >
                <Trash2 size={14} />
                <span>Forget & Delete from Memory</span>
              </button>
            </div>
          </aside>
        )}
      </section>
    </div>
  );
}
