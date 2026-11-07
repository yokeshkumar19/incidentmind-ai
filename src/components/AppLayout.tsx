import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  Bot,
  BrainCircuit,
  ChevronRight,
  CircleDot,
  Command,
  FilePlus2,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
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
  const [query, setQuery] = useState("");
  const { incidents, toasts, dismissToast, currentUser } = useApp();
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
            <div className="hidden items-center gap-2 rounded-full bg-[#D6FF45] px-3 py-2 text-xs font-black text-black sm:flex">
              <Activity size={15} /> All systems nominal
            </div>
            <button
              className="icon-button relative"
              aria-label="Notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#FF5A1F]" />
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
        title="Signal feed"
      >
        <div className="space-y-3">
          {[
            "INC-2048 confidence increased to 87%",
            "Identity service entered monitoring",
            "Three new memory links discovered",
          ].map((text, i) => (
            <div
              key={text}
              className="flex gap-3 rounded-2xl bg-white/60 p-4 dark:border dark:border-[#374151] dark:bg-[#111827]"
            >
              <span
                className={`mt-1 size-2.5 shrink-0 rounded-full ${i === 0 ? "bg-[#FF5A1F]" : i === 1 ? "bg-[#3155E7]" : "bg-[#6428C8]"}`}
              />
              <div>
                <p className="text-sm font-bold">{text}</p>
                <p className="mt-1 text-xs opacity-45">{i * 12 + 4} minutes ago</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
      <div className="fixed bottom-5 right-5 z-[120] space-y-2">
        {toasts.map((item) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => dismissToast(item.id)}
            className="flex items-center gap-3 rounded-2xl border-2 border-black bg-[#D6FF45] px-4 py-3 text-sm font-black text-black shadow-[5px_5px_0_#171717]"
          >
            <Bot size={18} />
            {item.message}
            <X size={14} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
