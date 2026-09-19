import { useEffect, useState } from "react";
import { api } from "../api";
import { socket } from "../socket";

export default function Overview() {
  const [ov, setOv] = useState(null);

  async function refresh() {
    try {
      setOv(await api.getOverview());
    } catch {}
  }

  useEffect(() => {
    refresh();
    socket.on("state:update", refresh);
    socket.on("violation:new", refresh);
    socket.on("judging:new", refresh);
    return () => {
      socket.off("state:update", refresh);
      socket.off("violation:new", refresh);
      socket.off("judging:new", refresh);
    };
  }, []);

  if (!ov) return <div className="cr-empty">Loading…</div>;

  return (
    <div>
      {/* Real-time Winning Team / Leader Card Section */}
      <div
        className="panel"
        style={{
          marginBottom: 24,
          borderColor: "var(--green)",
          background: "linear-gradient(135deg, rgba(74, 222, 154, 0.08), rgba(79, 216, 240, 0.04))",
          boxShadow: "0 0 20px rgba(74, 222, 154, 0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="field-label" style={{ color: "var(--green)", fontWeight: 700, letterSpacing: "0.08em" }}>
              🏆 CURRENT LEADER (REAL-TIME STANDINGS)
            </div>
            {ov.leader ? (
              <div>
                <div className="mono" style={{ fontSize: 26, fontWeight: 800, color: "var(--text)" }}>
                  {ov.leader.name}
                  <span className="c-green" style={{ marginLeft: 16 }}>
                    {ov.leader.total} PTS
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>
                  Violations: <span style={{ color: ov.leader.violations > 0 ? "var(--orange)" : "var(--green)" }}>{ov.leader.violations}</span> ·
                  Warnings: <span>{ov.leader.warnings}</span> · Status: <span className="c-green">ACTIVE</span>
                </div>
              </div>
            ) : (
              <div className="mono" style={{ fontSize: 18, color: "var(--text-faint)" }}>
                No active teams registered yet.
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="badge status-active" style={{ fontSize: 12, padding: "6px 14px" }}>
              LIVE TRACKING
            </span>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-label">ONLINE TEAMS</div>
          <div className="stat-card-value c-green">{ov.onlineTeams}/{ov.totalTeams}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">CURRENT ROUND</div>
          <div className="stat-card-value c-cyan" style={{ fontSize: 20 }}>{ov.currentRound}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">ELAPSED</div>
          <div className="stat-card-value">{ov.round?.startedAt ? "LIVE" : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">SUBMISSIONS IN</div>
          <div className="stat-card-value c-purple">{ov.submissionsIn || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">FLAGS CAPTURED</div>
          <div className="stat-card-value c-green">{ov.flagsCaptured}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">VIOLATIONS TODAY</div>
          <div className="stat-card-value c-red">{ov.violationsToday}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">WARNINGS TOTAL</div>
          <div className="stat-card-value c-orange">{ov.warningsTotal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">ELIMINATED</div>
          <div className="stat-card-value c-red">{ov.eliminated}</div>
        </div>
      </div>
    </div>
  );
}
