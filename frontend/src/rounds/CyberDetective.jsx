import { useEffect, useState } from "react";
import { api } from "../api";

export default function CyberDetective({ roundId, isTimeUp }) {
  const [data, setData] = useState(null);
  const [flags, setFlags] = useState({});
  const [wrongStation, setWrongStation] = useState(null);

  async function refresh() {
    const d = await api.getRoundContent(roundId);
    setData(d);
  }

  useEffect(() => {
    refresh();
  }, [roundId]);

  if (!data) return <div className="locked-screen">Loading round…</div>;

  const timeExpired = Boolean(isTimeUp);

  async function submit(stationId) {
    if (timeExpired) return;
    const res = await api.submitRound(roundId, { stationId, flag: flags[stationId] || "" });
    if (res.correct) {
      refresh();
    } else {
      setWrongStation(stationId);
      setTimeout(() => setWrongStation(null), 900);
    }
  }

  return (
    <div>
      <div style={{ textAlign: "center", fontFamily: "var(--mono)", color: "var(--text-faint)", fontSize: 12, marginBottom: 20, letterSpacing: "0.05em" }}>
        {data.captured.length} / {data.stations.length} FLAGS CAPTURED — ANALYZE MATERIAL & SUBMIT FLAGS
      </div>
      <div className="station-grid">
        {data.stations.map((s) => {
          const captured = data.captured.includes(s.id);
          return (
            <div className={`station-card ${captured ? "captured" : ""}`} key={s.id} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--cyan)", border: "1px solid rgba(79,216,240,0.3)", padding: "2px 8px", borderRadius: 4 }}>
                  {s.points} PTS
                </div>
              </div>

              {s.briefing && (
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.4 }}>
                  {s.briefing}
                </div>
              )}

              {s.material && (
                <div className="code-block" style={{ fontSize: 12, padding: 12, maxHeight: 150, overflowY: "auto", marginBottom: 14 }}>
                  {s.material}
                </div>
              )}

              <div style={{ marginTop: "auto" }}>
                {captured ? (
                  <div style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 13, textAlign: "center", background: "rgba(74, 222, 154, 0.08)", padding: 10, borderRadius: 6, border: "1px solid rgba(74,222,154,0.3)" }}>
                    ✓ FLAG CAPTURED
                  </div>
                ) : (
                  <>
                    <input
                      className="input"
                      style={{ marginBottom: 10, borderColor: wrongStation === s.id ? "var(--red)" : undefined, fontFamily: "var(--mono)", fontSize: 13 }}
                      placeholder="flag{...}"
                      value={flags[s.id] || ""}
                      onChange={(e) => setFlags((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      disabled={timeExpired}
                    />
                    <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => submit(s.id)} disabled={timeExpired}>
                      {timeExpired ? "TIME COMPLETED" : "SUBMIT FLAG"}
                    </button>
                    {wrongStation === s.id && (
                      <div style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 12, marginTop: 6, textAlign: "center" }}>
                        Incorrect flag string. Try again.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

