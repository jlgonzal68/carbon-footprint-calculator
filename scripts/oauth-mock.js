#!/usr/bin/env node
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Use Express built-in parsers instead of body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple CORS middleware so frontend/dev tools can call it
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const PORT = process.env.PORT || 3001;
const USERS_FILE = process.env.OAUTH_MOCK_USERS_FILE || path.resolve(__dirname, "oauth-mock.users.json");

async function loadUsers() {
  try {
    const txt = await fs.readFile(USERS_FILE, "utf8");
    const users = JSON.parse(txt);
    return users;
  } catch (err) {
    // If file missing, create with defaults
    const defaultUsers = [
      { openId: "admin@test.local", name: "Administrador", email: "admin@test.local", roles: ["administrador"] },
      { openId: "user@test.local", name: "User Test", email: "user@test.local", roles: ["usuario"] },
    ];
    await saveUsers(defaultUsers);
    return defaultUsers;
  }
}

async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

const REVOKED_FILE = process.env.OAUTH_MOCK_REVOKED_FILE || path.resolve(__dirname, "oauth-mock.revoked.json");

async function loadRevokedTokens() {
  try {
    const txt = await fs.readFile(REVOKED_FILE, "utf8");
    return JSON.parse(txt);
  } catch (err) {
    await saveRevokedTokens([]);
    return [];
  }
}

async function saveRevokedTokens(list) {
  await fs.writeFile(REVOKED_FILE, JSON.stringify(list, null, 2), "utf8");
}

