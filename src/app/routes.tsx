import { createBrowserRouter } from "react-router";
import { AppLayout } from "../components/AppLayout";
import { Dashboard } from "../pages/Dashboard";
import { ReportIncident } from "../pages/ReportIncident";
import { Investigation } from "../pages/Investigation";
import { Memory } from "../pages/Memory";
import { Resolution } from "../pages/Resolution";
import { Analytics } from "../pages/Analytics";
import { Team } from "../pages/Team";
import { Settings } from "../pages/Settings";
import { Login } from "../pages/Login";
import { NotFound } from "../pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "report", Component: ReportIncident },
      { path: "investigation", Component: Investigation },
      { path: "memory", Component: Memory },
      { path: "resolution", Component: Resolution },
      { path: "analytics", Component: Analytics },
      { path: "team", Component: Team },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);
