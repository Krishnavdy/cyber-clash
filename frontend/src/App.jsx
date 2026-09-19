import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import TeamLogin from "./pages/TeamLogin";
import Arena from "./pages/Arena";
import ArenaRound from "./pages/ArenaRound";
import Leaderboard from "./pages/Leaderboard";
import AdminLogin from "./pages/AdminLogin";
import ControlRoom from "./pages/ControlRoom";
import { useLiveState } from "./useLiveState";
import { identify } from "./socket";

export default function App() {
  const state = useLiveState();
  const location = useLocation();
  const live = state ? !state.event?.standby : false;

  // Re-identify on load so reconnects rejoin the right socket room.
  useEffect(() => {
    if (localStorage.getItem("cc_admin_token")) identify("admin");
    if (localStorage.getItem("cc_team_token")) identify("team");
  }, []);

  // The Arena round screen owns its own chrome (fullscreen + anti-cheat) —
  // hide the navbar there so leaving it isn't a click away.
  const hideNav = /^\/arena\/[^/]+$/.test(location.pathname);

  return (
    <div className="page">
      {!hideNav && <Navbar live={live} />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/team-login" element={<TeamLogin />} />
        <Route path="/arena" element={<Arena />} />
        <Route path="/arena/:roundId" element={<ArenaRound />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/control-room" element={<ControlRoom />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </div>
  );
}
