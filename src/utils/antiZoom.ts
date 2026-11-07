/**
 * Targeted Anti-Zoom enforcer that preserves 100% fluid native scrolling:
 * 1. Blocks iOS Safari pinch gestures (gesturestart, gesturechange, gestureend)
 * 2. Blocks multi-touch pinch zoom on mobile screens (touchmove when e.touches.length > 1)
 * 3. Blocks desktop Ctrl + Wheel / Trackpad pinch zoom (wheel when e.ctrlKey)
 * 4. Blocks desktop keyboard zoom shortcuts (Ctrl/Cmd + '+', '-', '0', '=')
 *
 * NOTE: Single-finger touch scrolling, mouse wheel scrolling, and drag scrolling are completely untouched.
 */
export function setupAntiZoom(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // 1. Prevent iOS Safari non-standard pinch gestures
  const preventGesture = (e: Event) => {
    if (e.cancelable) e.preventDefault();
  };
  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });

  // 2. Prevent multi-finger pinch zoom on mobile touch screens (ONLY when 2+ fingers are down)
  document.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        if (e.cancelable) e.preventDefault();
      }
    },
    { passive: false }
  );

  // 3. Prevent desktop Ctrl + Mouse Wheel & Trackpad pinch zoom
  // Notice: ONLY intercepts when Ctrl is actively held (zoom), allowing smooth normal scrolling!
  window.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      if (e.ctrlKey) {
        if (e.cancelable) e.preventDefault();
      }
    },
    { passive: false }
  );

  // 4. Prevent keyboard zoom shortcuts (Ctrl/Cmd + '+', '-', '0', '=')
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const k = e.key;
      if (
        k === "+" ||
        k === "-" ||
        k === "=" ||
        k === "_" ||
        k === "0" ||
        e.keyCode === 187 ||
        e.keyCode === 189 ||
        e.keyCode === 107 ||
        e.keyCode === 109 ||
        e.keyCode === 96 ||
        e.keyCode === 48
      ) {
        if (e.cancelable) e.preventDefault();
      }
    }
  });
}
