const express = require("express");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

// Обязательный middleware для чтения cookies
app.use(cookieParser());

// --- Главная страница ---
app.get("/", (req, res) => {
  // Обычная кука (SameSite=Strict)
  let sessionId, sessionStatus;
  if (!req.cookies || !req.cookies.session_id) {
    sessionId = uuidv4();
    sessionStatus = "Новая сессия создана";
    res.cookie("session_id", sessionId, {
      httpOnly: false,
      secure: true,
      sameSite: "Strict",
      path: "/",
      maxAge: 3600000,
    });
  } else {
    sessionId = req.cookies.session_id;
    sessionStatus = "Сессия сохранена";
  }

  // Partitioned кука (CHIPS) — всегда пересоздаётся если не пришла
  let partitionedId, partitionedStatus;
  if (!req.cookies || !req.cookies.partitioned_id) {
    partitionedId = uuidv4();
    partitionedStatus = "Новая partitioned сессия создана";
    res.cookie("partitioned_id", partitionedId, {
      httpOnly: false,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 3600000,
      partitioned: true,
    });
  } else {
    partitionedId = req.cookies.partitioned_id;
    partitionedStatus = "Partitioned сессия сохранена";
  }

  res.send(buildPage(sessionId, sessionStatus, partitionedId, partitionedStatus));
});

// --- API: вернуть текущую сессию в JSON ---
app.get("/api/session", (req, res) => {
  const sessionId = req.cookies ? req.cookies.session_id : null;
  const partitionedId = req.cookies ? req.cookies.partitioned_id : null;
  res.json({
    session_id: sessionId || "NO_COOKIE",
    partitioned_id: partitionedId || "NO_COOKIE",
    origin: req.get("Origin") || req.get("Referer") || "direct",
    timestamp: new Date().toISOString(),
  });
});

// --- API: принудительно создать новую сессию ---
app.get("/api/new-session", (req, res) => {
  const newSessionId = uuidv4();
  const newPartitionedId = uuidv4();
  res.cookie("session_id", newSessionId, {
    httpOnly: false,
    secure: true,
    sameSite: "Strict",
    path: "/",
    maxAge: 3600000,
  });
  res.cookie("partitioned_id", newPartitionedId, {
    httpOnly: false,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: 3600000,
    partitioned: true,
  });
  res.json({
    session_id: newSessionId,
    partitioned_id: newPartitionedId,
    message: "Новые сессии созданы",
    timestamp: new Date().toISOString(),
  });
});

// --- API: удалить куку ---
app.get("/api/reset", (req, res) => {
  res.clearCookie("session_id", { path: "/" });
  res.clearCookie("partitioned_id", { path: "/", partitioned: true });
  res.json({ message: "Куки удалены", timestamp: new Date().toISOString() });
});

function buildPage(sessionId, status, partitionedId, partitionedStatus) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>example.localhost — Cookie Test</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e; color: #e0e0e0;
      padding: 20px; min-height: 100vh;
    }
    .card {
      background: #16213e; border-radius: 12px; padding: 24px;
      margin: 12px 0; border: 1px solid #0f3460;
    }
    h1 { color: #e94560; margin-bottom: 8px; font-size: 1.4em; }
    h2 { color: #53a8b6; margin-bottom: 12px; font-size: 1.1em; }
    .session-id {
      font-family: 'Courier New', monospace;
      background: #0f3460; padding: 12px 16px; border-radius: 8px;
      word-break: break-all; font-size: 1.1em; color: #53a8b6;
      margin: 8px 0;
    }
    .status { color: #4ecca3; font-weight: bold; }
    .badge {
      display: inline-block; background: #e94560; color: white;
      padding: 2px 10px; border-radius: 12px; font-size: 0.85em;
      margin-left: 8px; vertical-align: middle;
    }
    .info { color: #aaa; font-size: 0.9em; line-height: 1.6; }
    button {
      background: #e94560; color: white; border: none;
      padding: 10px 20px; border-radius: 8px; cursor: pointer;
      font-size: 0.95em; margin: 4px;
    }
    button:hover { background: #c73650; }
    button.secondary { background: #0f3460; }
    button.secondary:hover { background: #1a4a8a; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🍪 example.localhost <span class="badge">SameSite=Strict</span> <span class="badge" style="background:#4ecca3">Partitioned</span></h1>
    <p class="info">Этот сайт выставляет <b>две</b> куки: обычную (SameSite=Strict) и partitioned (CHIPS).</p>
  </div>

  <div class="card">
    <h2>🔴 Обычная кука <code>session_id</code> (SameSite=Strict)</h2>
    <p><span class="status">${status}</span></p>
    <div class="session-id" id="sessionId">${sessionId}</div>
    <p class="info" style="margin-top:8px">В cross-site iframe кука <b>не отправляется</b> → сервер каждый раз создаёт новую.</p>
  </div>

  <div class="card">
    <h2>🟢 Partitioned кука <code>partitioned_id</code> (CHIPS)</h2>
    <p><span class="status">${partitionedStatus}</span></p>
    <div class="session-id" id="partitionedId" style="border-left:3px solid #4ecca3">${partitionedId}</div>
    <p class="info" style="margin-top:8px">Каждый top-frame origin получает <b>свою</b> куку. Внутри одного origin — кука сохраняется.</p>
  </div>

  <div class="card">
    <h2>Действия</h2>
    <button onclick="newSession()">🔄 Новые сессии</button>
    <button class="secondary" onclick="resetCookie()">🗑️ Сбросить куки</button>
    <button class="secondary" onclick="loadSession()">📡 Загрузить через API</button>
  </div>

  <div class="card">
    <h2>Информация</h2>
    <p class="info">
      <b>🔴 SameSite=Strict:</b> кука не отправляется в cross-site iframe → сервер видит пустую куку и создаёт новую каждый раз.<br><br>
      <b>🟢 Partitioned (CHIPS):</b> кука автоматически партиционируется по top-frame origin.<br>
      site-a.localhost и site-b.localhost получают <b>разные</b> куки, но внутри каждого — кука <b>сохраняется</b> при F5.
    </p>
  </div>

  <script>
    async function newSession() {
      const r = await fetch('/api/new-session');
      const d = await r.json();
      document.getElementById('sessionId').textContent = d.session_id;
      document.getElementById('partitionedId').textContent = d.partitioned_id;
    }
    async function resetCookie() {
      await fetch('/api/reset');
      document.getElementById('sessionId').textContent = 'КУКА УДАЛЕНА';
      document.getElementById('partitionedId').textContent = 'КУКА УДАЛЕНА';
    }
    async function loadSession() {
      const r = await fetch('/api/session');
      const d = await r.json();
      document.getElementById('sessionId').textContent = d.session_id;
      document.getElementById('partitionedId').textContent = d.partitioned_id;
    }
  </script>
</body>
</html>`;
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`example-app listening on port ${PORT}`);
});
