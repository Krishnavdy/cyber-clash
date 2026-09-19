import { Link, Navigate } from "react-router-dom";
import { useLiveState } from "../useLiveState";

export default function Arena() {
  const state = useLiveState();
  const teamToken = localStorage.getItem("cc_team_token");
  if (!teamToken) return <Navigate to="/team-login" replace />;

  const teamName = localStorage.getItem("cc_team_name");
  const rounds = state?.rounds || [];
  const myTeam = state?.teams?.find((t) => t.name === teamName);

  if (myTeam?.status === "eliminated") {
    return (
      <div className="arena-shell">
        <div className="panel panel-danger" style={{ textAlign: "center" }}>
          <div className="protocol-title" style={{ justifyContent: "center" }}>⚠ TEAM ELIMINATED</div>
          <p className="protocol-line" style={{ justifyContent: "center" }}>
            Your team reached 4 security violations and has been terminated from the competition.
            Appeal at the control desk if you believe this is in error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="main">
      <div className="section" style={{ paddingTop: 50 }}>
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">{teamName?.toUpperCase()}</div>
            <div className="section-title">YOUR ARENA</div>
            <div className="section-rule" />
          </div>

          {myTeam && (
            <div className="stat-grid" style={{ marginBottom: 50 }}>
              <div className="stat-card">
                <div className="stat-card-label">TOTAL SCORE</div>
                <div className="stat-card-value c-cyan">{myTeam.total}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">WARNINGS</div>
                <div className="stat-card-value c-orange">{myTeam.warnings}/3</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">VIOLATIONS</div>
                <div className="stat-card-value c-red">{myTeam.violations}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">STATUS</div>
                <div className="stat-card-value c-green" style={{ fontSize: 20 }}>{myTeam.status.toUpperCase()}</div>
              </div>
            </div>
          )}

          <div className="round-grid">
            {rounds.map((r) => (
              <Link
                to={r.status === "live" ? `/arena/${r.id}` : "#"}
                key={r.id}
                className={`round-card ${r.status === "live" ? "live" : "locked"}`}
                onClick={(e) => r.status !== "live" && e.preventDefault()}
              >
                <div className="round-thumb" />
                <div className="round-body">
                  <div className="round-eyebrow"><span>ROUND {r.order}</span></div>
                  <div className={`round-name c-${r.color}`}>{r.name}</div>
                  <div className="round-desc">Score so far: {myTeam?.scores?.[r.id] ?? 0} / {r.maxPoints} pts</div>
                  <div className="round-foot">
                    <div className="round-pts">MAX <b>{r.maxPoints}</b> PTS</div>
                    <div className="round-status">
                      {r.status === "live" ? <span className="c-green">ENTER ROUND →</span> : r.status === "closed" ? "CLOSED" : "AWAITING CONTROL ROOM"}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
