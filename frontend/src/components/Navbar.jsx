import { Link, useLocation } from "react-router-dom";

export default function Navbar({ live }) {
  const { pathname } = useLocation();
  const isTeam = !!localStorage.getItem("cc_team_token");
  const isAdmin = !!localStorage.getItem("cc_admin_token");

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <div className="brand-shield">🛡</div>
          <div className="brand-org">
            P.P. SAVANI
            <br />
            UNIVERSITY
          </div>
          <div className="brand-divider" />
          <div className="brand-title">CYBER CLASH</div>
          <div className="brand-badge">ENGINEERS DAY 2026</div>
        </Link>

        <div className="nav-links">
          <Link to="/arena" className={pathname.startsWith("/arena") ? "active" : ""}>ARENA</Link>
          <Link to="/leaderboard" className={pathname === "/leaderboard" ? "active" : ""}>LEADERBOARD</Link>
          <Link to="/control-room" className={pathname.startsWith("/control-room") ? "active" : ""}>CONTROL ROOM</Link>
        </div>

        <div className="nav-right">
          <div className={`status-pill ${live ? "live" : ""}`}>
            <span className="status-dot" />
            {live ? "LIVE" : "STANDBY"}
          </div>
          {isAdmin ? (
            <Link to="/control-room" className="btn btn-cyan">ADMIN</Link>
          ) : isTeam ? (
            <Link to="/arena" className="btn btn-cyan">TEAM PANEL</Link>
          ) : (
            <Link to="/team-login" className="btn btn-primary">TEAM LOGIN</Link>
          )}
        </div>
      </div>
    </div>
  );
}
