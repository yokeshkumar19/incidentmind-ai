import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { incidents as initialIncidents, type Incident, type Severity, type IncidentStatus } from "../data/demo";
import { api } from "../api/client";

type Theme = "light" | "dark" | "system";
type Toast = { id: number; message: string };

type AppState = {
  incidents: Incident[];
  addIncident: (incident: {
    title: string;
    description: string;
    service: string;
    severity: Severity;
    environment: string;
    logs: string;
  }) => Promise<string>;
  resolveIncident: (id: string, resolution: string, actualRootCause?: string) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;
  purgeIncidents: () => Promise<void>;
  deleteWorkspace: (teamId: string) => Promise<void>;
  leaveWorkspace: (teamId: string) => Promise<void>;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toast: (message: string) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  refreshIncidents: () => Promise<void>;
  backendConnected: boolean;
  activeTeam: any;
  userTeams: any[];
  currentUser: any;
  isGuest: boolean;
  setAsGuest: () => void;
  loginUser: (token: string, user: any) => Promise<void>;
  logoutUser: () => void;
  switchTeam: (teamId: string) => Promise<void>;
  createTeam: (name: string) => Promise<any>;
  joinTeam: (inviteCode: string) => Promise<any>;
  loadUserTeams: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

function mapBackendIncident(item: any): Incident {
  return {
    id: item.id,
    title: item.title,
    service: item.affected_service || item.service || "General",
    severity: item.severity as Severity,
    status: item.status as IncidentStatus,
    time: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
    owner: item.reporter_name || "Maya Chen",
    description: item.description,
    resolution: item.resolution_text,
    confidence: item.confidence || 85,
    tags: item.tags || [item.affected_service?.toLowerCase() || "general"],
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [backendConnected, setBackendConnected] = useState(false);
  const [activeTeam, setActiveTeam] = useState<any>(null);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return Boolean(sessionStorage.getItem("incidentmind_guest"));
  });
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("incidentmind-theme") as Theme) || "light",
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string) => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, []);

  const refreshIncidents = useCallback(async () => {
    try {
      const data = await api.incidents.list();
      if (Array.isArray(data) && data.length > 0) {
        setIncidents(data.map(mapBackendIncident));
        setBackendConnected(true);
      }
    } catch (err) {
      setBackendConnected(false);
    }
  }, []);

  const loadUserTeams = useCallback(async () => {
    try {
      const teams = await api.teams.list();
      if (Array.isArray(teams)) {
        setUserTeams(teams);
      }
    } catch (_) {}
  }, []);

  // Initial load: probe backend health, team, user profile, and incidents
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const health = await api.getHealth();
        if (mounted && health?.status === "healthy") {
          setBackendConnected(true);
          const [team, user, incidentList, teams] = await Promise.all([
            api.teams.getCurrent().catch(() => null),
            api.auth.getMe().catch(() => null),
            api.incidents.list().catch(() => null),
            api.teams.list().catch(() => []),
          ]);
          if (mounted) {
            if (team) {
              setActiveTeam(team);
              localStorage.setItem("incidentmind_team_id", team.id);
            }
            if (user) setCurrentUser(user);
            if (Array.isArray(teams)) setUserTeams(teams);
            if (Array.isArray(incidentList) && incidentList.length > 0) {
              setIncidents(incidentList.map(mapBackendIncident));
            }
          }
        }
      } catch {
        if (mounted) setBackendConnected(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("incidentmind-theme", theme);
    const isDark =
      theme === "dark" ||
      (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme]);

  const setAsGuest = useCallback(() => {
    sessionStorage.setItem("incidentmind_guest", "true");
    setIsGuest(true);
    toast("Continuing in Guest mode");
  }, [toast]);

  const loginUser = useCallback(async (token: string, user: any) => {
    localStorage.setItem("incidentmind_token", token);
    sessionStorage.removeItem("incidentmind_guest");
    setIsGuest(false);
    setCurrentUser(user);
    try {
      const [team, teams, incidentList] = await Promise.all([
        api.teams.getCurrent().catch(() => null),
        api.teams.list().catch(() => []),
        api.incidents.list().catch(() => null),
      ]);
      if (team) {
        setActiveTeam(team);
        localStorage.setItem("incidentmind_team_id", team.id);
      }
      if (Array.isArray(teams)) setUserTeams(teams);
      if (Array.isArray(incidentList) && incidentList.length > 0) {
        setIncidents(incidentList.map(mapBackendIncident));
      }
    } catch (_) {}
  }, []);

  const logoutUser = useCallback(() => {
    localStorage.removeItem("incidentmind_token");
    localStorage.removeItem("incidentmind_team_id");
    sessionStorage.removeItem("incidentmind_guest");
    setIsGuest(false);
    setCurrentUser(null);
    toast("Signed out successfully");
  }, [toast]);

  const switchTeam = useCallback(async (teamId: string) => {
    localStorage.setItem("incidentmind_team_id", teamId);
    try {
      const team = await api.teams.getCurrent();
      setActiveTeam(team);
      const incidentList = await api.incidents.list();
      if (Array.isArray(incidentList)) {
        setIncidents(incidentList.map(mapBackendIncident));
      }
      toast(`Switched to workspace: ${team.name}`);
    } catch (err: any) {
      toast("Failed to switch workspace");
    }
  }, [toast]);

  const createTeam = useCallback(async (name: string) => {
    try {
      const team = await api.teams.create({ name });
      await switchTeam(team.id);
      await loadUserTeams();
      toast(`Workspace '${name}' created!`);
      return team;
    } catch (err: any) {
      toast(err.message || "Failed to create workspace");
      throw err;
    }
  }, [switchTeam, loadUserTeams, toast]);

  const joinTeam = useCallback(async (inviteCode: string) => {
    try {
      const team = await api.teams.join({ invite_code: inviteCode });
      await switchTeam(team.id);
      await loadUserTeams();
      toast(`Joined workspace '${team.name}'!`);
      return team;
    } catch (err: any) {
      toast(err.message || "Failed to join workspace");
      throw err;
    }
  }, [switchTeam, loadUserTeams, toast]);

  const addIncident = useCallback(
    async (input: {
      title: string;
      description: string;
      service: string;
      severity: Severity;
      environment: string;
      logs: string;
    }) => {
      try {
        const created = await api.incidents.create({
          title: input.title,
          description: input.description,
          affected_service: input.service,
          severity: input.severity,
          environment: input.environment,
          error_logs: input.logs,
        });

        const mapped = mapBackendIncident(created);
        setIncidents((items) => [mapped, ...items.filter((i) => i.id !== mapped.id)]);
        setBackendConnected(true);
        return mapped.id;
      } catch (err: any) {
        console.warn("Backend addIncident fallback to local state:", err);
        const id = `INC-${2050 + incidents.length}`;
        const fallback: Incident = {
          id,
          title: input.title,
          description: input.description,
          service: input.service,
          severity: input.severity,
          status: "Investigating",
          time: "Just now",
          owner: "You",
          tags: [input.environment.toLowerCase(), input.service.toLowerCase().replace(/ /g, "-")],
        };
        setIncidents((items) => [fallback, ...items]);
        return id;
      }
    },
    [incidents.length],
  );

  const resolveIncident = useCallback(
    async (id: string, resolution: string, actualRootCause?: string) => {
      try {
        await api.resolutions.resolve(id, {
          actual_root_cause: actualRootCause || "Incident root cause verified by responder",
          actions_taken: resolution,
          final_resolution: resolution,
          resolution_status: "Resolved",
          retain_in_memory: true,
        });
        setBackendConnected(true);
      } catch (err) {
        console.warn("Backend resolveIncident fallback to local state:", err);
      }

      setIncidents((items) =>
        items.map((item) => (item.id === id ? { ...item, status: "Resolved", resolution } : item)),
      );
    },
    [],
  );

  const deleteIncident = useCallback(
    async (id: string) => {
      try {
        await api.incidents.delete(id);
      } catch (err) {
        console.warn("Backend deleteIncident fallback to local state:", err);
      }
      setIncidents((items) => items.filter((item) => item.id !== id));
      toast(`Incident ${id} deleted`);
    },
    [toast],
  );

  const purgeIncidents = useCallback(async () => {
    try {
      await api.incidents.purgeAll();
    } catch (err) {
      console.warn("Backend purgeIncidents fallback to local state:", err);
    }
    setIncidents([]);
    toast("All incidents have been purged from workspace");
  }, [toast]);

  const leaveWorkspace = useCallback(
    async (teamId: string) => {
      try {
        await api.teams.removeMember(currentUser?.id || "me");
      } catch (err: any) {
        console.warn("Backend leaveWorkspace error:", err);
        throw err;
      }
      setUserTeams((teams) => teams.filter((t) => t.id !== teamId));
      if (activeTeam?.id === teamId) {
        const remaining = userTeams.filter((t) => t.id !== teamId);
        setActiveTeam(remaining[0] || null);
        if (remaining[0]) {
          localStorage.setItem("incidentmind_team_id", remaining[0].id);
        } else {
          localStorage.removeItem("incidentmind_team_id");
        }
      }
      toast("Left workspace successfully");
    },
    [activeTeam, currentUser, userTeams, toast],
  );

  const deleteWorkspace = useCallback(
    async (teamId: string) => {
      try {
        await api.teams.deleteWorkspace(teamId);
      } catch (err: any) {
        console.warn("Backend deleteWorkspace error:", err);
        throw err;
      }
      setUserTeams((teams) => teams.filter((t) => t.id !== teamId));
      if (activeTeam?.id === teamId) {
        const remaining = userTeams.filter((t) => t.id !== teamId);
        setActiveTeam(remaining[0] || null);
        if (remaining[0]) {
          localStorage.setItem("incidentmind_team_id", remaining[0].id);
        } else {
          localStorage.removeItem("incidentmind_team_id");
        }
      }
      toast("Workspace deleted successfully");
    },
    [activeTeam, userTeams, toast],
  );

  const value = useMemo<AppState>(
    () => ({
      incidents,
      addIncident,
      resolveIncident,
      deleteIncident,
      purgeIncidents,
      deleteWorkspace,
      leaveWorkspace,
      theme,
      setTheme,
      toast,
      toasts,
      dismissToast: (id) => setToasts((items) => items.filter((item) => item.id !== id)),
      refreshIncidents,
      backendConnected,
      activeTeam,
      userTeams,
      currentUser,
      isGuest,
      setAsGuest,
      loginUser,
      logoutUser,
      switchTeam,
      createTeam,
      joinTeam,
      loadUserTeams,
    }),
    [
      incidents,
      addIncident,
      resolveIncident,
      deleteIncident,
      purgeIncidents,
      deleteWorkspace,
      leaveWorkspace,
      theme,
      toast,
      toasts,
      refreshIncidents,
      backendConnected,
      activeTeam,
      userTeams,
      currentUser,
      isGuest,
      setAsGuest,
      loginUser,
      logoutUser,
      switchTeam,
      createTeam,
      joinTeam,
      loadUserTeams,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used within AppProvider");
  return value;
}
