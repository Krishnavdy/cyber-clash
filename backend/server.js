// Cyber Clash — live backend
// Express REST API + Socket.IO realtime sync + lowdb (JSON file) persistence.
// Run: npm install && npm start   (default port 4000)

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const XLSX = require("xlsx");
const http = require("http");
const { Server } = require("socket.io");
const low = require("lowdb");
const { nanoid } = require("nanoid");

const fs = require("fs");

const PORT = process.env.PORT || 4000;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "spider";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, "db.json");
const initialData = fs.existsSync(dbFile)
  ? JSON.parse(fs.readFileSync(dbFile, "utf8"))
  : {};

let pendingSnapshot = null;
let persistTimer = null;
let persistInFlight = false;

function schedulePersist(state) {
  pendingSnapshot = JSON.stringify(state, null, 2);
  if (!persistTimer) persistTimer = setTimeout(flushPersistence, 50);
}

async function flushPersistence() {
  persistTimer = null;
  if (persistInFlight || !pendingSnapshot) return;
  persistInFlight = true;
  const snapshot = pendingSnapshot;
  pendingSnapshot = null;
  const tempFile = `${dbFile}.tmp`;
  try {
    await fs.promises.writeFile(tempFile, snapshot, "utf8");
    await fs.promises.rename(tempFile, dbFile);
  } catch (error) {
    console.error("Persistence flush failed:", error.message);
    pendingSnapshot = snapshot;
  } finally {
    persistInFlight = false;
    if (pendingSnapshot && !persistTimer) persistTimer = setTimeout(flushPersistence, 50);
  }
}

const adapter = {
  read: () => initialData,
  write: (state) => schedulePersist(state),
};
const db = low(adapter);

db.defaults({
  teams: [],
  rounds: [
    { id: "r1", key: "cyber-quiz", name: "Cyber Quiz", order: 1, color: "cyan", maxPoints: 80, timerMinutes: 15, status: "locked", autoStop: true, startedAt: null, endsAt: null },
    { id: "r2", key: "crypto-crack", name: "Crypto Crack", order: 2, color: "purple", maxPoints: 30, timerMinutes: 25, status: "locked", autoStop: true, startedAt: null, endsAt: null },
    { id: "r3", key: "bug-hunt", name: "Bug Hunt", order: 3, color: "orange", maxPoints: 24, timerMinutes: 30, status: "locked", autoStop: true, startedAt: null, endsAt: null },
    { id: "r4", key: "cyber-detective", name: "Cyber Detective", order: 4, color: "green", maxPoints: 66, timerMinutes: 35, status: "locked", autoStop: true, startedAt: null, endsAt: null },
  ],
  event: { standby: true },
  violationsLog: [],
  judging: { r3: {} }, // { r3: { [teamId]: { s1, s2, s3, notes } } }
  sessions: {}, // token -> { role: 'admin'|'team', teamId? }
}).write();

// ---------------------------------------------------------------------------
// Round content — correct answers NEVER leave this file / this process.
// ---------------------------------------------------------------------------
const QUIZ_QUESTIONS = [
  { q: "Which port is the default for HTTPS?", options: ["21", "443", "23", "3389"], a: 1 },
  { q: "What does DNS stand for?", options: ["Domain Name System", "Direct Network Service", "Data Node Storage", "Digital Naming Standard"], a: 0 },
  { q: "Which attack floods a target with traffic to exhaust resources?", options: ["Phishing", "SQL Injection", "DDoS", "XSS"], a: 2 },
  { q: "Which port does SSH use by default?", options: ["22", "80", "25", "110"], a: 0 },
  { q: "Ransomware primarily attacks by:", options: ["Encrypting files for ransom", "Slowing the CPU", "Deleting logs only", "Mining cryptocurrency only"], a: 0 },
  { q: "A 'zero-day' vulnerability is:", options: ["A bug patched immediately", "A flaw unknown to the vendor with no fix yet", "A bug older than a year", "A test environment issue"], a: 1 },
  { q: "Which of these is a symmetric encryption algorithm?", options: ["RSA", "AES", "ECC", "Diffie-Hellman"], a: 1 },
  { q: "SQL Injection primarily exploits:", options: ["Unsanitized database input", "Weak Wi-Fi passwords", "Expired SSL certificates", "DNS cache poisoning"], a: 0 },
  { q: "Which port does FTP use for control by default?", options: ["21", "25", "110", "143"], a: 0 },
  { q: "Phishing is best described as:", options: ["A brute-force login attack", "Tricking a user into revealing info via deception", "Overloading a server", "Cracking a hash offline"], a: 1 },
  { q: "What does a firewall primarily do?", options: ["Encrypts disk data", "Filters network traffic by rules", "Compresses files", "Backs up databases"], a: 1 },
  { q: "Which malware type disguises itself as legitimate software?", options: ["Worm", "Trojan", "Rootkit", "Adware"], a: 1 },
  { q: "MFA stands for:", options: ["Multi-Factor Authentication", "Managed File Access", "Malware Filter Agent", "Mandatory Firewall Audit"], a: 0 },
  { q: "Which HTTP status code means 'Unauthorized'?", options: ["200", "404", "401", "500"], a: 2 },
  { q: "A man-in-the-middle attack intercepts:", options: ["Communication between two parties", "Only DNS requests", "Only encrypted disks", "Only USB devices"], a: 0 },
  { q: "Which of these is NOT a hashing algorithm?", options: ["SHA-256", "MD5", "AES", "bcrypt"], a: 2 },
  { q: "A worm differs from a virus because it:", options: ["Needs a host file to spread", "Self-replicates without a host file", "Only affects mobile devices", "Cannot spread over networks"], a: 1 },
  { q: "Which port does HTTP use by default?", options: ["80", "443", "8443", "21"], a: 0 },
  { q: "Social engineering attacks primarily target:", options: ["Human trust and behavior", "Hardware firmware", "Network switches", "Database indexes"], a: 0 },
  { q: "A VPN primarily provides:", options: ["Faster internet speeds", "An encrypted tunnel over a network", "Free antivirus updates", "Automatic backups"], a: 1 },
];

