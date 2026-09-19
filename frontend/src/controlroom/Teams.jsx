import { useEffect, useState } from "react";
import { api } from "../api";
import { socket } from "../socket";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [name, setName] = useState("");
  const [lastPasscode, setLastPasscode] = useState(null);

  async function refresh() {
    setTeams(await api.getTeams());
  }

  useEffect(() => {
    refresh();
    socket.on("state:update", refresh);
    return () => socket.off("state:update", refresh);
  }, []);

  async function addTeam(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const { passcode, team } = await api.addTeam(name.trim());
    setLastPasscode({ name: team.name, passcode });
    setName("");
    refresh();
  }

  return (
    <div>
      <div className="cr-row">
        <form onSubmit={addTeam} style={{ display: "flex", gap: 12, flex: 1 }}>
          <input className="input" placeholder="new team name…" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-cyan">＋ ADD TEAM</button>
        </form>
        <a className="btn" href={api.exportCsvUrl()} target="_blank" rel="noreferrer">⬇ EXPORT CSV</a>
      </div>

      {lastPasscode && (
        <div className="panel" style={{ marginBottom: 20, borderColor: "var(--green)" }}>
          <span className="mono">
            Passcode for <b>{lastPasscode.name}</b>: <span style={{ color: "var(--green)", fontSize: 16 }}>{lastPasscode.passcode}</span>
          </span>{" "}
          — share this with the team, it won't be shown again here.
        </div>
      )}

      <div className="cr-table-wrap">
        {teams.length === 0 ? (
          <div className="cr-empty">NO TEAMS REGISTERED YET</div>
        ) : (
          <table className="cr-table">
            <thead>
              <tr>
                <th>TEAM</th><th>R1</th><th>R2</th><th>R3</th><th>R4</th><th>BONUS</th><th>TOTAL</th><th>WARN</th><th>VIOL</th><th>STATUS</th><th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <TeamRow key={t.id} team={t} onChange={refresh} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TeamRow({ team, onChange }) {
  const [bonus, setBonus] = useState(team.scores.bonus);

  return (
    <tr>
      <td>{team.name}</td>
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
