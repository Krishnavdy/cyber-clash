export default function Branding() {
  return (
    <div className="panel">
      <div style={{ fontFamily: "var(--mono)", fontWeight: 700, marginBottom: 10 }}>EVENT BRANDING</div>
      <p className="protocol-line" style={{ color: "var(--text-dim)", marginBottom: 18 }}>
        Event name, organizer and round names are set directly in the code for now
        (<span className="mono">backend/server.js</span> and <span className="mono">frontend/src/pages/Landing.jsx</span>).
        A visual editor for logo, colors and copy can be added here later if you want to hand this
        off to a non-technical organizer next year.
      </p>
      <div className="field-label">CURRENT EVENT</div>
      <div className="mono" style={{ fontSize: 14, color: "var(--text)" }}>CYBER CLASH · ENGINEERS DAY 2026 · P.P. SAVANI UNIVERSITY</div>
    </div>
  );
}
