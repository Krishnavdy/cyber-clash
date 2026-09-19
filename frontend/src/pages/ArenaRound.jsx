import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useLiveState } from "../useLiveState";
import RoundShell from "../components/RoundShell";
import CyberQuiz from "../rounds/CyberQuiz";
import CryptoCrack from "../rounds/CryptoCrack";
import BugHunt from "../rounds/BugHunt";
import CyberDetective from "../rounds/CyberDetective";

const PLAYERS = {
  "cyber-quiz": CyberQuiz,
  "crypto-crack": CryptoCrack,
  "bug-hunt": BugHunt,
  "cyber-detective": CyberDetective,
};

export default function ArenaRound() {
  const { roundId } = useParams();
  const state = useLiveState();
  const navigate = useNavigate();
  const teamToken = localStorage.getItem("cc_team_token");

  if (!teamToken) return <Navigate to="/team-login" replace />;
  if (!state) return <div className="locked-screen">Loading…</div>;

  const round = state.rounds.find((r) => r.id === roundId);
  if (!round) return <Navigate to="/arena" replace />;

  if (round.status !== "live") {
    return (
      <div className="locked-screen">
        🔒 {round.name} is not live right now.
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-cyan" onClick={() => navigate("/arena")}>BACK TO ARENA</button>
        </div>
      </div>
    );
  }

  const Player = PLAYERS[round.key];

  return (
    <RoundShell round={round} onEliminated={() => navigate("/arena")}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div className={`round-name c-${round.color}`} style={{ fontSize: 26 }}>{round.name}</div>
      </div>
      {Player ? <Player roundId={round.id} /> : <div className="locked-screen">Unknown round type.</div>}
    </RoundShell>
  );
}
