export function adminHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tideway Admin</title>
<style>
/* ── Reset & Variables ───────────────────────── */
:root {
  --sidebar-w: 232px;
  --sidebar-bg: #0f172a;
  --sidebar-hover: rgba(255,255,255,0.04);
  --sidebar-text: #94a3b8;
  --sidebar-active: #f97316;
  --sidebar-active-bg: rgba(249,115,22,0.08);
  --page-bg: #f1f5f9;
  --card-bg: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --border: #e2e8f0;
  --accent: #f97316;
  --accent-hover: #ea580c;
  --danger: #ef4444;
  --radius: 0.625rem;
  --font: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--page-bg);color:var(--text-primary);-webkit-font-smoothing:antialiased}

/* ── Login ───────────────────────────────────── */
.login-page{min-height:100vh;display:grid;place-items:center;background:var(--sidebar-bg)}
.login-card{background:var(--card-bg);border-radius:1rem;padding:2.5rem;width:min(400px,90vw);box-shadow:0 25px 60px rgba(0,0,0,0.35)}
.login-card h1{font-size:1.35rem;font-weight:700;margin-bottom:0.25rem}
.login-card .brand{color:var(--accent)}
.login-card p{color:var(--text-secondary);font-size:0.875rem;margin-bottom:1.5rem;line-height:1.5}
.login-card label{display:block;font-size:0.8rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.35rem}
.login-card input{width:100%;padding:0.6rem 0.75rem;border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem;outline:none;transition:border-color 150ms}
.login-card input:focus{border-color:var(--accent)}
.login-card button{margin-top:1rem;width:100%;padding:0.65rem;border:none;border-radius:var(--radius);background:var(--accent);color:#fff;font-size:0.9rem;font-weight:600;cursor:pointer;transition:background 150ms}
.login-card button:hover{background:var(--accent-hover)}

/* ── Layout ──────────────────────────────────── */
.layout{display:flex;min-height:100vh}
.sidebar{width:var(--sidebar-w);background:var(--sidebar-bg);color:var(--sidebar-text);display:flex;flex-direction:column;position:fixed;inset:0 auto 0 0;z-index:10;overflow-y:auto}
.sidebar-logo{padding:1.25rem 1.25rem 1rem;display:flex;align-items:center;gap:0.5rem;border-bottom:1px solid rgba(255,255,255,0.06)}
.sidebar-logo svg{flex-shrink:0}
.sidebar-logo span{font-size:1rem;font-weight:700;color:#fff}
.sidebar-logo .accent{color:var(--accent)}
.sidebar-section{padding:1rem 0.75rem 0.5rem;font-size:0.65rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:rgba(148,163,184,0.5);padding-left:1.25rem}
.sidebar-nav{flex:1;padding:0.25rem 0.75rem}
.nav-btn{display:flex;align-items:center;gap:0.65rem;width:100%;padding:0.55rem 0.75rem;border:none;background:transparent;color:var(--sidebar-text);cursor:pointer;font-size:0.85rem;text-align:left;border-radius:0.5rem;transition:all 100ms;font-family:var(--font)}
.nav-btn:hover{color:#e2e8f0;background:var(--sidebar-hover)}
.nav-btn.active{color:var(--sidebar-active);background:var(--sidebar-active-bg);font-weight:600}
.nav-btn svg{flex-shrink:0;opacity:0.7}
.nav-btn.active svg{opacity:1}
.sidebar-footer{padding:0.75rem;border-top:1px solid rgba(255,255,255,0.06)}
.logout-btn{display:flex;align-items:center;gap:0.65rem;width:100%;padding:0.55rem 0.75rem;border:none;background:transparent;color:var(--sidebar-text);cursor:pointer;font-size:0.85rem;border-radius:0.5rem;transition:all 100ms;font-family:var(--font)}
.logout-btn:hover{color:#fca5a5;background:rgba(239,68,68,0.08)}

/* ── Main ────────────────────────────────────── */
.main{margin-left:var(--sidebar-w);flex:1;min-width:0}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 2rem;background:var(--card-bg);border-bottom:1px solid var(--border)}
.topbar h1{font-size:1.1rem;font-weight:700}
.topbar-right{display:flex;align-items:center;gap:0.75rem}
.refresh-btn{display:flex;align-items:center;gap:0.4rem;padding:0.4rem 0.85rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--card-bg);color:var(--text-secondary);cursor:pointer;font-size:0.8rem;font-family:var(--font);transition:all 120ms}
.refresh-btn:hover{border-color:var(--accent);color:var(--accent)}
.refresh-btn svg{width:14px;height:14px}
.content{padding:1.5rem 2rem}

/* ── Stats Cards ─────────────────────────────── */
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1rem;margin-bottom:1.5rem}
.stat-card{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);padding:1.15rem 1.25rem}
.stat-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary);font-weight:600;margin-bottom:0.3rem}
.stat-value{font-size:1.6rem;font-weight:700;line-height:1.2}
.stat-sub{font-size:0.75rem;color:var(--text-secondary);margin-top:0.15rem}

