// Percival Labs Studio - Agent Observation UI
// Server-rendered HTML page with pixel art office scene and personality-driven feed
// Connects directly to agents service SSE for live event streaming

export function studioHTML(agentsUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Studio - Percival Labs</title>
<link rel="icon" href="/public/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Press+Start+2P&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

  :root{
    --bg:#0a0e17;
    --card:#111827;
    --border:rgba(229,231,235,0.1);
    --cyan:#22d3ee;
    --green:#10b981;
    --amber:#f59e0b;
    --red:#ef4444;
    --gray:#6b7280;
    --text:#e5e7eb;
    --text-dim:#9ca3af;
    --font-sans:'Inter',system-ui,sans-serif;
    --font-mono:'JetBrains Mono',ui-monospace,monospace;
    --font-pixel:'Press Start 2P',monospace;
  }

  html,body{
    height:100%;
    overflow:hidden;
    background:var(--bg);
    color:var(--text);
    font-family:var(--font-sans);
    font-size:14px;
    line-height:1.5;
  }

  /* -- Top Bar -- */
  .topbar{
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0.625rem 1.25rem;
    border-bottom:1px solid var(--border);
    background:var(--card);
    height:48px;
    flex-shrink:0;
  }
  .topbar-title{
    font-weight:700;
    font-size:0.9375rem;
    letter-spacing:0.04em;
    color:var(--cyan);
  }
  .topbar-stats{
    display:flex;
    align-items:center;
    gap:1rem;
  }
  .topbar-stat{
    font-size:0.6875rem;
    font-family:var(--font-mono);
    color:var(--text-dim);
  }
  .topbar-stat strong{
    color:var(--text);
  }
  .conn-status{
    display:flex;
    align-items:center;
    gap:0.375rem;
    font-size:0.75rem;
    color:var(--text-dim);
  }
  .conn-dot{
    width:8px;
    height:8px;
    border-radius:50%;
    background:var(--gray);
    transition:background 0.3s;
  }
  .conn-dot.connected{background:var(--green)}
  .conn-dot.disconnected{background:var(--red)}

  /* -- Layout Shell -- */
  .shell{
    display:flex;
    flex-direction:column;
    height:100vh;
  }
  .columns{
    display:grid;
    grid-template-columns:1fr 320px;
    gap:0;
    flex:1;
    min-height:0;
    overflow:hidden;
  }

  /* -- Left Panel (scene + role strip) -- */
  .left-panel{
    display:flex;
    flex-direction:column;
    border-right:1px solid var(--border);
    overflow:hidden;
  }
  .scene-wrapper{
    flex:1;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#0a0e17;
    min-height:0;
    overflow:hidden;
    padding:0.5rem;
  }
  #officeScene{
    width:100%;
    height:100%;
    max-width:100%;
    max-height:100%;
    object-fit:contain;
    border-radius:0.5rem;
    border:1px solid var(--border);
  }

  /* -- Role Card Strip -- */
  .role-strip{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:0.5rem;
    padding:0.5rem;
    border-top:1px solid var(--border);
    background:var(--card);
    flex-shrink:0;
  }
  .role-card-compact{
    background:var(--bg);
    border:1px solid var(--border);
    border-radius:0.375rem;
    padding:0.5rem 0.625rem;
    cursor:pointer;
    transition:border-color 0.2s;
  }
  .role-card-compact:hover{
    border-color:rgba(229,231,235,0.3);
  }
  .role-card-compact .rc-header{
    display:flex;
    align-items:center;
    gap:0.375rem;
  }
  .role-card-compact .rc-dot{
    width:8px;
    height:8px;
    border-radius:50%;
    flex-shrink:0;
  }
  .role-card-compact .rc-name{
    font-weight:700;
    font-size:0.75rem;
  }
  .role-card-compact .rc-title{
    font-size:0.625rem;
    color:var(--text-dim);
    margin-top:0.125rem;
  }
  .role-card-compact .rc-status{
    font-size:0.625rem;
    font-family:var(--font-mono);
    margin-top:0.25rem;
    color:var(--text-dim);
  }
  .role-card-compact .rc-task{
    font-size:0.625rem;
    color:var(--cyan);
    font-family:var(--font-mono);
    margin-top:0.125rem;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }

  /* -- Right Panel (feed + tasks) -- */
  .right-panel{
    display:flex;
    flex-direction:column;
    overflow:hidden;
  }
  .col-header{
    padding:0.625rem 0.875rem;
    font-size:0.6875rem;
    font-weight:600;
    letter-spacing:0.08em;
    text-transform:uppercase;
    color:var(--text-dim);
    border-bottom:1px solid var(--border);
    background:var(--card);
    flex-shrink:0;
  }
  .col-body{
    flex:1;
    overflow-y:auto;
    padding:0.5rem;
  }
  .col-body::-webkit-scrollbar{width:4px}
  .col-body::-webkit-scrollbar-track{background:transparent}
  .col-body::-webkit-scrollbar-thumb{background:rgba(229,231,235,0.15);border-radius:2px}

  /* -- Activity Feed -- */
  .feed-entry{
    display:flex;
    gap:0.5rem;
    align-items:flex-start;
    padding:0.5rem 0.625rem;
    border-bottom:1px solid var(--border);
    font-size:0.8125rem;
  }
  .feed-entry:hover{background:rgba(255,255,255,0.02)}
  .feed-time{
    font-family:var(--font-mono);
    color:var(--text-dim);
    font-size:0.6875rem;
    white-space:nowrap;
    padding-top:0.0625rem;
    flex-shrink:0;
  }
  .feed-content{
    flex:1;
    min-width:0;
  }
  .feed-agent{
    font-weight:700;
    font-size:0.8125rem;
  }
  .feed-message{
    color:var(--text-dim);
    font-size:0.75rem;
    margin-top:0.0625rem;
  }
  .feed-badge{
    display:inline-block;
    padding:0.0625rem 0.375rem;
    border-radius:9999px;
    font-size:0.5625rem;
    font-weight:600;
    white-space:nowrap;
    border:1px solid;
    flex-shrink:0;
    margin-top:0.125rem;
  }

  /* -- Task Board (inside right panel) -- */
  .task-board-section{
    border-top:1px solid var(--border);
    flex-shrink:0;
  }
  .task-board-header{
    padding:0.5rem 0.875rem;
    font-size:0.6875rem;
    font-weight:600;
    letter-spacing:0.08em;
    text-transform:uppercase;
    color:var(--text-dim);
    border-bottom:1px solid var(--border);
    background:var(--card);
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:space-between;
  }
  .task-board-header:hover{background:rgba(255,255,255,0.02)}
  .task-board-body{
    max-height:280px;
    overflow-y:auto;
    padding:0.5rem;
  }
  .task-board-body::-webkit-scrollbar{width:4px}
  .task-board-body::-webkit-scrollbar-track{background:transparent}
  .task-board-body::-webkit-scrollbar-thumb{background:rgba(229,231,235,0.15);border-radius:2px}
  .task-board-body.collapsed{display:none}
  .task-section{margin-bottom:0.75rem}
  .task-section-title{
    font-size:0.625rem;
    font-weight:700;
    letter-spacing:0.1em;
    text-transform:uppercase;
    color:var(--text-dim);
    padding:0.25rem 0.375rem;
    margin-bottom:0.25rem;
  }
  .task-item{
    background:var(--card);
    border:1px solid var(--border);
    border-radius:0.375rem;
    padding:0.5rem 0.625rem;
    margin-bottom:0.25rem;
  }
  .task-title{
    font-size:0.75rem;
    font-weight:500;
    color:var(--text);
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .task-meta{
    display:flex;
    align-items:center;
    gap:0.375rem;
    margin-top:0.25rem;
    font-size:0.625rem;
    color:var(--text-dim);
  }
  .priority-badge{
    padding:0 0.3125rem;
    border-radius:9999px;
    font-size:0.5625rem;
    font-weight:700;
    text-transform:uppercase;
  }
  .priority-critical{background:rgba(239,68,68,0.2);color:var(--red);border:1px solid rgba(239,68,68,0.4)}
  .priority-high{background:rgba(239,68,68,0.15);color:var(--red);border:1px solid rgba(239,68,68,0.3)}
  .priority-medium{background:rgba(245,158,11,0.15);color:var(--amber);border:1px solid rgba(245,158,11,0.3)}
  .priority-low{background:rgba(107,114,128,0.15);color:var(--gray);border:1px solid rgba(107,114,128,0.3)}
  .task-empty{
    color:var(--gray);
    font-size:0.6875rem;
    padding:0.375rem;
    font-style:italic;
  }

  /* -- Modal -- */
  .modal-overlay{
    display:none;
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.7);
    z-index:100;
    justify-content:center;
    align-items:center;
  }
  .modal-overlay.open{
    display:flex;
  }
  .modal-card{
    background:var(--card);
    border:1px solid var(--border);
    border-radius:0.75rem;
    padding:1.5rem;
    max-width:700px;
    width:90%;
    max-height:80vh;
    overflow-y:auto;
    position:relative;
  }
  .modal-close{
    position:absolute;
    top:0.75rem;
    right:0.75rem;
    background:none;
    border:none;
    color:var(--text-dim);
    font-size:1.25rem;
    cursor:pointer;
  }
  .modal-close:hover{color:var(--text)}
  .modal-header{
    display:flex;
    align-items:center;
    gap:0.75rem;
    margin-bottom:1rem;
    padding-bottom:0.75rem;
    border-bottom:1px solid var(--border);
  }
  .modal-header .mh-dot{
    width:12px;
    height:12px;
    border-radius:50%;
    flex-shrink:0;
  }
  .modal-header .mh-name{
    font-size:1.125rem;
    font-weight:700;
  }
  .modal-header .mh-title{
    font-size:0.8125rem;
    color:var(--text-dim);
  }
  .modal-header .mh-model{
    display:inline-block;
    padding:0.125rem 0.5rem;
    border-radius:9999px;
    font-size:0.625rem;
    font-weight:600;
    font-family:var(--font-mono);
    background:rgba(34,211,238,0.1);
    color:var(--cyan);
    border:1px solid rgba(34,211,238,0.3);
  }
  .modal-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:0.75rem;
  }
  .modal-field{
    margin-bottom:0.5rem;
  }
  .modal-field-label{
    font-size:0.625rem;
    font-weight:700;
    letter-spacing:0.08em;
    text-transform:uppercase;
    color:var(--text-dim);
    margin-bottom:0.25rem;
  }
  .modal-field-value{
    font-size:0.8125rem;
    color:var(--text);
    line-height:1.4;
  }
  .expertise-tags{
    display:flex;
    flex-wrap:wrap;
    gap:0.25rem;
    margin-top:0.75rem;
  }
  .expertise-tag{
    padding:0.125rem 0.5rem;
    border-radius:9999px;
    font-size:0.625rem;
    font-weight:500;
    background:rgba(107,114,128,0.15);
    color:var(--text-dim);
    border:1px solid rgba(107,114,128,0.2);
  }
  .modal-personality{
    margin-top:0.75rem;
    padding-top:0.75rem;
    border-top:1px solid var(--border);
    font-size:0.75rem;
    color:var(--text-dim);
    font-style:italic;
  }

  /* -- Bottom Controls -- */
  .controls{
    display:flex;
    align-items:center;
    gap:0.75rem;
    padding:0.5rem 1rem;
    border-top:1px solid var(--border);
    background:var(--card);
    height:52px;
    flex-shrink:0;
  }
  .controls button{
    background:rgba(34,211,238,0.1);
    border:1px solid rgba(34,211,238,0.3);
    color:var(--cyan);
    padding:0.375rem 0.875rem;
    border-radius:0.375rem;
    font-size:0.75rem;
    font-weight:600;
    font-family:var(--font-sans);
    cursor:pointer;
    white-space:nowrap;
    transition:background 0.2s,border-color 0.2s;
  }
  .controls button:hover{
    background:rgba(34,211,238,0.2);
    border-color:rgba(34,211,238,0.5);
  }
  .controls button:active{transform:scale(0.97)}
  .controls button.danger{
    background:rgba(239,68,68,0.1);
    border-color:rgba(239,68,68,0.3);
    color:var(--red);
  }
  .controls button.danger:hover{
    background:rgba(239,68,68,0.2);
    border-color:rgba(239,68,68,0.5);
  }
  .divider{
    width:1px;
    height:24px;
    background:var(--border);
    flex-shrink:0;
  }
  .controls input{
    background:var(--bg);
    border:1px solid var(--border);
    color:var(--text);
    padding:0.375rem 0.625rem;
    border-radius:0.375rem;
    font-size:0.75rem;
    font-family:var(--font-sans);
    outline:none;
    transition:border-color 0.2s;
  }
  .controls input:focus{border-color:rgba(34,211,238,0.4)}
  .controls input::placeholder{color:var(--gray)}
  .input-title{width:180px}
  .input-desc{width:240px}
