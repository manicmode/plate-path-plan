const SCAN_OVERLAY_REV = "2025-08-31T15:50Z-r1";

interface ScanOverlayProps {
  show: boolean;
  className?: string;
}

export function ScanOverlay({ show, className = "" }: ScanOverlayProps) {
  return (
    <div
      aria-hidden="true"
      data-camera-overlay
      className={[
        "fixed inset-0 pointer-events-none transition-opacity duration-180 ease-out",
        "bg-black/0",                 // completely transparent overlay
        "will-change-opacity",        
        "translate-z-0",              // force its own layer
        show ? "opacity-100" : "opacity-0",
        "z-[110]",                    // above camera, below dialogs
        className
      ].filter(Boolean).join(" ")}
    />
  );
}