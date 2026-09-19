# Cyber Clash — Engineers Day 2026

Full-stack build for the P.P. Savani University Cyber Clash competition site:
a Node/Express + Socket.IO **backend** (teams, live rounds, scoring, anti-cheat)
and a React **frontend** (landing page, team arena, leaderboard, Control Room).

No watermarks, no vendor lock-in — this is plain code you own and can deploy
anywhere for free.

## How it fits together

```
cyberclash/
  backend/     Express API + Socket.IO + JSON file database (lowdb)
  frontend/    React (Vite) app — matches your existing dark terminal design
```

The **Control Room** (admin) starts/locks rounds, manages teams, judges the
Bug Hunt round, reviews violations, and can wipe the event before a rehearsal.
Every action broadcasts instantly to every open Arena screen over WebSockets —
that's what makes "Control Room controls what teams see live" actually work.

## Run it locally

You need [Node.js](https://nodejs.org) 18+ installed.

**1. Backend**
```bash
cd backend
npm install
npm start
```
Runs on `http://localhost:4000`. Default admin passcode: `admin123`
(change it by setting the `ADMIN_PASSCODE` environment variable before you
run it for the real event).

**2. Frontend** (in a second terminal)
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` and proxies API/socket calls to the backend.
Open that URL — this is the site.

## How the event day actually works

1. Open **Control Room → Teams**, add each team by name. Each gets a
   6-character passcode — write these down / hand them out at check-in.
2. Teams open the site, click **Team Login**, and sign in with their team
   name + passcode.
3. In **Control Room → Rounds**, click **Start** on Round 1 when you're ready.
   Every team's Arena screen updates within a second and the round becomes
   playable. The timer is server-authoritative and auto-locks at zero.
4. The **Security Protocol** (tab-switch, right-click, DevTools, fullscreen
   exit, printing) is enforced client-side and reported to the server, which
   is the single source of truth for each team's violation count — refreshing
   the page or closing the tab does not reset it. 1st–3rd violation resets
   that team's progress in the live round and issues a warning; the 4th
   eliminates them. Appeals are handled in **Control Room → Violations** with
   a one-click "Clear & Reinstate."
5. Round 3 (Bug Hunt) is judged live: team explanations land in
   **Control Room → Judging**, where you assign 0–8 points per snippet.
6. **Leaderboard** updates live for the audience-facing screen; **Teams**
   tab lets you add manual bonus points and export final results as CSV.

## Deploying it for free (so it's live on the day, not just on your laptop)

**Backend → [Render](https://render.com) (free tier)**
1. Push the `backend/` folder to a GitHub repo.
2. New → Web Service → connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add an environment variable `ADMIN_PASSCODE` set to something only you know.
5. Render gives you a URL like `https://cyberclash-backend.onrender.com`.

**Frontend → [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (free tier)**
1. Push `frontend/` to GitHub (or the same repo, different folder).
2. Before deploying, edit `frontend/src/api.js` and `frontend/src/socket.js`
   so they point at your Render backend URL instead of `/api` and `/`
   (or set up an environment variable — ask if you want this wired up).
3. Deploy — you'll get a public URL to share with teams.

Both free tiers comfortably handle a single-day university event with a
handful of teams. The one thing to know about Render's free tier: it spins
down after inactivity and takes ~30s to wake up on the first request of the
day — hit it once yourself 5 minutes before check-in and it'll be warm.

## Notes on the anti-cheat system

This enforces the rules from your Security Protocol panel, but it's honest
to say what it can and can't do: it's a serious deterrent (catches tab
switches, right-click, DevTools shortcuts, copy/paste, fullscreen exit,
printing) enforced server-side so it can't be reset by refreshing. It can't
stop someone using a second physical device to look up answers — no
browser-based system can. For a university event this is the right amount
of friction; if you ever need stronger guarantees you'd be looking at
locked-down exam kiosk software instead.

## Extending it

- Question banks, ciphers, code snippets and detective flags live in plain
  arrays near the top of `backend/server.js` — edit them directly, restart
  the backend, done.
- Everything persists to `backend/data/db.json`. Back that file up before
  the event and you can restore state if the server ever needs a restart.