</style>
</head>
<body>
<div class="shell">
  <!-- Top Bar -->
  <div class="topbar">
    <span class="topbar-title">PERCIVAL LABS STUDIO</span>
    <div class="topbar-stats">
      <span class="topbar-stat" id="statTasks">Tasks: <strong>0</strong></span>
      <span class="topbar-stat" id="statEvents">Events: <strong>0</strong></span>
      <div class="conn-status">
        <span class="conn-dot" id="connDot"></span>
        <span id="connText">Connecting</span>
      </div>
    </div>
  </div>

  <!-- Two-Column Layout: Left (scene + cards) | Right (feed + tasks) -->
  <div class="columns">
    <!-- Left: Office Scene + Role Cards -->
    <div class="left-panel">
      <div class="scene-wrapper">
        <canvas id="officeScene" width="960" height="540"></canvas>
      </div>
      <div class="role-strip" id="roleStrip"></div>
    </div>

    <!-- Right: Activity Feed + Task Board -->
    <div class="right-panel">
      <div class="col-header">Activity Feed</div>
      <div class="col-body" id="feedList"></div>
      <div class="task-board-section">
        <div class="task-board-header" onclick="toggleTaskBoard()">
          <span>Task Board</span>
          <span id="taskBoardToggle">&#9660;</span>
        </div>
        <div class="task-board-body" id="taskBoard">
          <div class="task-section">
            <div class="task-section-title">In Progress</div>
            <div id="tasksInProgress"><div class="task-empty">No tasks</div></div>
          </div>
          <div class="task-section">
            <div class="task-section-title">Pending</div>
            <div id="tasksPending"><div class="task-empty">No tasks</div></div>
          </div>
          <div class="task-section">
            <div class="task-section-title">Completed</div>
            <div id="tasksCompleted"><div class="task-empty">No tasks</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Controls -->
  <div class="controls">
    <button id="btnAutoTick" onclick="toggleAutoTick()">Start Auto-Tick</button>
    <button onclick="manualTick()">Manual Tick</button>
    <div class="divider"></div>
    <input class="input-title" id="taskTitle" type="text" placeholder="Task title..." onkeydown="if(event.key==='Enter')submitTask()">
    <input class="input-desc" id="taskDesc" type="text" placeholder="Description (optional)..." onkeydown="if(event.key==='Enter')submitTask()">
    <button onclick="submitTask()">Go</button>
  </div>
</div>

<!-- Role Card Modal -->
<div class="modal-overlay" id="modalOverlay" onclick="closeRoleCard()">
  <div class="modal-card" onclick="event.stopPropagation()">
    <button class="modal-close" onclick="closeRoleCard()">&times;</button>
    <div id="modalContent"></div>
  </div>
</div>

