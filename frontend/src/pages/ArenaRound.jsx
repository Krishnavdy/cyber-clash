import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useLiveState } from "../useLiveState";
import RoundShell from "../components/RoundShell";
import RoundStartPopup from "../components/RoundStartPopup";
import CyberQuiz from "../rounds/CyberQuiz";
import CryptoCrack from "../rounds/CryptoCrack";
import BugHunt from "../rounds/BugHunt";
import CyberDetective from "../rounds/CyberDetective";
import { api } from "../api";

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

  // Per-team round status loaded from backend (source of truth)
  const [teamRoundStatus, setTeamRoundStatus] = useState(null); // null = loading
  const [showPopup, setShowPopup] = useState(false);

  // Load team's per-round status from backend on mount / round change
  const loadStatus = useCallback(async () => {
    try {
      const res = await api.getTeamStatus();
      setTeamRoundStatus(res.roundStatus || {});
    } catch {
      setTeamRoundStatus({});
    }
  }, []);

  useEffect(() => {
    if (teamToken) loadStatus();
  }, [teamToken, roundId, loadStatus]);

  // Determine whether to show popup once status is loaded
  useEffect(() => {
    if (teamRoundStatus === null) return; // still loading
    const status = teamRoundStatus[roundId];
    // Show popup if the team hasn't entered this round yet (no status = pending)
    if (!status || status === "pending") {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [teamRoundStatus, roundId]);

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

  // Block re-entry if team has already completed this round (backend is source of truth)
  if (teamRoundStatus !== null && teamRoundStatus[roundId] === "completed") {
    return (
      <div className="locked-screen">
        🔒 You have already completed {round.name}. This round is locked for your team.
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-cyan" onClick={() => navigate("/arena")}>BACK TO ARENA</button>
        </div>
      </div>
    );
  }

  // Handler: user clicks "LET'S GO" in the popup → call /enter to persist "active" in DB
  async function handlePopupStart() {
    try {
      const res = await api.enterRound(roundId);
      if (res.roundStatus) setTeamRoundStatus(res.roundStatus);
    } catch {
      // Ignore errors; allow the user in even if the request fails
    }
    setShowPopup(false);
  }

  const Player = PLAYERS[round.key];

  return (
    <>
      {/* Popup shown only the very first time a team enters this round */}
      {showPopup && teamRoundStatus !== null && (
        <RoundStartPopup round={round} onStart={handlePopupStart} />
      )}
      <RoundShell round={round} onEliminated={() => navigate("/arena")}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className={`round-name c-${round.color}`} style={{ fontSize: 26 }}>{round.name}</div>
        </div>
        {Player
          ? <Player roundId={round.id} onRoundComplete={() => loadStatus()} />
          : <div className="locked-screen">Unknown round type.</div>
        }
      </RoundShell>
    </>
  );
}
