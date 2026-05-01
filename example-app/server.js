const express = require("express");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

// Обязательный middleware для чтения cookies
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Главная страница ---
app.get("/", (req, res) => {
  // 🔴 Обычная кука (SameSite=Strict)
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

  // 🟡 Кука (SameSite=Lax)
  let laxId, laxStatus;
  if (!req.cookies || !req.cookies.lax_id) {
    laxId = uuidv4();
    laxStatus = "Новая Lax сессия создана";
    res.cookie("lax_id", laxId, {
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 3600000,
    });
  } else {
    laxId = req.cookies.lax_id;
    laxStatus = "Lax сессия сохранена";
  }

  // 🟢 Partitioned кука (CHIPS)
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

  // 🔵 Обычная SameSite=None кука (без Partitioned)
  let noneId, noneStatus;
  if (!req.cookies || !req.cookies.none_id) {
    noneId = uuidv4();
    noneStatus = "Новая None сессия создана";
    res.cookie("none_id", noneId, {
      httpOnly: false,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 3600000,
    });
  } else {
    noneId = req.cookies.none_id;
    noneStatus = "None сессия сохранена";
  }

  res.send(buildPage(sessionId, sessionStatus, laxId, laxStatus, partitionedId, partitionedStatus, noneId, noneStatus));
});

