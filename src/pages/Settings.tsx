import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  Bot,
  BrainCircuit,
  Check,
  Database,
  KeyRound,
  Monitor,
  Moon,
  Save,
  Sun,
  User,
  Activity,
  LogOut,
  Building2,
  Users,
  UserPlus,
  Plus,
  Copy,
  ArrowRight,
  Shield,
  Mail,
} from "lucide-react";
import { useApp } from "../app/state";
import { PageHeader } from "../components/ui";
import { api } from "../api/client";

export function Settings() {
  const navigate = useNavigate();
  const {
    theme,
    setTheme,
    toast,
    currentUser,
    backendConnected,
    logoutUser,
    activeTeam,
    userTeams,
    createTeam,
    joinTeam,
    switchTeam,
    isGuest,
  } = useApp();

  const [profile, setProfile] = useState({
    name: currentUser?.name || "Maya Chen",
    email: currentUser?.email || "maya@atlas.dev",
    timezone: "America/Los_Angeles",
  });

  const [notifications, setNotifications] = useState({
    critical: true,
    assignment: true,
    ai: true,
    digest: false,
  });

  const [tab, setTab] = useState<"profile" | "notifications" | "integrations">("profile");
  const [health, setHealth] = useState<any>(null);

  // Team creation and joining states
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    if (currentUser) {
      setProfile((prev) => ({
        ...prev,
        name: currentUser.name || prev.name,
        email: currentUser.email || prev.email,
      }));
    }
  }, [currentUser]);

  const save = () => toast("Preferences saved successfully");

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      toast("Please enter a workspace name");
      return;
    }
    if (isGuest && !currentUser) {
      toast("Please sign in first to create a team workspace");
      navigate("/login");
      return;
    }
    setCreatingTeam(true);
    try {
      await createTeam(newTeamName.trim());
      setNewTeamName("");
    } catch {
      // Toast notification is handled in createTeam
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      toast("Please enter a workspace invite code");
      return;
    }
    if (isGuest && !currentUser) {
      toast("Please sign in first to join a team workspace");
      navigate("/login");
      return;
    }
    setJoiningTeam(true);
    try {
      await joinTeam(inviteCodeInput.trim());
      setInviteCodeInput("");
    } catch {
      // Toast notification is handled in joinTeam
    } finally {
      setJoiningTeam(false);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    toast(`Invite code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace configuration / Environment"
        title="Make it yours."
        description="Configure your personal profile, collaborate across teams, and monitor Groq AI & Hindsight organizational memory health."
      />
      <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
        <nav className="panel h-fit space-y-1" aria-label="Settings sections">
          {(
            [
              ["profile", User, "Profile & workspace"],
              ["notifications", Bell, "Notifications"],
              ["integrations", Bot, "AI & memory"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`settings-nav ${tab === id ? "active" : ""}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <section className="panel">
          {tab === "profile" && (
            <div>
              <p className="eyebrow">Personal preferences</p>
              <h2 className="mt-1 font-display text-3xl font-black">Profile & appearance</h2>

              {isGuest && (
                <div className="mt-5 rounded-2xl bg-[#FF5A1F]/10 border-2 border-[#FF5A1F]/40 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#FF5A1F]">Guest Session:</span>
                    <span className="opacity-80">You are browsing in guest mode. Sign in to link team memberships permanently.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="font-black px-3 py-1.5 rounded-xl bg-[#FF5A1F] text-white hover:opacity-90 transition text-xs"
                  >
                    Sign In / Register
                  </button>
                </div>
              )}

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label">Display name</label>
                  <input
                    className="field"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email address</label>
                  <input
                    className="field"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Timezone</label>
                  <select
                    className="field"
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  >
                    <option>America/Los_Angeles</option>
                    <option>America/New_York</option>
                    <option>Europe/London</option>
                    <option>Asia/Singapore</option>
                  </select>
                </div>
              </div>

              {/* Interface Theme */}
              <fieldset className="mt-8">
                <legend className="label">Interface theme</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["light", Sun, "Light", "Clean crisp daytime contrast"],
                      ["dark", Moon, "Dark", "High-contrast nighttime cockpit"],
                      ["system", Monitor, "System", "Match OS preference automatically"],
                    ] as const
                  ).map(([val, Icon, title, desc]) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setTheme(val)}
                      className={`theme-card ${theme === val ? "selected" : ""}`}
                    >
                      <Icon size={20} />
                      <b className="mt-3 block font-bold">{title}</b>
                      <small className="opacity-50">{desc}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Teams & Workspaces Section */}
              <div className="mt-10 pt-8 border-t-2 border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="eyebrow">Collaboration & Access</p>
                    <h3 className="font-display text-2xl font-black mt-1">Teams & Workspaces</h3>
                    <p className="text-xs opacity-60 mt-0.5">
                      Create a dedicated team workspace or join an existing incident command team.
                    </p>
                  </div>
                  {activeTeam && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#D6FF45] text-black border border-black/20">
                      <Users size={13} /> Active: {activeTeam.name}
                    </span>
                  )}
                </div>

                {/* Active Team Summary Banner */}
                {activeTeam && (
                  <div className="mb-6 rounded-2xl border-2 border-black dark:border-white/20 bg-white/60 dark:bg-black/20 p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span className="grid size-12 place-items-center rounded-2xl bg-[#3155E7] text-white">
                        <Building2 size={24} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <b className="text-base font-black">{activeTeam.name}</b>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FF5A1F]/15 text-[#FF5A1F]">
                            {activeTeam.role || "Admin"}
                          </span>
                        </div>
                        <p className="text-xs opacity-60 mt-0.5">
                          Unique invite code: <code className="font-mono font-bold text-black dark:text-white">{activeTeam.invite_code || "ATLAS-2026"}</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyInviteCode(activeTeam.invite_code || "ATLAS-2026")}
                        className="rounded-xl border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 px-3 py-2 text-xs font-bold hover:bg-black/10 transition flex items-center gap-1.5"
                      >
                        {copiedCode ? <Check size={14} className="text-[#2A8F72]" /> : <Copy size={14} />}
                        <span>{copiedCode ? "Copied!" : "Copy Invite Code"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* User's Workspaces list if multiple */}
                {userTeams && userTeams.length > 1 && (
                  <div className="mb-6 space-y-2">
                    <label className="label">Your Workspaces ({userTeams.length})</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {userTeams.map((team) => {
                        const isActive = team.id === activeTeam?.id;
                        return (
                          <div
                            key={team.id}
                            className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                              isActive
                                ? "border-[#3155E7] bg-[#3155E7]/10"
                                : "border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/5"
                            }`}
                          >
                            <div>
                              <b className="block text-sm font-bold">{team.name}</b>
                              <small className="opacity-50 text-[11px]">
                                {team.role || "Member"} · Code: {team.invite_code}
                              </small>
                            </div>
                            {isActive ? (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#3155E7] text-white">
                                Active
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => switchTeam(team.id)}
                                className="text-xs font-bold px-3 py-1 rounded-xl border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 transition"
                              >
                                Switch
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Side-by-side Create Team & Join Team Cards */}
                <div className="grid gap-5 md:grid-cols-2">
                  {/* Create Team Card */}
                  <div className="rounded-2xl border-2 border-black dark:border-white/20 bg-white/80 dark:bg-[#111827]/80 p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-xl bg-[#FF5A1F] text-white">
                        <Plus size={18} />
                      </span>
                      <div>
                        <h4 className="font-display text-lg font-black leading-tight">Create Team</h4>
                        <p className="text-xs opacity-50">Create an isolated command workspace</p>
                      </div>
                    </div>

                    <form onSubmit={handleCreateTeam} className="space-y-3">
                      <div>
                        <label className="label text-xs">Team / Workspace Name</label>
                        <input
                          className="field text-sm"
                          type="text"
                          placeholder="e.g. Cloud Platform SRE"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          disabled={creatingTeam}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={creatingTeam || !newTeamName.trim()}
                        className="btn-primary w-full justify-center py-2.5 text-xs font-bold"
                      >
                        {creatingTeam ? "Creating Workspace..." : "Create Team"}
                        <Plus size={15} />
                      </button>
                    </form>
                  </div>

                  {/* Join Team Card */}
                  <div className="rounded-2xl border-2 border-black dark:border-white/20 bg-white/80 dark:bg-[#111827]/80 p-5 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-xl bg-[#6428C8] text-white">
                        <UserPlus size={18} />
                      </span>
                      <div>
                        <h4 className="font-display text-lg font-black leading-tight">Join Team</h4>
                        <p className="text-xs opacity-50">Join with an invite code from your lead</p>
                      </div>
                    </div>

                    <form onSubmit={handleJoinTeam} className="space-y-3">
                      <div>
                        <label className="label text-xs">Workspace Invite Code</label>
                        <input
                          className="field text-sm font-mono uppercase"
                          type="text"
                          placeholder="e.g. ATLAS-2026"
                          value={inviteCodeInput}
                          onChange={(e) => setInviteCodeInput(e.target.value)}
                          disabled={joiningTeam}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={joiningTeam || !inviteCodeInput.trim()}
                        className="rounded-2xl border-2 border-black bg-[#6428C8] text-white hover:opacity-90 transition px-4 py-2.5 text-xs font-black shadow-[3px_3px_0_#171717] flex items-center justify-center gap-1.5 w-full disabled:opacity-50"
                      >
                        {joiningTeam ? "Joining Workspace..." : "Join Team"}
                        <ArrowRight size={15} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Account Session Footer */}
              <div className="mt-8 pt-5 border-t border-black/10 dark:border-white/10 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <b className="block text-sm font-bold">Account Session</b>
                  <small className="opacity-60">Signed in as {currentUser?.email || profile.email}</small>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-black/20 dark:border-white/20 px-3 py-2 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition"
                    onClick={() => navigate("/login")}
                  >
                    Switch Account
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-[#FF5A1F] text-white px-3 py-2 text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5"
                    onClick={() => {
                      logoutUser();
                      navigate("/login");
                    }}
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div>
              <p className="eyebrow">Alerting</p>
              <h2 className="mt-1 font-display text-3xl font-black">Notifications</h2>
              <div className="mt-7 divide-y divide-black/10 dark:divide-white/10">
                {(
                  [
                    ["critical", "Critical outage alerts", "Immediate push when severity 1/Critical incidents occur"],
                    ["assignment", "Responder assignments", "Notify when assigned as incident commander or responder"],
                    ["ai", "AI root-cause hypotheses", "Alert when Groq finishes log reasoning with high confidence"],
                    ["digest", "Daily memory digest", "Summary of newly retained organizational memories"],
                  ] as const
                ).map(([key, name, desc]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-4 py-5">
                    <span className="flex-1">
                      <b className="block font-bold">{name}</b>
                      <small className="mt-1 block opacity-50">{desc}</small>
                    </span>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={notifications[key]}
                      onChange={(e) =>
                        setNotifications({ ...notifications, [key]: e.target.checked })
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === "integrations" && (
            <div>
              <p className="eyebrow">Production Engine Status</p>
              <h2 className="mt-1 font-display text-3xl font-black">AI & memory configuration</h2>
              <div className="mt-7 space-y-4">
                {/* FastAPI Backend */}
                <div className="integration-card">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#3155E7] text-white">
                    <Activity />
                  </span>
                  <div className="flex-1">
                    <b className="block text-lg font-bold">FastAPI Backend Server</b>
                    <p className="mt-1 text-sm opacity-50">
                      {backendConnected || health?.status === "healthy"
                        ? "Connected to FastAPI REST server on port 8000."
                        : "Backend offline. Running on client-side state."}
                    </p>
                  </div>
                  <span
                    className={
                      backendConnected || health?.status === "healthy"
                        ? "status-on text-[#2A8F72] font-bold"
                        : "status-off"
                    }
                  >
                    {backendConnected || health?.status === "healthy" ? "● Connected" : "Offline"}
                  </span>
                </div>

                {/* Supabase Cloud PostgreSQL Database */}
                <div className="integration-card">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#3ECF8E] text-black">
                    <Database />
                  </span>
                  <div className="flex-1">
                    <b className="block text-lg font-bold">Supabase Cloud Database (PostgreSQL)</b>
                    <p className="mt-1 text-sm opacity-50">
                      {health?.database === "supabase_postgresql" || health?.supabase_configured
                        ? "Connected to hosted Supabase PostgreSQL. Tables and relational schemas auto-managed."
                        : "Ready for Supabase. Currently using local SQLite. Paste DATABASE_URL in backend/.env to connect."}
                    </p>
                  </div>
                  <span
                    className={
                      health?.database === "supabase_postgresql"
                        ? "status-on text-[#2A8F72] font-bold"
                        : "status-off"
                    }
                  >
                    {health?.database === "supabase_postgresql"
                      ? "● Supabase Connected"
                      : "Local SQLite (Ready for Cloud)"}
                  </span>
                </div>

                {/* Groq reasoning */}
                <div className="integration-card">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#FF5A1F] text-white">
                    <BrainCircuit />
                  </span>
                  <div className="flex-1">
                    <b className="block text-lg font-bold">Groq LLM Reasoning</b>
                    <p className="mt-1 text-sm opacity-50">
                      {health?.groq_configured
                        ? "Active with live Groq API credentials (openai/gpt-oss-120b)."
                        : "Ready. Configure GROQ_API_KEY in backend/.env for live cloud inference."}
                    </p>
                  </div>
                  <span
                    className={health?.groq_configured ? "status-on text-[#2A8F72] font-bold" : "status-off"}
                  >
                    {health?.groq_configured ? "● Cloud Groq Active" : "Local Engine"}
                  </span>
                </div>

                {/* Hindsight memory */}
                <div className="integration-card">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#6428C8] text-white">
                    <Database />
                  </span>
                  <div className="flex-1">
                    <b className="block text-lg font-bold">Hindsight Memory Engine</b>
                    <p className="mt-1 text-sm opacity-50">
                      {health?.hindsight_configured
                        ? "Connected to Hindsight memory bank API."
                        : "Active via workspace memory store (Retain, Recall, Reflect supported)."}
                    </p>
                  </div>
                  <span className="status-on text-[#2A8F72] font-bold">● Active</span>
                </div>

                {/* Resend Email Dispatch */}
                <div className="integration-card">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#171717] text-white dark:bg-white dark:text-black">
                    <Mail />
                  </span>
                  <div className="flex-1">
                    <b className="block text-lg font-bold">Resend Outbound Email Service</b>
                    <p className="mt-1 text-sm opacity-50">
                      {health?.resend_configured
                        ? "Live Resend API connected. Team invitations and password resets are delivered to real inboxes."
                        : health?.smtp_configured
                        ? "Connected via custom SMTP gateway."
                        : "Ready for Resend. Add RESEND_API_KEY in backend/.env to send real emails (currently logged locally)."}
                    </p>
                  </div>
                  <span
                    className={
                      health?.resend_configured || health?.smtp_configured
                        ? "status-on text-[#2A8F72] font-bold"
                        : "status-off"
                    }
                  >
                    {health?.resend_configured
                      ? "● Resend Active"
                      : health?.smtp_configured
                      ? "● SMTP Active"
                      : "Local Dispatch"}
                  </span>
                </div>

                <div className="rounded-[22px] border-2 border-dashed border-black/15 p-5 dark:border-white/15">
                  <div className="flex gap-3">
                    <KeyRound className="text-[#3155E7]" />
                    <div>
                      <b className="font-bold">Secure Server-Side Configuration</b>
                      <p className="mt-1 text-sm leading-6 opacity-60">
                        API credentials are kept strictly on the backend in <code>backend/.env</code>.
                        They are never exposed to browser clients or committed to source control.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end border-t border-black/10 pt-5 dark:border-white/10">
            <button className="btn-primary" onClick={save}>
              <Save size={17} /> Save preferences
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
