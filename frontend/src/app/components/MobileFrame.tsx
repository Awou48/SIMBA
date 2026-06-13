import React from "react";

interface MobileFrameProps {
  children: React.ReactNode;
}

export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: "#e8e0d8" }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: "390px",
          height: "844px",
          borderRadius: "44px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.15)",
          background: "#FFF8EF",
          fontFamily: "'Nunito', 'Poppins', sans-serif",
        }}
      >
        {/* Status bar */}
        <div
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
          style={{ height: "44px", background: "transparent" }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047" }}>9:41</span>
          <div className="flex items-center gap-1">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <rect x="0" y="3" width="3" height="9" rx="1" fill="#2D3047" />
              <rect x="4.5" y="2" width="3" height="10" rx="1" fill="#2D3047" />
              <rect x="9" y="0.5" width="3" height="11.5" rx="1" fill="#2D3047" />
              <rect x="13.5" y="0" width="2.5" height="12" rx="1" fill="#2D3047" opacity="0.3" />
            </svg>
            <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
              <path d="M7.5 2.5C9.5 2.5 11.3 3.3 12.6 4.6L14 3.2C12.3 1.5 10 0.5 7.5 0.5C5 0.5 2.7 1.5 1 3.2L2.4 4.6C3.7 3.3 5.5 2.5 7.5 2.5Z" fill="#2D3047"/>
              <path d="M7.5 5.5C8.8 5.5 10 6 10.9 6.9L12.3 5.5C11 4.2 9.3 3.5 7.5 3.5C5.7 3.5 4 4.2 2.7 5.5L4.1 6.9C5 6 6.2 5.5 7.5 5.5Z" fill="#2D3047"/>
              <circle cx="7.5" cy="10" r="1.5" fill="#2D3047"/>
            </svg>
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#2D3047" strokeOpacity="0.35"/>
              <rect x="2" y="2" width="16" height="8" rx="2" fill="#2D3047"/>
              <path d="M23 4.5V7.5C23.8 7.2 24.5 6.4 24.5 6C24.5 5.6 23.8 4.8 23 4.5Z" fill="#2D3047" fillOpacity="0.4"/>
            </svg>
          </div>
        </div>
        <div className="h-full overflow-hidden" style={{ paddingTop: "44px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