<script>
(function(){
  var AGENTS_URL = '${agentsUrl}'.replace(/\\/+$/, '');
  var MAX_FEED = 200;
  var autoTickActive = false;
  var totalEventCount = 0;
  var totalTaskCount = 0;

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleTimeString('en-GB', { hour12: false });
    } catch(e) {
      return '--:--:--';
    }
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ====================================================
  // AGENT_VISUALS REGISTRY
  // ====================================================

  var AGENT_VISUALS = {
    coordinator: {
      label: 'Coordinator',
      title: 'Technical Lead',
      color: '#22d3ee',
      colorDark: '#0e7490',
      palette: { hair:'#1e3a5f', skin:'#f0c8a0', eyes:'#93c5fd', shirt:'#1e3a5f', tie:'#22d3ee', pants:'#1a1a2e', shoes:'#111111' },
      sprite: [
        ['_','_','_','hair','hair','hair','_','_'],
        ['_','_','hair','hair','hair','hair','hair','_'],
        ['_','_','skin','eyes','skin','skin','eyes','skin'],
        ['_','_','skin','skin','skin','skin','skin','skin'],
        ['_','_','_','skin','_','skin','_','_'],
        ['_','_','shirt','shirt','tie','shirt','shirt','_'],
        ['_','shirt','shirt','shirt','tie','shirt','shirt','shirt'],
        ['_','shirt','_','shirt','tie','shirt','_','shirt'],
        ['_','_','_','pants','pants','pants','_','_'],
        ['_','_','_','pants','_','pants','_','_'],
        ['_','_','_','shoes','_','shoes','_','_']
      ],
      spriteWorking: [
        ['_','_','_','hair','hair','hair','_','_'],
        ['_','_','hair','hair','hair','hair','hair','_'],
        ['_','_','skin','eyes','skin','skin','eyes','skin'],
        ['_','_','skin','skin','skin','skin','skin','skin'],
        ['_','_','_','skin','_','skin','_','_'],
        ['_','_','shirt','shirt','tie','shirt','shirt','_'],
        ['shirt','shirt','shirt','shirt','tie','shirt','shirt','shirt'],
        ['shirt','_','_','shirt','tie','shirt','_','_'],
        ['_','_','_','pants','pants','pants','_','_'],
        ['_','_','_','pants','_','pants','_','_'],
        ['_','_','_','shoes','_','shoes','_','_']
      ],
      deskX: 100,
      deskY: 280,
      deskScale: 0.82,
      bodyColor: '#1a6b8a',
      bodyDark: '#0e4f66',
      headColor: '#134d63',
      faceGlow: '#22d3ee',
      chairColor: '#22d3ee',
      deskItems: ['coffee'],
      verbs: {
        started: ['takes command of','begins strategizing on','maps out the approach for','surveys the landscape of'],
        completed: ['wraps up the plan for','delivers the strategy on','finishes orchestrating','signs off on the roadmap for'],
        failed: ['hits a wall planning','flags a blocker on','pauses to reassess'],
        assigned: ['delegates','routes','hands off'],
        decomposed: ['breaks the mission into','splits the work into','carves out']
      },
      quotes: {
        idle: ['Monitoring the team.','Standing by.','Awaiting orders.'],
        working: ['Analyzing dependencies...','Breaking this down...','Delegating subtasks...']
      }
    },
    builder: {
      label: 'Builder',
      title: 'Implementation Engineer',
      color: '#10b981',
      colorDark: '#065f46',
      palette: { hair:'#92400e', skin:'#f0c8a0', eyes:'#065f46', shirt:'#059669', hat:'#fbbf24', pants:'#374151', shoes:'#111111' },
      sprite: [
        ['_','_','hat','hat','hat','hat','hat','_'],
        ['_','hat','hat','hat','hat','hat','hat','hat'],
        ['_','_','skin','eyes','skin','skin','eyes','skin'],
        ['_','_','skin','skin','skin','skin','skin','skin'],
        ['_','_','_','skin','skin','skin','_','_'],
        ['_','_','shirt','shirt','shirt','shirt','shirt','_'],
        ['_','shirt','shirt','shirt','shirt','shirt','shirt','shirt'],
        ['_','shirt','_','shirt','shirt','shirt','_','shirt'],
        ['_','_','_','pants','pants','pants','_','_'],
        ['_','_','_','pants','_','pants','_','_'],
        ['_','_','_','shoes','_','shoes','_','_']
      ],
      spriteWorking: [
        ['_','_','hat','hat','hat','hat','hat','_'],
        ['_','hat','hat','hat','hat','hat','hat','hat'],
        ['_','_','skin','eyes','skin','skin','eyes','skin'],
        ['_','_','skin','skin','skin','skin','skin','skin'],
        ['_','_','_','skin','skin','skin','_','_'],
        ['_','_','shirt','shirt','shirt','shirt','shirt','_'],
        ['shirt','shirt','shirt','shirt','shirt','shirt','shirt','shirt'],
        ['shirt','_','_','shirt','shirt','shirt','_','_'],
        ['_','_','_','pants','pants','pants','_','_'],
        ['_','_','_','pants','_','pants','_','_'],
        ['_','_','_','shoes','_','shoes','_','_']
      ],
      deskX: 70,
      deskY: 410,
      deskScale: 1.0,
      bodyColor: '#0d7a52',
      bodyDark: '#065f3a',
      headColor: '#065f3a',
      faceGlow: '#34d399',
      chairColor: '#10b981',
      deskItems: ['wrench'],
      verbs: {
        started: ['rolls up sleeves on','fires up the editor for','starts hammering out','dives into building'],
        completed: ['ships','pushes code for','finishes building','nails the implementation of'],
        failed: ['hits a compile error on','runs into a snag building','flags a broken dependency in'],
        assigned: ['grabs','picks up','claims'],
        decomposed: ['scopes out','sizes up','sketches']
      },
      quotes: {
        idle: ['Tools ready.','Waiting for specs.','IDE open.'],
        working: ['Typing furiously...','Building it out...','Compiling...']
      }
    },
    auditor: {
      label: 'Auditor',
      title: 'Security Analyst',
      color: '#ef4444',
      colorDark: '#991b1b',
      palette: { hair:'#1f2937', skin:'#f0c8a0', eyes:'#991b1b', shirt:'#7f1d1d', badge:'#ef4444', pants:'#1a1a2e', shoes:'#111111' },
      sprite: [
        ['_','_','_','hair','hair','hair','_','_'],
        ['_','_','hair','hair','hair','hair','hair','_'],
        ['_','_','skin','eyes','skin','skin','eyes','skin'],
        ['_','_','skin','skin','skin','skin','skin','skin'],
        ['_','_','_','skin','skin','skin','_','_'],
        ['_','_','shirt','shirt','badge','shirt','shirt','_'],
        ['_','shirt','shirt','shirt','shirt','shirt','shirt','shirt'],
        ['_','shirt','_','shirt','shirt','shirt','_','shirt'],
        ['_','_','_','pants','pants','pants','_','_'],
        ['_','_','_','pants','_','pants','_','_'],
        ['_','_','_','shoes','_','shoes','_','_']
      ],
      spriteWorking: [
        ['_','_','_','hair','hair','hair','_','_'],
        ['_','_','hair','hair','hair','hair','hair','_'],
        ['_','_','skin','eyes','skin','skin','eyes','skin'],
        ['_','_','skin','skin','skin','skin','skin','skin'],
        ['_','_','_','skin','skin','skin','_','_'],
        ['_','_','shirt','shirt','badge','shirt','shirt','_'],
        ['shirt','shirt','shirt','shirt','shirt','shirt','shirt','shirt'],
        ['shirt','_','_','shirt','shirt','shirt','_','_'],
        ['_','_','_','pants','pants','pants','_','_'],
        ['_','_','_','pants','_','pants','_','_'],
        ['_','_','_','shoes','_','shoes','_','_']
      ],
      deskX: 530,
      deskY: 265,
      deskScale: 0.8,
      bodyColor: '#b91c1c',
      bodyDark: '#7f1d1d',
      headColor: '#7f1d1d',
      faceGlow: '#f87171',
      chairColor: '#ef4444',
      deskItems: ['lock'],
      verbs: {
        started: ['narrows eyes at','begins interrogating','scans for vulnerabilities in','puts under the microscope'],
        completed: ['files the security report on','clears (with caveats)','finishes the audit of','stamps the assessment for'],
        failed: ['flags a CRITICAL finding in','raises a red flag on','sounds the alarm about'],
        assigned: ['inspects','examines','scrutinizes'],
        decomposed: ['dissects','breaks down','catalogues']
      },
      quotes: {
        idle: ['Watching. Always watching.','Perimeter secure.','On guard.'],
        working: ['Scanning for threats...','Something looks off...','Checking credentials...']
      }
    },
    reviewer: {
      label: 'Reviewer',
      title: 'Quality Engineer',
      color: '#f59e0b',
      colorDark: '#92400e',
      palette: { hair:'#78350f', skin:'#f0c8a0', eyes:'#92400e', shirt:'#b45309', clip:'#fbbf24', pants:'#374151', shoes:'#111111' },
      sprite: [
        ['_','_','_','hair','hair','hair','_','_'],
        ['_','_','hair','hair','hair','hair','hair','_'],
        ['_','_','skin','eyes','skin','skin','eyes','skin'],
        ['_','_','skin','skin','skin','skin','skin','skin'],
        ['_','_','_','skin','skin','skin','_','_'],
        ['_','_','shirt','shirt','shirt','shirt','shirt','_'],
        ['_','shirt','shirt','shirt','shirt','shirt','shirt','clip'],
        ['_','shirt','_','shirt','shirt','shirt','_','clip'],
        ['_','_','_','pants','pants','pants','_','_'],
        ['_','_','_','pants','_','pants','_','_'],
        ['_','_','_','shoes','_','shoes','_','_']
      ],
      spriteWorking: [
        ['_','_','_','hair','hair','hair','_','_'],
        ['_','_','hair','hair','hair','hair','hair','_'],
        ['_','_','skin','eyes','skin','skin','eyes','skin'],
        ['_','_','skin','skin','skin','skin','skin','skin'],
        ['_','_','_','skin','skin','skin','_','_'],
        ['_','_','shirt','shirt','shirt','shirt','shirt','_'],
        ['shirt','shirt','shirt','shirt','shirt','shirt','shirt','clip'],
        ['shirt','_','_','shirt','shirt','shirt','_','clip'],
        ['_','_','_','pants','pants','pants','_','_'],
        ['_','_','_','pants','_','pants','_','_'],
        ['_','_','_','shoes','_','shoes','_','_']
      ],
      deskX: 500,
      deskY: 395,
      deskScale: 0.95,
      bodyColor: '#b45309',
      bodyDark: '#92400e',
      headColor: '#78350f',
      faceGlow: '#fbbf24',
      chairColor: '#f59e0b',
      deskItems: ['clipboard'],
      verbs: {
        started: ['opens the review for','takes a careful look at','begins examining','pulls up the diff for'],
        completed: ['approves with notes on','signs off on','finishes the review of','gives the green light to'],
        failed: ['requests changes on','sends back for revision','finds blockers in'],
        assigned: ['claims for review','picks up','queues'],
        decomposed: ['outlines','structures','organizes']
      },
      quotes: {
        idle: ['Clipboard ready.','Awaiting submissions.','Pen in hand.'],
        working: ['Reading through this...','Noting edge cases...','Almost done reviewing...']
      }
    }
  };

  // ====================================================
  // AGENT STATE
  // ====================================================

  var agentStates = {
    coordinator: { working: false, frame: 0, currentTask: '' },
    builder:     { working: false, frame: 0, currentTask: '' },
    auditor:     { working: false, frame: 0, currentTask: '' },
    reviewer:    { working: false, frame: 0, currentTask: '' }
  };

  var agentData = {};  // populated from /v1/agents/status for role card modals

  // ====================================================
  // OFFICE SCENE CANVAS
  // ====================================================

  // ====================================================
  // RICH OFFICE SCENE - 960x540 (gentle 3/4 perspective)
  // ====================================================

  var roomBuffer = null;
  var animFrame = 0;
  var particles = [];

  // Initialize floating light particles
  for (var pi = 0; pi < 18; pi++) {
    particles.push({
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 200,
      speed: 0.15 + Math.random() * 0.3,
      alpha: 0.15 + Math.random() * 0.35,
      size: 1 + Math.random() * 2,
      zone: 0
    });
  }
  for (var pi2 = 0; pi2 < 14; pi2++) {
    particles.push({
      x: 500 + Math.random() * 300,
      y: 100 + Math.random() * 200,
      speed: 0.15 + Math.random() * 0.3,
      alpha: 0.15 + Math.random() * 0.35,
      size: 1 + Math.random() * 2,
      zone: 1
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 3D box with top surface, front face, and right side
  function isoBox(ctx, x, y, w, h, d, topColor, frontColor, sideColor) {
    var dy = d * 0.5;
    // Top face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w + d, y - dy);
    ctx.lineTo(x + d, y - dy);
    ctx.closePath();
    ctx.fill();
    // Front face
    ctx.fillStyle = frontColor;
    ctx.fillRect(x, y, w, h);
    // Right side
    ctx.fillStyle = sideColor;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + d, y - dy);
    ctx.lineTo(x + w + d, y - dy + h);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }

  // ===== ROOM GEOMETRY =====
  // Gentle 3/4 view: back wall nearly horizontal with slight tilt
  // Floor recedes with mild perspective
  var WALL_TOP = 38;
  var WALL_BOTTOM = 230;
  // Slight tilt: left side 5px lower than right
  var WALL_TILT = 5;

  function drawStaticRoom(ctx) {
    var W = 960, H = 540;

    // === CEILING ===
    var ceilGrad = ctx.createLinearGradient(0, 0, 0, WALL_TOP + 5);
    ceilGrad.addColorStop(0, '#dce3ed');
    ceilGrad.addColorStop(1, '#c8d2e0');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, W, WALL_TOP + WALL_TILT + 5);

    // Crown molding
    ctx.fillStyle = '#d0d8e4';
    ctx.beginPath();
    ctx.moveTo(0, WALL_TOP + WALL_TILT);
    ctx.lineTo(W, WALL_TOP);
    ctx.lineTo(W, WALL_TOP + 3);
    ctx.lineTo(0, WALL_TOP + WALL_TILT + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b8c4d4';
    ctx.beginPath();
    ctx.moveTo(0, WALL_TOP + WALL_TILT + 3);
    ctx.lineTo(W, WALL_TOP + 3);
    ctx.lineTo(W, WALL_TOP + 5);
    ctx.lineTo(0, WALL_TOP + WALL_TILT + 5);
    ctx.closePath();
    ctx.fill();

    // === BACK WALL ===
    var wallGrad = ctx.createLinearGradient(0, WALL_TOP, 0, WALL_BOTTOM);
    wallGrad.addColorStop(0, '#c4cfe0');
    wallGrad.addColorStop(1, '#a8b8cc');
    ctx.fillStyle = wallGrad;
    ctx.beginPath();
    ctx.moveTo(0, WALL_TOP + WALL_TILT + 5);
    ctx.lineTo(W, WALL_TOP + 5);
    ctx.lineTo(W, WALL_BOTTOM);
    ctx.lineTo(0, WALL_BOTTOM + WALL_TILT);
    ctx.closePath();
    ctx.fill();

    // Subtle horizontal molding on wall
    var moldY = WALL_TOP + (WALL_BOTTOM - WALL_TOP) * 0.4;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, moldY + WALL_TILT * 0.6);
    ctx.lineTo(W, moldY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.beginPath();
    ctx.moveTo(0, moldY + WALL_TILT * 0.6 + 1);
    ctx.lineTo(W, moldY + 1);
    ctx.stroke();

    // === BASEBOARD ===
    ctx.fillStyle = '#8a7050';
    ctx.beginPath();
    ctx.moveTo(0, WALL_BOTTOM + WALL_TILT);
    ctx.lineTo(W, WALL_BOTTOM);
    ctx.lineTo(W, WALL_BOTTOM + 7);
    ctx.lineTo(0, WALL_BOTTOM + WALL_TILT + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, WALL_BOTTOM + WALL_TILT);
    ctx.lineTo(W, WALL_BOTTOM);
    ctx.lineTo(W, WALL_BOTTOM + 1);
    ctx.lineTo(0, WALL_BOTTOM + WALL_TILT + 1);
    ctx.closePath();
    ctx.fill();

    // === FLOOR ===
    var floorTop = WALL_BOTTOM + 7;
    var floorGrad = ctx.createLinearGradient(0, floorTop, 0, H);
    floorGrad.addColorStop(0, '#c4a070');
    floorGrad.addColorStop(0.4, '#b8956a');
    floorGrad.addColorStop(1, '#8a7050');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorTop, W, H - floorTop);

    // Wood plank horizontal lines (slight tilt to match perspective)
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (var py = floorTop + 15; py < H; py += 22) {
      var tiltAmt = ((py - floorTop) / (H - floorTop)) * 3;
      ctx.beginPath();
      ctx.moveTo(0, py + tiltAmt);
      ctx.lineTo(W, py);
      ctx.stroke();
    }
    // Staggered vertical joints
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    for (var py2 = floorTop; py2 < H; py2 += 22) {
      var offset = ((py2 - floorTop) / 22) % 2 === 0 ? 0 : 55;
      for (var px = offset; px < W; px += 110) {
        ctx.beginPath();
        ctx.moveTo(px, py2);
        ctx.lineTo(px, py2 + 22);
        ctx.stroke();
      }
    }
    // Subtle grain
    ctx.strokeStyle = 'rgba(0,0,0,0.02)';
    for (var gy = floorTop; gy < H; gy += 6) {
      ctx.beginPath();
      ctx.moveTo(0, gy + 2);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    // === WINDOWS (on back wall) ===
    drawWindow(ctx, 120, WALL_TOP + 25, 170, 150);
    drawWindow(ctx, 580, WALL_TOP + 22, 170, 150);

    // === WHITEBOARD (between windows) ===
    drawWhiteboard(ctx, 350, WALL_TOP + 30, 160, 140);

    // === BOOKSHELF (left side of wall) ===
    drawBookshelf(ctx, 15, WALL_BOTTOM - 140, 80, 140);

    // === SERVER RACK (right side of wall) ===
    drawServerRack(ctx, 850, WALL_BOTTOM - 130, 55, 130);

    // === CEILING LIGHTS ===
    drawCeilingLight(ctx, 200, 8, 80, 10);
    drawCeilingLight(ctx, 450, 6, 80, 10);
    drawCeilingLight(ctx, 700, 8, 80, 10);

    // === FLOOR PLANTS ===
    drawPlant(ctx, 25, 440, 1.0);
    drawPlant(ctx, 430, 460, 0.85);
    drawPlant(ctx, 880, 445, 0.9);
  }

  function drawWindow(ctx, x, y, w, h) {
    // Frame outer
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.fillStyle = '#6d5339';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);

    // Sky gradient
    var skyGrad = ctx.createLinearGradient(x, y, x, y + h);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(0.5, '#B0E0E6');
    skyGrad.addColorStop(1, '#E0F0FF');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(x, y, w, h);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    roundRect(ctx, x + 18, y + 20, 50, 16, 8);
    ctx.fill();
    roundRect(ctx, x + 90, y + 35, 40, 13, 6);
    ctx.fill();
    roundRect(ctx, x + 55, y + 14, 30, 10, 5);
    ctx.fill();

    // 4-pane cross
    ctx.fillStyle = '#5c4033';
    ctx.fillRect(x + w / 2 - 2, y, 4, h);
    ctx.fillRect(x, y + h / 2 - 2, w, 4);

    // Window sill
    ctx.fillStyle = '#6d5339';
    ctx.fillRect(x - 8, y + h + 5, w + 16, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x - 8, y + h + 11, w + 16, 3);
  }

  function drawWhiteboard(ctx, x, y, w, h) {
    // Frame
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    // Board
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(x, y, w, h);

    // Chart content
    ctx.fillStyle = 'rgba(34,211,238,0.4)';
    ctx.fillRect(x + 12, y + 20, 55, 7);
    ctx.fillRect(x + 12, y + 33, 40, 7);
    ctx.fillRect(x + 12, y + 46, 62, 7);

    ctx.fillStyle = 'rgba(16,185,129,0.4)';
    ctx.fillRect(x + 85, y + 20, 28, 45);

    ctx.fillStyle = 'rgba(245,158,11,0.3)';
    ctx.beginPath();
    ctx.arc(x + 110, y + 95, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(239,68,68,0.3)';
    ctx.fillRect(x + 12, y + 80, 45, 35);

    // Text-like lines
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (var tl = 0; tl < 3; tl++) {
      ctx.fillRect(x + 12, y + 120 + tl * 7, 35 + tl * 12, 2);
    }

    // Tray + markers
    ctx.fillStyle = '#999';
    ctx.fillRect(x + 10, y + h - 4, w - 20, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 28, y + h - 10, 4, 10);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(x + 38, y + h - 10, 4, 10);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x + 48, y + h - 10, 4, 10);
  }

  function drawBookshelf(ctx, x, y, w, h) {
    // Outer frame
    ctx.fillStyle = '#6d4c2a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8b6b4a';
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

    // 3 shelves
    var shelfH = Math.floor((h - 6) / 3);
    for (var si = 0; si < 3; si++) {
      var sy = y + 3 + si * shelfH;
      // Shelf plank
      ctx.fillStyle = '#6d4c2a';
      ctx.fillRect(x + 3, sy + shelfH - 3, w - 6, 3);

      // Books
      var bookX = x + 5;
      var bookColors = ['#1e3a5f','#8b2252','#2d5a27','#c4a35a','#4a3070','#b44b2d','#1a5276','#6b3f2a','#2e4057'];
      for (var bi = 0; bi < 6 + si; bi++) {
        var bw = 5 + Math.floor(Math.random() * 5);
        var bh = shelfH - 8 - Math.floor(Math.random() * 8);
        if (bookX + bw > x + w - 5) break;
        ctx.fillStyle = bookColors[(bi + si * 3) % bookColors.length];
        ctx.fillRect(bookX, sy + shelfH - 3 - bh, bw, bh);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(bookX + 1, sy + shelfH - 3 - bh, 1, bh);
        bookX += bw + 2;
      }
    }
    // 3D side edge
    ctx.fillStyle = '#5a3d22';
    ctx.fillRect(x + w, y + 2, 6, h - 2);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(x + w, y, 6, 3);
  }

  function drawServerRack(ctx, x, y, w, h) {
    // Dark body
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // 3D side edge
    ctx.fillStyle = '#151f2e';
    ctx.fillRect(x + w, y + 2, 8, h - 2);

    // Rack unit lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (var ri = 0; ri < 7; ri++) {
      var ry = y + 8 + ri * (h / 8);
      ctx.beginPath();
      ctx.moveTo(x + 4, ry);
      ctx.lineTo(x + w - 4, ry);
      ctx.stroke();
      // Vents
      for (var vi = 0; vi < 3; vi++) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x + 16 + vi * 8, ry + 3, 4, 2);
      }
    }

    // Static LEDs
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(x + 6, y + 10, 3, 2);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x + 6, y + 26, 3, 2);
    ctx.fillRect(x + 6, y + 58, 3, 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 6, y + 42, 3, 2);
    ctx.fillRect(x + 6, y + 74, 3, 2);
  }

  function drawCeilingLight(ctx, x, y, w, h) {
    ctx.fillStyle = '#c0c8d4';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#d8e0ea';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    // Glow pool
    var glowGrad = ctx.createRadialGradient(x + w / 2, y + h + 25, 3, x + w / 2, y + h + 25, 120);
    glowGrad.addColorStop(0, 'rgba(255,248,231,0.10)');
    glowGrad.addColorStop(1, 'rgba(255,248,231,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(x - 80, y + h, w + 160, 200);
  }

  function drawPlant(ctx, x, y, scale) {
    var s = scale || 1;
    // Pot
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - 9 * s, y + 14 * s, 18 * s, 18 * s);
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(x - 11 * s, y + 11 * s, 22 * s, 5 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x - 11 * s, y + 11 * s, 22 * s, 1);
    // Dirt
    ctx.fillStyle = '#3d2b1f';
    ctx.fillRect(x - 7 * s, y + 11 * s, 14 * s, 3 * s);
    // Leaves
    ctx.fillStyle = '#2d7a3a';
    var leaves = [[-10,-4,9,15],[-1,-13,12,13],[5,-6,9,15],[-7,-15,10,11],[2,-19,8,10]];
    for (var li = 0; li < leaves.length; li++) {
      var lf = leaves[li];
      roundRect(ctx, x + lf[0] * s, y + lf[1] * s, lf[2] * s, lf[3] * s, 3 * s);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(100,200,100,0.25)';
    for (var lh = 0; lh < 3; lh++) {
      var lf2 = leaves[lh];
      ctx.fillRect(x + (lf2[0] + 2) * s, y + (lf2[1] + 2) * s, 2 * s, (lf2[3] - 4) * s);
    }
  }

  // ===== DESK STATION (with 3D depth) =====
  function drawDeskStation(ctx, x, y, vis, state, frame, scale) {
    var s = scale || 1;

    // Floor shadow
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    roundRect(ctx, x - 3, y + 16 * s, 135 * s, 6 * s, 3);
    ctx.fill();

    // === CHAIR (behind agent, slightly right) ===
    var chX = x + 52 * s, chY = y - 28 * s;
    // Chair back
    ctx.fillStyle = vis.chairColor || vis.color;
    roundRect(ctx, chX, chY, 26 * s, 32 * s, 5 * s);
    ctx.fill();
    // Chair back inner (darker)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, chX + 3 * s, chY + 3 * s, 20 * s, 24 * s, 3 * s);
    ctx.fill();
    // Chair seat (parallelogram for depth)
    ctx.fillStyle = vis.chairColor || vis.color;
    ctx.beginPath();
    ctx.moveTo(chX - 2 * s, chY + 32 * s);
    ctx.lineTo(chX + 30 * s, chY + 32 * s);
    ctx.lineTo(chX + 36 * s, chY + 27 * s);
    ctx.lineTo(chX + 4 * s, chY + 27 * s);
    ctx.closePath();
    ctx.fill();
    // Base + wheels
    ctx.fillStyle = '#444';
    ctx.fillRect(chX + 10 * s, chY + 32 * s, 5 * s, 10 * s);
    ctx.fillStyle = '#333';
    ctx.fillRect(chX + 3 * s, chY + 40 * s, 6 * s, 3 * s);
    ctx.fillRect(chX + 18 * s, chY + 40 * s, 6 * s, 3 * s);

    // === DESK (3D box) ===
    var dW = 120 * s, dH = 13 * s, dD = 22 * s;
    isoBox(ctx, x, y, dW, dH, dD, '#a07850', '#8b6b4a', '#6d5339');

    // Top edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dW, y);
    ctx.stroke();

    // Drawer divider + handles on front
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    var mid = x + dW * 0.5;
    ctx.beginPath();
    ctx.moveTo(mid, y + 2);
    ctx.lineTo(mid, y + dH - 2);
    ctx.stroke();
    ctx.fillStyle = '#555';
    ctx.fillRect(mid - 22 * s, y + dH * 0.45, 6 * s, 2);
    ctx.fillRect(mid + 16 * s, y + dH * 0.45, 6 * s, 2);

    // Legs
    ctx.fillStyle = '#6d5339';
    ctx.fillRect(x + 3, y + dH, 4 * s, 20 * s);
    ctx.fillRect(x + dW - 6 * s, y + dH, 4 * s, 20 * s);

    // === MONITOR ===
    var monX = x + 22 * s, monY = y - 36 * s;
    var monW = 42 * s, monH = 28 * s;
    // Bezel
    ctx.fillStyle = '#1a1a2e';
    roundRect(ctx, monX, monY, monW, monH, 2 * s);
    ctx.fill();
    // Screen
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(monX + 3 * s, monY + 3 * s, monW - 6 * s, monH - 6 * s);
    // Stand
    ctx.fillStyle = '#333';
    ctx.fillRect(monX + monW * 0.4, monY + monH, 8 * s, 6 * s);
    ctx.fillStyle = '#444';
    ctx.fillRect(monX + monW * 0.28, monY + monH + 5 * s, 18 * s, 2 * s);

    // Screen content
    if (state.working) {
      var colors = [vis.faceGlow || vis.color, 'rgba(255,255,255,0.4)', vis.color, 'rgba(200,200,255,0.3)'];
      for (var cl = 0; cl < 5; cl++) {
        var lineW = (6 + ((frame + cl * 4) % 22)) * s;
        if (lineW > 32 * s) lineW = 32 * s;
        ctx.fillStyle = colors[cl % colors.length];
        ctx.globalAlpha = 0.7;
        ctx.fillRect(monX + 5 * s, monY + 5 * s + cl * 4.5 * s, lineW, 2);
      }
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillStyle = vis.colorDark;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(monX + monW * 0.5, monY + monH * 0.5, 3 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // === KEYBOARD ===
    ctx.fillStyle = '#4a4a5a';
    roundRect(ctx, x + 30 * s, y - 7 * s, 28 * s, 6 * s, 1.5 * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 32 * s, y - 6 * s, 24 * s, 1);
    ctx.fillRect(x + 32 * s, y - 3 * s, 24 * s, 1);

    // === DESK ITEMS ===
    var ix = x + 84 * s, iy = y - 5 * s;
    if (vis.deskItems.indexOf('coffee') >= 0) {
      ctx.fillStyle = '#d4a574';
      roundRect(ctx, ix, iy - 7 * s, 7 * s, 9 * s, 2);
      ctx.fill();
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(ix + 1, iy - 5 * s, 4 * s, 2 * s);
      ctx.strokeStyle = '#d4a574';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ix + 8 * s, iy - 2 * s, 3 * s, -1.2, 1.2);
      ctx.stroke();
    }
    if (vis.deskItems.indexOf('wrench') >= 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(ix + 2 * s, iy - 5 * s, 2 * s, 9 * s);
      ctx.fillRect(ix, iy - 5 * s, 5 * s, 2 * s);
    }
    if (vis.deskItems.indexOf('lock') >= 0) {
      ctx.fillStyle = '#ef4444';
      roundRect(ctx, ix, iy - 4 * s, 7 * s, 5 * s, 2);
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ix + 3.5 * s, iy - 6 * s, 3 * s, Math.PI, 0);
      ctx.stroke();
    }
    if (vis.deskItems.indexOf('clipboard') >= 0) {
      ctx.fillStyle = '#d4a574';
      ctx.fillRect(ix, iy - 9 * s, 9 * s, 13 * s);
      ctx.fillStyle = '#f5f0e0';
      ctx.fillRect(ix + 1, iy - 6 * s, 7 * s, 8 * s);
      ctx.fillStyle = '#888';
      ctx.fillRect(ix + 2, iy - 10 * s, 5 * s, 3 * s);
    }

    // === ROBOT ===
    drawRobot(ctx, x + 48 * s, y - 26 * s, vis, state, frame, s);
  }

  function drawRobot(ctx, x, y, vis, state, frame, scale) {
    var s = scale || 1;
    var bob = state.working ? Math.sin(frame * 0.5) * 1.5 * s : 0;
    var arm = state.working ? Math.sin(frame * 0.8) * 3 * s : 0;

    // Antenna
    ctx.strokeStyle = vis.bodyDark || '#444';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x + 10 * s, y - 8 * s + bob);
    ctx.lineTo(x + 10 * s, y - 20 * s + bob);
    ctx.stroke();
    if (state.working) {
      ctx.fillStyle = vis.faceGlow || vis.color;
      ctx.globalAlpha = 0.4 + Math.sin(frame * 0.6) * 0.3;
      ctx.beginPath();
      ctx.arc(x + 10 * s, y - 22 * s + bob, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    ctx.fillStyle = vis.faceGlow || vis.color;
    ctx.beginPath();
    ctx.arc(x + 10 * s, y - 22 * s + bob, 3 * s, 0, Math.PI * 2);
    ctx.fill();

    // Head
    var hx = x, hy = y - 6 * s + bob;
    ctx.fillStyle = vis.headColor || vis.bodyDark;
    roundRect(ctx, hx, hy, 20 * s, 18 * s, 4 * s);
    ctx.fill();
    // Face screen
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, hx + 3 * s, hy + 3 * s, 14 * s, 12 * s, 2 * s);
    ctx.fill();

    // Eyes
    if (state.working) {
      var ep = frame % 8;
      ctx.fillStyle = vis.faceGlow || '#fff';
      if (ep < 6) {
        ctx.fillRect(hx + 5 * s, hy + 7 * s, 3 * s, 3 * s);
        ctx.fillRect(hx + 12 * s, hy + 7 * s, 3 * s, 3 * s);
      } else {
        ctx.fillRect(hx + 5 * s, hy + 9 * s, 3 * s, 1);
        ctx.fillRect(hx + 12 * s, hy + 9 * s, 3 * s, 1);
      }
    } else {
      var bp = (frame + Math.floor(x)) % 30;
      ctx.fillStyle = vis.faceGlow || '#fff';
      if (bp < 27) {
        ctx.beginPath();
        ctx.arc(hx + 7 * s, hy + 9 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx + 14 * s, hy + 9 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(hx + 5 * s, hy + 9 * s, 4 * s, 1);
        ctx.fillRect(hx + 12 * s, hy + 9 * s, 4 * s, 1);
      }
    }

    // Body
    var bx = x - 2 * s, by = y + 14 * s + bob;
    ctx.fillStyle = vis.bodyColor || vis.color;
    roundRect(ctx, bx, by, 24 * s, 18 * s, 4 * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(bx + 4 * s, by + 2 * s, 16 * s, 2 * s);
    // Chest light
    ctx.fillStyle = vis.faceGlow || vis.color;
    ctx.globalAlpha = state.working ? 0.8 : 0.3;
    ctx.beginPath();
    ctx.arc(bx + 12 * s, by + 10 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Arms
    ctx.fillStyle = vis.bodyDark || '#444';
    ctx.fillRect(bx - 6 * s - arm, by + 2 * s, 6 * s, 4 * s);
    ctx.fillRect(bx - 8 * s - arm, by + 5 * s, 5 * s, 10 * s);
    ctx.fillRect(bx + 24 * s + arm, by + 2 * s, 6 * s, 4 * s);
    ctx.fillRect(bx + 27 * s + arm, by + 5 * s, 5 * s, 10 * s);

    // Working glow
    if (state.working) {
      ctx.fillStyle = vis.color;
      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      ctx.arc(x + 10 * s, y + 10 * s + bob, 28 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  function renderScene() {
    var canvas = document.getElementById('officeScene');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 960, H = 540;

    // Cache static room
    if (!roomBuffer) {
      var offscreen = document.createElement('canvas');
      offscreen.width = W;
      offscreen.height = H;
      drawStaticRoom(offscreen.getContext('2d'));
      roomBuffer = offscreen;
    }

    ctx.drawImage(roomBuffer, 0, 0);

    // Animated server LEDs
    var srvX = 850, srvY = WALL_BOTTOM - 130;
    if (animFrame % 3 === 0) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(srvX + 6, srvY + 90, 3, 2);
    }
    if (animFrame % 4 === 0) {
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(srvX + 6, srvY + 100, 3, 2);
    }
    if (animFrame % 6 === 0) {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(srvX + 6, srvY + 110, 3, 2);
    }

    // === DESK STATIONS (back-to-front for correct overlap) ===
    // Sort by deskY so farther-back desks draw first
    var drawOrder = [
      { id: 'coordinator', vis: AGENT_VISUALS.coordinator, st: agentStates.coordinator },
      { id: 'auditor', vis: AGENT_VISUALS.auditor, st: agentStates.auditor },
      { id: 'reviewer', vis: AGENT_VISUALS.reviewer, st: agentStates.reviewer },
      { id: 'builder', vis: AGENT_VISUALS.builder, st: agentStates.builder }
    ];
    drawOrder.sort(function(a, b) { return a.vis.deskY - b.vis.deskY; });

    for (var di = 0; di < drawOrder.length; di++) {
      var d = drawOrder[di];
      drawDeskStation(ctx, d.vis.deskX, d.vis.deskY, d.vis, d.st, d.st.frame, d.vis.deskScale || 1);
    }

    // === WINDOW LIGHT RAYS ===
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.moveTo(140, WALL_BOTTOM);
    ctx.lineTo(270, WALL_BOTTOM);
    ctx.lineTo(350, H);
    ctx.lineTo(60, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#fff8e7';
    ctx.beginPath();
    ctx.moveTo(600, WALL_BOTTOM);
    ctx.lineTo(730, WALL_BOTTOM);
    ctx.lineTo(810, H);
    ctx.lineTo(520, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Floating particles
    for (var ppi = 0; ppi < particles.length; ppi++) {
      var p = particles[ppi];
      ctx.fillStyle = '#fff8e7';
      ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(animFrame * 0.1 + ppi));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      p.y -= p.speed;
      p.x += Math.sin(animFrame * 0.05 + ppi) * 0.3;
      if (p.y < WALL_TOP) {
        p.y = 300 + Math.random() * 200;
        p.x = p.zone === 0 ? 80 + Math.random() * 320 : 480 + Math.random() * 340;
      }
    }
    ctx.globalAlpha = 1.0;

    // Warmth pulse
    if (animFrame % 20 < 10) {
      ctx.fillStyle = 'rgba(255,248,231,0.015)';
      ctx.fillRect(0, 0, W, H);
    }

    animFrame++;
  }

  // Animation loop
  setInterval(function() {
    var ids = ['coordinator','builder','auditor','reviewer'];
    for (var i = 0; i < ids.length; i++) {
      if (agentStates[ids[i]].working) agentStates[ids[i]].frame++;
    }
    renderScene();
  }, 600);

  // Initial draw
  setTimeout(function() { renderScene(); }, 50);

  // ====================================================
  // ROLE CARD STRIP
  // ====================================================

  function renderRoleStrip() {
    var strip = document.getElementById('roleStrip');
    if (!strip) return;
    var ids = ['coordinator','builder','auditor','reviewer'];
    var html = '';
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var vis = AGENT_VISUALS[id];
      var state = agentStates[id];
      var statusText = state.working ? 'working...' : 'idle';
      var taskText = state.currentTask || '';
      html += '<div class="role-card-compact" onclick="openRoleCard(\\'' + id + '\\')" style="border-left:3px solid ' + vis.color + '">' +
        '<div class="rc-header">' +
          '<span class="rc-dot" style="background:' + vis.color + (state.working ? ';box-shadow:0 0 6px ' + vis.color : '') + '"></span>' +
          '<span class="rc-name" style="color:' + vis.color + '">' + esc(vis.label) + '</span>' +
        '</div>' +
        '<div class="rc-title">' + esc(vis.title) + '</div>' +
        '<div class="rc-status">' + statusText + '</div>' +
        (taskText ? '<div class="rc-task">' + esc(taskText) + '</div>' : '') +
      '</div>';
    }
    strip.innerHTML = html;
  }

  // Initial role strip
  setTimeout(function() { renderRoleStrip(); }, 60);

  // ====================================================
  // ROLE CARD MODAL
  // ====================================================

  function buildField(label, value) {
    if (!value) return '';
    return '<div class="modal-field"><div class="modal-field-label">' + esc(label) + '</div><div class="modal-field-value">' + esc(value) + '</div></div>';
  }

  function buildExpertiseTags(expertise) {
    if (!expertise || expertise.length === 0) return '';
    var html = '<div class="expertise-tags">';
    for (var i = 0; i < expertise.length; i++) {
      html += '<span class="expertise-tag">' + esc(expertise[i]) + '</span>';
    }
    html += '</div>';
    return html;
  }

  window.openRoleCard = function(id) {
    var vis = AGENT_VISUALS[id];
    if (!vis) return;
    var data = agentData[id] || {};
    var rc = data.roleCard || {};
    var overlay = document.getElementById('modalOverlay');
    var content = document.getElementById('modalContent');

    var modelBadge = (data.modelPreference || 'sonnet').toUpperCase();
    var state = agentStates[id];
    var quote = state.working
      ? pickRandom(vis.quotes.working)
      : (data.personality || pickRandom(vis.quotes.idle));

    content.innerHTML =
      '<div class="modal-header">' +
        '<span class="mh-dot" style="background:' + vis.color + (state.working ? ';box-shadow:0 0 8px ' + vis.color : '') + '"></span>' +
        '<div>' +
          '<div class="mh-name" style="color:' + vis.color + '">' + esc(vis.label) + '</div>' +
          '<div class="mh-title">' + esc(vis.title) + ' <span class="mh-model">' + esc(modelBadge) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-grid">' +
        '<div>' +
          buildField('Domain', rc.domain) +
          buildField('Inputs', rc.inputs) +
          buildField('Delivers', rc.delivers) +
          buildField('Autonomy', rc.autonomy) +
        '</div>' +
        '<div>' +
          buildField('Definition of Done', rc.definitionOfDone) +
          buildField('Hard Noes', rc.hardNoes) +
          buildField('Escalation', rc.escalation) +
          buildField('Methods', rc.methods) +
        '</div>' +
      '</div>' +
      buildExpertiseTags(data.expertise || []) +
      '<div class="modal-personality">"' + esc(quote) + '"</div>';

    overlay.className = 'modal-overlay open';
  };

  window.closeRoleCard = function() {
    document.getElementById('modalOverlay').className = 'modal-overlay';
  };

  // ====================================================
  // TASK BOARD TOGGLE
  // ====================================================

  window.toggleTaskBoard = function() {
    var body = document.getElementById('taskBoard');
    var toggle = document.getElementById('taskBoardToggle');
    if (body.className.indexOf('collapsed') >= 0) {
      body.className = 'task-board-body';
      toggle.innerHTML = '&#9660;';
    } else {
      body.className = 'task-board-body collapsed';
      toggle.innerHTML = '&#9654;';
    }
  };

  // ====================================================
  // EVENT COLORS
  // ====================================================

  var EVENT_COLORS = {
    task_submitted:   { bg:'rgba(34,211,238,0.12)', fg:'#22d3ee', border:'rgba(34,211,238,0.3)' },
    task_decomposed:  { bg:'rgba(34,211,238,0.12)', fg:'#22d3ee', border:'rgba(34,211,238,0.3)' },
    auto_tick_started:{ bg:'rgba(34,211,238,0.12)', fg:'#22d3ee', border:'rgba(34,211,238,0.3)' },
    task_assigned:    { bg:'rgba(245,158,11,0.12)', fg:'#f59e0b', border:'rgba(245,158,11,0.3)' },
    agent_started:    { bg:'rgba(245,158,11,0.12)', fg:'#f59e0b', border:'rgba(245,158,11,0.3)' },
    auto_tick_stopped:{ bg:'rgba(245,158,11,0.12)', fg:'#f59e0b', border:'rgba(245,158,11,0.3)' },
    agent_completed:  { bg:'rgba(16,185,129,0.12)', fg:'#10b981', border:'rgba(16,185,129,0.3)' },
    agent_failed:     { bg:'rgba(239,68,68,0.12)',  fg:'#ef4444', border:'rgba(239,68,68,0.3)' },
    tick_started:     { bg:'rgba(107,114,128,0.08)', fg:'#4b5563', border:'rgba(107,114,128,0.2)' },
    tick_completed:   { bg:'rgba(107,114,128,0.08)', fg:'#4b5563', border:'rgba(107,114,128,0.2)' }
  };
  var DEFAULT_COLOR = { bg:'rgba(107,114,128,0.12)', fg:'#6b7280', border:'rgba(107,114,128,0.3)' };

  function getColor(type) { return EVENT_COLORS[type] || DEFAULT_COLOR; }

  // ====================================================
  // AGENT RESOLUTION
  // ====================================================

  var AGENT_IDS = ['coordinator','builder','auditor','reviewer'];

  function resolveAgentId(raw) {
    if (!raw) return null;
    var lower = String(raw).toLowerCase();
    for (var i = 0; i < AGENT_IDS.length; i++) {
      if (lower === AGENT_IDS[i] || lower.indexOf(AGENT_IDS[i]) !== -1) return AGENT_IDS[i];
    }
    return null;
  }

  // ====================================================
  // FEED - PERSONALITY-DRIVEN MESSAGES
  // ====================================================

  var feedList = document.getElementById('feedList');
  var connDot = document.getElementById('connDot');
  var connText = document.getElementById('connText');
  var feedCount = 0;

  function setConnected(state) {
    connDot.className = 'conn-dot ' + (state ? 'connected' : 'disconnected');
    connText.textContent = state ? 'Connected' : 'Disconnected';
  }

  function getAgentName(evt) {
    var d = evt.data || {};
    return d.agentName || d.agent || d.agent_id || null;
  }

  function getTaskTitle(evt) {
    var d = evt.data || {};
    return d.taskTitle || d.task_title || d.title || null;
  }

  function buildFeedHTML(evt) {
    var color = getColor(evt.type);
    var name = getAgentName(evt);
    var agentId = resolveAgentId(name);
    var vis = agentId ? AGENT_VISUALS[agentId] : null;
    var taskTitle = getTaskTitle(evt);
    var d = evt.data || {};

    var agentColor = vis ? vis.color : '#6b7280';
    var agentLabel = name || 'System';
    var message = '';

    switch (evt.type) {
      case 'task_submitted':
        agentLabel = 'System';
        agentColor = '#22d3ee';
        message = 'New task submitted: "' + esc(taskTitle || '?') + '"';
        break;
      case 'task_decomposed':
        agentLabel = name || 'Coordinator';
        agentColor = AGENT_VISUALS.coordinator.color;
        var count = d.subtaskCount || d.subtask_count || '?';
        message = pickRandom(AGENT_VISUALS.coordinator.verbs.decomposed) + ' ' + count + ' subtasks';
        break;
      case 'task_assigned':
        if (vis) {
          message = pickRandom(vis.verbs.assigned) + ' "' + esc(taskTitle || '?') + '"';
        } else {
          message = 'assigned to "' + esc(taskTitle || '?') + '"';
        }
        break;
      case 'agent_started':
        if (vis) {
          message = pickRandom(vis.verbs.started) + ' "' + esc(taskTitle || '?') + '"';
        } else {
          message = 'started working on "' + esc(taskTitle || '?') + '"';
        }
        break;
      case 'agent_completed':
        var dur = d.duration ? ' (' + (d.duration / 1000).toFixed(1) + 's)' : '';
        if (vis) {
          message = pickRandom(vis.verbs.completed) + ' "' + esc(taskTitle || '?') + '"' + dur;
        } else {
          message = 'completed "' + esc(taskTitle || '?') + '"' + dur;
        }
        break;
      case 'agent_failed':
        if (vis) {
          message = pickRandom(vis.verbs.failed) + ' "' + esc(taskTitle || '?') + '"';
        } else {
          message = 'failed on "' + esc(taskTitle || '?') + '"';
        }
        break;
      case 'tick_started':
        agentLabel = 'System';
        agentColor = '#4b5563';
        message = 'Tick #' + (d.tickNumber || d.tick_number || '?');
        break;
      case 'tick_completed':
        agentLabel = 'System';
        agentColor = '#4b5563';
        var ex = d.executed || 0;
        message = 'Tick #' + (d.tickNumber || d.tick_number || '?') + ' done' + (ex > 0 ? ' \\u2014 ' + ex + ' executed' : ' \\u2014 idle');
        break;
      case 'auto_tick_started':
        agentLabel = 'System';
        agentColor = '#22d3ee';
        message = 'Auto-tick enabled (' + (d.intervalMs || d.interval_ms || '?') + 'ms)';
        break;
      case 'auto_tick_stopped':
        agentLabel = 'System';
        agentColor = '#f59e0b';
        message = 'Auto-tick stopped';
        break;
      case 'connected':
        agentLabel = 'Studio';
        agentColor = '#10b981';
        message = 'Connected to agent service';
        break;
      default:
        message = evt.type.replace(/_/g, ' ');
    }

    return '<span class="feed-time">' + esc(formatTime(evt.timestamp)) + '</span>' +
      '<div class="feed-content">' +
        '<span class="feed-agent" style="color:' + agentColor + '">' + esc(agentLabel) + '</span> ' +
        '<span class="feed-badge" style="background:' + color.bg + ';color:' + color.fg + ';border-color:' + color.border + '">' + esc(evt.type) + '</span>' +
        '<div class="feed-message">' + message + '</div>' +
      '</div>';
  }

  function addFeedEntry(evt) {
    var el = document.createElement('div');
    el.className = 'feed-entry';
    el.innerHTML = buildFeedHTML(evt);
    feedList.insertBefore(el, feedList.firstChild);
    feedCount++;
    totalEventCount++;
    updateStats();
    while (feedCount > MAX_FEED) {
      feedList.removeChild(feedList.lastChild);
      feedCount--;
    }
  }

  function updateStats() {
    var statTasks = document.getElementById('statTasks');
    var statEvents = document.getElementById('statEvents');
    if (statTasks) statTasks.innerHTML = 'Tasks: <strong>' + totalTaskCount + '</strong>';
    if (statEvents) statEvents.innerHTML = 'Events: <strong>' + totalEventCount + '</strong>';
  }

  // ====================================================
  // AGENT STATUS - Updates scene + role strip
  // ====================================================

  function setAgentStatus(rawId, status, taskTitle) {
    var id = resolveAgentId(rawId);
    if (!id) return;

    var isWorking = status === 'working' || status === 'active' || status === 'busy';

    // Update agent state
    if (agentStates[id]) {
      agentStates[id].working = isWorking;
      agentStates[id].currentTask = isWorking && taskTitle ? taskTitle : '';
      if (!isWorking) agentStates[id].frame = 0;
    }

    // Re-render role strip and scene
    renderRoleStrip();
    renderScene();
  }

  // ====================================================
  // TASK BOARD
  // ====================================================

  function renderTasks(tasks) {
    var inProgress = [], pending = [], completed = [];
    (tasks || []).forEach(function(t) {
      var s = String(t.status || '').toLowerCase();
      if (s === 'in_progress' || s === 'in-progress' || s === 'running') inProgress.push(t);
      else if (s === 'completed' || s === 'done') completed.push(t);
      else pending.push(t);
    });
    totalTaskCount = (tasks || []).length;
    updateStats();
    document.getElementById('tasksInProgress').innerHTML = inProgress.length ? inProgress.map(taskItemHTML).join('') : '<div class="task-empty">No tasks</div>';
    document.getElementById('tasksPending').innerHTML = pending.length ? pending.map(taskItemHTML).join('') : '<div class="task-empty">No tasks</div>';
    document.getElementById('tasksCompleted').innerHTML = completed.length ? completed.map(taskItemHTML).join('') : '<div class="task-empty">No tasks</div>';
  }

  function taskItemHTML(t) {
    var pLabel = String(t.priority || 'medium').toLowerCase();
    var pClass = 'priority-' + (pLabel === 'critical' ? 'critical' : pLabel === 'high' ? 'high' : pLabel === 'medium' ? 'medium' : 'low');
    var assignee = t.assignedTo || t.assigned_to || '';
    var aId = resolveAgentId(assignee);
    var aColor = aId && AGENT_VISUALS[aId] ? AGENT_VISUALS[aId].color : '#6b7280';
    return '<div class="task-item">' +
      '<div class="task-title">' + esc(String(t.title || t.id || 'Untitled')) + '</div>' +
      '<div class="task-meta">' +
        '<span class="priority-badge ' + pClass + '">' + esc(pLabel) + '</span>' +
        (assignee ? '<span style="color:' + aColor + ';font-weight:600">' + esc(String(assignee)) + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  function refreshTasks() {
    fetch(AGENTS_URL + '/v1/agents/tasks')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) { if (data) renderTasks(data.tasks || data); })
      .catch(function() {});
  }

  // ====================================================
  // EVENT PROCESSING
  // ====================================================

  function processEvent(evt) {
    addFeedEntry(evt);

    var name = getAgentName(evt);
    var taskTitle = getTaskTitle(evt);

    switch (evt.type) {
      case 'agent_started':
        setAgentStatus(name, 'working', taskTitle);
        break;
      case 'agent_completed':
      case 'agent_failed':
        setAgentStatus(name, 'idle', null);
        break;
      case 'auto_tick_started':
        autoTickActive = true;
        updateAutoTickButton();
        break;
      case 'auto_tick_stopped':
        autoTickActive = false;
        updateAutoTickButton();
        break;
    }

    if (evt.type.indexOf('task') !== -1 || evt.type === 'agent_completed' || evt.type === 'agent_failed') {
      refreshTasks();
    }
  }

  // ====================================================
  // SSE
  // ====================================================

  function connectSSE() {
    var es = new EventSource(AGENTS_URL + '/v1/agents/events');
    es.onopen = function() { setConnected(true); };
    es.onmessage = function(e) {
      try { processEvent(JSON.parse(e.data)); } catch(err) {}
    };
    es.onerror = function() { setConnected(false); };
  }

  // ====================================================
  // CONTROLS
  // ====================================================

  function updateAutoTickButton() {
    var btn = document.getElementById('btnAutoTick');
    if (autoTickActive) {
      btn.textContent = 'Stop Auto-Tick';
      btn.className = 'danger';
    } else {
      btn.textContent = 'Start Auto-Tick';
      btn.className = '';
    }
  }

  window.toggleAutoTick = function() {
    var endpoint = autoTickActive ? '/v1/agents/auto-tick/stop' : '/v1/agents/auto-tick/start';
    fetch(AGENTS_URL + endpoint, { method: 'POST' })
      .then(function(r) { if (r.ok) { autoTickActive = !autoTickActive; updateAutoTickButton(); } })
      .catch(function() {});
  };

  window.manualTick = function() {
    fetch(AGENTS_URL + '/v1/agents/tick', { method: 'POST' }).catch(function() {});
  };

  window.submitTask = function() {
    var titleEl = document.getElementById('taskTitle');
    var descEl = document.getElementById('taskDesc');
    var title = titleEl.value.trim();
    if (!title) { titleEl.focus(); return; }
    var body = { title: title, description: descEl.value.trim() || title };
    fetch(AGENTS_URL + '/v1/agents/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function(r) { if (r.ok) { titleEl.value = ''; descEl.value = ''; } })
    .catch(function() {});
  };

  // ====================================================
  // BOOT
  // ====================================================

  function loadInitialData() {
    fetch(AGENTS_URL + '/v1/agents/status')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data) return;
        var agents = data.agents || [];
        agents.forEach(function(a) {
          var id = resolveAgentId(a.name || a.id);
          if (id) {
            // Store full agent data for role card modals
            agentData[id] = {
              modelPreference: a.modelPreference || a.model_preference || a.model || 'sonnet',
              roleCard: a.roleCard || a.role_card || {},
              expertise: a.expertise || [],
              personality: a.personality || ''
            };
          }
          setAgentStatus(a.name || a.id, 'idle', null);
        });
        renderRoleStrip();
      }).catch(function() {});

    refreshTasks();

    fetch(AGENTS_URL + '/v1/agents/events/history')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data) return;
        var events = data.events || [];
        events.forEach(function(evt) { addFeedEntry(evt); });
      }).catch(function() {});

    fetch(AGENTS_URL + '/v1/agents/auto-tick/status')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (!data) return;
        autoTickActive = !!(data.running);
        updateAutoTickButton();
      }).catch(function() {});
  }

  loadInitialData();
  connectSSE();
})();
</script>
</body>
</html>`;
}
