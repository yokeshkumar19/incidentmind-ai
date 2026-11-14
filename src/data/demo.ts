export type Severity = "Critical" | "High" | "Medium" | "Low";
export type IncidentStatus = "Investigating" | "Monitoring" | "Resolved";

export type Incident = {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  time: string;
  owner: string;
  description: string;
  resolution?: string;
  confidence?: number;
  tags: string[];
};

// All incidents start strictly at 0 and populate from user activity
export const incidents: Incident[] = [];

export const frequencyData = [
  { week: "W1", incidents: 0, critical: 0, resolved: 0 },
  { week: "W2", incidents: 0, critical: 0, resolved: 0 },
  { week: "W3", incidents: 0, critical: 0, resolved: 0 },
  { week: "W4", incidents: 0, critical: 0, resolved: 0 },
];

export const resolutionTrend = [
  { month: "Jan", hours: 0, target: 4.0 },
  { month: "Feb", hours: 0, target: 4.0 },
  { month: "Mar", hours: 0, target: 4.0 },
  { month: "Apr", hours: 0, target: 4.0 },
  { month: "May", hours: 0, target: 3.5 },
  { month: "Jun", hours: 0, target: 3.5 },
  { month: "Jul", hours: 0, target: 3.0 },
  { month: "Aug", hours: 0, target: 3.0 },
  { month: "Sep", hours: 0, target: 2.5 },
  { month: "Oct", hours: 0, target: 2.5 },
  { month: "Nov", hours: 0, target: 2.0 },
  { month: "Dec", hours: 0, target: 2.0 },
];

export const services = [
  { name: "Checkout", reliability: 100, incidents: 0, color: "#FF5A1F" },
  { name: "Identity", reliability: 100, incidents: 0, color: "#3155E7" },
  { name: "Search", reliability: 100, incidents: 0, color: "#6428C8" },
  { name: "Billing", reliability: 100, incidents: 0, color: "#D6FF45" },
];

export const activity: any[] = [];

export const members = [
  {
    name: "Maya Chen",
    initials: "MC",
    role: "Incident Commander",
    status: "Online",
    incidents: 0,
    resolved: 0,
    color: "#FF5A1F",
  },
  {
    name: "Jon Bell",
    initials: "JB",
    role: "Platform Engineer",
    status: "Online",
    incidents: 0,
    resolved: 0,
    color: "#3155E7",
  },
  {
    name: "Priya Rao",
    initials: "PR",
    role: "SRE",
    status: "Online",
    incidents: 0,
    resolved: 0,
    color: "#6428C8",
  },
  {
    name: "Theo Grant",
    initials: "TG",
    role: "Backend Engineer",
    status: "Away",
    incidents: 0,
    resolved: 0,
    color: "#2A8F72",
  },
];
