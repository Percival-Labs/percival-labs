// Percival Labs - Landing Page Server
// Serves the marketing site for the security-verified AI skills registry

import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { studioHTML } from './studio';

// ── Configuration ──

const PORT = Number(process.env.PORT) || 3400;
const AGENTS_URL = process.env.AGENTS_URL || 'http://localhost:3200';
// Browser-accessible URL for client-side JS (Docker containers use internal URLs)
const AGENTS_PUBLIC_URL = process.env.AGENTS_PUBLIC_URL || 'http://localhost:3200';

// ── Build App ──

const app = new Hono();

// Static files
app.use('/public/*', serveStatic({ root: './' }));

const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3100';

// Landing page
app.get('/', async (c) => {
  const html = await Bun.file('./templates/index.html').text();
  return c.html(html);
});

// Auth success page — receives JWT token from OAuth callback
app.get('/auth/success', (c) => {
  const token = c.req.query('token') || '';
  return c.html(`<!DOCTYPE html>
<html><head><title>Percival Labs - Authenticated</title>
<style>body{background:#0a0e17;color:#e5e7eb;font-family:Inter,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
.card{background:#111827;padding:2rem;border-radius:1rem;border:1px solid rgba(34,211,238,.3);max-width:480px;text-align:center}
h2{color:#22d3ee;margin-bottom:1rem}code{background:#0a0e17;padding:.5rem;border-radius:.25rem;display:block;margin:1rem 0;word-break:break-all;font-size:.75rem}
a{color:#22d3ee;text-decoration:none}</style></head>
<body><div class="card"><h2>Authenticated</h2><p>Your API token:</p><code id="token">${esc(token)}</code>
<p style="margin-top:1rem;font-size:.875rem;color:#9ca3af">Use this token in the <code style="display:inline;padding:.125rem .25rem">Authorization: Bearer &lt;token&gt;</code> header.</p>
<p style="margin-top:1rem"><a href="/dashboard">Go to Dashboard</a></p></div></body></html>`);
});

// Publisher dashboard — fetches data from registry API
app.get('/dashboard', async (c) => {
  // Fetch registry stats
  let stats = { total_skills: 0, total_publishers: 0, total_mcp_servers: 0 };
  let skills: any[] = [];
  let categories: string[] = [];
  try {
    const [statsRes, skillsRes, catsRes] = await Promise.all([
      fetch(`${REGISTRY_URL}/health/stats`),
      fetch(`${REGISTRY_URL}/v1/skills?limit=50`),
      fetch(`${REGISTRY_URL}/health/categories`),
    ]);
    if (statsRes.ok) stats = await statsRes.json() as any;
    if (skillsRes.ok) {
      const data = await skillsRes.json() as any;
      skills = data.skills || [];
    }
    if (catsRes.ok) {
      const data = await catsRes.json() as any;
      categories = (data.categories || []).map((c: any) => c.category);
    }
  } catch { /* registry not available */ }

  return c.html(dashboardHTML(stats, skills, categories));
});

// Studio — agent observation UI
app.get('/studio', (c) => {
  return c.html(studioHTML(AGENTS_PUBLIC_URL));
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: '@percival/web', version: '0.2.0' });
});

// 404
app.notFound((c) => {
  return c.html('<h1>404 - Not Found</h1>', 404);
});

function dashboardHTML(stats: any, skills: any[], categories: string[]) {
  const skillRows = skills.map((s: any) => `
    <tr>
      <td style="padding:.5rem .75rem"><strong>${esc(s.name)}</strong><br><span style="color:#6b7280;font-size:.75rem">${esc(s.slug)}</span></td>
      <td style="padding:.5rem .75rem">${esc(s.category)}</td>
      <td style="padding:.5rem .75rem">${esc(s.latest_version || '-')}</td>
      <td style="padding:.5rem .75rem">${statusBadge(s.visibility)}</td>
      <td style="padding:.5rem .75rem;color:#6b7280">${esc(s.trust_score?.toString() || '-')}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Dashboard - Percival Labs</title>
<link rel="icon" href="/public/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/public/styles.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
body{font-family:'Inter',sans-serif;background:#0a0e17;color:#e5e7eb;margin:0;padding:0}
.container{max-width:1200px;margin:0 auto;padding:2rem}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;border-bottom:1px solid rgba(229,231,235,.1);padding-bottom:1rem}
.header h1{font-size:1.5rem;color:#22d3ee}
.header a{color:#9ca3af;text-decoration:none;font-size:.875rem}
.header a:hover{color:#22d3ee}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.stat-card{background:#111827;border:1px solid rgba(229,231,235,.1);border-radius:.75rem;padding:1.25rem}
.stat-card .value{font-size:2rem;font-weight:700;color:#22d3ee}
.stat-card .label{color:#9ca3af;font-size:.875rem;margin-top:.25rem}
.categories{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.5rem}
.cat-tag{background:#111827;border:1px solid rgba(34,211,238,.2);color:#22d3ee;padding:.25rem .75rem;border-radius:9999px;font-size:.75rem}
table{width:100%;border-collapse:collapse;background:#111827;border-radius:.75rem;overflow:hidden}
th{text-align:left;padding:.75rem;background:#0d1420;color:#9ca3af;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em}
tr{border-bottom:1px solid rgba(229,231,235,.05)}
tr:hover{background:#1a2236}
.badge{padding:.125rem .5rem;border-radius:9999px;font-size:.7rem;font-weight:600}
.badge-published{background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.3)}
.badge-pending{background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3)}
.badge-draft{background:rgba(107,114,128,.15);color:#6b7280;border:1px solid rgba(107,114,128,.3)}
.badge-failed{background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3)}
</style></head><body>
<div class="container">
  <div class="header">
    <h1>Percival Labs Dashboard</h1>
    <div><a href="/">Home</a> &middot; <a href="/docs">API Docs</a></div>
  </div>

  <div class="stats">
    <div class="stat-card"><div class="value">${stats.total_skills || 0}</div><div class="label">Skills</div></div>
    <div class="stat-card"><div class="value">${stats.total_publishers || 0}</div><div class="label">Publishers</div></div>
    <div class="stat-card"><div class="value">${stats.total_mcp_servers || 0}</div><div class="label">MCP Servers</div></div>
    <div class="stat-card"><div class="value">${categories.length}</div><div class="label">Categories</div></div>
  </div>

  <div class="categories">
    ${categories.map(c => `<span class="cat-tag">${esc(c)}</span>`).join('')}
  </div>

  <table>
    <thead><tr><th>Skill</th><th>Category</th><th>Version</th><th>Status</th><th>Trust</th></tr></thead>
    <tbody>
      ${skillRows || '<tr><td colspan="5" style="padding:2rem;text-align:center;color:#6b7280">No skills found. Start the registry first.</td></tr>'}
    </tbody>
  </table>
</div></body></html>`;
}

function statusBadge(status: string): string {
  const cls = status === 'published' ? 'badge-published'
    : status === 'pending' ? 'badge-pending'
    : status === 'suspended' || status === 'revoked' ? 'badge-failed'
    : 'badge-draft';
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Start ──

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║       PERCIVAL LABS WEB v0.1.0               ║');
console.log('║   Landing Page & Marketing Site              ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');
console.log(`[Init] Server running at http://localhost:${PORT}`);
console.log('');

export default {
  port: PORT,
  fetch: app.fetch,
};
