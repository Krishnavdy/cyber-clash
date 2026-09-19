import { useState } from "react";
import { Navigate } from "react-router-dom";
import Overview from "../controlroom/Overview";
import Teams from "../controlroom/Teams";
import Rounds from "../controlroom/Rounds";
import Judging from "../controlroom/Judging";
import Violations from "../controlroom/Violations";
import Branding from "../controlroom/Branding";
import Danger from "../controlroom/Danger";

const TABS = [
  { key: "overview", label: "OVERVIEW", Comp: Overview },
  { key: "teams", label: "TEAMS", Comp: Teams },
  { key: "rounds", label: "ROUNDS", Comp: Rounds },
  { key: "judging", label: "JUDGING", Comp: Judging },
  { key: "violations", label: "VIOLATIONS", Comp: Violations },
  { key: "branding", label: "BRANDING", Comp: Branding },
  { key: "danger", label: "DANGER", Comp: Danger },
];

export default function ControlRoom() {
  const [tab, setTab] = useState("overview");
  const adminToken = localStorage.getItem("cc_admin_token");
  if (!adminToken) return <Navigate to="/admin-login" replace />;

  const Active = TABS.find((t) => t.key === tab)?.Comp || Overview;

  return (
    <div className="main">
      <div className="container">
        <div className="cr-header">
          <div className="cr-title-wrap">
            <div className="cr-icon">&gt;_</div>
            <div>
              <div className="cr-title">CONTROL ROOM</div>
              <div className="cr-sub">MISSION CONTROL · CYBER CLASH · ENGINEERS DAY 2026 · P.P. SAVANI UNIVERSITY</div>
            </div>
          </div>
        </div>

        <div className="cr-tabs">
          {TABS.map((t) => (
            <div key={t.key} className={`cr-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>

        <Active />
      </div>
    </div>
  );
}