const CIPHER_CHAIN = [
  { type: "Caesar (+3)", prompt: "Decode this Caesar cipher (shift 3): WKH IODJ LV VDIH", answer: "the flag is safe" },
  { type: "Base64", prompt: "Decode this Base64 string: Q1lCRVJDTEFTSDIwMjY=", answer: "CYBERCLASH2026" },
  { type: "Hex", prompt: "Decode this hex string: 68756e742074686520666c6167", answer: "hunt the flag" },
  { type: "Morse", prompt: "Decode this Morse code: -.-. .-.. .- ...- .-", answer: "clave" },
  { type: "Vigenere (key: SAVANI)", prompt: "Decode this Vigenere cipher (key: SAVANI): AOZC ZL DYWO", answer: "cyber is king" },
];

const BUG_SNIPPETS = [
  {
    id: "s1",
    lang: "PHP",
    code: `$query = "SELECT * FROM users WHERE username = '" . $_GET['user'] . "'";\n$result = mysqli_query($conn, $query);`,
    options: ["SQL Injection", "Cross-Site Scripting", "Buffer Overflow", "Hardcoded Credentials"],
    a: 0,
  },
  {
    id: "s2",
    lang: "JavaScript",
    code: `app.get('/search', (req, res) => {\n  res.send('<h1>Results for: ' + req.query.q + '</h1>');\n});`,
    options: ["Path Traversal", "Cross-Site Scripting (XSS)", "Race Condition", "Insecure Deserialization"],
    a: 1,
  },
  {
    id: "s3",
    lang: "Python",
    code: `DB_PASSWORD = "SuperSecret123"\nconn = connect(host="prod-db", password=DB_PASSWORD)`,
    options: ["Hardcoded Credentials", "SSRF", "Command Injection", "CSRF"],
    a: 0,
  },
];

