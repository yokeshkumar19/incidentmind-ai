import { useState, useEffect, useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Command,
  FilePlus2,
  Flame,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useApp } from "../app/state";
import { Modal } from "./ui";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/report", label: "Report incident", icon: FilePlus2 },
  { to: "/investigation", label: "AI investigation", icon: BrainCircuit },
  { to: "/memory", label: "Incident memory", icon: Archive },
  { to: "/resolution", label: "Resolution center", icon: ShieldCheck },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/team", label: "Team workspace", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "alerts" | "workspace">("all");
  const [readNotifs, setReadNotifs] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const { incidents, toasts, dismissToast, currentUser, activeTeam } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const hasToken = localStorage.getItem("incidentmind_token");
    const isGuest = sessionStorage.getItem("incidentmind_guest");
    if (!hasToken && !isGuest) {
      navigate("/login");
    }
  }, [navigate]);

  const results = incidents.filter((i) =>
    `${i.id} ${i.title} ${i.service}`.toLowerCase().includes(query.toLowerCase()),
  );

  const activeIncidents = incidents.filter((i) => i.status !== "Resolved");
  const criticalCount = activeIncidents.filter((i) => i.severity === "Critical").length;

  const notificationsList = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      detail: string;
      time: string;
      category: "alerts" | "workspace" | "system";
      severity?: string;
      action?: () => void;
      actionLabel?: string;
    }> = [];

    // Active incidents as alerts
    activeIncidents.forEach((inc) => {
      list.push({
        id: `inc-${inc.id}`,
        title: `${inc.severity}: ${inc.title}`,
        detail: `Service: ${inc.service} · Triage Status: ${inc.status}`,
        time: inc.time || "Active now",
        category: "alerts",
        severity: inc.severity,
        action: () => {
          navigate("/investigation", { state: { incidentId: inc.id } });
          setNotificationsOpen(false);
        },
        actionLabel: "Investigate →",
      });
    });

    // Workspace membership notification
    if (activeTeam) {
      list.push({
        id: `team-${activeTeam.id}`,
        title: `Workspace: ${activeTeam.name}`,
        detail: `Invite Code: ${activeTeam.invite_code || "ATLAS-2026"} · Role: ${activeTeam.role || "Member"}`,
        time: "Current",
        category: "workspace",
        action: () => {
          navigate("/team");
          setNotificationsOpen(false);
        },
        actionLabel: "View Team →",
      });
    }

    // Newly retained fleet memory
    const resolvedIncidents = incidents.filter((i) => i.status === "Resolved");
    if (resolvedIncidents.length > 0) {
      const latest = resolvedIncidents[0];
      list.push({
        id: `mem-${latest.id}`,
        title: `Resolution Retained into Fleet Memory`,
        detail: `Incident ${latest.id} (${latest.service}) resolution verified and committed to Vectorize Hindsight.`,
        time: latest.time || "Recent",
        category: "workspace",
        action: () => {
          navigate("/memory");
          setNotificationsOpen(false);
        },
        actionLabel: "Browse Memory →",
      });
    }

    // IoT Telemetry Gateway status
    list.push({
      id: "telemetry-stream",
      title: "IoT Edge Telemetry Synchronized",
      detail: "MQTT & HTTP sensor telemetry gateways connected to IncidentMind AI.",
      time: "Live",
      category: "system",
    });

    return list;
  }, [activeIncidents, activeTeam, incidents, navigate]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === "alerts") return notificationsList.filter((n) => n.category === "alerts");
    if (notifFilter === "workspace") return notificationsList.filter((n) => n.category === "workspace");
    return notificationsList;
  }, [notificationsList, notifFilter]);

  const unreadCount = notificationsList.filter((n) => !readNotifs.has(n.id)).length;

  const sidebar = (
    <>
      <div className="flex h-[84px] items-center justify-between border-b-2 border-black px-5 dark:border-[#374151]">
        <NavLink to="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <span className="grid size-10 rotate-3 place-items-center rounded-xl bg-[#FF5A1F] text-white">
            <BrainCircuit size={23} />
          </span>
          <span>
            <strong className="block font-display text-lg leading-none">IncidentMind</strong>
            <small className="font-black uppercase tracking-[.18em] text-[#FF5A1F]">
              AI / Beta
            </small>
          </span>
        </NavLink>
        <button
          className="icon-button lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto no-scrollbar p-3" aria-label="Primary navigation">
        <p className="px-3 pb-2 pt-3 text-[10px] font-black uppercase tracking-[.2em] opacity-40">
          Control room
        </p>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Icon size={19} strokeWidth={2.3} />
            <span>{label}</span>
            <ChevronRight className="ml-auto opacity-0 transition-opacity" size={15} />
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-[22px] bg-[#3155E7] p-4 text-white">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em]">
          <CircleDot size={13} className="text-[#D6FF45]" /> IncidentMind Engine
        </div>
        <p className="mt-2 text-xs font-medium leading-5 text-white/70 dark:text-[#F3F4F6]">
          FastAPI backend active · Hindsight organizational memory enabled.
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#FFF7E8] text-[#171717] dark:bg-[#0B0F19] dark:text-[#F3F4F6]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r-2 border-black bg-[#FFF7E8] dark:border-r dark:border-[#374151] dark:bg-[#111827] lg:flex">
        {sidebar}
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col bg-[#FFF7E8] text-[#171717] dark:bg-[#111827] dark:text-[#F3F4F6] lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b-2 border-black/10 bg-[#FFF7E8]/85 px-4 backdrop-blur-xl dark:border-b dark:border-[#374151] dark:bg-[#1F2937]/95 sm:px-6">
          <button
            className="icon-button lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full border-2 border-black/15 bg-white/50 px-4 text-left text-sm font-bold text-black/45 transition hover:border-black sm:max-w-md dark:border dark:border-[#374151] dark:bg-[#111827] dark:text-[#D1D5DB] dark:hover:border-[#60A5FA]"
          >
            <Search size={17} />
            <span className="truncate">Search incidents, memory, people...</span>
            <kbd className="ml-auto hidden rounded-md border border-current/20 px-1.5 py-0.5 text-[10px] sm:block">
              ⌘ K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {criticalCount > 0 ? (
              <button
                onClick={() => navigate("/")}
                className="hidden items-center gap-2 rounded-full bg-[#EF4444] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#DC2626] transition sm:flex"
                title={`${criticalCount} active critical incident${criticalCount > 1 ? "s" : ""}`}
              >
                <span className="size-2 rounded-full bg-white animate-pulse" />
                <span>Critical Outage ({criticalCount})</span>
              </button>
            ) : activeIncidents.length > 0 ? (
              <button
                onClick={() => navigate("/")}
                className="hidden items-center gap-2 rounded-full bg-[#F59E0B] px-3.5 py-1.5 text-xs font-bold text-[#171717] shadow-sm hover:bg-[#D97706] transition sm:flex"
                title={`${activeIncidents.length} active incident${activeIncidents.length > 1 ? "s" : ""}`}
              >
                <Activity size={14} className="animate-spin text-[#171717]" style={{ animationDuration: "3s" }} />
                <span>Degraded ({activeIncidents.length} active)</span>
              </button>
            ) : (
              <div className="hidden items-center gap-2 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 px-3.5 py-1.5 text-xs font-bold text-[#059669] dark:text-[#34D399] sm:flex">
                <Activity size={14} className="text-[#10B981]" />
                <span>Systems Nominal</span>
              </div>
            )}
            <button
              className="icon-button relative"
              aria-label="Notifications"
              onClick={() => {
                setNotificationsOpen(true);
                setReadNotifs(new Set(notificationsList.map((n) => n.id)));
              }}
              title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "Notifications"}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF5A1F] px-1 text-[9px] font-black text-white shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            {currentUser ? (
              <button
                className="grid size-10 place-items-center rounded-full border-2 border-black bg-[#6428C8] text-xs font-black text-white dark:border dark:border-[#60A5FA]"
                onClick={() => navigate("/settings")}
                aria-label="Open profile settings"
                title={`Signed in as ${currentUser.name}`}
              >
                {(currentUser.name || "MC")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </button>
            ) : (
              <button
                className="rounded-full border-2 border-black bg-[#D6FF45] text-black px-4 py-1.5 text-xs font-black hover:opacity-90 transition dark:border-white/20"
                onClick={() => navigate("/login")}
              >
                Sign In
              </button>
            )}
          </div>
        </header>
        <main className="min-h-[calc(100vh-72px)] w-full max-w-[1600px] mx-auto p-4 sm:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>

      <Modal
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setQuery("");
        }}
        title="Search the control room"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={19} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “checkout” or “INC-2048”"
            className="field pl-11"
          />
        </div>
        <div className="mt-4 space-y-2">
          {(query ? results : incidents.slice(0, 4)).map((incident) => (
            <button
              key={incident.id}
              onClick={() => {
                navigate("/investigation", { state: { incidentId: incident.id } });
                setSearchOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-black/10 p-3 text-left hover:bg-black/5 dark:border-[#374151] dark:bg-[#111827] dark:hover:bg-[#1F2937]"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-[#3155E7] text-white">
                <Command size={16} />
              </span>
              <span>
                <strong className="block text-sm">{incident.title}</strong>
                <small className="opacity-50">
                  {incident.id} · {incident.service}
                </small>
              </span>
              <ChevronRight className="ml-auto" size={16} />
            </button>
          ))}
          {query && results.length === 0 && (
            <p className="p-8 text-center text-sm opacity-50">No matching incidents found.</p>
          )}
        </div>
      </Modal>
      <Modal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Live Fleet & System Notifications"
      >
        <div className="space-y-4 pt-1">
          {/* Header controls & filter tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setNotifFilter("all")}
                className={`px-3 py-1 rounded-lg transition ${
                  notifFilter === "all"
                    ? "bg-[#3155E7] text-white shadow-sm"
                    : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                }`}
              >
                All ({notificationsList.length})
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter("alerts")}
                className={`px-3 py-1 rounded-lg transition ${
                  notifFilter === "alerts"
                    ? "bg-[#FF5A1F] text-white shadow-sm"
                    : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                }`}
              >
                Alerts ({activeIncidents.length})
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter("workspace")}
                className={`px-3 py-1 rounded-lg transition ${
                  notifFilter === "workspace"
                    ? "bg-[#6428C8] text-white shadow-sm"
                    : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                }`}
              >
                Workspace
              </button>
            </div>
            {notificationsList.length > 0 && (
              <button
                type="button"
                onClick={() => setReadNotifs(new Set(notificationsList.map((n) => n.id)))}
                className="text-[11px] font-bold text-[#FF5A1F] hover:underline flex items-center gap-1"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications feed list */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-50">
                No notifications matching current filter.
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isRead = readNotifs.has(notif.id);
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start justify-between gap-3 rounded-2xl p-3.5 transition border ${
                      isRead
                        ? "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-75"
                        : "bg-white/80 dark:bg-[#111827] border-black/10 dark:border-white/10 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`mt-1 size-2.5 shrink-0 rounded-full ${
                          notif.severity === "Critical"
                            ? "bg-[#FF5A1F] animate-pulse"
                            : notif.severity === "High"
                              ? "bg-[#F97316]"
                              : notif.category === "workspace"
                                ? "bg-[#3155E7]"
                                : "bg-[#10B981]"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-snug truncate text-black dark:text-white">
                          {notif.title}
                        </p>
                        <p className="mt-0.5 text-[11px] opacity-70 line-clamp-2">
                          {notif.detail}
                        </p>
                        <p className="mt-1 text-[10px] font-mono opacity-40">
                          {notif.time}
                        </p>
                      </div>
                    </div>
                    {notif.action && (
                      <button
                        type="button"
                        onClick={notif.action}
                        className="shrink-0 text-xs font-bold text-[#FF5A1F] hover:underline px-2.5 py-1 rounded-lg hover:bg-[#FF5A1F]/10 transition"
                      >
                        {notif.actionLabel || "View →"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
      <div className="fixed bottom-5 right-5 z-[120] space-y-2 max-w-sm pointer-events-none">
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border-2 border-black dark:border-white/20 bg-[#D6FF45] dark:bg-[#1E293B] p-3.5 text-xs font-black text-black dark:text-white shadow-[4px_4px_0_#171717]"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-black/10 dark:bg-white/10">
                <Bell size={13} className="text-[#FF5A1F]" />
              </span>
              <span>{item.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white p-1"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
