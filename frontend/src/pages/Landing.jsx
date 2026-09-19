import { Link } from "react-router-dom";
import { useLiveState } from "../useLiveState";

const TICKER_ITEMS = [
  { tag: "info", text: "DNS tunneling attempt flagged" },
  { tag: "info", text: "Zero-day watchlist updated · 3 new CVEs" },
  { tag: "threat", text: "Credential-stuffing wave mitigated at edge" },
  { tag: "info", text: "SOC shift handover complete — all clear" },
];

const RUN_OF_SHOW = [
  { time: "T-30 MIN", title: "CHECK-IN", desc: "Reporting, team numbering, seating" },
  { time: "0:05", title: "ROUND 1 :: CYBER QUIZ", desc: "15 min — 20 rapid-fire questions" },
  { time: "0:25", title: "ROUND 2 :: CRYPTO CRACK", desc: "25 min — five progressive ciphers" },
  { time: "0:55", title: "ROUND 3 :: BUG HUNT", desc: "30 min — judged vulnerability triage" },
  { time: "1:30", title: "ROUND 4 :: CYBER DETECTIVE", desc: "35 min — four forensic CTF stations" },
  { time: "2:05", title: "RESULTS", desc: "Score compilation — leaderboard reveal" },
];

function statusFor(round) {
  if (round.status === "live") return { label: "LIVE NOW", color: "c-green" };
  if (round.status === "closed") return { label: "CLOSED", color: "c-red" };
  return { label: "AWAITING CONTROL ROOM", color: "" };
}

export default function Landing() {
  const state = useLiveState();
  const rounds = state?.rounds || [];
  const teamsRegistered = state?.teams?.length || 0;

  return (
    <div className="main">
      <div className="hero">
        <div className="container">
          <div className="eyebrow">NATIONAL LEVEL CYBERSECURITY CHAMPIONSHIP</div>
          <h1>CYBER CLASH</h1>
          <div className="hero-sub">P.P. SAVANI UNIVERSITY · ENGINEERS DAY 2026</div>

          <div className="stat-row">
            <div className="stat">
              <div className="stat-num">{String(teamsRegistered).padStart(2, "0")}</div>
              <div className="stat-label">TEAMS REGISTERED</div>
            </div>
            <div className="stat">
              <div className="stat-num">04</div>
              <div className="stat-label">ROUNDS</div>
            </div>
            <div className="stat">
              <div className="stat-num">200</div>
              <div className="stat-label">POINTS AT STAKE</div>
            </div>
          </div>

          <div className="hero-actions">
            <Link to="/team-login" className="btn btn-cyan">TEAM LOGIN &gt;</Link>
            <Link to="/leaderboard" className="btn">🏆 VIEW LEADERBOARD</Link>
          </div>
        </div>
      </div>

      <div className="ticker-wrap">
        <div className="ticker">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i}>
              <span className={item.tag === "threat" ? "tag-threat" : "tag-info"}>
                [{item.tag.toUpperCase()}]
              </span>{" "}
              {item.text}
            </span>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">FOUR ROUNDS · ONE CHAMPION</div>
            <div className="section-title">THE GAUNTLET</div>
            <div className="section-rule" />
          </div>

          <div className="round-grid">
            {(rounds.length ? rounds : PLACEHOLDER_ROUNDS).map((r) => {
              const st = statusFor(r);
              return (
                <Link
                  to={r.status === "live" ? `/arena/${r.id}` : "/arena"}
                  key={r.id}
                  className={`round-card ${r.status === "live" ? "live" : r.status === "locked" ? "locked" : ""}`}
                >
                  <div className="round-thumb" />
                  <div className="round-body">
                    <div className="round-eyebrow">
                      <span>ROUND {r.order}</span>
                    </div>
                    <div className={`round-name c-${r.color}`}>{r.name}</div>
                    <div className="round-desc">{ROUND_DESC[r.key]}</div>
                    <div className="round-foot">
                      <div className="round-pts">MAX <b>{r.maxPoints}</b> PTS</div>
                      <div className={`round-status ${st.color}`}>{st.label}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="panel panel-danger">
            <div className="protocol-title">🛡 SECURITY PROTOCOL</div>
            <div className="protocol-line"><b>[01]</b> Tab switch or window blur (leaving the round screen)</div>
            <div className="protocol-line"><b>[02]</b> Right-click, copy, cut or paste</div>
            <div className="protocol-line"><b>[03]</b> View-source (Ctrl/Cmd+U), DevTools (F12, Ctrl/Cmd+Shift+I/J/C)</div>
            <div className="protocol-line"><b>[04]</b> Printing or exiting fullscreen</div>
            <div className="protocol-line"><b>[05]</b> Each violation resets your round progress immediately</div>
            <div className="protocol-line"><b>[06]</b> Warnings 1-3: reset + warning. Violation 4: TERMINATED — elimination</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">EVENT DAY FLOW</div>
            <div className="section-title">RUN OF SHOW</div>
            <div className="section-rule" />
          </div>
          <div className="timeline">
            <div className="timeline-rail" />
            {RUN_OF_SHOW.map((item, i) => (
              <div className="timeline-item" key={i}>
                <div className="timeline-dot" />
                <div className="timeline-time">{item.time}</div>
                <div className="timeline-title">{item.title}</div>
                <div className="timeline-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-note">CYBER CLASH · ENGINEERS DAY 2026 · P.P. SAVANI UNIVERSITY</div>
    </div>
  );
}

const ROUND_DESC = {
  "cyber-quiz": "20 rapid-fire questions. 30 seconds each. Speed recon across ports, malware and attack classes.",
  "crypto-crack": "Five progressive ciphers, each one unlocks the next. Caesar, Base64, hex, Morse, Vigenere.",
  "bug-hunt": "Three vulnerable code snippets. Identify the flaw, explain the risk, ship the fix — judged live.",
  "cyber-detective": "Four forensic stations: OSINT, steganography, log analysis and file forensics. Capture every flag.",
};

const PLACEHOLDER_ROUNDS = [
  { id: "r1", key: "cyber-quiz", name: "CYBER QUIZ", order: 1, color: "cyan", maxPoints: 80, status: "locked" },
  { id: "r2", key: "crypto-crack", name: "CRYPTO CRACK", order: 2, color: "purple", maxPoints: 30, status: "locked" },
  { id: "r3", key: "bug-hunt", name: "BUG HUNT", order: 3, color: "orange", maxPoints: 24, status: "locked" },
  { id: "r4", key: "cyber-detective", name: "CYBER DETECTIVE", order: 4, color: "green", maxPoints: 66, status: "locked" },
];
