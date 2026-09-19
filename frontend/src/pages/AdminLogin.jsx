import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { identify } from "../socket";

export default function AdminLogin() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.adminLogin(passcode.trim());
      localStorage.setItem("cc_admin_token", token);
      identify("admin");
      navigate("/control-room");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-title mono">CONTROL ROOM ACCESS</div>
        <div className="auth-sub">Mission control · restricted to event organizers.</div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="auth-field">
            <label className="field-label">ADMIN PASSCODE</label>
            <input
              className="input"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "VERIFYING…" : "UNLOCK CONSOLE"}
          </button>
        </form>
      </div>
    </div>
  );
}
