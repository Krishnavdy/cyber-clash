import React, { useEffect, useState } from "react";
import { useAntiCheat, enterFullscreen } from "../useAntiCheat";

function formatTime(ms) {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function RoundShell({ round, children, onEliminated }) {
  const [now, setNow] = useState(Date.now());
  const [banner, setBanner] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFS);
    return () => document.removeEventListener("fullscreenchange", handleFS);
  }, []);

  useAntiCheat(round?.status === "live", (result) => {
    setBanner(result.message);
    if (result.action === "eliminated" && onEliminated) onEliminated();
  });

  const endsAt = round?.endsAt || 0;
  const remaining = endsAt - now;
  const totalMs = (round?.timerMinutes || 1) * 60 * 1000;
  const pct = Math.max(0, Math.min(100, (remaining / totalMs) * 100));

  const isTimeUp = round?.status === "closed" || (endsAt > 0 && remaining <= 0);

  function startFullscreen() {
    enterFullscreen();
    setIsFullscreen(true);
  }

  return (
    <div className="arena-shell">
      {!isFullscreen && (
        <div className="warn-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🛡 SECURITY PROTOCOL: Fullscreen required during live rounds.</span>
          <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={startFullscreen}>
            ⛶ ENTER FULLSCREEN
          </button>
        </div>
      )}
      {banner && (
        <div className="warn-banner">
          ⚠ SECURITY PROTOCOL — {banner}
          <button className="mini-btn" style={{ float: "right" }} onClick={() => setBanner(null)}>DISMISS</button>
        </div>
      )}
      {isTimeUp && (
        <div className="warn-banner" style={{ borderColor: "var(--red)", color: "var(--red)", background: "rgba(240,85,111,0.1)", textAlign: "center", fontWeight: 700 }}>
          🔒 TIME COMPLETED — ROUND IS LOCKED. NO FURTHER ANSWERS ALLOWED.
        </div>
      )}
      <div className={`arena-timer ${remaining < 60000 ? "low" : ""}`}>{formatTime(remaining)}</div>
      <div className="arena-progress-bar">
        <div className="arena-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? React.cloneElement(child, { isTimeUp }) : child
      )}
    </div>
  );
}


