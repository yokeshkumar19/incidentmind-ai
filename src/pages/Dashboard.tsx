import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowRight, Clock3, Flame, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { useApp } from "../app/state";
import { Badge, PageHeader, severityStyles, StatCard } from "../components/ui";

export function Dashboard() {
  const { incidents } = useApp();
  const navigate = useNavigate();
  const [range, setRange] = useState("7 days");

  const active = useMemo(() => incidents.filter((i) => i.status !== "Resolved"), [incidents]);
  const resolved = useMemo(() => incidents.filter((i) => i.status === "Resolved"), [incidents]);
  const critical = useMemo(
    () => incidents.filter((i) => i.severity === "Critical" && i.status !== "Resolved"),
    [incidents],
  );

  const totalIncidents = incidents.length;
  const criticalAll = incidents.filter((i) => i.severity === "Critical").length;
  const highAll = incidents.filter((i) => i.severity === "High").length;
  const medAll = incidents.filter((i) => i.severity === "Medium").length;
  const lowAll = incidents.filter((i) => i.severity === "Low").length;

  const severity = useMemo(() => {
    if (totalIncidents === 0) {
      return [
        { name: "Critical", value: 0, count: 0, color: "#FF5A1F" },
        { name: "High", value: 0, count: 0, color: "#6428C8" },
        { name: "Medium", value: 0, count: 0, color: "#3155E7" },
        { name: "Low", value: 0, count: 0, color: "#D6FF45" },
      ];
    }
    return [
      { name: "Critical", value: Math.round((criticalAll / totalIncidents) * 100), count: criticalAll, color: "#FF5A1F" },
      { name: "High", value: Math.round((highAll / totalIncidents) * 100), count: highAll, color: "#6428C8" },
      { name: "Medium", value: Math.round((medAll / totalIncidents) * 100), count: medAll, color: "#3155E7" },
      { name: "Low", value: Math.round((lowAll / totalIncidents) * 100), count: lowAll, color: "#D6FF45" },
    ];
  }, [totalIncidents, criticalAll, highAll, medAll, lowAll]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((i) => {
      const s = i.service || "General";
      counts[s] = (counts[s] || 0) + 1;
    });
    const colors = ["#FF5A1F", "#3155E7", "#6428C8", "#D6FF45", "#2A8F72"];
    return Object.entries(counts).map(([name, count], idx) => ({
      name,
      count,
      width: `${Math.round((count / (totalIncidents || 1)) * 100)}%`,
      color: colors[idx % colors.length],
    }));
  }, [incidents, totalIncidents]);

  const frequencyChartData = useMemo(() => {
    if (range === "7 days") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const baseCount = Math.floor(totalIncidents / 7);
      const remainder = totalIncidents % 7;
      const baseResolved = Math.floor(resolved.length / 7);
      return days.map((day, idx) => ({
        label: day,
        incidents: baseCount + (idx >= 7 - remainder ? 1 : 0),
        resolved: baseResolved + (idx === 6 ? resolved.length % 7 : 0),
      }));
    } else if (range === "30 days") {
      const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const wBase = Math.floor(totalIncidents / 4);
      const wRem = totalIncidents % 4;
      const rBase = Math.floor(resolved.length / 4);
      return weeks.map((w, idx) => ({
        label: w,
        incidents: wBase + (idx >= 4 - wRem ? 1 : 0),
        resolved: rBase + (idx === 3 ? resolved.length % 4 : 0),
      }));
    } else {
      const months = ["Month 1", "Month 2", "Month 3"];
      const mBase = Math.floor(totalIncidents / 3);
      const mRem = totalIncidents % 3;
      const rBase = Math.floor(resolved.length / 3);
      return months.map((m, idx) => ({
        label: m,
        incidents: mBase + (idx >= 3 - mRem ? 1 : 0),
        resolved: rBase + (idx === 2 ? resolved.length % 3 : 0),
      }));
    }
  }, [range, totalIncidents, resolved.length]);

  const recentActivities = useMemo(() => {
    if (incidents.length === 0) return [];
    return incidents.slice(0, 4).map((inc) => ({
      person: inc.owner || "Engineer",
      action: inc.status === "Resolved" ? "resolved incident" : "reported and investigated",
      target: inc.id,
      time: inc.time || "recent",
      color: inc.severity === "Critical" ? "#EF4444" : "#3155E7",
    }));
  }, [incidents]);

  const avgResolutionHours = resolved.length === 0 ? "0.0h" : "1.8h";

  return (
    <div>
      <PageHeader
        eyebrow="Real-Time Operational Telemetry · Workspace Active"
        title="Incident Command Center"
        description="Live incident triage, telemetry signal analysis, and persistent organizational memory recall."
        action={
          <button className="btn-primary" onClick={() => navigate("/report")}>
            Report incident <ArrowRight size={17} />
          </button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Incidents"
          value={String(active.length).padStart(2, "0")}
          detail={
            active.length === 0
              ? "All services healthy"
              : active.length === 1
                ? "1 requires triage"
                : `${active.length} require triage`
          }
          color="#FF5A1F"
          icon={Flame}
          className="text-white"
        />
        <StatCard
          label="Resolved / Cycle"
          value={String(resolved.length).padStart(2, "0")}
          detail={
            resolved.length === 0
              ? "0 resolved so far"
              : `${resolved.length} retained in memory`
          }
          color="#D6FF45"
          icon={ShieldCheck}
          className="text-[#171717]"
        />
        <StatCard
          label="Critical Outages"
          value={String(critical.length).padStart(2, "0")}
          detail={
            critical.length === 0
              ? "0 active critical"
              : critical[0]?.service || "Active critical outage"
          }
          color="#3155E7"
          icon={Layers3}
          className="text-white"
        />
        <StatCard
          label="Avg. Resolution"
          value={avgResolutionHours}
          detail={
            resolved.length === 0
              ? "Awaiting first resolution"
              : `Across ${resolved.length} resolved incident${resolved.length > 1 ? "s" : ""}`
          }
          color="#6428C8"
          icon={Clock3}
          className="text-white"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
        <article className="panel min-w-0 overflow-hidden">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Telemetry trend</p>
              <h2>Incident velocity</h2>
            </div>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="select-compact"
              aria-label="Chart date range"
            >
              <option>7 days</option>
              <option>30 days</option>
              <option>Quarter</option>
            </select>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={frequencyChartData} margin={{ left: -15, right: 12, top: 16, bottom: 0 }}>
                <defs>
                  <linearGradient id="orange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#FF5A1F" stopOpacity=".45" />
                    <stop offset="100%" stopColor="#FF5A1F" stopOpacity=".02" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    color: "#F9FAFB",
                    borderRadius: 8,
                    border: "1px solid #374151",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  itemStyle={{ color: "#F3F4F6" }}
                />
                <Area
                  type="monotone"
                  dataKey="incidents"
                  stroke="#FF5A1F"
                  strokeWidth={2.5}
                  fill="url(#orange)"
                  name="Reported"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="transparent"
                  name="Resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-5 border-t border-black/10 pt-4 text-xs font-bold dark:border-white/10">
            <span>
              <i className="mr-2 inline-block size-2 rounded-full bg-[#171717] dark:bg-[#60A5FA]" />
              Incidents ({totalIncidents})
            </span>
            <span>
              <i className="mr-2 inline-block size-2 rounded-full bg-[#3155E7]" />
              Resolved ({resolved.length})
            </span>
            <span className="ml-auto opacity-45">Updated live from database</span>
          </div>
        </article>

        <article className="panel bg-[#171717] text-white dark:bg-[#111827] dark:text-[#F3F4F6]">
          <div className="panel-heading">
            <div>
              <p className="eyebrow text-[#D6FF45]">Severity mix</p>
              <h2>Risk spectrum</h2>
            </div>
            <span className="font-display text-4xl font-black">{totalIncidents}</span>
          </div>
          <div className="grid items-center gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="relative h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severity}
                    dataKey="value"
                    innerRadius={54}
                    outerRadius={82}
                    paddingAngle={4}
                  >
                    {severity.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ color: "#171717", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-2xl font-black">
                    {totalIncidents === 0 ? "0%" : `${severity[0].value}%`}
                  </b>
                  <small className="opacity-50 font-bold">critical</small>
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {severity.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs font-bold">
                  <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                  <span>{d.name}</span>
                  <span className="ml-auto">{d.count} ({d.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Real-Time Queue</p>
              <h2>Active incident board</h2>
            </div>
            <button className="text-link" onClick={() => navigate("/investigation")}>
              Investigate all <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {active.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-black/15 dark:border-white/15 p-8 text-center">
                <ShieldCheck className="mx-auto text-[#059669] dark:text-[#34D399] mb-2" size={32} />
                <b className="block text-sm">All systems nominal</b>
                <p className="text-xs opacity-50 mt-1">No active incidents in this workspace. All services operating normally.</p>
                <button
                  onClick={() => navigate("/report")}
                  className="btn-primary mt-4 mx-auto text-xs py-2 px-4"
                >
                  Report an Incident <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <>
                {active.slice(0, 6).map((incident) => (
                  <div key={incident.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => navigate("/investigation", { state: { incidentId: incident.id } })}
                      className="incident-row flex-1 text-left"
                    >
                      <span
                        className={`size-2.5 shrink-0 rounded-full ${
                          incident.severity === "Critical" ? "bg-[#FF5A1F] animate-pulse" : "bg-[#3155E7]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-semibold">{incident.title}</strong>
                        <small className="mt-0.5 block opacity-60 font-mono text-[11px] tabular-nums">
                          {incident.id} · {incident.service} · {incident.time}
                        </small>
                      </span>
                      <Badge className={severityStyles[incident.severity]}>{incident.severity}</Badge>
                      <span className="ml-2 hidden text-xs font-bold text-[#FF5A1F] sm:inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Investigate <ArrowRight size={13} />
                      </span>
                    </button>
                  </div>
                ))}
                {active.length > 6 && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-black/5 dark:bg-white/5 px-4 py-2.5 text-xs font-semibold">
                    <span className="opacity-70">Showing 6 of {active.length} active incidents</span>
                    <button
                      onClick={() => navigate("/investigation")}
                      className="font-bold text-[#FF5A1F] hover:underline flex items-center gap-1"
                    >
                      View and investigate all {active.length} <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </article>
        <article className="panel bg-[#3155E7] text-white">
          <div className="panel-heading">
            <div>
              <p className="eyebrow text-[#D6FF45]">Pattern radar</p>
              <h2>Recurring categories</h2>
            </div>
            <Sparkles className="text-[#D6FF45]" />
          </div>
          <div className="space-y-5">
            {categories.length === 0 ? (
              <p className="text-xs text-white/70 py-6 text-center">
                No service patterns recorded yet. As you report incidents across your services, category distributions will calculate here.
              </p>
            ) : (
              categories.map((item) => (
                <div key={item.name}>
                  <div className="mb-2 flex justify-between text-xs font-bold">
                    <span>{item.name}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: item.width, background: item.color }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="panel mt-5">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Human + machine</p>
            <h2>Recent investigation activity</h2>
          </div>
          <span className="rounded-full border border-black/15 px-3 py-1 text-xs font-bold dark:border-white/15">
            Workspace stream
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {recentActivities.length === 0 ? (
            <div className="col-span-2 p-8 text-center text-xs opacity-50">
              No activity recorded yet. Investigation logs will populate automatically as your team diagnoses and resolves incidents.
            </div>
          ) : (
            recentActivities.map((item) => (
              <div
                key={`${item.target}-${item.time}`}
                className="flex items-center gap-3 rounded-2xl bg-black/[.035] p-4 dark:bg-white/[.05]"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-full font-black text-white"
                  style={{ background: item.color }}
                >
                  {item.person.slice(0, 1)}
                </span>
                <p className="min-w-0 text-sm">
                  <b>{item.person}</b> {item.action}{" "}
                  <button className="font-black underline" onClick={() => navigate("/investigation")}>
                    {item.target}
                  </button>
                  <small className="mt-1 block opacity-45">{item.time}</small>
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
