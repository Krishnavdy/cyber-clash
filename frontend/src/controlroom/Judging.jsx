import { useEffect, useState } from "react";
import { api } from "../api";
import { socket } from "../socket";

const SNIPPET_LABELS = { s1: "Snippet 1 (PHP)", s2: "Snippet 2 (JavaScript)", s3: "Snippet 3 (Python)" };

export default function Judging() {
  const [subs, setSubs] = useState([]);

  async function refresh() {
    setSubs(await api.getJudging("r3"));
  }

  useEffect(() => {
    refresh();
    socket.on("judging:new", refresh);
    socket.on("state:update", refresh);
    return () => {
      socket.off("judging:new", refresh);
      socket.off("state:update", refresh);
    };
  }, []);

  if (subs.length === 0) {
    return <div className="cr-empty">NO BUG HUNT SUBMISSIONS YET — waiting on teams</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-faint)", marginBottom: 20, letterSpacing: "0.05em" }}>
        ROUND 3 · BUG HUNT — score each snippet 0–8 pts. Total updates the team's R3 score live.
      </div>
      {subs.map((sub) => (
        <div className="panel" key={sub.teamId} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--mono)", fontWeight: 700, marginBottom: 14, fontSize: 16 }}>{sub.teamName}</div>
          {Object.entries(sub.submitted).map(([snippetId, s]) => (
            <div key={snippetId} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border-soft)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-dim)", marginBottom: 6 }}>
                {SNIPPET_LABELS[snippetId] || snippetId} —{" "}
                <span style={{ color: s.correct ? "var(--green)" : "var(--red)" }}>
                  {s.correct ? "correct classification" : "incorrect classification"}
                </span>
              </div>
              {s.explanation && (
                <div className="code-block" style={{ marginBottom: 10 }}>{s.explanation}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="field-label" style={{ margin: 0 }}>SCORE (0-8)</span>
                <input
                  className="mini-input"
                  defaultValue={sub.scores[snippetId] ?? ""}
                  onBlur={(e) => api.scoreJudging("r3", sub.teamId, snippetId, Number(e.target.value) || 0).then(refresh)}
                />
              </div>
            </div>
          ))}
          <div style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
            TOTAL: <span style={{ color: "var(--green)", fontWeight: 700 }}>
              {Object.values(sub.scores).reduce((s, v) => s + v, 0)}
            </span> / 24
          </div>
        </div>
      ))}
    </div>
  );
}
