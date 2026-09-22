import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function BugHunt({ roundId, isTimeUp }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [picked, setPicked] = useState({});
  const [completing, setCompleting] = useState(false);

  async function refresh() {
    const d = await api.getRoundContent(roundId);
    setData(d);
  }

  useEffect(() => {
    refresh();
  }, [roundId]);

  if (!data) return <div className="locked-screen">Loading round…</div>;

  const timeExpired = Boolean(isTimeUp);

  async function submit(snippetId) {
    if (picked[snippetId] === undefined || timeExpired) return;
    await api.submitRound(roundId, {
      snippetId,
      optionIndex: picked[snippetId],
      explanation: explanations[snippetId] || "",
    });
    refresh();
  }

  // Smart Dashboard: lock this round in DB then go to next live round (or arena)
  async function handleDashboard() {
    if (completing) return;
    setCompleting(true);
    try {
      const res = await api.completeRound(roundId);
      if (res.nextRoundId) {
        navigate(`/arena/${res.nextRoundId}`);
      } else {
        navigate("/arena");
      }
    } catch {
      navigate("/arena");
    }
  }

  return (
    <div>
      <div style={{ textAlign: "center", fontFamily: "var(--mono)", color: "var(--text-faint)", fontSize: 12, marginBottom: 14, letterSpacing: "0.05em" }}>
        THREE VULNERABLE SNIPPETS — IDENTIFY, EXPLAIN, SUBMIT
      </div>
      {data.snippets.map((s) => {
        const done = data.submitted[s.id];
        return (
          <div className="q-card" key={s.id}>
            <div className="q-prompt" style={{ fontSize: 15 }}>
              <span className="mono" style={{ color: "var(--orange)" }}>{s.lang}</span>
            </div>
            <div className="code-block">{s.code}</div>
            {done ? (
              <div style={{ fontFamily: "var(--mono)", color: "var(--green)", fontSize: 13.5 }}>
                ✓ Submitted — judged live by the Control Room.
              </div>
            ) : (
              <>
                <div className="q-options" style={{ marginBottom: 14 }}>
                  {s.options.map((opt, i) => (
                    <button
                      key={i}
                      className={`q-option ${picked[s.id] === i ? "correct" : ""}`}
                      onClick={() => setPicked((prev) => ({ ...prev, [s.id]: i }))}
                      disabled={timeExpired}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Explain the risk and how you'd fix it (judged live)…"
                  style={{ marginBottom: 12 }}
                  onChange={(e) => setExplanations((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  disabled={timeExpired}
                />
                <button
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => submit(s.id)}
                  disabled={picked[s.id] === undefined || timeExpired}
                >
                  {timeExpired ? "TIME COMPLETED" : "SUBMIT FINDING"}
                </button>
              </>
            )}
          </div>
        );
      })}
      <button className="btn btn-cyan" style={{ width: "100%" }} onClick={handleDashboard} disabled={completing}>
        {completing ? "SAVING..." : "DASHBOARD \u2192"}
      </button>
    </div>
  );
}

