import { createBrowserRouter, Navigate } from "react-router";
import { RequireAuth } from "./components/RequireAuth";
import { ChildProvider } from "./ChildContext";
import { session } from "../lib/api";
import { ParentShell } from "../parent/ParentShell";
import { ParentLogin } from "../parent/pages/Login";
import { ParentRegister } from "../parent/pages/Register";
import { AddChild, EditChild } from "../parent/pages/ChildForm";
import { Home } from "../parent/pages/Home";
import { Growth } from "../parent/pages/Growth";
import { Measure } from "../parent/pages/Measure";
import { Meals } from "../parent/pages/Meals";
import { AddMeal } from "../parent/pages/AddMeal";
import { Development } from "../parent/pages/Development";
import { More } from "../parent/pages/More";
import { Immunization } from "../parent/pages/Immunization";
import { Calendar } from "../parent/pages/Calendar";
import { Alerts } from "../parent/pages/Alerts";
import { Reports } from "../parent/pages/Reports";
import { Article, Explore } from "../parent/pages/Explore";
import { HMShell } from "../web/HMShell";
import { HMLogin } from "../web/pages/Login";
import { Dashboard as HMDashboard } from "../web/pages/Dashboard";
import { Children as HMChildren } from "../web/pages/Children";
import { ChildDetail as HMChildDetail } from "../web/pages/ChildDetail";
import { Regions as HMRegions } from "../web/pages/Regions";
import { GrowthStandards as HMGrowthStandards } from "../web/pages/GrowthStandards";
import { AkgTargets as HMAkgTargets } from "../web/pages/AkgTargets";
import { Foods as HMFoods } from "../web/pages/Foods";
import { Milestones as HMMilestones } from "../web/pages/Milestones";
import { Education as HMEducation } from "../web/pages/Education";
import { System as HMSystem } from "../web/pages/System";

function ParentLayout() {
  return (
    <RequireAuth role="Parent" loginPath="/masuk">
      <ChildProvider>
        <ParentShell />
      </ChildProvider>
    </RequireAuth>
  );
}

function ParentPage({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="Parent" loginPath="/masuk">
      <ChildProvider>
        <div className="sb min-h-screen">{children}</div>
      </ChildProvider>
    </RequireAuth>
  );
}

function PortalLayout() {
  return (
    <RequireAuth role="Health Manager" loginPath="/hm/login">
      <HMShell />
    </RequireAuth>
  );
}

function Root() {
  return <Navigate to={session.isLoggedInAs("Parent") ? "/beranda" : "/masuk"} replace />;
}

export const router = createBrowserRouter([
  { path: "/", element: <Root /> },
  { path: "/masuk", element: <ParentLogin /> },
  { path: "/daftar", element: <ParentRegister /> },
  { path: "/login", element: <Navigate to="/masuk" replace /> },
  { path: "/register", element: <Navigate to="/daftar" replace /> },
  { path: "/home", element: <Navigate to="/beranda" replace /> },
  { path: "/tambah-anak", element: <ParentPage><AddChild /></ParentPage> },
  { path: "/ukur", element: <ParentPage><Measure /></ParentPage> },
  { path: "/makan/tambah", element: <ParentPage><AddMeal /></ParentPage> },
  {
    element: <ParentLayout />,
    children: [
      { path: "/beranda", element: <Home /> },
      { path: "/tumbuh", element: <Growth /> },
      { path: "/makan", element: <Meals /> },
      { path: "/kembang", element: <Development /> },
      { path: "/lainnya", element: <More /> },
      { path: "/imunisasi", element: <Immunization /> },
      { path: "/kalender", element: <Calendar /> },
      { path: "/pengingat", element: <Alerts /> },
      { path: "/laporan", element: <Reports /> },
      { path: "/artikel", element: <Explore /> },
      { path: "/artikel/:id", element: <Article /> },
      { path: "/anak/:id", element: <EditChild /> },
    ],
  },
  { path: "/hm/login", element: <HMLogin /> },
  {
    path: "/hm",
    element: <PortalLayout />,
    children: [
      { index: true, element: <Navigate to="/hm/dashboard" replace /> },
      { path: "dashboard", element: <HMDashboard /> },
      { path: "children", element: <HMChildren /> },
      { path: "children/:id", element: <HMChildDetail /> },
      { path: "regions", element: <HMRegions /> },
      { path: "regional-trends", element: <Navigate to="/hm/regions" replace /> },
      { path: "growth-standards", element: <HMGrowthStandards /> },
      { path: "akg-targets", element: <HMAkgTargets /> },
      { path: "food-database", element: <HMFoods /> },
      { path: "milestones", element: <HMMilestones /> },
      { path: "education", element: <HMEducation /> },
      { path: "system", element: <HMSystem /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
