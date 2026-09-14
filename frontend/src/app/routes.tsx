import React from "react";
import { createBrowserRouter } from "react-router";
import { MobileFrame } from "./components/MobileFrame";
import { MainLayout } from "./components/MainLayout";
import { HMLayout } from "./components/HMLayout";
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
// Health Manager screens
import { HMDashboard } from "./components/screens/hm/HMDashboard";
import { HMGrowthStandards } from "./components/screens/hm/HMGrowthStandards";
import { HMAKGTargets } from "./components/screens/hm/HMAKGTargets";
import { HMFoodDatabase } from "./components/screens/hm/HMFoodDatabase";
import { HMMilestones } from "./components/screens/hm/HMMilestones";
import { HMEducation } from "./components/screens/hm/HMEducation";
import { HMRegionalTrends } from "./components/screens/hm/HMRegionalTrends";
import { HMSystem } from "./components/screens/hm/HMSystem";

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

function FramedHMLayout() {
  return (
    <RequireAuth role="Health Manager">
      <MobileFrame>
        <HMLayout />
      </MobileFrame>
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
  // Parent main app with persistent bottom navigation
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
    ],
  },
  // Health Manager portal with its own layout
  {
    path: "/hm",
    element: <FramedHMLayout />,
    children: [
      { path: "dashboard",        element: <HMDashboard /> },
      { path: "growth-standards", element: <HMGrowthStandards /> },
      { path: "akg-targets",      element: <HMAKGTargets /> },
      { path: "food-database",    element: <HMFoodDatabase /> },
      { path: "milestones",       element: <HMMilestones /> },
      { path: "education",        element: <HMEducation /> },
      { path: "regional-trends",  element: <HMRegionalTrends /> },
      { path: "system",           element: <HMSystem /> },
    ],
  },
]);