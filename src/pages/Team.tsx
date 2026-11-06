import { useState, useEffect, useMemo } from "react";
import { Activity, Mail, MoreHorizontal, Plus, Shield, Users, Copy, Check } from "lucide-react";
import { members as defaultMembers } from "../data/demo";
import { useApp } from "../app/state";
import { Modal, PageHeader, StatCard } from "../components/ui";
import { api } from "../api/client";

export function Team() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Engineer");
  const [serverMembers, setServerMembers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const { toast, activeTeam, incidents } = useApp();

  const resolved = useMemo(() => incidents.filter((i) => i.status === "Resolved"), [incidents]);
  const totalActions = incidents.length + resolved.length;

  useEffect(() => {
    let active = true;
    api.teams
      .getMembers()
      .then((m) => {
        if (active && Array.isArray(m) && m.length > 0) {
          const colors = ["#FF5A1F", "#3155E7", "#6428C8", "#2A8F72"];
          const mapped = m.map((item, idx) => ({
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
          setServerMembers(mapped);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const members = serverMembers.length > 0 ? serverMembers : defaultMembers;
  const inviteCode = activeTeam?.invite_code || "ATLAS-2026";

  const copyInvite = () => {
    navigator.clipboard?.writeText(inviteCode);
    setCopied(true);
    toast(`Invite code ${inviteCode} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={copyInvite}>
              {copied ? <Check size={16} /> : <Copy size={16} />} Invite code: {inviteCode}
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
                    <button
                      className="icon-button ml-auto"
                      onClick={() => toast(`Role: ${member.role} for ${member.name}`)}
                      aria-label={`Actions for ${member.name}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
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
    </div>
  );
}
