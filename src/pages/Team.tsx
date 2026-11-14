import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Mail,
  MoreHorizontal,
  Plus,
  Shield,
  Users,
  Copy,
  Check,
  UserMinus,
  Lock,
  Crown,
  Info,
} from "lucide-react";
import { members as defaultMembers } from "../data/demo";
import { useApp } from "../app/state";
import { Modal, PageHeader, StatCard } from "../components/ui";
import { api } from "../api/client";

export function Team() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Engineer");
  const [teamMembers, setTeamMembers] = useState<any[]>(defaultMembers);
  const [activeMenuMember, setActiveMenuMember] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast, activeTeam, incidents, currentUser, joinTeam } = useApp();

  const resolved = useMemo(() => incidents.filter((i) => i.status === "Resolved"), [incidents]);
  const totalActions = incidents.length + resolved.length;

  // The current user is a Team Leader if their role is Admin or they created the workspace
  const isTeamLeader = useMemo(() => {
    if (activeTeam?.role) {
      return activeTeam.role === "Admin";
    }
    if (currentUser?.id && activeTeam?.created_by) {
      return currentUser.id === activeTeam.created_by;
    }
    // Default to true in unauthenticated/demo workspace mode
    return true;
  }, [activeTeam, currentUser]);

  useEffect(() => {
    let active = true;
    api.teams
      .getMembers()
      .then((m) => {
        if (active && Array.isArray(m) && m.length > 0) {
          const colors = ["#FF5A1F", "#3155E7", "#6428C8", "#2A8F72"];
          const mapped = m.map((item, idx) => ({
            id: item.id,
            userId: item.user_id,
            email: item.user_email,
            name: item.user_name || "Engineer",
            initials: (item.user_name || "EN")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
            role: item.role || "Engineer",
            status: "Online",
            incidents: 0,
            resolved: 0,
            color: colors[idx % colors.length],
          }));
          setTeamMembers(mapped);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Close 3-dots popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".member-menu-container")) {
        setActiveMenuMember(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const members = teamMembers;

  const handleRoleChange = async (member: any, newRole: string) => {
    if (!isTeamLeader) {
      toast("Permission Denied: Only Team Leaders can change member roles.");
      return;
    }
    try {
      if (member.id) {
        await api.teams.updateRole(member.id, newRole);
      }
      setTeamMembers((prev) =>
        prev.map((m) => (m.name === member.name ? { ...m, role: newRole } : m))
      );
      toast(`Updated ${member.name}'s role to ${newRole}`);
      setActiveMenuMember(null);
    } catch (err: any) {
      toast(err.message || "Failed to update member role");
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (!isTeamLeader) {
      toast("Permission Denied: Only Team Leaders can remove members from the team.");
      return;
    }
    try {
      if (member.id) {
        await api.teams.removeMember(member.id);
      }
      setTeamMembers((prev) => prev.filter((m) => m.name !== member.name));
      toast(`Removed ${member.name} from the workspace`);
      setActiveMenuMember(null);
    } catch (err: any) {
      toast(err.message || "Failed to remove member");
    }
  };
  const inviteCode = activeTeam?.invite_code || "ATLAS-2026";

  const copyInvite = () => {
    navigator.clipboard?.writeText(inviteCode);
    setCopied(true);
    toast(`Invite code ${inviteCode} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return toast("Please enter an invite code");
    setJoining(true);
    try {
      await joinTeam(joinCode.trim());
      setJoinOpen(false);
      setJoinCode("");
    } catch (err: any) {
      toast(err.message || "Failed to join workspace");
    } finally {
      setJoining(false);
    }
  };

  const [sendingInvite, setSendingInvite] = useState(false);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return toast("Enter a valid email address");
    setSendingInvite(true);
    try {
      const res = await api.teams.invite({ email: email.trim(), role });
      setInviteOpen(false);
      setEmail("");
      toast(res.message || `Invitation email sent to ${email}!`);
    } catch (err: any) {
      toast(err.message || "Failed to send invitation email");
    } finally {
      setSendingInvite(false);
    }
  };

  const recentTeamActions = useMemo(() => {
    if (incidents.length === 0) return [];
    return incidents.slice(0, 6).map((inc) => ({
      person: inc.owner || "Responder",
      action: inc.status === "Resolved" ? "confirmed mitigation & closed" : "triaged signal & investigated",
      target: inc.id,
      time: inc.time || "recently",
      color: inc.severity === "Critical" ? "#FF5A1F" : "#3155E7",
    }));
  }, [incidents]);

  return (
    <div>
      <PageHeader
        eyebrow={`Team workspace / ${activeTeam?.name || "Atlas SRE"}`}
        title="Reliability is a team sport."
        description="See who is responding, how work moves, and the collective practice behind every recovery."
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={copyInvite}>
              {copied ? <Check size={16} /> : <Copy size={16} />} Invite code: {inviteCode}
            </button>
            <button className="btn-secondary" onClick={() => setJoinOpen(true)}>
              Join another workspace
            </button>
            <button className="btn-primary" onClick={() => setInviteOpen(true)}>
              <Plus size={17} /> Invite member
            </button>
          </div>
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Team members"
          value={String(members.length)}
          detail={`${members.length} active in workspace`}
          color="#3155E7"
          icon={Users}
          className="text-white"
        />
        <StatCard
          label="Resolved / quarter"
          value={String(resolved.length).padStart(2, "0")}
          detail={resolved.length === 0 ? "0 resolved in current quarter" : `${resolved.length} resolved within SLO`}
          color="#D6FF45"
          icon={Shield}
        />
        <StatCard
          label="Shared actions"
          value={String(totalActions).padStart(2, "0")}
          detail={totalActions === 0 ? "0 collaborative actions" : `${totalActions} collaborative activities`}
          color="#FF5A1F"
          icon={Activity}
          className="text-white"
        />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Responders</p>
              <h2>Core incident team</h2>
            </div>
            <span className="text-xs font-bold opacity-40">{members.length} members</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((member) => {
              const memberIncidents = incidents.filter((i) => i.owner === member.name).length;
              const memberResolved = incidents.filter((i) => i.owner === member.name && i.status === "Resolved").length;
              return (
                <div
                  key={member.name}
                  className="rounded-[22px] border border-black/10 p-4 dark:border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-12 place-items-center rounded-2xl font-black text-white"
                      style={{ background: member.color }}
                    >
                      {member.initials}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate">{member.name}</strong>
                      <small className="opacity-45">{member.role}</small>
                    </div>
                    <div className="relative ml-auto member-menu-container">
                      <button
                        className="icon-button"
                        onClick={() =>
                          setActiveMenuMember(activeMenuMember === member.name ? null : member.name)
                        }
                        aria-label={`Actions for ${member.name}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {activeMenuMember === member.name && (
                        <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border-2 border-black bg-white p-3 shadow-[4px_4px_0_#171717] dark:border-white/20 dark:bg-[#111827] text-xs">
                          {/* Member Role Header */}
                          <div className="px-1 py-1 border-b border-black/10 dark:border-white/10 pb-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50 block">
                              Member Profile
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-[#3155E7] dark:text-[#60A5FA]">
                              {member.role === "Admin" ? (
                                <Crown size={15} className="text-[#FF5A1F]" />
                              ) : (
                                <Shield size={14} />
                              )}
                              <span>{member.role === "Admin" ? "Team Leader (Admin)" : member.role}</span>
                            </div>
                            {member.email && (
                              <span className="text-[11px] opacity-70 truncate block mt-1 font-mono">
                                {member.email}
                              </span>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-[11px] font-medium opacity-80">
                              <span
                                className={`size-2 rounded-full ${
                                  member.status === "Online" ? "bg-[#2A8F72]" : "bg-black/30"
                                }`}
                              />
                              <span>Status: {member.status}</span>
                            </div>
                          </div>

                          {isTeamLeader ? (
                            <>
                              {/* Role Switcher (Leader only) */}
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-black/40 dark:text-white/40 px-2 py-0.5 block">
                                  Change Role
                                </span>
                                {(["Admin", "Engineer", "Viewer"] as const).map((r) => (
                                  <button
                                    key={r}
                                    type="button"
                                    onClick={() => handleRoleChange(member, r)}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition text-left ${
                                      member.role === r
                                        ? "bg-black/5 dark:bg-white/10 font-bold"
                                        : "hover:bg-black/5 dark:hover:bg-white/5"
                                    }`}
                                  >
                                    <span>{r === "Admin" ? "Team Leader (Admin)" : r}</span>
                                    {member.role === r && <Check size={13} className="text-[#2A8F72]" />}
                                  </button>
                                ))}
                              </div>

                              {/* Remove from team button (Leader only) */}
                              <div className="border-t border-black/10 dark:border-white/10 mt-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(member)}
                                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl font-bold text-[#FF5A1F] hover:bg-[#FF5A1F]/10 transition text-left"
                                >
                                  <UserMinus size={14} />
                                  <span>Remove from team</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            /* Regular Member Read-Only Info View */
                            <div className="space-y-2 pt-1">
                              <div className="rounded-xl bg-black/5 dark:bg-white/5 p-2 text-[11px] leading-relaxed">
                                <b className="block text-[10px] uppercase font-bold text-black/60 dark:text-white/60 mb-0.5">
                                  Permissions
                                </b>
                                {member.role === "Admin"
                                  ? "Full administrative control, role assignment, and team management."
                                  : member.role === "Engineer"
                                    ? "Triage incoming outages, run AI investigation, and document resolutions."
                                    : "Read-only workspace visibility into active incidents and analytics."}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-black/50 dark:text-white/50 px-1 pt-1">
                                <Lock size={11} className="shrink-0" />
                                <span>Only Team Leaders can modify roles or remove members.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-black/10 pt-3 text-xs font-bold dark:border-white/10">
                    <span
                      className={`size-2 rounded-full ${member.status === "Online" ? "bg-[#2A8F72]" : member.status === "In incident" ? "bg-[#FF5A1F]" : "bg-black/25"}`}
                    />
                    {member.status}
                    <span className="ml-auto opacity-45">
                      {memberResolved}/{memberIncidents} resolved
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
        <aside className="panel space-y-5">
          <div>
            <p className="eyebrow">Live feed</p>
            <h2 className="mt-1 font-display text-2xl font-black">Recent team actions</h2>
          </div>
          <div className="space-y-4">
            {recentTeamActions.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-50">
                No recent actions recorded. Team actions appear here as incidents and mitigations are handled.
              </div>
            ) : (
              recentTeamActions.map((item, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span
                    className="mt-1 size-2 shrink-0 rounded-full"
                    style={{ background: item.color }}
                  />
                  <div className="flex-1 leading-5">
                    <b>{item.person}</b> <span className="opacity-60">{item.action}</span>{" "}
                    <b className="underline underline-offset-2">{item.target}</b>
                    <small className="block text-[11px] font-bold opacity-35">{item.time}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      {/* Invite Modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite team member">
        <form onSubmit={invite} className="space-y-4 pt-3">
          <div>
            <label className="label">Colleague email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={18} />
              <input
                className="field pl-11"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@atlas.dev"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Admin</option>
              <option>Engineer</option>
              <option>Viewer</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={sendingInvite} className="btn-primary">
              {sendingInvite ? "Sending..." : "Send invitation"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Join Workspace Modal */}
      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join another workspace">
        <form onSubmit={handleJoin} className="space-y-4 pt-3">
          <p className="text-sm opacity-60">
            Enter the workspace invite code provided by your team lead to join their shared incidents and failure memory bank.
          </p>
          <div>
            <label className="label">Invite Code</label>
            <input
              className="field uppercase tracking-wider font-mono font-bold"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. ATLAS-2026"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setJoinOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={joining} className="btn-primary">
              {joining ? "Joining..." : "Join workspace"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
