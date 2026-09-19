import { io } from "socket.io-client";

export const socket = io("/", { autoConnect: true, transports: ["websocket", "polling"] });

export function identify(role) {
  const token = localStorage.getItem(role === "admin" ? "cc_admin_token" : "cc_team_token");
  if (token) socket.emit("identify", token);
}
