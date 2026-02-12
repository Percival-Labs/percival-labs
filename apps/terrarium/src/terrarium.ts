/**
 * terrarium.ts — Live agent observation page
 *
 * Three-layer compositing:
 *   1. Office background (office-bg.png — wide nighttime office)
 *   2. Workstation desk cutouts (transparent PNG props, same as character sprites)
 *   3. Robot sprites (small figurines at each workstation)
 *
 * Designed for OBS browser source (1920x1080).
 * v0.2: Three-layer layout, SSE live data, RPG character system.
 */

// --- Types ---

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  rpgClass: string;
  color: string;
  /** Workstation desk cutout position & size (% of viewport) */
  workstation: { left: number; bottom: number; width: number };
  /** Sprite position (% from left, % from bottom, px height) */
  sprite: { left: number; bottom: number; height: number };
  messages: string[];
}

// --- Agent Layout ---
//
// office-wide-v2: 30-degree diorama, cozy illustrated loft.
// Room features: whiteboard (left wall), beanbag (back-left corner),
// bookshelves (right wall), blue rug (center), moon window (back center).
//
//   Percy  → back center, by the moon window (commander's perch)
//   Scout  → right side back, near bookshelves (researcher + references)
//   Sage   → right side front, near bookshelves (critic + quiet corner)
//   Pixel  → left side, mid depth (creative near whiteboard/beanbag)
//   Forge  → front center-left (workbench with elbow room)
//   Relay  → front center-right (ops monitoring station)

const AGENTS: AgentConfig[] = [
  // --- BACK (near windows) ---
  {
    id: "percy",
    name: "Percy",
    role: "Lead Architect",
    rpgClass: "Commander",
    color: "#3b82f6",
    workstation: { left: 32, bottom: 30, width: 16 },
    sprite: { left: 47, bottom: 31, height: 125 },
    messages: [
      "Reviewing the authentication module...",
      "Refactoring the event bus for SSE support",
      "Running test suite — 45 passing",
      "Deploying registry v0.2.1",
      "Analyzing token usage patterns",
      "Writing ADR for agent memory schema",
    ],
  },
  {
    id: "scout",
    name: "Scout",
    role: "Researcher",
    rpgClass: "Ranger",
    color: "#10b981",
    workstation: { left: 72, bottom: 28, width: 14 },
    sprite: { left: 68, bottom: 29, height: 120 },
    messages: [
      "Scanning HuggingFace for new LoRA models...",
      "Found 3 promising ComfyUI workflows",
      "Indexing documentation updates",
      "Comparing MLX vs ONNX benchmarks",
      "Pulling latest Anthropic changelog",
      "Evaluating IP-Adapter v2 improvements",
    ],
  },
  // --- MIDDLE ---
  {
    id: "pixel",
    name: "Pixel",
    role: "Art Director",
    rpgClass: "Artisan",
    color: "#ec4899",
    workstation: { left: 3, bottom: 16, width: 16 },
    sprite: { left: 18, bottom: 17, height: 140 },
    messages: [
      "Generating scene variations...",
      "Adjusting IP-Adapter strength to 0.65",
      "Testing new reference image style",
      "Rendering agent sprites at 512x512",
      "Color grading the terrarium background",
      "Compositing chat bubble positions",
    ],
  },
  {
    id: "sage",
    name: "Sage",
    role: "Critic",
    rpgClass: "Oracle",
    color: "#8b5cf6",
    workstation: { left: 70, bottom: 12, width: 16 },
    sprite: { left: 66, bottom: 13, height: 145 },
    messages: [
      "Reviewing PR #42 — found 2 issues",
      "Running security audit on dependencies",
      "Checking for prompt injection vectors",
      "Validating API response schemas",
      "Benchmarking latency: p99 = 230ms",
      "Auditing rate limiter configuration",
    ],
  },
  // --- FRONT ---
  {
    id: "forge",
    name: "Forge",
    role: "Engineer",
    rpgClass: "Artificer",
    color: "#f59e0b",
    workstation: { left: 22, bottom: 2, width: 18 },
    sprite: { left: 39, bottom: 3, height: 160 },
    messages: [
      "Building workflow-builder.ts",
      "Fixing TypeScript strict mode errors",
      "Implementing ComfyUI API client",
      "Adding --ref flag to gen command",
      "Running bun test — all green",
      "Optimizing image upload pipeline",
    ],
  },
  {
    id: "relay",
    name: "Relay",
    role: "Ops",
    rpgClass: "Sentinel",
    color: "#06b6d4",
    workstation: { left: 46, bottom: 2, width: 17 },
    sprite: { left: 62, bottom: 3, height: 155 },
    messages: [
      "Monitoring container health — all green",
      "Rotating API logs (12MB compressed)",
      "Syncing agent memory to disk",
      "Backing up registry database",
      "Checking SSL cert expiry — 89 days",
      "Scaling worker pool to 4 instances",
    ],
  },
];

