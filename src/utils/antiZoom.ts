/**
 * Rigorous multi-layer Anti-Zoom enforcer:
 * 1. iOS Safari Pinch Gestures (gesturestart, gesturechange, gestureend)
 * 2. Mobile Multi-Touch Pinch (touchstart and touchmove with e.touches.length > 1)
 * 3. Mobile Double-Tap to Zoom (touchend interval check, preserving input focuses)
 * 4. Desktop Trackpad Pinch Zoom & Mouse Wheel Zoom (Ctrl + Wheel)
 * 5. Desktop Keyboard Zoom Shortcuts (Ctrl/Cmd + '+', '-', '0', '=')
 */
export function setupAntiZoom(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // 1. Prevent iOS Safari non-standard pinch gestures
  const preventGesture = (e: Event) => {
    if (e.cancelable) {
      e.preventDefault();
    }
  };
  document.addEventListener("gesturestart", preventGesture, { passive: false, capture: true });
  document.addEventListener("gesturechange", preventGesture, { passive: false, capture: true });
  document.addEventListener("gestureend", preventGesture, { passive: false, capture: true });

  // 2. Prevent multi-finger pinch zoom on touch screens (iOS & Android)
  const preventTouchPinch = (e: TouchEvent) => {
    if (e.touches && e.touches.length > 1) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };
  document.addEventListener("touchstart", preventTouchPinch, { passive: false, capture: true });
  document.addEventListener("touchmove", preventTouchPinch, { passive: false, capture: true });

  // 3. Prevent rapid double-tap zoom on non-form elements
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e: TouchEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (!isInput && now - lastTouchEnd <= 300) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    },
    { passive: false, capture: true }
  );

  // 4. Prevent desktop mouse wheel with Ctrl and trackpad pinch zoom
  const preventWheelZoom = (e: WheelEvent) => {
    if (e.ctrlKey) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };
  window.addEventListener("wheel", preventWheelZoom, { passive: false, capture: true });
  document.addEventListener("wheel", preventWheelZoom, { passive: false, capture: true });

  // 5. Prevent keyboard zoom shortcuts (Ctrl/Cmd + '+', '-', '0', '=')
  const preventKeyboardZoom = (e: KeyboardEvent) => {
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
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };
  window.addEventListener("keydown", preventKeyboardZoom, { passive: false, capture: true });
  document.addEventListener("keydown", preventKeyboardZoom, { passive: false, capture: true });
}