const DETECTIVE_STATIONS = [
  {
    id: "osint",
    name: "OSINT (Open Source Intelligence)",
    points: 15,
    flag: "flag{recon_never_sleeps}",
    briefing: "An archived target dossier revealed emergency administrative handles and internal notes.",
    material: "PUBLIC DOSSIER:\nTarget Org: P.P. Savani Security Team\nPublic Handle: @PPS_CyberAdmin\nArchive ID: PPS-OSINT-2048\nCollection Date: 2026-09-18\nSource: Public emergency response index\nDocument Status: Archived\nAnalyst: Field Intelligence Desk\nConfidence: HIGH\nRecord Hash: 7c91-a204-19ef\nReference: emergency-access.html\nArchive Tier: public mirror\nReview Queue: intelligence-04\nThe archived record references an administrator recovery procedure.\nA margin note says the pattern was copied from the emergency access page.\nThe document was published during a routine security review.\nNo encryption wrapper was found around the visible text.\nThe handle matches the organization name in the header.\nA second reviewer confirmed the archive was not altered.\nThe recovery instructions mention an emergency master key.\nThe key pattern is stored in a quoted note below.\nArchived Note: 'Emergency master key pattern: flag{recon_never_sleeps}'\nThe note is plain text and was not redacted from the public copy.\nThe surrounding punctuation is part of the document, not the flag.\nUse the exact flag format shown inside the quoted note.\nCross-check: the prefix begins with flag and uses braces.\nThe archive contains no additional candidate flag strings.\nThe public handle is a locator, not the answer.\nThe archive ID is a catalog reference, not the answer.\nThe collection date identifies the correct snapshot.\nThe recovery procedure was indexed under emergency access.\nThe quoted note is the only line marked as a key pattern.\nPreserve lowercase characters when recording the answer.\nDo not include quotation marks in the submitted value.\nDo not include spaces before or after the flag.\nThe note appears in the original archive, not analyst commentary.\nThe record hash is included for chain-of-custody verification.\nThe source page was reachable without authentication.\nNo alternate spelling of the flag is present.\nThe dossier payload is complete and readable.\nHint: Extract the flag string directly from the dossier payload.",
  },
  {
    id: "stego",
    name: "Steganography",
    points: 15,
    flag: "flag{hidden_in_plain_sight}",
    briefing: "An intercepted image chunk header contained hidden comments inside ASCII metadata.",
    material: "HEX DUMP / HEADER DATA:\nFile Type: PNG image export\nCapture Source: intercepted thumbnail cache\nCapture ID: IMG-8841\nByte Order: network order\nParser Status: structurally valid\nChunk Count: 5\nHeader Length: 33 bytes\nThe header begins with the standard PNG signature.\nThe file is only one pixel wide in the recovered preview.\nSeveral chunks contain dimensions, color information, and checksum bytes.\nThe chunk order is valid for a normal PNG image.\nThe analyst noticed an embedded COMMENT field between the header and the closing marker.\nThe comment begins after the visible header metadata.\nThe following bytes are shown in hexadecimal and ASCII form.\n00000000  89 50 4e 47 0d 0a 1a 0a  00 00 00 0d 49 48 44 52  |.PNG........IHDR|\n00000010  00 00 01 00 00 00 01 00  08 06 00 00 00 5c 72 a8  |.............\\r.|\n00000020  43 4f 4d 4d 45 4e 54 3a  66 6c 61 67 7b 68 69 64  |COMMENT:flag{hid|\n00000030  64 65 6e 5f 69 6e 5f 70  6c 61 69 6e 5f 73 69 67  |den_in_plain_sig|\n00000040  68 74 7d 00 00 00 00 00  49 45 4e 44 ae 42 60 82  |ht}.....IEND.B`.|\nThe ASCII column is more useful than the padding bytes.\nThe COMMENT label identifies the hidden text field.\nRead the text continuously across the wrapped rows.\nThe first row contains the beginning of the field.\nThe middle rows continue the same ASCII sequence.\nThe final row contains the closing characters before padding.\nDo not include the PNG signature or the closing IEND marker.\nDo not convert the ASCII characters into another encoding.\nThe embedded value uses the standard flag format.\nThe braces are visible across the wrapped text.\nNo line break exists inside the embedded value.\nNo other comment field appears in this capture.\nThe checksum bytes are unrelated to the hidden text.\nThe image dimensions are unrelated to the hidden text.\nThe comment label is the strongest extraction indicator.\nThe hex and ASCII columns should be read together.\nConclusion: inspect the ASCII text in the comment field rather than the binary padding.",
  },
  {
    id: "logs",
    name: "Log Analysis",
    points: 18,
    flag: "flag{the_logs_dont_lie}",
    briefing: "Inspect the auth.log excerpt from the compromised target server to discover the exfiltrated flag payload.",
    material: "SERVER LOGS (/var/log/auth.log):\nHost: target-gateway-07\nLog Rotation: daily at 02:00 UTC\nCollection Window: 2026-09-20 01:00-01:10 UTC\nSource File Hash: auth-77d1\nTimezone: UTC\nRetention Class: incident evidence\nParser: authlog-normalizer v1.8\nThe following entries were recovered from the midnight incident window.\nThe archive contains both informational and warning records.\nAn authenticated root session appears before the sensitive file access.\nThe source address remains consistent across the login and disconnect records.\nThe session used a public key rather than a password.\nThe command path indicates that a privileged file was inspected.\nReview the alert payload after the command entry.\n2026-09-20 01:02:14 [INFO] sshd[1042]: Accepted publickey for root from 192.168.1.50 port 49201 ssh2\n2026-09-20 01:03:22 [WARN] sudo: root : TTY=pts/0 ; PWD=/root ; COMMAND=/usr/bin/cat /etc/shadow\n2026-09-20 01:04:18 [ALERT] Suspicious env payload: EXFIL_KEY=flag{the_logs_dont_lie}\n2026-09-20 01:05:00 [INFO] Connection closed by 192.168.1.50 port 49201\nThe connection closed less than three minutes after the first login.\nNo second source address appears in the recovered interval.\nThe alert is the only line containing an environment payload.\nThe key name EXFIL_KEY marks the extracted value.\nUse the complete value assigned after the equals sign.\nThe timestamp is not part of the answer.\nThe severity label is also not part of the answer.\nThe source IP is context, not the extracted value.\nThe command path is context, not the extracted value.\nThe alert payload contains one complete candidate.\nThe key name ends immediately before the equals sign.\nThe answer includes the braces shown in the value.\nPreserve the underscores exactly as logged.\nDo not include the trailing log punctuation.\nThe line is classified ALERT because it carries the payload.\nThe login and disconnect lines establish the session boundary.\nThe warning line establishes the privileged action.\nAnalyst note: the exfiltration key is recorded in the alert payload.",
  },
  {
    id: "forensics",
    name: "File Forensics",
    points: 18,
    flag: "flag{metadata_gives_it_away}",
    briefing: "Analyze the EXIF metadata dump extracted from the recovered evidentiary document.",
    material: "EXIF & METADATA ANALYSIS:\nEvidence ID: CF-7714\nFile Name: confidential_audit.pdf\nFile Size: 412 KB\nMIME Type: application/pdf\nContainer: recovered document package\nCreator: CyberClash Forensics Tool v2.4\nTool Build: 2.4.19\nAuthor: Lead Analyst\nSubject: EXIF Metadata Audit\nCreation Date: 2026-09-19 22:14 UTC\nModification Date: 2026-09-19 22:14 UTC\nMetadata Extracted: 2026-09-20 00:11 UTC\nExtraction Profile: forensic-complete\nContainer Status: intact\nThe file was reconstructed from a document image recovered during the audit.\nThe visible pages contain no suspicious phrases or annotations.\nMost fields appear ordinary, but the user comment contains an analyst-added payload.\nThe comment field was preserved during conversion.\nReviewers confirmed that the metadata was not stripped.\nThe user comment is stored separately from the document body.\nUserComment: flag{metadata_gives_it_away}\nPDF Version: 1.7\nPage Count: 6\nEmbedded Fonts: 4\nProducer: Secure Document Pipeline\nChecksum Status: verified\nPage Geometry: A4 portrait\nEncryption: none\nAttachments: none\nXMP Packet: present\nVisible Text Review: clear\nThe flag follows the standard lowercase format.\nThe UserComment field is separate from the visible title.\nThe file name is an identifier, not the answer.\nThe creator field identifies the extraction tool.\nThe creation date establishes the evidence timeline.\nThe checksum confirms the metadata was preserved.\nDo not submit the PDF filename.\nDo not submit the author or producer value.\nRead the complete value assigned to UserComment.\nAnalyst note: metadata fields should be reviewed before the visible document text.",
  },
];

