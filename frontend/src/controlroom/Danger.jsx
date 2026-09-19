import { useState } from "react";
import { api } from "../api";

export default function Danger() {
  const [confirmText, setConfirmText] = useState("");

  async function resetEvent() {
    if (confirmText !== "RESET EVENT") return;
    await api.resetEvent();
    setConfirmText("");
    alert("Event has been fully reset. All teams, scores and violations were cleared.");
  }

  function lockConsole() {
    localStorage.removeItem("cc_admin_token");
    window.location.href = "/";
  }

  return (
    <div>
      <div className="panel panel-danger" style={{ marginBottom: 24 }}>
        <div className="protocol-title">⚠ FULL EVENT RESET</div>
        <p className="protocol-line" style={{ marginBottom: 18 }}>
          This permanently deletes every team, score, warning, violation and judging record, and
          re-locks all four rounds. There is no undo. Only do this before the event starts, or
          between rehearsals.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            placeholder='Type "RESET EVENT" to confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <button className="btn btn-danger" disabled={confirmText !== "RESET EVENT"} onClick={resetEvent}>
            ERASE EVERYTHING
          </button>
        </div>
      </div>

      <div className="panel">
        <div style={{ fontFamily: "var(--mono)", fontWeight: 700, marginBottom: 10 }}>SESSION</div>
        <p className="protocol-line" style={{ color: "var(--text-dim)" }}>
          Log out of this console. Team sessions and live scores are unaffected.
        </p>
        <button className="btn" onClick={lockConsole}>⇥ LOCK CONSOLE</button>
      </div>
    </div>
  );
}