// --- Configuration ---

const CONFIG = {
  bubbleDisplayTime: 5000,
  bubbleStagger: 2200,
  maxVisibleBubbles: 3,
  /** Office background — wide nighttime office (no workstation detail) */
  bgImage: "/public/scenes/office-bg.png",
  typingDuration: 1500,
  ambientInterval: 15000,
};

// --- Page Generator ---

export function terrariumPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1920, height=1080">
  <title>Percival Labs — Terrarium</title>
  <style>
    ${generateCSS()}
  </style>
</head>
<body>
  <div id="terrarium">
    <!-- Layer 1: Office background -->
    <img id="scene" src="${CONFIG.bgImage}" alt="Percival Labs Office" />

    <!-- Layer 2: Workstation desk cutouts (transparent PNGs) -->
    <div id="workstations">
      ${AGENTS.map(
        (a) =>
          `<img class="workstation" id="ws-${a.id}" src="/public/workstations/${a.id}.png" alt="${a.name}'s desk" style="left:${a.workstation.left}%;bottom:${a.workstation.bottom}%;width:${a.workstation.width}%;" />`
      ).join("\n      ")}
    </div>

    <!-- Layer 3: Robot sprites -->
    <div id="characters">
      ${AGENTS.map(
        (a) =>
          `<img class="agent-sprite" id="sprite-${a.id}" src="/public/sprites/${a.id}.png" alt="${a.name}" style="left:${a.sprite.left}%;bottom:${a.sprite.bottom}%;height:${a.sprite.height}px;" />`
      ).join("\n      ")}
    </div>

    <div id="bubbles"></div>
    <div id="status-bar">
      <span class="dot" id="status-dot"></span>
      <span class="label">PERCIVAL LABS — SHIPPING</span>
      <span class="agent-count">${AGENTS.length} agents online</span>
      <span class="clock" id="clock"></span>
    </div>
  </div>
  <script>
    ${generateJS()}
  </script>