// Add dense, non-answer evidence so the real payload requires careful inspection.
for (const station of DETECTIVE_STATIONS) {
  const lines = station.material.split("\n");
  const markerIndex = lines.findIndex((line) => line.includes(station.flag));
  const decoyTemplates = {
    osint: [
      "Mirror snapshot: public index reachable; no credential prompt observed.",
      "Analyst note: organization alias matches two unrelated archived pages.",
      "URL fragment recorded for correlation; fragment contains no payload.",
      "Contact directory entry marked stale after the 2025 review cycle.",
      "Search result score: 0.42; retained as contextual material only.",
      "Cached page header contains a normal last-modified timestamp.",
      "Public handle spelling verified against the dossier title.",
      "Archive crawler found no executable attachment in this snapshot.",
      "Reference page returned a standard 200 response during collection.",
      "Analyst confidence unchanged after secondary source comparison.",
    ],
    stego: [
      "Chunk offset reviewed; value belongs to image dimensions.",
      "ASCII preview contains ordinary padding before the next marker.",
      "CRC bytes verified against the captured chunk boundary.",
      "Color depth is consistent with the thumbnail export profile.",
      "No second image stream was detected in the recovered bytes.",
      "Parser skipped a null byte that carries no printable character.",
      "Header signature matches the claimed file type.",
      "Trailing bytes were classified as alignment padding.",
      "Visual preview contains no readable overlay or watermark.",
      "Byte offset retained for chain-of-custody comparison.",
    ],
    logs: [
      "Correlation window: event falls inside the retained incident interval.",
      "Source address reputation: internal range; requires session context.",
      "Process ID remained stable until the disconnect event.",
      "Authentication method was recorded as public-key login.",
      "Privilege transition was observed after the successful session start.",
      "Shell working directory matches the account home policy.",
      "No failed login attempts preceded the accepted session.",
      "Log sequence numbers are contiguous across the reviewed interval.",
      "Alert severity was elevated by the environment variable pattern.",
      "Connection closure was clean and included the original source port.",
    ],
    forensics: [
      "Metadata field type: text; value length falls within normal range.",
      "Document producer matches the approved evidence conversion pipeline.",
      "Page dimensions are consistent across all six rendered pages.",
      "Embedded font table contains no external network reference.",
      "XMP packet checksum agrees with the container checksum.",
      "Author field was preserved during the forensic export.",
      "No attachment stream was found in the document container.",
      "Creation and modification timestamps are identical in the source.",
      "Visible text extraction returned a normal audit heading.",
      "Comment field requires separate inspection from page content.",
    ],
  }[station.id];
  const decoyLines = Array.from({ length: 80 }, (_, index) => {
    const record = String(index + 1).padStart(3, "0");
    return `${record} | ${decoyTemplates[index % decoyTemplates.length]}`;
  });
  lines.splice(markerIndex, 0, ...decoyLines);
  station.material = lines.join("\n");
}


// ---------------------------------------------------------------------------
// Session tokens (persisted to db.json so restarts keep sessions active)
// ---------------------------------------------------------------------------
function issueToken(payload) {
  const token = nanoid(32);
  db.set(["sessions", token], payload).write();
  return token;
}

function getSession(token) {
  if (!token) return null;
  return db.get(["sessions", token]).value();
}

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "") || req.query.token;
  const sess = getSession(token);
  if (!sess || sess.role !== "admin") return res.status(401).json({ error: "unauthorized" });
  next();
}

function requireTeam(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const sess = getSession(token);
  if (!sess || sess.role !== "team") return res.status(401).json({ error: "unauthorized" });
  const team = db.get("teams").find({ id: sess.teamId }).value();
  if (!team) return res.status(401).json({ error: "unauthorized" });
  if (team.status === "eliminated") return res.status(403).json({ error: "eliminated" });
  req.team = team;
  next();
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function publicTeam(t) {
  const total = (t.scores.r1 || 0) + (t.scores.r2 || 0) + (t.scores.r3 || 0) + (t.scores.r4 || 0) + (t.scores.bonus || 0);
  return {
    id: t.id,
    name: t.name,
    scores: t.scores,
    total,
    warnings: t.warnings,
    violations: t.violations,
    status: t.status,
  };
}

function publicState() {
  return {
    event: db.get("event").value(),
    rounds: db.get("rounds").value(),
    teams: db.get("teams").value().map(publicTeam).sort((a, b) => b.total - a.total),
  };
}

let broadcastTimer = null;

function broadcastState() {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    io.emit("state:update", publicState());
  }, 50);
}

