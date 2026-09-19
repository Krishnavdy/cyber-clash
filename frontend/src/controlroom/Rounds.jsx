import { useEffect, useState } from "react";
import { api } from "../api";
import { socket } from "../socket";

export default function Rounds() {
  const [rounds, setRounds] = useState([]);

  async function refresh() {
    const state = await api.getState();
    setRounds(state.rounds);
  }

  useEffect(() => {
    refresh();
    socket.on("state:update", (s) => setRounds(s.rounds));
    return () => socket.off("state:update", refresh);
  }, []);

  return (
    <div className="round-admin-grid">
      {rounds.map((r) => (
        <RoundCard key={r.id} round={r} onChange={refresh} />
      ))}
    </div>
  );
}

function RoundCard({ round, onChange }) {
  const [minutes, setMinutes] = useState(round.timerMinutes);
  const [autoStop, setAutoStop] = useState(round.autoStop);

  const chip =
    round.status === "live" ? { label: "LIVE", cls: "live" } :
    round.status === "closed" ? { label: "CLOSED", cls: "closed" } :
    { label: "LOCKED", cls: "locked" };

  return (
    <div className="round-admin-card">
      <div className="ra-head">
        <div>
          <div className="ra-order">ROUND {round.order}</div>
          <div className={`ra-name c-${round.color}`}>{round.name}</div>
        </div>
        <span className={`chip ${chip.cls}`}>{chip.label}</span>
      </div>

      <div className="ra-meta">
        <span>TIMER {round.timerMinutes}:00 ({round.status === "live" ? "running" : "ready"})</span>
        <span>MAX {round.maxPoints} PTS</span>
      </div>

      <div className="ra-actions">
        <button className="btn btn-primary" disabled={round.status === "live"} onClick={() => api.startRound(round.id).then(onChange)}>
          ▷ START
        </button>
        <button className="btn" disabled={round.status !== "live"} onClick={() => api.lockRound(round.id).then(onChange)}>
          ⏸ LOCK
        </button>
        <button className="btn btn-danger" onClick={() => window.confirm(`Reset ${round.name} for ALL teams? This clears scores for this round.`) && api.resetRoundForAll(round.id).then(onChange)}>
          ↺ RESET FOR ALL
        </button>
      </div>

      <div className="ra-config">
        <span>⏱ MIN</span>
        <input
          className="mini-input"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          onBlur={() => api.updateRound(round.id, { timerMinutes: Number(minutes) || 1 }).then(onChange)}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={autoStop}
            onChange={(e) => {
              setAutoStop(e.target.checked);
              api.updateRound(round.id, { autoStop: e.target.checked }).then(onChange);
            }}
          />
          AUTO-STOP AT ZERO
        </label>
      </div>
    </div>
  );
}
