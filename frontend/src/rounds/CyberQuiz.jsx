import { useEffect, useState } from "react";
import { api } from "../api";

export default function CyberQuiz({ roundId, isTimeUp }) {
  const [data, setData] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const d = await api.getRoundContent(roundId);
    setData(d);
    setAnswers(d.answers || {});
  }

  useEffect(() => {
    refresh();
  }, [roundId]);

  if (!data || !data.questions) return <div className="locked-screen">Loading round…</div>;

  const timeExpired = Boolean(isTimeUp);
  const q = data.questions[current] || data.questions[0];

  async function pick(optIdx) {
    if (saving || timeExpired) return;
    setSaving(true);
    setAnswers((prev) => ({ ...prev, [current]: optIdx }));
    try {
      const res = await api.submitRound(roundId, { index: current, optionIndex: optIdx });
      if (res.answers) setAnswers(res.answers);
    } catch (e) {
      // safe fallback
    } finally {
      setSaving(false);
    }
  }

  const selectedForCurrent = answers[current];

  return (
    <div>
      {/* Question Jumper Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 20 }}>
        {data.questions.map((_, idx) => {
          const isAnswered = answers[idx] !== undefined;
          const isCurrent = idx === current;
          return (
            <button
              key={idx}
              className={`mini-btn ${isCurrent ? "btn-cyan" : ""}`}
              style={{
                width: 32,
                height: 32,
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: isCurrent ? 800 : 400,
                borderColor: isCurrent ? "var(--cyan)" : isAnswered ? "var(--green)" : "var(--border)",
                background: isCurrent ? "rgba(79, 216, 240, 0.15)" : isAnswered ? "rgba(74, 222, 154, 0.1)" : "var(--panel-2)",
                color: isCurrent ? "var(--cyan)" : isAnswered ? "var(--green)" : "var(--text-dim)",
              }}
              onClick={() => setCurrent(idx)}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono)", color: "var(--text-faint)", fontSize: 12, marginBottom: 14 }}>
        <span>QUESTION {current + 1} / {data.questions.length}</span>
        <span>{Object.keys(answers).length} / {data.questions.length} ANSWERED</span>
      </div>

      {q && (
        <div className="q-card">
          <div className="q-prompt">{q.q}</div>
          <div className="q-options">
            {q.options.map((opt, i) => {
              const isSelected = selectedForCurrent === i;
              let cls = "q-option";
              if (isSelected) cls += " correct";
              return (
                <button key={i} className={cls} onClick={() => pick(i)} disabled={timeExpired}>
                  <span className="mono" style={{ marginRight: 10, color: "var(--text-faint)" }}>
                    {["A", "B", "C", "D"][i]}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* Prev / Next Navigation Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
        <button
          className="btn"
          disabled={current === 0}
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
        >
          ← PREV
        </button>

        <button
          className="btn btn-cyan"
          disabled={current === data.questions.length - 1}
          onClick={() => setCurrent((c) => Math.min(data.questions.length - 1, c + 1))}
        >
          NEXT →
        </button>
      </div>
    </div>
  );
}

