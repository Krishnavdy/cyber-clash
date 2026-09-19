import { useEffect, useRef } from "react";
import { api } from "./api";

/**
 * Enforces the Security Protocol while `active` is true:
 *  [01] Tab switch or window blur
 *  [02] Right-click, copy, cut, paste
 *  [03] View-source / DevTools shortcuts
 *  [04] Printing or exiting fullscreen
 * Every violation is reported to the server, which is the sole source of
 * truth for the count (refresh-proof) and decides reset vs. elimination.
 * onViolation(payload) receives the server's decision to update the UI.
 */
export function useAntiCheat(active, onViolation) {
  const reportingRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    const report = async (type) => {
      if (reportingRef.current) return; // debounce bursts (e.g. blur + visibilitychange together)
      reportingRef.current = true;
      try {
        const result = await api.reportViolation(type);
        onViolation && onViolation(result);
      } catch (e) {
        // ignore network hiccups; server remains authoritative
      } finally {
        setTimeout(() => (reportingRef.current = false), 800);
      }
    };

    const onBlur = () => report("Tab switch or window blur");
    const onVisibility = () => document.hidden && report("Tab switch or window blur");
    const onContextMenu = (e) => {
      e.preventDefault();
      report("Right-click");
    };
    const onCopyCutPaste = (e) => {
      e.preventDefault();
      report("Copy / cut / paste");
    };
    const onKeyDown = (e) => {
      const k = e.key?.toLowerCase();
      const blockedCombo =
        (e.ctrlKey || e.metaKey) && (k === "u" || k === "c" || k === "v" || k === "x" || k === "p") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "j" || k === "c")) ||
        k === "f12";
      if (blockedCombo) {
        e.preventDefault();
        report(k === "u" ? "View-source shortcut" : k === "p" ? "Print shortcut" : "DevTools shortcut");
      }
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) report("Exited fullscreen");
    };
    const onBeforePrint = () => report("Printing");

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopyCutPaste);
    document.addEventListener("cut", onCopyCutPaste);
    document.addEventListener("paste", onCopyCutPaste);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("beforeprint", onBeforePrint);

    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopyCutPaste);
      document.removeEventListener("cut", onCopyCutPaste);
      document.removeEventListener("paste", onCopyCutPaste);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("beforeprint", onBeforePrint);
    };
  }, [active, onViolation]);
}

export function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
}