function currentLiveRound() {
  return db.get("rounds").find({ status: "live" }).value();
}

function resetTeamRoundProgress(team, roundId) {
  const t = db.get("teams").find({ id: team.id });
  t.set(["roundProgress", roundId], {}).write();
  if (roundId === "r3") {
    t.set(["scores", "r3"], 0).write();
    const existingJudging = db.get(["judging", "r3"]).value() || {};
    delete existingJudging[team.id];
    db.set(["judging", "r3"], existingJudging).write();
  }
}


// Server-side violation handling — cumulative per team, refresh-proof (stored in db.json).
function recordViolation(team, roundId, type) {
  const teamRef = db.get("teams").find({ id: team.id });
  const fresh = teamRef.value();
  const newViolations = (fresh.violations || 0) + 1;
  let action = "reset";
  let status = fresh.status;

  if (newViolations >= 3) {
    action = "eliminated";
    status = "eliminated";
  }

  teamRef
    .assign({
      violations: newViolations,
      warnings: action === "reset" ? (fresh.warnings || 0) + 1 : fresh.warnings,
      status,
    })
    .write();

  if (roundId && action === "reset") {
    resetTeamRoundProgress(fresh, roundId);
  }

  db.get("violationsLog")
    .push({
      id: nanoid(10),
      teamId: team.id,
      teamName: fresh.name,
      roundId: roundId || null,
      type,
      action,
      timestamp: Date.now(),
    })
    .write();

  broadcastState();
  io.to(`team:${team.id}`).emit("violation:ack", {
    violations: newViolations,
    action,
    message:
      action === "eliminated"
        ? "Violation 3 — TERMINATED. Your team has been eliminated. Appeal at the control desk."
        : `Violation ${newViolations}/2 — round progress reset.`,
  });
  io.to("admin").emit("violation:new", {
    teamId: team.id,
    teamName: fresh.name,
    type,
    action,
    violations: newViolations,
  });

  return { violations: newViolations, action };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ---- Public -----------------------------------------------------------------
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/state", (req, res) => res.json(publicState()));
app.get("/api/leaderboard", (req, res) => res.json(publicState().teams));

// ---- Auth ---------------------------------------------------------------
app.post("/api/admin/login", (req, res) => {
  const { passcode } = req.body || {};
  if (passcode !== ADMIN_PASSCODE) return res.status(401).json({ error: "invalid passcode" });
  const token = issueToken({ role: "admin" });
  res.json({ token });
});

app.post("/api/team/login", (req, res) => {
  const { name, passcode } = req.body || {};
  const team = db
    .get("teams")
    .find((t) => t.name.toLowerCase() === String(name || "").toLowerCase() && t.passcode === passcode)
    .value();
  if (!team) return res.status(401).json({ error: "invalid team name or passcode" });
  if (team.status === "eliminated") return res.status(403).json({ error: "this team has been eliminated" });
  const token = issueToken({ role: "team", teamId: team.id });
  res.json({ token, team: publicTeam(team) });
});

// ---- Team-facing round content & submission ------------------------------
app.get("/api/round/:roundId/content", requireTeam, (req, res) => {
  const round = db.get("rounds").find({ id: req.params.roundId }).value();
  if (!round) return res.status(404).json({ error: "round not found" });
  if (round.status !== "live") return res.status(403).json({ error: "round is not live" });

  const progress = req.team.roundProgress?.[round.id] || {};

  if (round.key === "cyber-quiz") {
    const answers = progress.answers || {};
    return res.json({
      type: "cyber-quiz",
      questions: QUIZ_QUESTIONS.map((q, i) => ({ index: i, q: q.q, options: q.options })),
      answers,
      answeredCount: Object.keys(answers).length,
    });
  }
  if (round.key === "crypto-crack") {
    const solved = progress.solved || [];
    return res.json({
      type: "crypto-crack",
      total: CIPHER_CHAIN.length,
      ciphers: CIPHER_CHAIN.map((c, i) => ({ index: i, type: c.type, prompt: c.prompt })),
      solved,
      solvedAll: solved.length >= CIPHER_CHAIN.length,
    });
  }
  if (round.key === "bug-hunt") {
    return res.json({
      type: "bug-hunt",
      snippets: BUG_SNIPPETS.map((s) => ({ id: s.id, lang: s.lang, code: s.code, options: s.options })),
      submitted: progress.submitted || {},
    });
  }
  if (round.key === "cyber-detective") {
    return res.json({
      type: "cyber-detective",
      stations: DETECTIVE_STATIONS.map((s) => ({
        id: s.id,
        name: s.name,
        points: s.points,
        briefing: s.briefing,
        material: s.material,
      })),
      captured: progress.captured || [],
    });
  }
  res.status(400).json({ error: "unknown round type" });
});

app.post("/api/round/:roundId/submit", requireTeam, (req, res) => {
  const round = db.get("rounds").find({ id: req.params.roundId }).value();
  if (!round) return res.status(404).json({ error: "round not found" });
  if (round.status !== "live" || (round.endsAt && Date.now() >= round.endsAt)) {
    return res.status(403).json({ error: "round is locked or timer has completed" });
  }

  const teamRef = db.get("teams").find({ id: req.team.id });
  const team = teamRef.value();
  const progress = team.roundProgress?.[round.id] || {};


  // --- Round 1: Cyber Quiz ---
  if (round.key === "cyber-quiz") {
    const { index, optionIndex } = req.body;
    if (typeof index !== "number" || index < 0 || index >= QUIZ_QUESTIONS.length) {
      return res.status(400).json({ error: "invalid question index" });
    }
    const answers = progress.answers || {};
    answers[index] = optionIndex;
    const pointsPer = round.maxPoints / QUIZ_QUESTIONS.length;
    let correctCount = 0;
    Object.entries(answers).forEach(([idx, opt]) => {
      if (QUIZ_QUESTIONS[Number(idx)]?.a === opt) {
        correctCount++;
      }
    });
    const newScore = correctCount * pointsPer;
    teamRef.set(["roundProgress", round.id], { answers }).write();
    teamRef.set(["scores", "r1"], Math.round(newScore * 100) / 100).write();
    broadcastState();
    return res.json({ ok: true, answers, answeredCount: Object.keys(answers).length, total: QUIZ_QUESTIONS.length });
  }

  // --- Round 2: Crypto Crack ---
  if (round.key === "crypto-crack") {
    const { index, guess } = req.body;
    const stageIdx = Number(index ?? progress.stage ?? 0);
    if (isNaN(stageIdx) || stageIdx < 0 || stageIdx >= CIPHER_CHAIN.length) {
      return res.status(400).json({ error: "invalid stage index" });
    }
    const solved = progress.solved || [];
    const correct = String(guess || "").trim().toLowerCase() === CIPHER_CHAIN[stageIdx].answer.toLowerCase();
    if (!correct) return res.json({ ok: true, correct: false, solved });
    if (!solved.includes(stageIdx)) {
      solved.push(stageIdx);
    }
    const pointsPer = round.maxPoints / CIPHER_CHAIN.length;
    const newScore = Math.round(solved.length * pointsPer * 100) / 100;
    teamRef.set(["roundProgress", round.id], { solved }).write();
    teamRef.set(["scores", "r2"], newScore).write();
    broadcastState();
    return res.json({ ok: true, correct: true, solved, solvedAll: solved.length >= CIPHER_CHAIN.length });
  }


  // --- Round 3: Bug Hunt (auto id score now; explanation judged live in Control Room) ---
  if (round.key === "bug-hunt") {
    const { snippetId, optionIndex, explanation } = req.body;
    const snippet = BUG_SNIPPETS.find((s) => s.id === snippetId);
    if (!snippet) return res.status(400).json({ error: "invalid snippet" });
    const submitted = progress.submitted || {};
    if (submitted[snippetId]) return res.json({ ok: true, alreadySubmitted: true });
    submitted[snippetId] = { optionIndex, explanation: String(explanation || "").slice(0, 1000), correct: snippet.a === optionIndex };
    teamRef.set(["roundProgress", round.id], { submitted }).write();
    // Notify judges a new submission is waiting.
    io.to("admin").emit("judging:new", { teamId: team.id, teamName: team.name, snippetId });
    broadcastState();
    return res.json({ ok: true });
  }

  // --- Round 4: Cyber Detective ---
  if (round.key === "cyber-detective") {
    const { stationId, flag } = req.body;
    const station = DETECTIVE_STATIONS.find((s) => s.id === stationId);
    if (!station) return res.status(400).json({ error: "invalid station" });
    const captured = progress.captured || [];
    if (captured.includes(stationId)) return res.json({ ok: true, alreadyCaptured: true });
    const correct = String(flag || "").trim() === station.flag;
    if (!correct) return res.json({ ok: true, correct: false });
    captured.push(stationId);
    const newScore = captured.reduce((sum, id) => sum + DETECTIVE_STATIONS.find((s) => s.id === id).points, 0);
    teamRef.set(["roundProgress", round.id], { captured }).write();
    teamRef.set(["scores", "r4"], newScore).write();
    broadcastState();
    return res.json({ ok: true, correct: true, captured });
  }

  res.status(400).json({ error: "unknown round type" });
});

// Anti-cheat violation report (team-facing, server-side enforced & counted).
app.post("/api/violation", requireTeam, (req, res) => {
  const round = currentLiveRound();
  const result = recordViolation(req.team, round ? round.id : null, req.body?.type || "unknown");
  res.json(result);
});

app.get("/api/admin/overview", requireAdmin, (req, res) => {
  const teams = db.get("teams").value();
  const round = currentLiveRound();
  const activeTeams = teams
    .filter((t) => t.status !== "eliminated")
    .map(publicTeam)
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (a.violations !== b.violations) return a.violations - b.violations;
      return a.warnings - b.warnings;
    });
  const leader = activeTeams.length > 0 ? activeTeams[0] : null;

  res.json({
    onlineTeams: teams.filter((t) => t.status !== "eliminated").length,
    totalTeams: teams.length,
    currentRound: round ? `${round.id.toUpperCase()} ${round.name}` : "STANDBY",
    round,
    leader: leader ? { name: leader.name, total: leader.total, violations: leader.violations, warnings: leader.warnings } : null,
    submissionsIn: teams.reduce((sum, t) => sum + Object.keys(t.roundProgress?.r3?.submitted || {}).length, 0),
    flagsCaptured: teams.reduce((sum, t) => sum + (t.roundProgress?.r4?.captured?.length || 0), 0),
    violationsToday: db.get("violationsLog").value().length,
    warningsTotal: teams.reduce((sum, t) => sum + (t.warnings || 0), 0),
    eliminated: teams.filter((t) => t.status === "eliminated").length,
  });
});