</body>
</html>`;
}

// --- CSS ---

function generateCSS(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background: #0a0a0f;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    #terrarium {
      position: relative;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
    }

    /* --- Layer 1: Background --- */

    #scene {
      position: absolute;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
    }

    /* --- Layer 2: Workstation vignettes --- */

    #workstations {
      position: absolute;
      inset: 0;
      z-index: 10;
      pointer-events: none;
    }

    .workstation {
      position: absolute;
      height: auto;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
    }

    /* --- Layer 3: Character sprites --- */

    #characters {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 30;
    }

    .agent-sprite {
      position: absolute;
      width: auto;
      image-rendering: auto;
      /* Anchor at feet using bottom positioning */
      filter:
        drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))
        drop-shadow(0 0 6px rgba(30, 60, 120, 0.15));
      animation: idle-bob 4s ease-in-out infinite;
    }

    /* Stagger idle bob */
    #sprite-percy  { animation-delay: 0s; }
    #sprite-scout  { animation-delay: 0.7s; }
    #sprite-forge  { animation-delay: 1.4s; }
    #sprite-pixel  { animation-delay: 2.1s; }
    #sprite-sage   { animation-delay: 2.8s; }
    #sprite-relay  { animation-delay: 3.5s; }

    @keyframes idle-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }

    /* --- Status Bar --- */

    #status-bar {
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
      padding: 8px 16px;
      border-radius: 20px;
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.5px;
      z-index: 100;
    }

    #status-bar .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse-dot 2s ease-in-out infinite;
    }

    #status-bar .dot.reconnecting { background: #eab308; }
    #status-bar .dot.disconnected { background: #ef4444; animation: none; }

    #status-bar .agent-count { opacity: 0.6; margin-left: 8px; }
    #status-bar .clock { opacity: 0.4; font-variant-numeric: tabular-nums; margin-left: 6px; }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    /* --- Chat Bubbles --- */

    #bubbles {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 50;
    }

    .bubble {
      position: absolute;
      max-width: 260px;
      min-width: 140px;
      background: rgba(10, 15, 30, 0.82);
      backdrop-filter: blur(12px);
      border-radius: 12px;
      padding: 8px 12px;
      color: #e8ecf4;
      font-size: 12px;
      line-height: 1.4;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.4s ease, transform 0.4s ease;
      border: 1px solid rgba(100, 140, 255, 0.15);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(60, 100, 255, 0.06);
    }

    .bubble.visible { opacity: 1; transform: translateY(0); }
    .bubble.exiting { opacity: 0; transform: translateY(-6px); }

    .bubble-header {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 4px;
    }

    .bubble-avatar { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
    .bubble-name { font-weight: 600; font-size: 11px; letter-spacing: 0.3px; }
    .bubble-role { font-size: 9px; opacity: 0.5; margin-left: auto; }
    .bubble-message { color: rgba(255, 255, 255, 0.85); }

    .bubble-typing { display: flex; gap: 4px; padding: 4px 0; }
    .bubble-typing span {
      width: 5px; height: 5px; border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      animation: typing-bounce 1.4s ease-in-out infinite;
    }
    .bubble-typing span:nth-child(2) { animation-delay: 0.2s; }
    .bubble-typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    .bubble::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 20px;
      width: 12px;
      height: 12px;
      background: rgba(10, 15, 30, 0.82);
      border: 1px solid rgba(100, 140, 255, 0.15);
      border-top: none;
      border-left: none;
      transform: rotate(45deg);
    }
  `;
}

// --- Client-Side JavaScript ---

