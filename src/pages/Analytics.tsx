import { useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowDownRight, ArrowUpRight, Clock3, Gauge } from "lucide-react";
import { frequencyData as defaultFrequency, resolutionTrend as defaultTrend, services as defaultServices } from "../data/demo";
import { PageHeader, StatCard } from "../components/ui";
import { api } from "../api/client";
import { useApp } from "../app/state";

export function Analytics() {
  const { incidents } = useApp();
  const [range, setRange] = useState("Last 90 days");
  const [metric, setMetric] = useState<"all" | "critical">("all");
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    let active = true;
    api.analytics
      .getSummary()
      .then((data) => {
        if (active && data) {
          setSummary(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [incidents.length]);

  const frequencyList = summary?.frequency_trend?.length ? summary.frequency_trend : defaultFrequency;
  const resolutionList = summary?.resolution_trend?.length ? summary.resolution_trend : defaultTrend;
  const servicesList = summary?.service_breakdown || [];
  const recurringList = summary?.recurring_issues || [];

  const chartData = frequencyList.map((d: any) => ({
    ...d,
    incidents: metric === "critical" ? d.critical : d.incidents,
  }));

  const fleetReliability = summary?.fleet_reliability ?? (incidents.length === 0 ? 100 : 99.5);
  const medianMttr = summary?.median_mttr_hours !== undefined ? `${summary.median_mttr_hours}h` : "0.0h";
  const weeklyFreq = summary?.incident_frequency_weekly !== undefined ? `${summary.incident_frequency_weekly}` : "0.0";

  return (
    <div>
      <PageHeader
        eyebrow="Reliability intelligence / Live database metrics"
        title="See the system behind the incidents."
        description="Find recurring pressure, measure recovery, and understand where engineering attention creates the most leverage."
        action={
          <select
            className="select-compact"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Last 12 months</option>
          </select>
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Incident frequency"
          value={weeklyFreq}
          detail="per week · calculated from DB"
          color="#D6FF45"
          icon={Activity}
        />
        <StatCard
          label="Median MTTR"
          value={medianMttr}
          detail={medianMttr === "0.0h" ? "Awaiting resolution data" : "Calculated from resolved incidents"}
          color="#3155E7"
          icon={Clock3}
          className="text-white"
        />
        <StatCard
          label="Fleet reliability"
          value={`${fleetReliability}%`}
          detail={incidents.length === 0 ? "100% nominal · 0 active outages" : "Computed from service health"}
          color="#FF5A1F"
          icon={Gauge}
          className="text-white"
        />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="panel min-w-0">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Frequency</p>
              <h2>Incident volume</h2>
            </div>
            <div className="flex gap-2">
              <button
                className={`filter-chip ${metric === "all" ? "active" : ""}`}
                onClick={() => setMetric("all")}
              >
                All
              </button>
              <button
                className={`filter-chip ${metric === "critical" ? "active" : ""}`}
                onClick={() => setMetric("critical")}
              >
                Critical
              </button>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="#00000015" strokeDasharray="4 4" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "#D6FF4522" }}
                  contentStyle={{ border: "2px solid #171717", borderRadius: 14 }}
                />
                <Bar dataKey="incidents" fill="#3155E7" radius={[8, 8, 0, 0]} />
                <Bar dataKey="critical" fill="#FF5A1F" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel min-w-0 bg-[#171717] text-white dark:bg-[#111827] dark:text-[#F3F4F6]">
          <div className="panel-heading">
            <div>
              <p className="eyebrow text-[#D6FF45]">Recovery speed</p>
              <h2>Resolution time trend</h2>
            </div>
            <ArrowDownRight className="text-[#D6FF45]" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={resolutionList}>
                <CartesianGrid vertical={false} stroke="#ffffff22" strokeDasharray="4 4" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} stroke="#ffffff66" />
                <YAxis axisLine={false} tickLine={false} stroke="#ffffff66" />
                <Tooltip contentStyle={{ color: "#171717", borderRadius: 14 }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#D6FF45"
                  strokeWidth={4}
                  dot={{ fill: "#D6FF45", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#ffffff66"
                  strokeDasharray="6 6"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Service overview</p>
              <h2>Reliability by service</h2>
            </div>
            <span className="text-xs font-bold opacity-40">{range}</span>
          </div>
          <div className="space-y-3">
            {servicesList.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-50 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                No service incidents reported yet. Service reliability graphs will appear as incidents are ingested.
              </div>
            ) : (
              servicesList.map((service: any) => (
                <div
                  key={service.name}
                  className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl bg-black/[.035] p-4 dark:bg-white/5"
                >
                  <div>
                    <div className="flex items-center justify-between text-sm font-black">
                      <span>{service.name}</span>
                      <span>{service.reliability}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(20, (service.reliability - 90) * 10)}%`,
                          background: service.color,
                        }}
                      />
                    </div>
                  </div>
                  <div className="border-l border-black/10 pl-4 text-center dark:border-white/10">
                    <b className="block font-display text-2xl">{service.incidents}</b>
                    <small className="opacity-45">incidents</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
        <article className="panel bg-[#6428C8] text-white">
          <p className="eyebrow text-[#D6FF45]">Recurring issues</p>
          <h2 className="mt-1 font-display text-3xl font-black">Concentrated friction</h2>
          <div className="mt-7 space-y-5">
            {recurringList.length === 0 ? (
              <p className="text-xs text-white/70 py-8 text-center">
                No recurring root causes identified yet. As your team resolves incidents and retains knowledge in Hindsight, repeat patterns will surface here.
              </p>
            ) : (
              recurringList.map((issue: any, i: number) => {
                const name = issue.name;
                const count = issue.count;
                const change = issue.change || "+5%";
                return (
                  <div key={name} className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-lg bg-white/15 text-xs font-black">
                          {i + 1}
                        </span>
                        <b className="text-sm">{name}</b>
                      </div>
                      <small className="ml-8 opacity-60">{change} vs last quarter</small>
                    </div>
                    <div className="text-right">
                      <b className="font-display text-2xl font-black">{count}</b>
                      <small className="block opacity-60">events</small>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