app.get("/api/admin/teams", requireAdmin, (req, res) => {
  res.json(db.get("teams").value().map((team) => ({ ...publicTeam(team), passcode: team.passcode })));
});

app.post("/api/admin/teams", requireAdmin, (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "team name required" });
  const passcode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const team = {
    id: nanoid(10),
    name: name.trim(),
    passcode,
    createdAt: Date.now(),
    scores: { r1: 0, r2: 0, r3: 0, r4: 0, bonus: 0 },
    warnings: 0,
    violations: 0,
    status: "active",
    roundProgress: {},
  };
  db.get("teams").push(team).write();
  broadcastState();
  res.json({ team: publicTeam(team), passcode });
});

app.post("/api/admin/teams/import", requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Excel file required" });

  let rows;
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  } catch (error) {
    return res.status(400).json({ error: "Could not read Excel file" });
  }

  const existingNames = new Set(db.get("teams").value().map((team) => team.name.trim().toLowerCase()));
  const created = [];
  const skipped = [];

  for (const row of rows) {
    const nameKey = Object.keys(row).find((key) => /^(team\s*)?name$/i.test(String(key).trim()));
    const name = String(nameKey ? row[nameKey] : Object.values(row)[0] || "").trim();
    if (!name) {
      skipped.push({ name: "", reason: "empty team name" });
      continue;
    }
    const normalizedName = name.toLowerCase();
    if (existingNames.has(normalizedName)) {
      skipped.push({ name, reason: "duplicate team name" });
      continue;
    }

    const team = {
      id: nanoid(10),
      name,
      passcode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      createdAt: Date.now(),
      scores: { r1: 0, r2: 0, r3: 0, r4: 0, bonus: 0 },
      warnings: 0,
      violations: 0,
      status: "active",
      roundProgress: {},
    };
    db.get("teams").push(team).write();
    existingNames.add(normalizedName);
    created.push({ name: team.name, passcode: team.passcode });
  }

  if (created.length) broadcastState();
  res.json({ created, skipped, total: created.length });
});

