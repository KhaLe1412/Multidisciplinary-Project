import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { withErrorBoundary } from "./components/ErrorBoundary";
import { Control } from "./components/Control";
import { DrierControl } from "./components/DrierControl";
import { DeviceManagement } from "./components/DeviceManagement";
import { PolicyPage } from "./components/PolicyPage";
import { Statistics } from "./components/Statistics";
import { LogsPage } from "./components/LogsPage";
import { UsersPage } from "./components/UsersPage";
import { ProfilePage } from "./components/ProfilePage";

// Wrap each page with ErrorBoundary to prevent crashes on fast navigation
const SafeControl = withErrorBoundary(Control);
const SafeDrierControl = withErrorBoundary(DrierControl);
const SafeDeviceManagement = withErrorBoundary(DeviceManagement);
const SafePolicyPage = withErrorBoundary(PolicyPage);
const SafeStatistics = withErrorBoundary(Statistics);
const SafeLogsPage = withErrorBoundary(LogsPage);
const SafeUsersPage = withErrorBoundary(UsersPage);
const SafeProfilePage = withErrorBoundary(ProfilePage);

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        loader: () => redirect("/control"),
      },
      { path: "control", Component: SafeControl },
      { path: "control/:id", Component: SafeDrierControl },
      { path: "devices", Component: SafeDeviceManagement },
      { path: "policy", Component: SafePolicyPage },
      { path: "statistics", Component: SafeStatistics },
      { path: "logs", Component: SafeLogsPage },
      { path: "users", Component: SafeUsersPage },
      { path: "profile", Component: SafeProfilePage },
    ],
  },
  {
    path: "*",
    loader: () => redirect("/login"),
  },
]);