function makeAccessTokenForCode(code) {
  // code format: mockcode-<openId>-<rand>
  return `mock-access-token-${code}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractOpenIdFromCode(code) {
  const m = /^mockcode-([^\-]+)(?:-|$)/.exec(code);
  if (m) return m[1];
  return null;
}

app.get("/", (req, res) => {
  res.send(`OAuth mock server: visit /app-auth to simulate a login. Users file: ${USERS_FILE}`);
});

// Admin: list users
app.get("/admin/users", async (req, res) => {
  const users = await loadUsers();
  res.json(users);
});

// Admin: create/update user
app.post("/admin/users", async (req, res) => {
  const body = req.body || {};
  const { openId, name, email, roles } = body;
  if (!openId) return res.status(400).json({ error: "openId required" });
  const users = await loadUsers();
  const existing = users.find((u) => u.openId === openId);
  if (existing) {
    existing.name = name ?? existing.name;
    existing.email = email ?? existing.email;
    existing.roles = roles ?? existing.roles;
  } else {
    users.push({ openId, name: name || openId, email: email || "", roles: roles || [] });
  }
  await saveUsers(users);
  res.json({ ok: true });
});

// Admin: delete user
app.delete("/admin/users/:openId", async (req, res) => {
  const openId = req.params.openId;
  const users = await loadUsers();
  const idx = users.findIndex((u) => u.openId === openId);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  users.splice(idx, 1);
  await saveUsers(users);
  res.json({ ok: true });
});

// Admin: revoke token
app.post("/admin/revoke", async (req, res) => {
  const { accessToken } = req.body || {};
  if (!accessToken) return res.status(400).json({ error: "accessToken required" });
  const revoked = await loadRevokedTokens();
  if (!revoked.includes(accessToken)) {
    revoked.push(accessToken);
    await saveRevokedTokens(revoked);
  }
  res.json({ ok: true });
});

// Admin: list revoked tokens
app.get("/admin/revoked", async (req, res) => {
  const revoked = await loadRevokedTokens();
  res.json(revoked);
});

// Admin: unrevoke (delete revoked token)
app.delete("/admin/revoked/:token", async (req, res) => {
  const token = req.params.token;
  const revoked = await loadRevokedTokens();
  const idx = revoked.indexOf(token);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  revoked.splice(idx, 1);
  await saveRevokedTokens(revoked);
  res.json({ ok: true });
});

// Admin UI
app.get("/admin", async (req, res) => {
  const html = `<!doctype html>
  <html>
    <head><meta charset="utf-8"><title>OAuth Mock Admin</title></head>
    <body>
      <h1>OAuth Mock Admin</h1>
      <section>
        <h2>Users</h2>
        <div id="users"></div>
        <h3>Create / Update User</h3>
        <form id="userForm">
          <input name="openId" placeholder="openId" required />
          <input name="name" placeholder="name" />
          <input name="email" placeholder="email" />
          <input name="roles" placeholder="roles comma separated" />
          <button type="submit">Save</button>
        </form>
      </section>
      <section>
        <h2>Revoked Tokens</h2>
        <div id="revoked"></div>
        <h3>Revoke Token</h3>
        <form id="revokeForm">
          <input name="accessToken" placeholder="accessToken" required />
          <button type="submit">Revoke</button>
        </form>
      </section>

      <script>
        async function load() {
          const u = await fetch('/admin/users').then(r=>r.json());
          document.getElementById('users').innerHTML = '<ul>' + u.map(function(x){ return '<li>'+x.openId+' ('+x.name+') ['+(x.roles||[]).join(',')+'] <button onclick="delUser(\''+x.openId+'\')">Delete</button></li>'; }).join('') + '</ul>';
          const r = await fetch('/admin/revoked').then(r=>r.json());
          document.getElementById('revoked').innerHTML = '<ul>' + r.map(function(t){ return '<li>'+t+' <button onclick="unrevoke(\''+encodeURIComponent(t)+'\')">Unrevoke</button></li>'; }).join('') + '</ul>';
        }
        async function delUser(openId){ if(!confirm('Delete '+openId+'?')) return; await fetch('/admin/users/'+openId,{method:'DELETE'}); load(); }
        async function unrevoke(token){ await fetch('/admin/revoked/'+decodeURIComponent(token),{method:'DELETE'}); load(); }
        document.getElementById('userForm').addEventListener('submit', async (e)=>{ e.preventDefault(); const fd = new FormData(e.target); const roles = fd.get('roles') ? fd.get('roles').split(',').map(s=>s.trim()).filter(Boolean) : []; const body = { openId: fd.get('openId'), name: fd.get('name'), email: fd.get('email'), roles }; await fetch('/admin/users',{method:'POST',headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}); e.target.reset(); load(); });
        document.getElementById('revokeForm').addEventListener('submit', async (e)=>{ e.preventDefault(); const fd = new FormData(e.target); await fetch('/admin/revoke',{method:'POST',headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accessToken: fd.get('accessToken') })}); e.target.reset(); load(); });
        load();
      </script>
    </body>
  </html>`;
  res.send(html);
});

// Simple login page that lets you choose a user and redirects to the provided redirectUri with code + state
app.get("/oauth/authorize", async (req, res) => {
  const { client_id = "mock-app", redirect_uri = "http://localhost:8081/oauth/callback", state = "", response_type = "code" } = req.query;
  // Encode redirect_uri in base64 for state parameter (SDK expects this format)
  const encodedState = Buffer.from(redirect_uri).toString("base64");
  // Redirect to /app-auth with proper parameters
  const params = new URLSearchParams({
    appId: client_id,
    redirectUri: redirect_uri,
    state: encodedState,
  });
  res.redirect(`/app-auth?${params.toString()}`);
});

app.get("/app-auth", async (req, res) => {
  const { appId = "mock-app", redirectUri = "http://localhost:8081/oauth/callback", state = "", user = "" } = req.query;
  const users = await loadUsers();

  const options = users
    .map((u) => `<option value="${u.openId}" ${u.openId === String(user) ? "selected" : ""}>${u.name} (${u.openId})</option>`)
    .join("\n");

  // The form should redirect to the BACKEND /api/oauth/callback, not directly to the frontend
  // The backend will exchange the code for a token and then redirect to the frontend
  const backendCallbackUrl = "http://localhost:3001/api/oauth/callback";

  const html = `<!doctype html>
  <html>
    <head><meta charset="utf-8"><title>OAuth Mock Login</title></head>
    <body>
      <h1>OAuth Mock Login</h1>
      <p>App ID: ${String(appId)}</p>
      <form method="GET" action="${String(backendCallbackUrl)}">
        <label>Select user:</label>
        <select name="openId">${options}</select>
        <input type="hidden" name="state" value="${String(state)}" />
        <input type="hidden" name="code" value="" id="codeField" />
        <button type="button" onclick="document.getElementById('codeField').value='mockcode-'+document.querySelector('select[name=openId]').value; this.form.submit();">Login as Selected User</button>
      </form>
      <hr />
      <p>Direct link (preselect user): <code>/app-auth?user=${encodeURIComponent(users[0]?.openId || "")}</code></p>
    </body>
  </html>`;
  res.send(html);
});

// Exchange code => token
app.post("/webdev.v1.WebDevAuthPublicService/ExchangeToken", async (req, res) => {
  const { clientId, grantType, code } = req.body || {};
  if (!code) return res.status(400).json({ error: "missing code" });

  const openIdFromCode = extractOpenIdFromCode(code);
  const users = await loadUsers();
  const user = users.find((u) => u.openId === openIdFromCode) ?? users[0];

  if (!user) return res.status(400).json({ error: "invalid code" });

  const accessToken = makeAccessTokenForCode(code);
  const refreshToken = `mock-refresh-${Math.random().toString(36).slice(2, 8)}`;

  // Attach simple metadata so GetUserInfo can resolve
  // In this mock we do not persist tokens to disk; they are encoded enough to extract openId

  res.json({
    accessToken,
    refreshToken,
    expiresIn: 3600,
    tokenType: "Bearer",
    openId: user.openId,
  });
});

// Return user info for a given access token
app.post("/webdev.v1.WebDevAuthPublicService/GetUserInfo", async (req, res) => {
  const { accessToken } = req.body || {};
  if (!accessToken) return res.status(400).json({ error: "missing accessToken" });

  // Check revoked tokens
  const revoked = await loadRevokedTokens();
  if (revoked.includes(accessToken)) return res.status(401).json({ error: "token revoked" });

  // try to find openId encoded in token: tokens created by this mock start with 'mock-access-token-mockcode-<openId>'
  const m = /mock-access-token-mockcode-([^\-]+)/.exec(accessToken);
  const possibleOpenId = m ? m[1] : null;

  const users = await loadUsers();
  const user = users.find((u) => u.openId === possibleOpenId) ?? users[0];

  if (!user) return res.status(404).json({ error: "user not found" });

  res.json({
    openId: user.openId,
    name: user.name,
    email: user.email,
    platforms: ["REGISTERED_PLATFORM_EMAIL"],
    roles: user.roles || [],
  });
});

// Get user info with JWT token (for establishing session cookie)
app.post("/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt", async (req, res) => {
  const { jwtToken } = req.body || {};
  if (!jwtToken) return res.status(400).json({ error: "missing jwtToken" });

  // In the mock, we just return a dummy user
  // In a real implementation, this would verify the JWT and return the actual user
  const users = await loadUsers();
  const user = users[0];

  res.json({
    openId: user.openId,
    name: user.name,
    email: user.email,
    platforms: ["REGISTERED_PLATFORM_EMAIL"],
    roles: user.roles || [],
  });
});

app.listen(PORT, () => {
  console.log(`OAuth mock server listening on http://localhost:${PORT}`);
  console.log(`Users file: ${USERS_FILE}`);
});