app.delete("/api/admin/teams/:id", requireAdmin, (req, res) => {
  db.get("teams").remove({ id: req.params.id }).write();
  broadcastState();
  res.json({ ok: true });
});

app.post("/api/admin/teams/:id/reset", requireAdmin, (req, res) => {
  const teamRef = db.get("teams").find({ id: req.params.id });
  if (!teamRef.value()) return res.status(404).json({ error: "team not found" });
  teamRef.assign({ warnings: 0, violations: 0, status: "active", roundProgress: {} }).write();
  broadcastState();
  res.json({ ok: true });
});

app.post("/api/admin/teams/:id/eliminate", requireAdmin, (req, res) => {
  const teamRef = db.get("teams").find({ id: req.params.id });
  if (!teamRef.value()) return res.status(404).json({ error: "team not found" });
  teamRef.assign({ status: "eliminated" }).write();
  broadcastState();
  io.to(`team:${req.params.id}`).emit("violation:ack", { action: "eliminated", message: "Your team has been eliminated by the control room." });
  res.json({ ok: true });
});

app.post("/api/admin/teams/:id/reinstate", requireAdmin, (req, res) => {
  const teamRef = db.get("teams").find({ id: req.params.id });
  if (!teamRef.value()) return res.status(404).json({ error: "team not found" });
  teamRef.assign({ status: "active" }).write();
  broadcastState();
  res.json({ ok: true });
});

app.post("/api/admin/teams/:id/bonus", requireAdmin, (req, res) => {
  const { points } = req.body || {};
  const teamRef = db.get("teams").find({ id: req.params.id });
  if (!teamRef.value()) return res.status(404).json({ error: "team not found" });
  teamRef.set(["scores", "bonus"], Number(points) || 0).write();
  broadcastState();
  res.json({ ok: true });
});

app.put("/api/admin/rounds/:id", requireAdmin, (req, res) => {
  const { timerMinutes, autoStop } = req.body || {};
  const roundRef = db.get("rounds").find({ id: req.params.id });
  if (!roundRef.value()) return res.status(404).json({ error: "round not found" });
  const patch = {};
  if (typeof timerMinutes === "number") patch.timerMinutes = timerMinutes;
  if (typeof autoStop === "boolean") patch.autoStop = autoStop;
  roundRef.assign(patch).write();
  broadcastState();
  res.json({ ok: true });
});

