import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const setupDevtoolsDeterrents = () => {
  if (typeof window === "undefined") return;

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const overlayId = "devtools-guard-overlay";

  const blockContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  document.addEventListener("contextmenu", blockContextMenu, { capture: true });
  window.addEventListener("contextmenu", blockContextMenu, { capture: true });

  const ensureOverlay = () => {
    let overlay = document.getElementById(overlayId) as HTMLDivElement | null;
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "2147483647";
    overlay.style.background = "rgba(8, 10, 14, 0.98)";
    overlay.style.color = "#f5f7fb";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.textAlign = "center";
    overlay.style.padding = "2rem";
    overlay.style.fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif";
    overlay.innerHTML =
      "<div style=\"max-width: 520px;\">DevTools is disabled for this site.</div>";

    if (document.body) {
      document.body.appendChild(overlay);
    } else {
      window.addEventListener(
        "DOMContentLoaded",
        () => document.body?.appendChild(overlay!),
        { once: true }
      );
    }

    return overlay;
  };

  const hideOverlay = () => {
    const overlay = document.getElementById(overlayId);
    overlay?.remove();
  };

  const devtoolsLikelyOpen = () => {
    const widthGap = Math.abs(window.outerWidth - window.innerWidth);
    const heightGap = Math.abs(window.outerHeight - window.innerHeight);

    // Normal browser chrome height can be large; use a higher threshold to avoid false positives.
    const gapThreshold = 260;
    return widthGap > gapThreshold || heightGap > gapThreshold;
  };

  let openHits = 0;
  let closedHits = 0;

  window.setInterval(() => {
    if (devtoolsLikelyOpen()) {
      openHits += 1;
      closedHits = 0;
    } else {
      closedHits += 1;
      openHits = 0;
    }

    if (openHits >= 3) {
      ensureOverlay();
    } else if (closedHits >= 3) {
      hideOverlay();
    }
  }, 700);

  const blockDevtoolsKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      if (event.key === "F12") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (ctrlOrCmd && key === "u") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (ctrlOrCmd && isShift && ["i", "j", "c", "k", "e", "s", "m"].includes(key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (isMac && ctrlOrCmd && isAlt && ["i", "j", "c"].includes(key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
  };

  document.addEventListener("keydown", blockDevtoolsKeys, { capture: true });
  window.addEventListener("keydown", blockDevtoolsKeys, { capture: true });
  document.addEventListener("keyup", blockDevtoolsKeys, { capture: true });
  window.addEventListener("keyup", blockDevtoolsKeys, { capture: true });
};

setupDevtoolsDeterrents();

createRoot(document.getElementById("root")!).render(<App />);
