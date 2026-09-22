import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { socket } from "../socket";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();

  // Wrapped in useCallback so the same reference is used for socket on/off
  const refresh = useCallback(async () => {
    try {
      const data = await api.getTeams();
      setTeams(data);
      setAuthError(false); // clear any previous auth error on success
    } catch (err) {
      // If the token is gone / expired, the API returns 401 and throws.
      // Do NOT call setTeams([]) here — keep showing the last known list
      // so teams don't vanish. Instead surface a visible error banner.
      const isAuthErr =
        err.message === "unauthorized" ||
        !localStorage.getItem("cc_admin_token");
      if (isAuthErr) {
        setAuthError(true);
      } else {
        console.error("Teams refresh failed:", err);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    socket.on("state:update", refresh);
    return () => socket.off("state:update", refresh);
  }, [refresh]);

  async function addTeam(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addTeam(name.trim());
      setName("");
      refresh();
    } catch (err) {
      if (!localStorage.getItem("cc_admin_token")) setAuthError(true);
      else alert("Failed to add team: " + err.message);
    }
  }

  return (
    <div>
      {/* Session-expired banner — shown whenever the admin token is missing/invalid */}
      {authError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.5)",
          borderRadius: 8, padding: "12px 20px", marginBottom: 16, color: "#ff6b6b",
          fontWeight: 700, fontSize: 14, letterSpacing: "0.05em"
        }}>
          <span>⚠ SESSION EXPIRED — your admin token is missing or invalid. Teams data is safe in the database.</span>
          <button
            className="btn"
            style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
            onClick={() => navigate("/admin-login")}
          >
            RE-LOGIN
          </button>
        </div>
      )}

      <div className="cr-row">
        <form onSubmit={addTeam} style={{ display: "flex", gap: 12, flex: 1 }}>
          <input className="input" placeholder="new team name…" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-cyan">＋ ADD TEAM</button>
        </form>
        <a className="btn" href={api.exportCsvUrl()} target="_blank" rel="noreferrer">⬇ EXPORT CSV</a>
      </div>

      <div className="cr-table-wrap">
        {/* Only show "no teams" if there's genuinely no data AND we're not in an auth-error state */}
        {teams.length === 0 && !authError ? (
          <div className="cr-empty">NO TEAMS REGISTERED YET</div>
        ) : teams.length > 0 ? (
          <table className="cr-table">
            <thead>
              <tr>
                <th>TEAM</th><th>TEAM CODE</th><th>R1</th><th>R2</th><th>R3</th><th>R4</th><th>BONUS</th><th>TOTAL</th><th>WARN</th><th>VIOL</th><th>STATUS</th><th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <TeamRow key={t.id} team={t} onChange={refresh} />
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

function TeamRow({ team, onChange }) {
  const [bonus, setBonus] = useState(team.scores.bonus);

  return (
    <tr>
      <td>{team.name}</td>
      <td className="mono" style={{ color: "var(--cyan)", fontWeight: 700 }}>{team.passcode}</td>
      <td>{team.scores.r1}</td>
      <td>{team.scores.r2}</td>
      <td>{team.scores.r3}</td>
      <td>{team.scores.r4}</td>
      <td>
        <input
          className="mini-input"
          value={bonus}
          onChange={(e) => setBonus(e.target.value)}
          onBlur={() => api.setBonus(team.id, Number(bonus) || 0).then(onChange)}
        />
      </td>
      <td style={{ color: "var(--green)", fontWeight: 700 }}>{team.total}</td>
      <td>{team.warnings}</td>
      <td>{team.violations}</td>
      <td><span className={`badge status-${team.status}`}>{team.status.toUpperCase()}</span></td>
      <td>
        <button className="mini-btn" onClick={() => api.resetTeam(team.id).then(onChange)}>RESET</button>
        {team.status === "eliminated" ? (
          <button className="mini-btn" onClick={() => api.reinstateTeam(team.id).then(onChange)}>REINSTATE</button>
        ) : (
          <button className="mini-btn danger" onClick={() => api.eliminateTeam(team.id).then(onChange)}>ELIMINATE</button>
        )}
        <button className="mini-btn danger" onClick={() => window.confirm(`Delete ${team.name}?`) && api.deleteTeam(team.id).then(onChange)}>DELETE</button>
      </td>
    </tr>
  );
}