/* ── Table ───────────────────────────────────── */
.table-card{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.table-header{padding:0.85rem 1.25rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)}
.table-title{font-size:0.95rem;font-weight:600}
.table-count{font-size:0.75rem;color:var(--text-tertiary);background:var(--page-bg);padding:0.15rem 0.5rem;border-radius:999px;margin-left:0.5rem}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:0.6rem 1.25rem;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary);font-weight:600;background:#f8fafc;border-bottom:1px solid var(--border)}
td{padding:0.7rem 1.25rem;border-bottom:1px solid var(--border);font-size:0.85rem}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(241,245,249,0.5)}
.mono{font-family:'SF Mono','Fira Code',monospace;font-size:0.8rem;color:var(--text-secondary)}
.badge{display:inline-block;padding:0.1rem 0.5rem;border-radius:999px;font-size:0.7rem;font-weight:600;background:rgba(249,115,22,0.08);color:var(--accent)}
.empty-state{padding:3rem;text-align:center;color:var(--text-tertiary);font-size:0.9rem}

/* ── Tail Controls ───────────────────────────── */
.tail-controls{display:flex;gap:0.75rem;align-items:flex-end;margin-bottom:1rem}
.tail-controls .field{flex:1}
.tail-controls label{display:block;font-size:0.75rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.3rem}
.tail-controls input{width:100%;padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:var(--radius);font-size:0.85rem;outline:none;font-family:var(--font);transition:border-color 150ms}
.tail-controls input:focus{border-color:var(--accent)}
.tail-btn{padding:0.5rem 1rem;border:none;border-radius:var(--radius);background:var(--accent);color:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;transition:background 150ms;font-family:var(--font);white-space:nowrap}
.tail-btn:hover{background:var(--accent-hover)}

