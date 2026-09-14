import React from "react";
import { createPortal } from "react-dom";

interface FrameModalProps {
  children: React.ReactNode;
  onClose?: () => void;
  /** "bottom" slides a sheet up from the frame's bottom edge; "center" floats a card. */
  align?: "bottom" | "center";
}

/**
 * Overlay that covers the phone frame (not the browser window). Renders into
 * #mobile-frame via a portal so `position: absolute; inset: 0` is clipped to
 * the device mock-up regardless of where the caller sits in the scroll tree.
 */
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
