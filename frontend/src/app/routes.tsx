import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { MobileFrame } from "./components/MobileFrame";
import { MainLayout } from "./components/MainLayout";
import { RequireAuth } from "./components/RequireAuth";
import { ChildProvider } from "./ChildContext";
import { SplashScreen } from "./components/screens/SplashScreen";
import { OnboardingScreen } from "./components/screens/OnboardingScreen";
import { LoginScreen } from "./components/screens/LoginScreen";
import { RegisterScreen } from "./components/screens/RegisterScreen";
import { AddChildScreen } from "./components/screens/AddChildScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { GrowthScreen } from "./components/screens/GrowthScreen";
import { FoodDiaryScreen } from "./components/screens/FoodDiaryScreen";
import { RecipesScreen } from "./components/screens/RecipesScreen";
import { ImmunizationScreen } from "./components/screens/ImmunizationScreen";
import { ReportsScreen } from "./components/screens/ReportsScreen";
import { ExploreScreen } from "./components/screens/ExploreScreen";
import { SettingsScreen } from "./components/screens/SettingsScreen";
import { AlertsScreen } from "./components/screens/AlertsScreen";
import { MilestonesScreen } from "./components/screens/MilestonesScreen";
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

function FramedScreen({ children }: { children: React.ReactNode }) {
  return (
    <MobileFrame>
      <div
        className="h-full overflow-y-auto"
        style={{ background: "#FFF8EF", fontFamily: "'Nunito', sans-serif" }}
      >
        {children}
      </div>
    </MobileFrame>
  );
}

function FramedLayout() {
  return (
    <RequireAuth role="Parent">
      <ChildProvider>
        <MobileFrame>
          <MainLayout />
        </MobileFrame>
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <FramedScreen><SplashScreen /></FramedScreen>,
  },
  {
    path: "/onboarding",
    element: <FramedScreen><OnboardingScreen /></FramedScreen>,
  },
  {
    path: "/login",
    element: <FramedScreen><LoginScreen /></FramedScreen>,
  },
  {
    path: "/register",
    element: <FramedScreen><RegisterScreen /></FramedScreen>,
  },
  {
    path: "/add-child",
    element: (
      <RequireAuth role="Parent">
        <FramedScreen><AddChildScreen /></FramedScreen>
      </RequireAuth>
    ),
  },
  {
    element: <FramedLayout />,
    children: [
      { path: "/home",         element: <HomeScreen /> },
      { path: "/growth",       element: <GrowthScreen /> },
      { path: "/food-diary",   element: <FoodDiaryScreen /> },
      { path: "/recipes",      element: <RecipesScreen /> },
      { path: "/immunization", element: <ImmunizationScreen /> },
      { path: "/reports",      element: <ReportsScreen /> },
      { path: "/explore",      element: <ExploreScreen /> },
      { path: "/settings",     element: <SettingsScreen /> },
      { path: "/alerts",       element: <AlertsScreen /> },
      { path: "/milestones",   element: <MilestonesScreen /> },
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
]);