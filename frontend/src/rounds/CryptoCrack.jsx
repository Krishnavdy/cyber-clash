import { useEffect, useState } from "react";
import { api } from "../api";

export default function CryptoCrack({ roundId, isTimeUp }) {
  const [data, setData] = useState(null);
  const [activeStage, setActiveStage] = useState(0);
  const [guess, setGuess] = useState("");
  const [wrong, setWrong] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const d = await api.getRoundContent(roundId);
    setData(d);
    if (d && d.stage !== undefined && d.ciphers === undefined) {
      setActiveStage(d.stage);
    }
  }

  useEffect(() => {
    refresh();
  }, [roundId]);

  if (!data) return <div className="locked-screen">Loading round…</div>;

  const timeExpired = Boolean(isTimeUp);

  const ciphersList = data.ciphers || Array.from({ length: data.total || 5 }).map((_, i) => ({
    index: i,
    type: `Stage ${i + 1}`,
    prompt: data.current && (data.stage === i || data.stage === undefined) ? data.current.prompt : "Cipher stage locked or active",
  }));

  const currentCipher = data.ciphers ? data.ciphers[activeStage] : (data.current || ciphersList[activeStage]);
  const isSolved = (data.solved || []).includes(activeStage);

  async function onSubmit(e) {
    e.preventDefault();
    if (!guess.trim() || submitting || isSolved || timeExpired) return;
    setSubmitting(true);
    try {
      const res = await api.submitRound(roundId, { index: activeStage, guess });
      if (res.correct) {
        setGuess("");
        setWrong(false);
        await refresh();
      } else {
        setWrong(true);
        setTimeout(() => setWrong(false), 900);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Stage Jumper Tabs */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
        {ciphersList.map((c, idx) => {
          const solved = (data.solved || []).includes(idx);
          const isActive = idx === activeStage;
          return (
            <button
              key={idx}
              className={`mini-btn ${isActive ? "btn-cyan" : ""}`}
              style={{
                padding: "6px 14px",
                borderColor: isActive ? "var(--cyan)" : solved ? "var(--green)" : "var(--border)",
                background: isActive ? "rgba(79, 216, 240, 0.15)" : solved ? "rgba(74, 222, 154, 0.1)" : "var(--panel-2)",
                color: isActive ? "var(--cyan)" : solved ? "var(--green)" : "var(--text-dim)",
              }}
              onClick={() => {
                setActiveStage(idx);
                setGuess("");
                setWrong(false);
              }}
            >
              STAGE {idx + 1} {solved ? "🔓" : ""}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--mono)", color: "var(--text-faint)", fontSize: 12, marginBottom: 14 }}>
        <span>STAGE {activeStage + 1} / {data.total || 5} — {currentCipher?.type}</span>
        <span>{(data.solved || []).length} / {data.total || 5} SOLVED</span>
      </div>

      {currentCipher && (
        <div className="q-card">
          <div className="q-prompt mono" style={{ fontSize: 16, marginBottom: 20 }}>
            {currentCipher.prompt}
          </div>

          {isSolved ? (
            <div style={{ fontFamily: "var(--mono)", color: "var(--green)", fontSize: 14, background: "rgba(74, 222, 154, 0.08)", padding: 14, borderRadius: 8, border: "1px solid rgba(74, 222, 154, 0.3)" }}>
              🔓 STAGE {activeStage + 1} SOLVED! Correct plaintext accepted.
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <input
                className="input"
                style={{ marginBottom: 14, borderColor: wrong ? "var(--red)" : undefined }}
                placeholder="Enter decoded plaintext…"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                disabled={timeExpired}
                autoFocus
              />
              <button className="btn btn-primary" style={{ width: "100%" }} disabled={submitting || timeExpired}>
                {submitting ? "VERIFYING…" : timeExpired ? "TIME COMPLETED" : "SUBMIT DECRYPTION"}
              </button>
            </form>
          )}

          {wrong && (
            <div style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 13, marginTop: 12 }}>
              Incorrect decrypted text — try again.
            </div>
          )}
        </div>
      )}

      {/* Prev / Next Navigation Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
        <button
          className="btn"
          disabled={activeStage === 0}
          onClick={() => {
            setActiveStage((s) => Math.max(0, s - 1));
            setGuess("");
            setWrong(false);
          }}
        >
          ← PREV STAGE
        </button>

        <button
          className="btn btn-cyan"
          disabled={activeStage === (data.total || 5) - 1}
          onClick={() => {
            setActiveStage((s) => Math.min((data.total || 5) - 1, s + 1));
            setGuess("");
            setWrong(false);
          }}
        >
          NEXT STAGE →
        </button>
      </div>
    </div>
  );
}


