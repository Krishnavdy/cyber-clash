import { useEffect, useState } from "react";
import { api } from "../api";
import { socket } from "../socket";

function formatTime(ms) {
  const safeMs = Math.max(0, ms || 0);
  const totalSec = Math.floor(safeMs / 1000);
  const minutes = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const seconds = String(totalSec % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = round.status === "live" && round.endsAt ? Math.max(0, round.endsAt - now) : 0;
  const displayTimer = round.status === "live" ? formatTime(remaining) : `${String(round.timerMinutes).padStart(2, "0")}:00`;

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
        <span>TIMER {displayTimer} ({round.status === "live" ? "running" : "ready"})</span>
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
