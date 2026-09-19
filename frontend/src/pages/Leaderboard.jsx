import { useLiveState } from "../useLiveState";

export default function Leaderboard() {
  const state = useLiveState();
  const teams = state?.teams || [];

  return (
    <div className="main">
      <div className="section" style={{ paddingTop: 50 }}>
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">LIVE STANDINGS</div>
            <div className="section-title">LEADERBOARD</div>
            <div className="section-rule" />
          </div>

          <div className="cr-table-wrap">
            {teams.length === 0 ? (
              <div className="cr-empty">NO TEAMS REGISTERED YET</div>
            ) : (
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>TEAM</th>
                    <th>R1</th>
                    <th>R2</th>
                    <th>R3</th>
                    <th>R4</th>
                    <th>BONUS</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t, i) => (
                    <tr key={t.id}>
                      <td className={`lb-rank ${i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : ""}`}>
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="lb-name">{t.name}</td>
                      <td>{t.scores.r1}</td>
                      <td>{t.scores.r2}</td>
                      <td>{t.scores.r3}</td>
                      <td>{t.scores.r4}</td>
                      <td>{t.scores.bonus}</td>
                      <td className="lb-total">{t.total}</td>
                      <td>
                        <span className={`badge status-${t.status}`}>{t.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
