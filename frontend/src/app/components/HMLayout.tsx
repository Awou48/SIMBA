import { Outlet } from "react-router";
import { HMBottomNav } from "./HMBottomNav";

export function HMLayout() {
  return (
    <div className="relative h-full flex flex-col" style={{ background: "#EEF2FF" }}>
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "80px", scrollbarWidth: "none" }}
      >
        <Outlet />
      </div>
      <HMBottomNav />
    </div>
  );
}
