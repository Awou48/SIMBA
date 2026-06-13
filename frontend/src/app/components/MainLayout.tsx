import React from "react";
import { Outlet } from "react-router";
import { BottomNav } from "./BottomNav";

export function MainLayout() {
  return (
    <div className="relative h-full flex flex-col" style={{ background: "#FFF8EF" }}>
      <div
        id="main-scroll"
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "80px", scrollbarWidth: "none" }}
      >
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
