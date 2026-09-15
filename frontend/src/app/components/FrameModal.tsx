import React from "react";
import { createPortal } from "react-dom";

interface FrameModalProps {
  children: React.ReactNode;
  onClose?: () => void;
  align?: "bottom" | "center";
}

export function FrameModal({ children, onClose, align = "bottom" }: FrameModalProps) {
  const host = typeof document !== "undefined" ? document.getElementById("mobile-frame") : null;
  const overlay = (
    <div
      className={`absolute inset-0 z-50 flex justify-center ${align === "bottom" ? "items-end" : "items-center p-4"}`}
      style={{ background: "rgba(45,48,71,0.55)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div className="w-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
  return host ? createPortal(overlay, host) : overlay;
}