function generateJS(): string {
  return `
    const AGENTS = ${JSON.stringify(AGENTS)};
    const CONFIG = ${JSON.stringify(CONFIG)};

    const bubblesContainer = document.getElementById('bubbles');
    const statusDot = document.getElementById('status-dot');
    const activeBubbles = new Map();
    let messageIndices = {};
    let sseConnected = false;
    let lastEventTime = Date.now();

    AGENTS.forEach(a => { messageIndices[a.id] = 0; });

    const agentByName = {};
    AGENTS.forEach(a => { agentByName[a.name.toLowerCase()] = a; });

    function positionBubble(el, agent) {
      const sprite = document.getElementById('sprite-' + agent.id);
      if (sprite) {
        const rect = sprite.getBoundingClientRect();
        el.style.left = Math.max(4, Math.min(1700, rect.left + rect.width / 2 - 110)) + 'px';
        el.style.top = Math.max(4, rect.top - 80) + 'px';
      } else {
        // Fallback: center above workstation
        const wsLeft = agent.workstation.left + agent.workstation.width / 2;
        el.style.left = wsLeft + '%';
        el.style.bottom = '55%';
      }
    }

    function createBubbleEl(agent, message) {
      const el = document.createElement('div');
      el.className = 'bubble';
      positionBubble(el, agent);

      const roleText = agent.rpgClass || agent.role;
      el.innerHTML = \`
        <div class="bubble-header">
          <div class="bubble-avatar" style="background: \${agent.color}"></div>
          <span class="bubble-name" style="color: \${agent.color}">\${agent.name}</span>
          <span class="bubble-role">\${roleText}</span>
        </div>
        <div class="bubble-typing">
          <span></span><span></span><span></span>
        </div>
      \`;

      return { el, message };
    }

    function showMessage(agent, message) {
      if (activeBubbles.has(agent.id)) {
        const old = activeBubbles.get(agent.id);
        old.classList.add('exiting');
        old.classList.remove('visible');
        setTimeout(() => old.remove(), 400);
      }

      if (activeBubbles.size >= CONFIG.maxVisibleBubbles) {
        const oldest = activeBubbles.entries().next().value;
        if (oldest) {
          const [oldId, oldEl] = oldest;
          oldEl.classList.add('exiting');
          oldEl.classList.remove('visible');
          setTimeout(() => oldEl.remove(), 400);
          activeBubbles.delete(oldId);
        }
      }

      const { el } = createBubbleEl(agent, message);
      bubblesContainer.appendChild(el);
      activeBubbles.set(agent.id, el);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => { el.classList.add('visible'); });
      });

      setTimeout(() => {
        const typingEl = el.querySelector('.bubble-typing');
        if (typingEl) {
          typingEl.outerHTML = '<div class="bubble-message">' + escapeHtml(message) + '</div>';
        }
      }, CONFIG.typingDuration);

      setTimeout(() => {
        if (activeBubbles.get(agent.id) === el) {
          el.classList.add('exiting');
          el.classList.remove('visible');
          setTimeout(() => { el.remove(); activeBubbles.delete(agent.id); }, 400);
        }
      }, CONFIG.bubbleDisplayTime + CONFIG.typingDuration);
    }

    function escapeHtml(text) {
      const d = document.createElement('div');
      d.textContent = text;
      return d.innerHTML;
    }

    // --- SSE ---

    let mockInterval = null;
    let hasReceivedRealEvent = false;

    function setConnectionStatus(status) {
      statusDot.className = 'dot' + (status === 'connected' ? '' : status === 'reconnecting' ? ' reconnecting' : ' disconnected');
      sseConnected = status === 'connected';
    }

    function connectSSE() {
      setConnectionStatus('reconnecting');
      const es = new EventSource('/events');

      es.onopen = function() { setConnectionStatus('connected'); };

      es.onmessage = function(e) {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'connected' || event.type === 'heartbeat') return;

          const agentName = (event.data && event.data.agentName) || '';
          const agent = agentByName[agentName.toLowerCase()];
          if (!agent) return;

          const message = eventToMessage(event);
          if (!message) return;

          if (!hasReceivedRealEvent) { hasReceivedRealEvent = true; stopMockCycle(); }
          lastEventTime = Date.now();
          showMessage(agent, message);
        } catch {}
      };

      es.onerror = function() {
        setConnectionStatus('disconnected');
        es.close();
        if (!hasReceivedRealEvent) startMockCycle();
        setTimeout(connectSSE, 5000);
      };
    }

    function eventToMessage(event) {
      const d = event.data || {};
      switch (event.type) {
        case 'task_assigned':    return 'Picking up: ' + (d.taskTitle || 'task');
        case 'agent_started':    return 'Working on ' + (d.taskTitle || 'task') + '...';
        case 'agent_completed':  return 'Done: ' + (d.taskTitle || 'task') + (d.duration ? ' (' + (d.duration / 1000).toFixed(1) + 's)' : '');
        case 'agent_failed':     return 'Hit a wall on ' + (d.taskTitle || 'task') + ' \\u2014 retrying';
        case 'tick_started':     return 'Execution cycle #' + (d.tickNumber || '?') + ' starting';
        case 'tick_completed':   return 'Cycle done: ' + (d.succeeded || 0) + ' tasks completed';
        case 'task_submitted':   return 'New task received: ' + (d.taskTitle || 'task');
        case 'task_decomposed':  return 'Decomposed into ' + (d.subtaskCount || '?') + ' subtasks';
        default: return null;
      }
    }

    // --- Mock cycle ---

    let agentQueue = [...AGENTS];
    let queueIndex = 0;

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function startMockCycle() {
      if (mockInterval) return;
      agentQueue = shuffle([...AGENTS]);
      queueIndex = 0;

      function nextBubble() {
        const agent = agentQueue[queueIndex % agentQueue.length];
        queueIndex++;
        const msgIdx = messageIndices[agent.id];
        const message = agent.messages[msgIdx % agent.messages.length];
        messageIndices[agent.id] = msgIdx + 1;
        showMessage(agent, message);
        if (queueIndex % AGENTS.length === 0) agentQueue = shuffle([...AGENTS]);
      }

      nextBubble();
      mockInterval = setInterval(nextBubble, CONFIG.bubbleStagger);
    }

    function stopMockCycle() {
      if (mockInterval) { clearInterval(mockInterval); mockInterval = null; }
    }

    // --- Clock ---
    const clockEl = document.getElementById('clock');
    function updateClock() {
      clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    updateClock();
    setInterval(updateClock, 30000);

    // --- Boot ---
    const sceneImg = document.getElementById('scene');
    function boot() { startMockCycle(); connectSSE(); }
    if (sceneImg.complete) boot();
    else sceneImg.addEventListener('load', boot);
  `;
}
