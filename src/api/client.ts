/**
 * Centralized API Client for IncidentMind AI
 * Connects React Frontend to FastAPI Backend
 */

function resolveApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, "");
    if (!clean.endsWith("/api")) {
      clean = `${clean}/api`;
    }
    return clean;
  }

  if (typeof window !== "undefined") {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocal) {
      return `${window.location.protocol}//${window.location.hostname}:8000/api`;
    }
    return `${window.location.origin}/api`;
  }

  return "http://localhost:8000/api";
}

export const API_BASE_URL = resolveApiBaseUrl();

class ApiClient {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = localStorage.getItem("incidentmind_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const teamId = localStorage.getItem("incidentmind_team_id");
    if (teamId) {
      headers["X-Team-ID"] = teamId;
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string>) };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === "string" 
              ? errorData.detail 
              : JSON.stringify(errorData.detail);
          }
        } catch (_) {}
        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (err: any) {
      console.warn(`[IncidentMind API] Request to ${endpoint} failed:`, err.message);
      throw err;
    }
  }

  // System & Health
  async getHealth() {
    return this.request<{
      status: string;
      service: string;
      database: string;
      groq_configured: boolean;
      hindsight_configured: boolean;
    }>("/health");
  }

  // Authentication
  auth = {
    register: (data: { name: string; email: string; password: string }) =>
      this.request<{ access_token: string; user: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      this.request<{ access_token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getMe: () => this.request<any>("/auth/me"),
    forgotPassword: (email: string) =>
      this.request<{ message: string; status: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (data: { token: string; new_password: string }) =>
      this.request<{ message: string; status: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  };

  // Teams & Workspaces
  teams = {
    list: () => this.request<any[]>("/teams/"),
    getCurrent: () => this.request<any>("/teams/current"),
    create: (data: { name: string }) =>
      this.request<any>("/teams/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    join: (data: { invite_code: string }) =>
      this.request<any>("/teams/join", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    invite: (data: { email: string; role: string }) =>
      this.request<{ message: string; email: string; team_name: string; invite_code: string; channel: string }>(
        "/teams/invite",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    getMembers: () => this.request<any[]>("/teams/members"),
    updateRole: (memberId: string, role: string) =>
      this.request<any>(`/teams/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    removeMember: (memberId: string) =>
      this.request<{ message: string; status: string }>(`/teams/members/${memberId}`, {
        method: "DELETE",
      }),
    deleteWorkspace: (teamId: string) =>
      this.request<{ message: string; status: string }>(`/teams/${teamId}`, {
        method: "DELETE",
      }),
  };

  // Incidents
  incidents = {
    list: (params?: { status?: string; severity?: string; service?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.severity) searchParams.set("severity", params.severity);
      if (params?.service && params.service !== "All services") searchParams.set("service", params.service);
      if (params?.search) searchParams.set("search", params.search);
      const query = searchParams.toString();
      return this.request<any[]>(`/incidents/${query ? `?${query}` : ""}`);
    },
    get: (id: string) => this.request<any>(`/incidents/${id}`),
    create: (data: {
      title: string;
      description: string;
      affected_service: string;
      severity: string;
      environment: string;
      error_logs?: string;
    }) =>
      this.request<any>("/incidents/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      this.request<any>(`/incidents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      this.request<void>(`/incidents/${id}`, {
        method: "DELETE",
      }),
    purgeAll: () =>
      this.request<{ message: string; count: number }>("/incidents/purge/all", {
        method: "DELETE",
      }),
  };

  // AI Investigation (Groq + Hindsight)
  investigations = {
    investigate: (incidentId: string, customContext?: string) =>
      this.request<any>(`/incidents/${incidentId}/investigate`, {
        method: "POST",
        body: JSON.stringify({ custom_context: customContext }),
      }),
    list: (incidentId: string) =>
      this.request<any[]>(`/incidents/${incidentId}/investigations`),
  };

  // Resolutions (Human in control + Hindsight Retain)
  resolutions = {
    resolve: (
      incidentId: string,
      data: {
        actual_root_cause: string;
        actions_taken: string;
        final_resolution: string;
        resolution_status?: string;
        retain_in_memory?: boolean;
      }
    ) =>
      this.request<any>(`/incidents/${incidentId}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          resolution_status: "Resolved",
          retain_in_memory: true,
          ...data,
        }),
      }),
    get: (incidentId: string) =>
      this.request<any>(`/incidents/${incidentId}/resolution`),
  };

  // Feedback on AI Findings
  feedback = {
    submit: (
      investigationId: string,
      data: {
        finding_reference: string;
        feedback_type: "accepted" | "rejected" | "corrected";
        correction?: string;
      }
    ) =>
      this.request<any>(`/investigations/${investigationId}/feedback`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    list: (investigationId: string) =>
      this.request<any[]>(`/investigations/${investigationId}/feedback`),
  };

  // Organizational Memory (Hindsight)
  memory = {
    list: (service?: string) => {
      const q = service && service !== "All services" ? `?service=${encodeURIComponent(service)}` : "";
      return this.request<any[]>(`/memory/${q}`);
    },
    recall: (query: string, service?: string, limit = 5) =>
      this.request<any>("/memory/recall", {
        method: "POST",
        body: JSON.stringify({ query, service, limit }),
      }),
    reflect: (query?: string) =>
      this.request<any>("/memory/reflect", {
        method: "POST",
        body: JSON.stringify({ query }),
      }),
    delete: (id: string) =>
      this.request<{ message: string; status: string }>(`/memory/${id}`, {
        method: "DELETE",
      }),
  };

  // Analytics
  analytics = {
    getSummary: () => this.request<any>("/analytics/summary"),
  };
}

export const api = new ApiClient();

