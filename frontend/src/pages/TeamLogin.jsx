import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { identify } from "../socket";

export default function TeamLogin() {
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, team } = await api.teamLogin(name.trim(), passcode.trim());
      localStorage.setItem("cc_team_token", token);
      localStorage.setItem("cc_team_name", team.name);
      identify("team");
      navigate("/arena");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-title mono">TEAM LOGIN</div>
        <div className="auth-sub">Enter the team name and passcode issued at check-in.</div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="auth-field">
            <label className="field-label">TEAM NAME</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Team Alpha" required />
          </div>
          <div className="auth-field">
            <label className="field-label">PASSCODE</label>
            <input className="input" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="6-character code" required />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "SIGNING IN…" : "ENTER ARENA"}
          </button>
        </form>
      </div>
    </div>
  );
}