app.post("/api/admin/rounds/:id/start", requireAdmin, (req, res) => {
  const rounds = db.get("rounds");
  const roundRef = rounds.find({ id: req.params.id });
  const round = roundRef.value();
  if (!round) return res.status(404).json({ error: "round not found" });

  // Only one round live at a time; lock any other live round.
  rounds
    .filter((r) => r.status === "live" && r.id !== round.id)
    .forEach((r) => rounds.find({ id: r.id }).assign({ status: "closed" }).write());

  const startedAt = Date.now();
  const endsAt = startedAt + round.timerMinutes * 60 * 1000;
  roundRef.assign({ status: "live", startedAt, endsAt }).write();
  db.set("event.standby", false).write();
  broadcastState();
  io.emit("round:started", { roundId: round.id, startedAt, endsAt });
  res.json({ ok: true, startedAt, endsAt });
});

app.post("/api/admin/rounds/:id/lock", requireAdmin, (req, res) => {
  const roundRef = db.get("rounds").find({ id: req.params.id });
  if (!roundRef.value()) return res.status(404).json({ error: "round not found" });
  roundRef.assign({ status: "closed" }).write();
  broadcastState();
  io.emit("round:locked", { roundId: req.params.id });
  res.json({ ok: true });
});

app.post("/api/admin/rounds/:id/reset-all", requireAdmin, (req, res) => {
  const roundId = req.params.id;
  const roundRef = db.get("rounds").find({ id: roundId });
  if (!roundRef.value()) return res.status(404).json({ error: "round not found" });
  roundRef.assign({ status: "locked", startedAt: null, endsAt: null }).write();
  const scoreKey = roundId;
  db.get("teams")
    .forEach((t) => {
      db.get("teams").find({ id: t.id }).set(["scores", scoreKey], 0).set(["roundProgress", roundId], {}).write();
    })
    .write();
  broadcastState();
  io.emit("round:reset", { roundId });
  res.json({ ok: true });
});

app.get("/api/admin/violations", requireAdmin, (req, res) => {
  res.json(db.get("violationsLog").value().slice().reverse());
});

app.post("/api/admin/violations/:teamId/clear", requireAdmin, (req, res) => {
  const teamRef = db.get("teams").find({ id: req.params.teamId });
  if (!teamRef.value()) return res.status(404).json({ error: "team not found" });
  teamRef.assign({ warnings: 0, violations: 0, status: "active" }).write();
  broadcastState();
  res.json({ ok: true });
});

// Judging (Bug Hunt manual scoring)
app.get("/api/admin/judging/:roundId", requireAdmin, (req, res) => {
  const teams = db.get("teams").value();
  const submissions = teams
    .filter((t) => t.roundProgress?.[req.params.roundId]?.submitted)
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      submitted: t.roundProgress[req.params.roundId].submitted,
      scores: db.get(["judging", req.params.roundId, t.id]).value() || {},
    }));
  res.json(submissions);
});

app.post("/api/admin/judging/:roundId/:teamId", requireAdmin, (req, res) => {
  const { snippetId, points } = req.body || {};
  const path = ["judging", req.params.roundId, req.params.teamId];
  const existing = db.get(path).value() || {};
  existing[snippetId] = Number(points) || 0;
  db.set(path, existing).write();

  const total = Object.values(existing).reduce((s, v) => s + v, 0);
  db.get("teams").find({ id: req.params.teamId }).set(["scores", "r3"], total).write();
  broadcastState();
  res.json({ ok: true, total });
});

app.get("/api/admin/export-csv", requireAdmin, (req, res) => {
  const teams = db.get("teams").value().map(publicTeam);
  const header = "Team,R1,R2,R3,R4,Bonus,Total,Warnings,Violations,Status\n";
  const rows = teams
    .map((t) => [t.name, t.scores.r1, t.scores.r2, t.scores.r3, t.scores.r4, t.scores.bonus, t.total, t.warnings, t.violations, t.status].join(","))
    .join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=cyberclash-results.csv");
  res.send(header + rows);
});

app.post("/api/admin/danger/reset-event", requireAdmin, (req, res) => {
  db.set("teams", []).write();
  db.set("violationsLog", []).write();
  db.set("judging", { r3: {} }).write();
  db.set("sessions", {}).write();
  db.get("rounds")
    .forEach((r) => db.get("rounds").find({ id: r.id }).assign({ status: "locked", startedAt: null, endsAt: null }).write())
    .write();
  db.set("event.standby", true).write();
  broadcastState();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Socket.IO — identification & rooms
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  socket.emit("state:update", publicState());

  socket.on("identify", (token) => {
    const sess = getSession(token);
    if (!sess) return;
    if (sess.role === "admin") socket.join("admin");
    if (sess.role === "team") socket.join(`team:${sess.teamId}`);
  });
});


// Auto-stop timers: check every 2s whether a live round's endsAt has passed.
setInterval(() => {
  const rounds = db.get("rounds").value();
  const live = rounds.find((r) => r.status === "live");
  if (live && live.autoStop && live.endsAt && Date.now() >= live.endsAt) {
    db.get("rounds").find({ id: live.id }).assign({ status: "closed" }).write();
    broadcastState();
    io.emit("round:locked", { roundId: live.id, reason: "timer" });
  }
}, 2000);

const distPath = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`Cyber Clash backend running on :${PORT}`);
  console.log(`Admin passcode: ${ADMIN_PASSCODE} (set ADMIN_PASSCODE env var to change)`);
});