/* ── Error Banner ────────────────────────────── */
.error-banner{margin-bottom:1rem;padding:0.75rem 1rem;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:var(--radius);font-size:0.85rem;display:flex;align-items:center;justify-content:space-between}
.error-banner button{border:none;background:none;color:#991b1b;cursor:pointer;font-size:1rem;line-height:1;padding:0 0.25rem}

/* ── Responsive ──────────────────────────────── */
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);transition:transform 200ms}
  .sidebar.open{transform:translateX(0)}
  .main{margin-left:0}
  .topbar{padding:1rem 1.25rem}
  .content{padding:1.25rem}
  .stats-row{grid-template-columns:1fr 1fr}
  .hamburger{display:flex !important}
}
.hamburger{display:none;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid var(--border);border-radius:var(--radius);background:var(--card-bg);cursor:pointer;margin-right:0.75rem}
.backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:5}
.backdrop.visible{display:block}
</style>
</head>
<body>
<div id="app"></div>
<script>
(function(){
  /* ── Helpers ──────────────────────────────── */
  var E={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return E[c]})}

  /* ── Icons (inline SVG) ──────────────────── */
  var icons = {
    topics: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    connections: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    tail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    logo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#f97316" stroke-width="2"/><path d="M8 12h8M12 8v8" stroke="#f97316" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  /* ── State ────────────────────────────────── */
  var STORAGE_KEY = 'tideway.admin.apiKey';
  var apiKey = localStorage.getItem(STORAGE_KEY) || '';
  var activeTab = 'topics';
  var topics = [];
  var connections = [];
  var tailTopic = '';
  var tailEvents = [];
  var errorMessage = '';
  var sidebarOpen = false;
  var loading = false;

  /* ── API ──────────────────────────────────── */
  function apiRequest(path) {
    return fetch(path, {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    }).then(function(res) {
      if (!res.ok) throw new Error('Request failed with status ' + res.status);
      return res.json();
    });
  }

  function loadTopics() {
    loading = true; render();
    apiRequest('/v1/admin/topics?page=1&pageSize=50').then(function(r) {
      topics = r.data; errorMessage = ''; loading = false; render();
    }).catch(function(e) { errorMessage = e.message; loading = false; render(); });
  }

  function loadConnections() {
    loading = true; render();
    apiRequest('/v1/admin/connections?page=1&pageSize=50').then(function(r) {
      connections = r.data; errorMessage = ''; loading = false; render();
    }).catch(function(e) { errorMessage = e.message; loading = false; render(); });
  }

  function loadTail() {
    var t = tailTopic.trim();
    if (!t) return;
    loading = true; render();
    apiRequest('/v1/admin/topics/' + encodeURIComponent(t) + '/tail?limit=20').then(function(r) {
      tailEvents = r.events; errorMessage = ''; loading = false; render();
    }).catch(function(e) { errorMessage = e.message; loading = false; render(); });
  }

  function login(key) {
    apiKey = key;
    localStorage.setItem(STORAGE_KEY, key);
    activeTab = 'topics';
    loadTopics();
  }

  function logout() {
    apiKey = '';
    localStorage.removeItem(STORAGE_KEY);
    topics = []; connections = []; tailEvents = []; tailTopic = '';
    errorMessage = ''; activeTab = 'topics'; sidebarOpen = false;
    render();
  }

  function switchTab(tab) {
    activeTab = tab; errorMessage = ''; sidebarOpen = false;
    if (tab === 'topics') loadTopics();
    else if (tab === 'connections') loadConnections();
    else render();
  }

  function refreshData() {
    if (activeTab === 'topics') loadTopics();
    else if (activeTab === 'connections') loadConnections();
  }

  /* ── Render: Login ────────────────────────── */
  function renderLogin() {
    return '<div class="login-page"><div class="login-card">' +
      '<h1><span class="brand">Tideway</span> Admin</h1>' +
      '<p>Sign in with a publisher API key to manage topics and streams.</p>' +
      '<form id="login-form">' +
      '<label for="api-key">API Key</label>' +
      '<input id="api-key" type="password" placeholder="Enter your API key" autocomplete="off">' +
      '<button type="submit">Sign in</button>' +
      '</form></div></div>';
  }

  /* ── Render: Stats ────────────────────────── */
  function renderStats() {
    var totalTopics = topics.length;
    var totalConns = topics.reduce(function(s,t){return s+t.connectionCount},0);
    var avgConns = totalTopics ? (totalConns / totalTopics).toFixed(1) : '0';
    return '<div class="stats-row">' +
      '<div class="stat-card"><div class="stat-label">Active Topics</div><div class="stat-value">' + totalTopics + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Total Connections</div><div class="stat-value">' + totalConns + '</div></div>' +
      '<div class="stat-card"><div class="stat-label">Avg per Topic</div><div class="stat-value">' + avgConns + '</div></div>' +
      '</div>';
  }

  /* ── Render: Tables ───────────────────────── */
  function renderTopicsTable() {
    if (!topics.length) return '<div class="table-card"><div class="empty-state">No active topics</div></div>';
    var rows = topics.map(function(t) {
      return '<tr><td>' + esc(t.topic) + '</td><td><span class="badge">' + t.connectionCount + ' conn' + (t.connectionCount !== 1 ? 's' : '') + '</span></td></tr>';
    }).join('');
    return '<div class="table-card">' +
      '<div class="table-header"><div><span class="table-title">Topics</span><span class="table-count">' + topics.length + '</span></div></div>' +
      '<table><thead><tr><th>Topic Name</th><th>Connections</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderConnectionsTable() {
    if (!connections.length) return '<div class="table-card"><div class="empty-state">No active connections</div></div>';
    var rows = connections.map(function(c) {
      var badges = c.topics.map(function(t){return '<span class="badge">' + esc(t) + '</span>'}).join(' ');
      return '<tr><td class="mono">' + esc(c.connectionId) + '</td><td>' + badges + '</td></tr>';
    }).join('');
    return '<div class="table-card">' +
      '<div class="table-header"><div><span class="table-title">Connections</span><span class="table-count">' + connections.length + '</span></div></div>' +
      '<table><thead><tr><th>Connection ID</th><th>Subscribed Topics</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderTailTab() {
    var controls = '<div class="tail-controls">' +
      '<div class="field"><label for="tail-topic">Topic</label>' +
      '<input id="tail-topic" placeholder="Enter topic name" value="' + esc(tailTopic) + '"></div>' +
      '<button class="tail-btn" data-action="load-tail">Load Tail</button></div>';

    if (!tailEvents.length) return controls + '<div class="table-card"><div class="empty-state">Enter a topic name and click Load Tail to view recent events</div></div>';

    var rows = tailEvents.map(function(e) {
      return '<tr><td class="mono">' + esc(e.id) + '</td><td>' + esc(e.payload) + '</td></tr>';
    }).join('');
    return controls + '<div class="table-card">' +
      '<div class="table-header"><div><span class="table-title">Events</span><span class="table-count">' + tailEvents.length + '</span></div></div>' +
      '<table><thead><tr><th>Event ID</th><th>Payload</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* ── Render: Dashboard ────────────────────── */
  function renderDashboard() {
    var tabLabels = {topics:'Topics',connections:'Connections',tail:'Tail Events'};
    var navItems = ['topics','connections','tail'].map(function(tab) {
      var cls = 'nav-btn' + (activeTab === tab ? ' active' : '');
      return '<button class="' + cls + '" data-tab="' + tab + '">' + icons[tab] + '<span>' + tabLabels[tab] + '</span></button>';
    }).join('');

    var sidebar = '<aside class="sidebar" id="sidebar">' +
      '<div class="sidebar-logo">' + icons.logo + '<span>Tide<span class="accent">way</span></span></div>' +
      '<div class="sidebar-section">Monitor</div>' +
      '<nav class="sidebar-nav">' + navItems + '</nav>' +
      '<div class="sidebar-footer"><button class="logout-btn" data-action="logout">' + icons.logout + '<span>Sign out</span></button></div>' +
      '</aside>';

    var err = errorMessage ? '<div class="error-banner" role="alert"><span>' + esc(errorMessage) + '</span><button data-action="dismiss-error">&times;</button></div>' : '';

    var content = '';
    if (activeTab === 'topics') content = renderStats() + renderTopicsTable();
    else if (activeTab === 'connections') content = renderConnectionsTable();
    else if (activeTab === 'tail') content = renderTailTab();

    var refreshBtn = (activeTab !== 'tail') ? '<button class="refresh-btn" data-action="refresh">' + icons.refresh + ' Refresh</button>' : '';
    var topbar = '<div class="topbar">' +
      '<div style="display:flex;align-items:center">' +
      '<button class="hamburger" data-action="toggle-sidebar">' + icons.menu + '</button>' +
      '<h1>' + tabLabels[activeTab] + '</h1></div>' +
      '<div class="topbar-right">' + refreshBtn + '</div></div>';

    var backdrop = '<div class="backdrop' + (sidebarOpen ? ' visible' : '') + '" data-action="close-sidebar"></div>';

    return backdrop + sidebar + '<div class="main">' + topbar + '<div class="content">' + err + content + '</div></div>';
  }

  /* ── Render Entry ─────────────────────────── */
  function render() {
    var app = document.getElementById('app');
    if (!apiKey) { app.innerHTML = renderLogin(); return; }
    app.innerHTML = renderDashboard();
    if (sidebarOpen) document.getElementById('sidebar').classList.add('open');
  }

  /* ── Events (delegation) ──────────────────── */
  document.addEventListener('click', function(e) {
    var target = e.target.closest('[data-action],[data-tab]');
    if (!target) return;

    var action = target.getAttribute('data-action');
    var tab = target.getAttribute('data-tab');

    if (tab) { switchTab(tab); return; }
    if (action === 'logout') { logout(); return; }
    if (action === 'refresh') { refreshData(); return; }
    if (action === 'dismiss-error') { errorMessage = ''; render(); return; }
    if (action === 'load-tail') { loadTail(); return; }
    if (action === 'toggle-sidebar') { sidebarOpen = !sidebarOpen; render(); return; }
    if (action === 'close-sidebar') { sidebarOpen = false; render(); return; }
  });

  document.addEventListener('submit', function(e) {
    e.preventDefault();
    if (e.target.id === 'login-form') {
      var input = document.getElementById('api-key');
      var key = input.value.trim();
      if (key) login(key);
    }
  });

  document.addEventListener('input', function(e) {
    if (e.target.id === 'tail-topic') { tailTopic = e.target.value; }
  });

  /* ── Init ─────────────────────────────────── */
  if (apiKey) { loadTopics(); } else { render(); }
})();
</script>
</body>
</html>`;
}
