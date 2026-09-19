import { useEffect, useState } from "react";
import { api } from "../api";
import { socket } from "../socket";

export default function Violations() {
  const [log, setLog] = useState([]);

  async function refresh() {
    setLog(await api.getViolations());
  }

  useEffect(() => {
    refresh();
    socket.on("violation:new", refresh);
    return () => socket.off("violation:new", refresh);
  }, []);

  return (
    <div className="cr-table-wrap">
      {log.length === 0 ? (
        <div className="cr-empty">NO VIOLATIONS LOGGED — ALL CLEAR</div>
      ) : (
        <table className="cr-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>TEAM</th>
              <th>ROUND</th>
              <th>TYPE</th>
              <th>ACTION</th>
              <th>APPEAL</th>
            </tr>
          </thead>
          <tbody>
            {log.map((v) => (
              <tr key={v.id}>
                <td>{new Date(v.timestamp).toLocaleTimeString()}</td>
                <td>{v.teamName}</td>
                <td>{v.roundId ? v.roundId.toUpperCase() : "—"}</td>
                <td>{v.type}</td>
                <td>
                  <span className={v.action === "eliminated" ? "badge status-eliminated" : "badge"}>
                    {v.action.toUpperCase()}
                  </span>
                </td>
                <td>
                  <button
                    className="mini-btn"
                    onClick={() =>
                      window.confirm(`Clear all warnings/violations for ${v.teamName} and reinstate if eliminated?`) &&
                      api.clearViolations(v.teamId).then(refresh)
                    }
                  >
                    CLEAR &amp; REINSTATE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