// --- API: вернуть текущую сессию в JSON ---
app.get("/api/session", (req, res) => {
  const sessionId = req.cookies ? req.cookies.session_id : null;
  const laxId = req.cookies ? req.cookies.lax_id : null;
  const partitionedId = req.cookies ? req.cookies.partitioned_id : null;
  const noneId = req.cookies ? req.cookies.none_id : null;
  res.json({
    session_id: sessionId || "NO_COOKIE",
    lax_id: laxId || "NO_COOKIE",
    partitioned_id: partitionedId || "NO_COOKIE",
    none_id: noneId || "NO_COOKIE",
    origin: req.get("Origin") || req.get("Referer") || "direct",
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// --- API: POST-эндпоинт для проверки передачи куки ---
app.post("/api/session", (req, res) => {
  const sessionId = req.cookies ? req.cookies.session_id : null;
  const laxId = req.cookies ? req.cookies.lax_id : null;
  const partitionedId = req.cookies ? req.cookies.partitioned_id : null;
  const noneId = req.cookies ? req.cookies.none_id : null;
  res.json({
    session_id: sessionId || "NO_COOKIE",
    lax_id: laxId || "NO_COOKIE",
    partitioned_id: partitionedId || "NO_COOKIE",
    none_id: noneId || "NO_COOKIE",
    origin: req.get("Origin") || req.get("Referer") || "direct",
    method: "POST",
    body: req.body,
    timestamp: new Date().toISOString(),
  });
});

// --- API: принудительно создать новую сессию ---
app.get("/api/new-session", (req, res) => {
  const newSessionId = uuidv4();
  const newLaxId = uuidv4();
  const newPartitionedId = uuidv4();
  const newNoneId = uuidv4();
  res.cookie("session_id", newSessionId, {
    httpOnly: false,
    secure: true,
    sameSite: "Strict",
    path: "/",
    maxAge: 3600000,
  });
  res.cookie("lax_id", newLaxId, {
    httpOnly: false,
    secure: true,
    sameSite: "Lax",
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
  res.cookie("none_id", newNoneId, {
    httpOnly: false,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: 3600000,
  });
  res.json({
    session_id: newSessionId,
    lax_id: newLaxId,
    partitioned_id: newPartitionedId,
    none_id: newNoneId,
    message: "Новые сессии созданы",
    timestamp: new Date().toISOString(),
  });
});

// --- API: удалить куку ---
app.get("/api/reset", (req, res) => {
  res.clearCookie("session_id", { path: "/" });
  res.clearCookie("lax_id", { path: "/" });
  res.clearCookie("partitioned_id", { path: "/", partitioned: true });
  res.clearCookie("none_id", { path: "/" });
  res.json({ message: "Куки удалены", timestamp: new Date().toISOString() });
});

function buildPage(sessionId, sessionStatus, laxId, laxStatus, partitionedId, partitionedStatus, noneId, noneStatus) {
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
    button.post-btn { background: #f0c040; color: #0a0a1a; }
    button.post-btn:hover { background: #d4a830; }
    .result-box {
      background: #0a0a1a; padding: 12px; border-radius: 8px;
      font-family: 'Courier New', monospace; font-size: 0.85em;
      color: #aaa; margin-top: 8px; white-space: pre-wrap;
      min-height: 40px;
    }
    .result-box.ok { color: #4ecca3; }
    .result-box.fail { color: #e94560; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #0f3460; font-size: 0.9em; }
    th { color: #53a8b6; font-weight: bold; }
    td { color: #aaa; }
    .sent { color: #4ecca3; font-weight: bold; }
    .blocked { color: #e94560; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🍪 example.localhost
      <span class="badge">Strict</span>
      <span class="badge" style="background:#f0c040;color:#0a0a1a">Lax</span>
      <span class="badge" style="background:#4ecca3">Partitioned</span>
      <span class="badge" style="background:#53a8b6">None</span>
    </h1>
    <p class="info">Этот сайт выставляет <b>четыре</b> куки с разными SameSite-атрибутами.</p>
  </div>

  <div class="card">
    <h2>🔴 <code>session_id</code> (SameSite=Strict)</h2>
    <p><span class="status">${sessionStatus}</span></p>
    <div class="session-id" id="sessionId">${sessionId}</div>
    <p class="info" style="margin-top:8px">В cross-site iframe кука <b>не отправляется</b> ни при GET, ни при POST.</p>
  </div>

  <div class="card">
    <h2>🟡 <code>lax_id</code> (SameSite=Lax)</h2>
    <p><span class="status">${laxStatus}</span></p>
    <div class="session-id" id="laxId" style="border-left:3px solid #f0c040">${laxId}</div>
    <p class="info" style="margin-top:8px">Отправляется при top-level GET-навигации, но <b>не отправляется</b> при cross-site POST.</p>
  </div>

  <div class="card">
    <h2>🟢 <code>partitioned_id</code> (CHIPS)</h2>
    <p><span class="status">${partitionedStatus}</span></p>
    <div class="session-id" id="partitionedId" style="border-left:3px solid #4ecca3">${partitionedId}</div>
    <p class="info" style="margin-top:8px">Каждый top-frame origin получает <b>свою</b> куку. Отправляется и при GET, и при POST.</p>
  </div>

  <div class="card">
    <h2>🔵 <code>none_id</code> (SameSite=None, без Partitioned)</h2>
    <p><span class="status">${noneStatus}</span></p>
    <div class="session-id" id="noneId" style="border-left:3px solid #53a8b6">${noneId}</div>
    <p class="info" style="margin-top:8px">Отправляется <b>везде</b>: в iframe, при GET, при POST. <b>Одна и та же</b> кука шарится между всеми iframe и основным сайтом (в отличие от CHIPS).</p>
  </div>

  <div class="card">
    <h2>📋 Таблица передачи куки (cross-site iframe)</h2>
    <table>
      <tr>
        <th>Кука</th>
        <th>GET-запрос</th>
        <th>POST-запрос</th>
        <th>Сохраняется в iframe</th>
      </tr>
      <tr>
        <td>🔴 Strict</td>
        <td class="blocked">❌ Нет</td>
        <td class="blocked">❌ Нет</td>
        <td class="blocked">❌ Нет</td>
      </tr>
      <tr>
        <td>🟡 Lax</td>
        <td class="sent">✅ Да (top-level)</td>
        <td class="blocked">❌ Нет</td>
        <td class="blocked">❌ Нет (в iframe)</td>
      </tr>
      <tr>
        <td>🟢 Partitioned</td>
        <td class="sent">✅ Да</td>
        <td class="sent">✅ Да</td>
        <td class="sent">✅ Да (свой partition)</td>
      </tr>
      <tr>
        <td>🔵 None (unpartitioned)</td>
        <td class="sent">✅ Да</td>
        <td class="sent">✅ Да</td>
        <td class="sent">✅ Да (одна на всех)</td>
      </tr>
    </table>
  </div>

  <div class="card">
    <h2>🧪 Тест: POST-запрос</h2>
    <p class="info">Нажмите кнопку — будет отправлен POST-запрос к /api/session. Проверим, какие куки пришли.</p>
    <div style="margin-top:12px">
      <button class="post-btn" onclick="postTest()">📮 Отправить POST</button>
      <button class="secondary" onclick="getTest()">📡 Отправить GET</button>
    </div>
    <div class="result-box" id="postResult">Нажмите кнопку для теста...</div>
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
      <b>🔴 SameSite=Strict:</b> кука не отправляется в cross-site iframe ни при GET, ни при POST → сервер видит пустую куку и создаёт новую каждый раз.<br><br>
      <b>🟡 SameSite=Lax:</b> кука отправляется при top-level GET-навигации, но не при cross-site POST и не в iframe.<br><br>
      <b>🟢 Partitioned (CHIPS):</b> кука автоматически партиционируется по top-frame origin. Отправляется и при GET, и при POST. site-a.localhost и site-b.localhost получают <b>разные</b> куки, но внутри каждого — кука <b>сохраняется</b> при F5.<br><br>
      <b>🔵 SameSite=None (без Partitioned):</b> кука отправляется <b>везде</b> — в iframe, при GET, при POST. В отличие от CHIPS, это <b>одна общая кука</b> для всех origin — site-a, site-b и прямой доступ видят <b>одинаковый</b> ID.
    </p>
  </div>

  <script>
    async function newSession() {
      const r = await fetch('/api/new-session');
      const d = await r.json();
      document.getElementById('sessionId').textContent = d.session_id;
      document.getElementById('laxId').textContent = d.lax_id;
      document.getElementById('partitionedId').textContent = d.partitioned_id;
      document.getElementById('noneId').textContent = d.none_id;
    }
    async function resetCookie() {
      await fetch('/api/reset');
      document.getElementById('sessionId').textContent = 'КУКА УДАЛЕНА';
      document.getElementById('laxId').textContent = 'КУКА УДАЛЕНА';
      document.getElementById('partitionedId').textContent = 'КУКА УДАЛЕНА';
      document.getElementById('noneId').textContent = 'КУКА УДАЛЕНА';
    }
    async function loadSession() {
      const r = await fetch('/api/session');
      const d = await r.json();
      document.getElementById('sessionId').textContent = d.session_id;
      document.getElementById('laxId').textContent = d.lax_id;
      document.getElementById('partitionedId').textContent = d.partitioned_id;
      document.getElementById('noneId').textContent = d.none_id;
    }

    async function postTest() {
      const el = document.getElementById('postResult');
      el.textContent = 'Отправка POST...';
      el.className = 'result-box';
      try {
        const r = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'post-request', ts: Date.now() })
        });
        const d = await r.json();
        const lines = [
          '📮 POST-ответ (method: ' + d.method + ')',
          '🔴 session_id:  ' + d.session_id,
          '🟡 lax_id:      ' + d.lax_id,
          '🟢 partitioned: ' + d.partitioned_id,
          '🔵 none_id:     ' + d.none_id,
          '⏰ ' + d.timestamp
        ];
        el.textContent = lines.join('\n');
        el.className = 'result-box ok';
      } catch(e) {
        el.textContent = '❌ Ошибка: ' + e.message;
        el.className = 'result-box fail';
      }
    }

    async function getTest() {
      const el = document.getElementById('postResult');
      el.textContent = 'Отправка GET...';
      el.className = 'result-box';
      try {
        const r = await fetch('/api/session');
        const d = await r.json();
        const lines = [
          '📡 GET-ответ (method: ' + d.method + ')',
          '🔴 session_id:  ' + d.session_id,
          '🟡 lax_id:      ' + d.lax_id,
          '🟢 partitioned: ' + d.partitioned_id,
          '🔵 none_id:     ' + d.none_id,
          '⏰ ' + d.timestamp
        ];
        el.textContent = lines.join('\n');
        el.className = 'result-box ok';
      } catch(e) {
        el.textContent = '❌ Ошибка: ' + e.message;
        el.className = 'result-box fail';
      }
    }
  </script>
</body>
</html>`;
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`example-app listening on port ${PORT}`);
});
