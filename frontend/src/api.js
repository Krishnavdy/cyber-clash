const BASE = "/api";

function tokenFor(role) {
  return localStorage.getItem(role === "admin" ? "cc_admin_token" : "cc_team_token");
}

async function request(path, { method = "GET", body, role } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = isFormData ? {} : { "Content-Type": "application/json" };
  const token = role ? tokenFor(role) : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && role) {
    if (role === "admin") localStorage.removeItem("cc_admin_token");
    if (role === "team") localStorage.removeItem("cc_team_token");
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  // public
  getState: () => request("/state"),
  getLeaderboard: () => request("/leaderboard"),

  // auth
  adminLogin: (passcode) => request("/admin/login", { method: "POST", body: { passcode } }),
  teamLogin: (name, passcode) => request("/team/login", { method: "POST", body: { name, passcode } }),

  // team
  getRoundContent: (roundId) => request(`/round/${roundId}/content`, { role: "team" }),
  submitRound: (roundId, body) => request(`/round/${roundId}/submit`, { method: "POST", body, role: "team" }),
  reportViolation: (type) => request("/violation", { method: "POST", body: { type }, role: "team" }),

  // admin
  getOverview: () => request("/admin/overview", { role: "admin" }),
  getTeams: () => request("/admin/teams", { role: "admin" }),
  addTeam: (name) => request("/admin/teams", { method: "POST", body: { name }, role: "admin" }),
  importTeams: (file) => {
    const body = new FormData();
    body.append("file", file);
    return request("/admin/teams/import", { method: "POST", body, role: "admin" });
  },
  deleteTeam: (id) => request(`/admin/teams/${id}`, { method: "DELETE", role: "admin" }),
  resetTeam: (id) => request(`/admin/teams/${id}/reset`, { method: "POST", role: "admin" }),
  eliminateTeam: (id) => request(`/admin/teams/${id}/eliminate`, { method: "POST", role: "admin" }),
  reinstateTeam: (id) => request(`/admin/teams/${id}/reinstate`, { method: "POST", role: "admin" }),
  setBonus: (id, points) => request(`/admin/teams/${id}/bonus`, { method: "POST", body: { points }, role: "admin" }),
  updateRound: (id, patch) => request(`/admin/rounds/${id}`, { method: "PUT", body: patch, role: "admin" }),
  startRound: (id) => request(`/admin/rounds/${id}/start`, { method: "POST", role: "admin" }),
  lockRound: (id) => request(`/admin/rounds/${id}/lock`, { method: "POST", role: "admin" }),
  resetRoundForAll: (id) => request(`/admin/rounds/${id}/reset-all`, { method: "POST", role: "admin" }),
  getViolations: () => request("/admin/violations", { role: "admin" }),
  clearViolations: (teamId) => request(`/admin/violations/${teamId}/clear`, { method: "POST", role: "admin" }),
  getJudging: (roundId) => request(`/admin/judging/${roundId}`, { role: "admin" }),
  scoreJudging: (roundId, teamId, snippetId, points) =>
    request(`/admin/judging/${roundId}/${teamId}`, { method: "POST", body: { snippetId, points }, role: "admin" }),
  exportCsvUrl: () => {
    const token = tokenFor("admin");
    return `${BASE}/admin/export-csv?token=${token}`;
  },
  resetEvent: () => request("/admin/danger/reset-event", { method: "POST", role: "admin" }),
};
