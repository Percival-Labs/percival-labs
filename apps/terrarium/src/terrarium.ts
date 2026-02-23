/**
 * terrarium.ts — Live agent observation page (Three.js 3D rebuild)
 *
 * Low-poly 3D office scene rendered with Three.js via CDN importmap.
 * 3D GLB robot agents at workstations with per-agent accessories.
 * SSE overlay for live chat bubbles projected from 3D→2D coordinates.
 *
 * Designed for OBS browser source (1920x1080).
 * v0.5: GLB robot models, 5-step toon shading, outline pass, improved animations.
 */

// --- Types ---

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  rpgClass: string;
  color: string;
  /** 3D position in the scene (x, y, z) — this is the desk/anchor position */
  position: [number, number, number];
  /** Facing direction in radians. 0 = +Z (toward camera). π/2 = +X, -π/2 = -X */
  facing: number;
  /** How far robot sits from desk. 0.8 for desk agents, 0 for table agents */
  deskOffset: number;
  messages: string[];
}

// --- Agent Layout (perimeter desks facing center, Vouch table in middle) ---

const AGENTS: AgentConfig[] = [
  // --- PERCY: Solo station, back wall ---
  {
    id: "percy",
    name: "Percy",
    role: "Lead Architect",
    rpgClass: "Commander",
    color: "#3b82f6",
    position: [-4, 0, -9],
    facing: 0,
    deskOffset: 0.8,
    messages: [
      "Reviewing the authentication module...",
      "Refactoring the event bus for SSE support",
      "Running test suite — 45 passing",
      "Deploying registry v0.2.1",
      "Analyzing token usage patterns",
      "Writing ADR for agent memory schema",
    ],
  },
  // --- SCOUT + SAGE POD: Right side, facing each other across desks ---
  {
    id: "scout",
    name: "Scout",
    role: "Researcher",
    rpgClass: "Ranger",
    color: "#10b981",
    position: [7, 0, -5],
    facing: Math.PI,
    deskOffset: 0.8,
    messages: [
      "Scanning HuggingFace for new LoRA models...",
      "Found 3 promising ComfyUI workflows",
      "Indexing documentation updates",
      "Comparing MLX vs ONNX benchmarks",
      "Pulling latest Anthropic changelog",
      "Evaluating IP-Adapter v2 improvements",
    ],
  },
  {
    id: "sage",
    name: "Sage",
    role: "Critic",
    rpgClass: "Oracle",
    color: "#8b5cf6",
    position: [7, 0, -2],
    facing: 0,
    deskOffset: 0.8,
    messages: [
      "Reviewing PR #42 — found 2 issues",
      "Running security audit on dependencies",
      "Checking for prompt injection vectors",
      "Validating API response schemas",
      "Benchmarking latency: p99 = 230ms",
      "Auditing rate limiter configuration",
    ],
  },
  // --- PIXEL: Solo station, left wall ---
  {
    id: "pixel",
    name: "Pixel",
    role: "Art Director",
    rpgClass: "Artisan",
    color: "#ec4899",
    position: [-10, 0, -3],
    facing: Math.PI / 2,
    deskOffset: 0.8,
    messages: [
      "Generating scene variations...",
      "Adjusting IP-Adapter strength to 0.65",
      "Testing new reference image style",
      "Rendering agent sprites at 512x512",
      "Color grading the terrarium background",
      "Compositing chat bubble positions",
    ],
  },
  // --- FORGE + RELAY POD: Left-front, facing each other across desks ---
  {
    id: "forge",
    name: "Forge",
    role: "Engineer",
    rpgClass: "Artificer",
    color: "#f59e0b",
    position: [-6, 0, 1],
    facing: Math.PI,
    deskOffset: 0.8,
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
    position: [-6, 0, 4],
    facing: 0,
    deskOffset: 0.8,
    messages: [
      "Monitoring container health — all green",
      "Rotating API logs (12MB compressed)",
      "Syncing agent memory to disk",
      "Backing up registry database",
      "Checking SSL cert expiry — 89 days",
      "Scaling worker pool to 4 instances",
    ],
  },
  // --- WORKER TIER: Agent Zero workforce agents ---
  {
    id: "worker-coder",
    name: "Wrench",
    role: "Code Worker",
    rpgClass: "Artificer",
    color: "#22c55e",
    position: [3.5, 0, 0],
    facing: -Math.PI / 2,
    deskOffset: 0.8,
    messages: [
      "Executing test suite — 47/47 passing",
      "Building health check endpoint...",
      "Running bun install in workspace",
      "Debugging connection timeout",
      "Compiling TypeScript — zero errors",
      "Patching CORS middleware",
    ],
  },
  {
    id: "worker-researcher",
    name: "Lens",
    role: "Research Worker",
    rpgClass: "Scholar",
    color: "#8b5cf6",
    position: [3.5, 0, 2],
    facing: -2.3,
    deskOffset: 0.8,
    messages: [
      "Scanning 12 sources for API docs...",
      "Extracting pricing data from competitors",
      "Cross-referencing documentation versions",
      "Browsing GitHub issues for edge cases",
      "Summarizing research findings",
      "Verifying claims against primary sources",
    ],
  },
  {
    id: "worker-general",
    name: "Cog",
    role: "General Worker",
    rpgClass: "Journeyman",
    color: "#f97316",
    position: [3.5, 0, 4],
    facing: Math.PI / 2,
    deskOffset: 0.8,
    messages: [
      "Processing batch data conversion",
      "Formatting markdown documentation",
      "Generating report from task outputs",
      "Organizing file structure",
      "Converting CSV to JSON schema",
      "Compiling weekly summary",
    ],
  },
];

// --- Configuration ---

const CONFIG = {
  bubbleDisplayTime: 5000,
  bubbleStagger: 2200,
  maxVisibleBubbles: 3,
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
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/"
    }
  }
  </script>
  <style>
    ${generateCSS()}
  </style>
</head>
<body>
  <canvas id="scene-canvas"></canvas>
  <div id="vignette"></div>
  <div id="bubbles"></div>
  <div id="status-bar">
    <span class="dot" id="status-dot"></span>
    <span class="label">PERCIVAL LABS — SHIPPING</span>
    <span class="agent-count">${AGENTS.length} agents online</span>
    <span class="upstream-dot" id="upstream-dot" title="Agents service connection"></span>
    <span class="upstream-label" id="upstream-label">agents</span>
    <span class="clock" id="clock"></span>
    <span class="music-controls" id="music-controls">
      <button class="music-btn" id="music-toggle" title="Toggle music">&#9835;</button>
      <span class="music-track" id="music-track"></span>
      <span class="music-credit">Music: FASSounds, Purrple Cat, Riddiman (CC-BY)</span>
    </span>
  </div>
  <audio id="bg-music" preload="auto"></audio>
  <script type="module">
    ${generateSceneJS()}
  </script>
  <script>
    ${generateOverlayJS()}
    ${generateMusicJS()}
  </script>
</body>
</html>`;
}

// --- CSS (overlay-only, scene is WebGL canvas) ---

function generateCSS(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background: #12100c;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    #scene-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 1920px;
      height: 1080px;
      z-index: 1;
    }

    /* --- Vignette overlay --- */

    #vignette {
      position: fixed;
      top: 0;
      left: 0;
      width: 1920px;
      height: 1080px;
      z-index: 2;
      pointer-events: none;
      background: radial-gradient(
        ellipse 80% 75% at 50% 45%,
        transparent 55%,
        rgba(18, 14, 10, 0.4) 100%
      );
    }

    /* --- Status Bar --- */

    #status-bar {
      position: fixed;
      top: 16px;
      left: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(8, 10, 18, 0.92);
      backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 4px;
      border: 1px solid rgba(0, 200, 255, 0.1);
      color: #fff;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.8px;
      text-transform: uppercase;
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

    #status-bar .upstream-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #6b7280;
      margin-left: 4px;
    }
    #status-bar .upstream-dot.up { background: #22c55e; }
    #status-bar .upstream-dot.down { background: #ef4444; }
    #status-bar .upstream-label { font-size: 10px; opacity: 0.4; }

    #status-bar .music-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 8px;
      border-left: 1px solid rgba(255,255,255,0.15);
      padding-left: 10px;
    }
    #status-bar .music-btn {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      font-size: 14px;
      cursor: pointer;
      padding: 0 4px;
      pointer-events: auto;
      transition: color 0.2s;
    }
    #status-bar .music-btn:hover { color: rgba(255,255,255,0.9); }
    #status-bar .music-btn.playing { color: #22c55e; }
    #status-bar .music-credit {
      font-size: 9px;
      opacity: 0.3;
      margin-left: 6px;
      white-space: nowrap;
    }
    #status-bar .music-track {
      font-size: 10px;
      opacity: 0.4;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #status-bar .label { color: #00CCFF; }
    #status-bar .agent-count { color: rgba(0, 255, 136, 0.7); margin-left: 8px; }
    #status-bar .clock { opacity: 0.4; font-variant-numeric: tabular-nums; margin-left: 6px; }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    /* --- Chat Bubbles --- */

    #bubbles {
      position: fixed;
      top: 0;
      left: 0;
      width: 1920px;
      height: 1080px;
      pointer-events: none;
      z-index: 50;
    }

    .bubble {
      position: absolute;
      max-width: 260px;
      min-width: 140px;
      background: rgba(255, 248, 235, 0.92);
      backdrop-filter: blur(6px);
      border-radius: 14px 14px 14px 4px;
      border-left: 3px solid var(--agent-color, #3b82f6);
      padding: 10px 14px;
      color: #3A2E24;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      opacity: 0;
      transform: translateY(8px) scale(0.97);
      transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      border-top: 1px solid rgba(200, 180, 140, 0.35);
      border-right: 1px solid rgba(200, 180, 140, 0.35);
      border-bottom: 1px solid rgba(200, 180, 140, 0.35);
      box-shadow: 0 3px 16px rgba(40, 30, 15, 0.35), 0 0 8px color-mix(in srgb, var(--agent-color, #3b82f6) 12%, transparent);
    }

    .bubble::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.08) 0%,
        transparent 60%
      );
      pointer-events: none;
      border-radius: inherit;
    }

    .bubble.visible { opacity: 1; transform: translateY(0) scale(1); }
    .bubble.exiting { opacity: 0; transform: translateY(-6px) scale(0.97); }

    .bubble-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 5px;
    }

    .bubble-avatar {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 4px color-mix(in srgb, var(--agent-color, #3b82f6) 50%, transparent);
    }
    .bubble-name {
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.3px;
    }
    .bubble-role { font-size: 9px; opacity: 0.45; margin-left: auto; letter-spacing: 0.3px; color: #8A7A6A; }
    .bubble-message { color: #4A3E32; }

    .bubble-typing { display: flex; gap: 5px; padding: 5px 0; }
    .bubble-typing span {
      width: 5px; height: 5px; border-radius: 50%;
      background: rgba(120, 100, 70, 0.4);
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
      bottom: -5px;
      left: 18px;
      width: 10px;
      height: 10px;
      background: rgba(255, 248, 235, 0.92);
      border: 1px solid rgba(200, 180, 140, 0.35);
      border-top: none;
      border-left: none;
      transform: rotate(45deg);
    }
  `;
}

// --- Three.js Scene (ES Module) ---

function generateSceneJS(): string {
  return `
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ============================================================
// SCENE SETUP
// ============================================================

const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(1920, 1080);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#14120E');
scene.fog = new THREE.FogExp2(0x14120E, 0.006);

const camera = new THREE.PerspectiveCamera(35, 1920 / 1080, 0.1, 100);
camera.position.set(3, 10, 17);
camera.lookAt(0, 1, -2);

// ============================================================
// MATERIALS
// ============================================================

// ============================================================
// LIGHTING — Cozy Cyberpunk (dark evening + neon accents)
// ============================================================

// Hemisphere: warm amber ceiling + soft earth floor (Ghibli interior warmth)
const hemi = new THREE.HemisphereLight(0x3A2A1A, 0x5A3A18, 0.9);
scene.add(hemi);

// Warm ambient — Ghibli interiors have visible fill, not pitch black
const ambient = new THREE.AmbientLight(0x2A1E14, 0.7);
scene.add(ambient);

// Warm golden directional (late afternoon sun through window — Ghibli signature)
const sunLight = new THREE.DirectionalLight(0xC8A882, 0.9);
sunLight.position.set(-5, 14, -6);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 40;
sunLight.shadow.camera.left = -15;
sunLight.shadow.camera.right = 15;
sunLight.shadow.camera.top = 15;
sunLight.shadow.camera.bottom = -15;
sunLight.shadow.bias = -0.002;
scene.add(sunLight);

// Golden light shaft through window (Ghibli god-ray feel)
const windowBeam = new THREE.SpotLight(0xD4A864, 2.5, 25, Math.PI / 4, 0.6, 1);
windowBeam.position.set(0, 10, -10);
windowBeam.target.position.set(2, 0, -2);
windowBeam.castShadow = true;
scene.add(windowBeam);
scene.add(windowBeam.target);

// Volumetric light shaft planes (visible god-rays through windows)
const shaftMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(0xFFE8C0),
  transparent: true,
  opacity: 0.04,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

// Two crossing planes create a volumetric look from any angle
for (let i = 0; i < 3; i++) {
  const shaftGeo = new THREE.PlaneGeometry(3.5 + i * 1.2, 12);
  const shaft = new THREE.Mesh(shaftGeo, shaftMat.clone());
  shaft.material.opacity = 0.035 - i * 0.008;
  shaft.position.set(-3 + i * 4, 5.5, -8 + i * 1.5);
  shaft.rotation.x = -0.25;
  shaft.rotation.y = (i - 1) * 0.15;
  shaft.rotation.z = 0.05 * (i - 1);
  shaft.userData.isLightShaft = true;
  shaft.userData.baseOpacity = shaft.material.opacity;
  scene.add(shaft);
}

// Warm fill from the right (complementary to window light)
const fillSun = new THREE.DirectionalLight(0x8A7A6A, 0.5);
fillSun.position.set(8, 10, 4);
scene.add(fillSun);

// Warm tungsten overhead fills — Ghibli interior lighting is generous
const overhead1 = new THREE.PointLight(0x4A3820, 0.6, 25);
overhead1.position.set(-5, 10, -3);
scene.add(overhead1);
const overhead2 = new THREE.PointLight(0x4A3820, 0.6, 25);
overhead2.position.set(5, 10, 2);
scene.add(overhead2);
const overhead3 = new THREE.PointLight(0x4A3820, 0.5, 20);
overhead3.position.set(0, 10, -7);
scene.add(overhead3);

// Warm rim for silhouette separation (soft amber instead of cool blue)
const rimLight = new THREE.PointLight(0xCC9966, 0.8, 25);
rimLight.position.set(0, 5, -9);
scene.add(rimLight);

// --- Accent lights (Ghibli-cyber: soft teal + dusty rose instead of harsh neon) ---
const accentTeal = new THREE.PointLight(0x5ABFB0, 1.2, 28);
accentTeal.position.set(-8, 10, -1);
scene.add(accentTeal);

const accentRose = new THREE.PointLight(0xD88AA0, 0.8, 22);
accentRose.position.set(10, 8, -4);
scene.add(accentRose);

const accentFloor = new THREE.PointLight(0xDEA050, 0.5, 20);
accentFloor.position.set(0, 0.3, -1);
scene.add(accentFloor);

// --- Practical lights (lamps, string lights, window) ---

// Window city glow — warm amber/orange light spilling in from outside
// City light ambient bounce from window (supplements window SpotLight in branding section)
const cityBounce = new THREE.PointLight(0xFFAA55, 0.6, 12);
cityBounce.position.set(-8, 4, -9);
scene.add(cityBounce);

// String lights along back wall (warm fairy lights)
const stringLightPositions = [
  [-8, 9.5, -10.5], [-5, 9.2, -10.5], [-2, 9.6, -10.5],
  [1, 9.3, -10.5], [4, 9.5, -10.5], [7, 9.1, -10.5], [10, 9.4, -10.5],
];
for (const [sx, sy, sz] of stringLightPositions) {
  const sl = new THREE.PointLight(0xFFD080, 0.8, 7);
  sl.position.set(sx, sy, sz);
  scene.add(sl);
}

// Desk lamp warm pools — supplement the colored desk lights with white-warm fills
const deskLampPositions = [
  [-4, 2.8, -8.5],   // Percy's desk lamp
  [7, 2.8, -4.5],    // Scout's area
  [-10, 2.8, -2.5],  // Pixel's area
  [-6, 2.8, 1.5],    // Forge's area
];
for (const [lx, ly, lz] of deskLampPositions) {
  const lamp = new THREE.PointLight(0xFFD4A0, 2.0, 6);
  lamp.position.set(lx, ly, lz);
  scene.add(lamp);
}

// Sage's standing floor lamp (right side of room) — warm reading light
const floorLamp = new THREE.SpotLight(0xFFD8A0, 3.5, 12, Math.PI / 4, 0.8, 1);
floorLamp.position.set(9, 4.3, -1.5);
floorLamp.target.position.set(9, 0, -1.5);
scene.add(floorLamp);
scene.add(floorLamp.target);
// Warm glow around the lamp shade
const floorLampGlow = new THREE.PointLight(0xFFCC80, 1.2, 7);
floorLampGlow.position.set(9, 4.0, -1.5);
scene.add(floorLampGlow);

// Overhead pendant warm spots (practical ceiling fixtures)
const pendant1 = new THREE.SpotLight(0xFFD890, 2.5, 14, Math.PI / 5, 0.6, 1);
pendant1.position.set(-4, 9.5, -4);
pendant1.target.position.set(-4, 0, -4);
scene.add(pendant1);
scene.add(pendant1.target);

const pendant2 = new THREE.SpotLight(0xFFD890, 2.0, 14, Math.PI / 5, 0.6, 1);
pendant2.position.set(4, 9.5, -1);
pendant2.target.position.set(4, 0, -1);
scene.add(pendant2);
scene.add(pendant2.target);

// ============================================================
// LOAD OFFICE ENVIRONMENT (GLB)
// ============================================================

const AGENT_DATA = ${JSON.stringify(AGENTS.map((a) => ({ id: a.id, name: a.name, color: a.color, position: a.position, facing: a.facing, deskOffset: a.deskOffset })))};

// Per-desk PointLights (agent-colored, positioned above desk area)
const deskLights = [];
for (const agent of AGENT_DATA) {
  const [ax, , az] = agent.position;
  const f = agent.facing || 0;
  const deskLight = new THREE.PointLight(new THREE.Color(agent.color), 5.5, 10);
  // Light above desk, slightly toward the robot
  deskLight.position.set(ax + Math.sin(f) * 0.3, 2.3, az + Math.cos(f) * 0.3);
  scene.add(deskLight);
  deskLights.push(deskLight);
}

// --- Toon gradient map (4-step: Ghibli-inspired warm shadows, painterly transitions) ---
function createGradientMap() {
  const size = 4;
  const data = new Uint8Array(size * 4);
  // Step 0: deep shadow — warm purple-brown (Ghibli shadow tone)
  data[0] = 45; data[1] = 32; data[2] = 52; data[3] = 255;
  // Step 1: shadow — dusty mauve
  data[4] = 95; data[5] = 75; data[6] = 90; data[7] = 255;
  // Step 2: midtone — warm golden tan
  data[8] = 185; data[9] = 168; data[10] = 148; data[11] = 255;
  // Step 3: highlight — soft cream
  data[12] = 248; data[13] = 240; data[14] = 225; data[15] = 255;

  const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const gradientMap = createGradientMap();

// --- Wall sconces (warm amber perimeter lighting) ---
const sconceMat = new THREE.MeshToonMaterial({ color: new THREE.Color('#2A2018'), gradientMap: gradientMap });
const sconceGlowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFAA55') });
const sconcePositions = [
  // Back wall (z=-10.7, facing +Z)
  { x: -10, y: 6, z: -10.7, nx: 0, nz: 1 },
  { x:   3, y: 6, z: -10.7, nx: 0, nz: 1 },
  { x:   7, y: 6, z: -10.7, nx: 0, nz: 1 },
  // Left wall (x=-11.7, facing +X)
  { x: -11.7, y: 6, z: -8, nx: 1, nz: 0 },
  { x: -11.7, y: 6, z:  1, nx: 1, nz: 0 },
  { x: -11.7, y: 6, z:  6, nx: 1, nz: 0 },
  // Right wall (x=11.7, facing -X)
  { x: 11.7, y: 6, z: -9, nx: -1, nz: 0 },
  { x: 11.7, y: 6, z: -4, nx: -1, nz: 0 },
  { x: 11.7, y: 6, z:  1, nx: -1, nz: 0 },
  { x: 11.7, y: 6, z:  6, nx: -1, nz: 0 },
];
for (const sc of sconcePositions) {
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.15), sconceMat);
  bracket.position.set(sc.x, sc.y, sc.z);
  scene.add(bracket);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.18, 8), sconceGlowMat);
  shade.position.set(sc.x + sc.nx * 0.1, sc.y + 0.15, sc.z + sc.nz * 0.1);
  scene.add(shade);
  const light = new THREE.PointLight(0xFF9940, 0.6, 6);
  light.position.set(sc.x + sc.nx * 0.3, sc.y + 0.2, sc.z + sc.nz * 0.3);
  scene.add(light);
}

// Mesh references for animation (populated during GLB traverse)
const catMeshes = [];      // Cat_Body, Cat_Tail_*, Cat_Head, etc.
const plantMeshes = [];    // Plant_*_Foliage_*, HangingPlant_*_Foliage_*
let rugMesh = null;        // Rug mesh for material enhancement

const loader = new GLTFLoader();
loader.load('/public/models/office.glb', (gltf) => {
  const office = gltf.scene;

  let meshCount = 0;
  let toonCount = 0;

  office.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      meshCount++;

      const oldMat = child.material;
      if (!oldMat) return;



      // Detect MonitorGlow meshes and replace with CanvasTexture
      if (child.name.startsWith('MonitorGlow_')) {
        const agentName = child.name.replace('MonitorGlow_', '').toLowerCase();
        const agentMatch = AGENT_DATA.find(a => a.id === agentName || a.name.toLowerCase() === agentName);
        if (agentMatch && monitorTextures[agentMatch.id]) {
          child.material = new THREE.MeshBasicMaterial({ map: monitorTextures[agentMatch.id], blending: THREE.AdditiveBlending });
          monitorMeshes[agentMatch.id] = child;
          return;
        }
        // Unmatched MonitorGlow — hide it (likely the floating board)
        child.visible = false;
        return;
      }

      // Reposition Bookshelf2/Book2 from x=-5 to x=1 (clear of back wall windows)
      if (child.name.startsWith('Bookshelf2_') || child.name.startsWith('Book2_')) {
        child.position.x += 6; // shift from x≈-5 to x≈1
      }

      // Hide props that were positioned for wall-facing desks (now float in pod layout)
      const hidePatterns = ['Blueprint', 'Kanban_', 'Pegboard', 'Whiteboard', 'Percy_WB_', 'Scout_CB_', 'Scout_Pin', 'Corkboard', 'StickyNote', 'Sticky', 'PostIt', 'Post_It', 'Note_', 'Memo', 'Poster_', 'Poster2_', 'WindowFrame', 'WindowGlass', 'WindowBar', 'Sage_Bookcase_', 'Sage_Book_', 'Filing', 'Cabinet', 'FileCab', 'PegHook', 'Forge_Tool_'];
      if (hidePatterns.some(p => child.name.includes(p))) {
        child.visible = false;
        return;
      }

      // Capture cat mesh references for idle animation
      if (child.name.startsWith('Cat_')) {
        catMeshes.push(child);
      }

      // Capture plant foliage references for sway animation
      if (child.name.includes('Foliage') || child.name.includes('_Leaf')) {
        plantMeshes.push(child);
      }

      // Capture rug for material enhancement
      if (child.name === 'Rug') {
        rugMesh = child;
      }

      // Emissive objects (LEDs, bulbs, lamp shades, window glass) keep PBR
      // for proper glow through bloom pass
      // Check ACTUAL emissive luminance, not just intensity (Blender defaults intensity=1.0 with black color)
      const emColor = oldMat.emissive;
      const emLuminance = emColor ? (emColor.r + emColor.g + emColor.b) * oldMat.emissiveIntensity : 0;
      const hasEmissive = emLuminance > 0.3;
      const isTransparent = oldMat.opacity < 0.9;

      if (hasEmissive || isTransparent) {
        // Keep as MeshStandardMaterial — bloom needs emissive PBR
        return;
      }

      // Convert to MeshToonMaterial for illustrated look
      const toonMat = new THREE.MeshToonMaterial({
        color: oldMat.color ? oldMat.color.clone() : new THREE.Color(0xcccccc),
        gradientMap: gradientMap,
      });

      // Preserve emissive if present (low-level glow)
      if (oldMat.emissive) {
        toonMat.emissive = oldMat.emissive.clone();
        toonMat.emissiveIntensity = oldMat.emissiveIntensity;
      }

      child.material = toonMat;
      toonCount++;
    }
  });

  // Log Vouch table mesh (don't replace material — that makes it transparent)
  office.traverse((child2) => {
    if (!child2.isMesh) return;
    const name = child2.name.toLowerCase();
    if (name.includes('vouch') || name.includes('roundtable') || name.includes('round_table')) {
      console.log('[Terrarium] Found Vouch mesh:', child2.name);
    }
  });

  scene.add(office);
  console.log('[Terrarium] GLB loaded:', meshCount, 'meshes,', toonCount, 'converted to toon');

  // --- Rug enhancement: warm Persian-style pattern via CanvasTexture ---
  if (rugMesh) {
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 512;
    rugCanvas.height = 512;
    const rc = rugCanvas.getContext('2d');

    // Base: deep warm burgundy
    rc.fillStyle = '#5A2828';
    rc.fillRect(0, 0, 512, 512);

    // Border band
    rc.strokeStyle = '#8B6B3A';
    rc.lineWidth = 18;
    rc.strokeRect(30, 30, 452, 452);
    rc.strokeStyle = '#3A1818';
    rc.lineWidth = 6;
    rc.strokeRect(44, 44, 424, 424);
    rc.strokeStyle = '#C8A050';
    rc.lineWidth = 2;
    rc.strokeRect(52, 52, 408, 408);

    // Inner decorative border
    rc.strokeStyle = '#6B4A28';
    rc.lineWidth = 10;
    rc.strokeRect(68, 68, 376, 376);

    // Center medallion
    const cx = 256, cy = 256;
    // Outer ring
    rc.beginPath();
    rc.arc(cx, cy, 120, 0, Math.PI * 2);
    rc.fillStyle = '#6B3030';
    rc.fill();
    rc.strokeStyle = '#C8A050';
    rc.lineWidth = 2;
    rc.stroke();
    // Inner ring
    rc.beginPath();
    rc.arc(cx, cy, 85, 0, Math.PI * 2);
    rc.fillStyle = '#4A2020';
    rc.fill();
    rc.strokeStyle = '#8B6B3A';
    rc.lineWidth = 1.5;
    rc.stroke();
    // Center dot
    rc.beginPath();
    rc.arc(cx, cy, 30, 0, Math.PI * 2);
    rc.fillStyle = '#C8A050';
    rc.fill();

    // Star points around medallion
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const px = cx + Math.cos(angle) * 100;
      const py = cy + Math.sin(angle) * 100;
      rc.beginPath();
      rc.arc(px, py, 8, 0, Math.PI * 2);
      rc.fillStyle = '#C8A050';
      rc.fill();
    }

    // Corner flourishes
    for (const [cornerX, cornerY] of [[90, 90], [422, 90], [90, 422], [422, 422]]) {
      rc.beginPath();
      rc.arc(cornerX, cornerY, 35, 0, Math.PI * 2);
      rc.fillStyle = '#6B3030';
      rc.fill();
      rc.strokeStyle = '#8B6B3A';
      rc.lineWidth = 1.5;
      rc.stroke();
      rc.beginPath();
      rc.arc(cornerX, cornerY, 15, 0, Math.PI * 2);
      rc.fillStyle = '#C8A050';
      rc.fill();
    }

    // Subtle noise texture overlay
    rc.globalAlpha = 0.08;
    for (let i = 0; i < 3000; i++) {
      const nx = Math.random() * 512;
      const ny = Math.random() * 512;
      rc.fillStyle = Math.random() > 0.5 ? '#000' : '#FFF';
      rc.fillRect(nx, ny, 1, 1);
    }
    rc.globalAlpha = 1;

    const rugTex = new THREE.CanvasTexture(rugCanvas);
    rugMesh.material = new THREE.MeshToonMaterial({
      map: rugTex,
      gradientMap: gradientMap,
      color: new THREE.Color('#D8C0A0'),
    });
  }

  // --- Extra bookshelves (programmatic, cozy clutter) ---
  const shelfWood = new THREE.MeshToonMaterial({ color: new THREE.Color('#7A5C3A'), gradientMap: gradientMap });
  const shelfDark = new THREE.MeshToonMaterial({ color: new THREE.Color('#5A4028'), gradientMap: gradientMap });
  const bookColors = ['#8B2020', '#1E3A6B', '#2D5A27', '#6B3A8A', '#B8860B', '#1A5C5C', '#8B4513', '#4A2060'];

  function addBookshelf(sx, sy, sz, shelfW, shelfH, shelves, faceX, mat) {
    const depth = 0.5;
    // Side panels
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, shelfH, depth), mat);
      if (faceX) {
        panel.position.set(sx, sy + shelfH / 2, sz + side * shelfW / 2);
      } else {
        panel.position.set(sx + side * shelfW / 2, sy + shelfH / 2, sz);
      }
      scene.add(panel);
    }
    // Back panel
    const back = new THREE.Mesh(new THREE.BoxGeometry(faceX ? 0.04 : shelfW, shelfH, faceX ? shelfW : 0.04), mat);
    if (faceX) {
      back.position.set(sx - 0.2, sy + shelfH / 2, sz);
    } else {
      back.position.set(sx, sy + shelfH / 2, sz - 0.2);
    }
    scene.add(back);
    // Shelves + books
    const shelfSpacing = shelfH / shelves;
    for (let i = 0; i <= shelves; i++) {
      const shelfY = sy + i * shelfSpacing;
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(faceX ? 0.06 : shelfW, 0.06, faceX ? shelfW : depth), mat);
      shelf.position.set(sx, shelfY, sz);
      scene.add(shelf);
      // Books on each shelf (except top)
      if (i < shelves) {
        let bx = faceX ? -shelfW / 2 + 0.06 : -shelfW / 2 + 0.06;
        const maxB = faceX ? shelfW : shelfW;
        while (bx < maxB / 2 - 0.1) {
          const bw = 0.05 + Math.random() * 0.08;
          const bh = shelfSpacing * (0.5 + Math.random() * 0.35);
          const color = bookColors[Math.floor(Math.random() * bookColors.length)];
          const bookMat = new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: gradientMap });
          const book = new THREE.Mesh(new THREE.BoxGeometry(faceX ? 0.3 : bw, bh, faceX ? bw : 0.3), bookMat);
          if (faceX) {
            book.position.set(sx, shelfY + 0.03 + bh / 2, sz + bx);
          } else {
            book.position.set(sx + bx, shelfY + 0.03 + bh / 2, sz);
          }
          scene.add(book);
          bx += bw + 0.02;
        }
      }
    }
  }

  // Right wall — additional shelf forward of existing GLB one (z=-2)
  addBookshelf(11.5, 0, -2, 1.8, 4.5, 5, true, shelfDark);

  // Right wall — small shelf near front (z=3)
  addBookshelf(11.5, 0, 3, 1.4, 3.5, 4, true, shelfWood);

  // Back-right corner — tall shelf
  addBookshelf(9.5, 0, -10.5, 1.8, 5.0, 5, false, shelfDark);

  // ============================================================
  // CYBERPUNK OFFICE PROPS (tech layer on cozy Ghibli base)
  // ============================================================

  const pipeMat = new THREE.MeshToonMaterial({ color: new THREE.Color(0x3A3530), gradientMap: gradientMap });
  const neonTealMat = new THREE.MeshStandardMaterial({
    color: 0x5ABFB0, emissive: new THREE.Color(0x5ABFB0), emissiveIntensity: 0.6,
    transparent: true, opacity: 0.9,
  });
  const neonRoseMat = new THREE.MeshStandardMaterial({
    color: 0xD88AA0, emissive: new THREE.Color(0xD88AA0), emissiveIntensity: 0.5,
    transparent: true, opacity: 0.9,
  });

  // --- Exposed ceiling conduit pipes ---
  // Main run along back wall
  const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 20, 8), pipeMat);
  pipe1.rotation.z = Math.PI / 2;
  pipe1.position.set(0, 9.6, -10.2);
  scene.add(pipe1);
  // Cross pipe from back to front (left side)
  const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 16, 8), pipeMat);
  pipe2.rotation.x = Math.PI / 2;
  pipe2.position.set(-8, 9.4, -2);
  scene.add(pipe2);
  // Smaller branch pipe (right side)
  const pipe3 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 10, 6), pipeMat);
  pipe3.rotation.x = Math.PI / 2;
  pipe3.position.set(8, 9.3, -5);
  scene.add(pipe3);
  // Vertical drop pipe (left wall)
  const pipe4 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 8), pipeMat);
  pipe4.position.set(-11.4, 7, -5);
  scene.add(pipe4);

  // --- Neon LED strips (accent lighting along architecture) ---
  // Teal strip along left wall base
  const ledStrip1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 18), neonTealMat);
  ledStrip1.position.set(-11.6, 0.15, -2);
  scene.add(ledStrip1);
  // Rose strip along back wall ceiling edge
  const ledStrip2 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.03, 0.03), neonRoseMat);
  ledStrip2.position.set(0, 9.8, -10.6);
  scene.add(ledStrip2);
  // (Round table LED strips removed — caused floating artifacts)

  // (Server racks removed — clipped into existing GLB furniture)
  // (Floor cables removed — caused lines across carpet)

}, undefined, (error) => {
  console.error('[Terrarium] GLB load failed:', error);
});

// ============================================================
// PROCEDURAL ROBOT AGENTS (Ghibli × Cyberpunk)
// ============================================================

const robots = {};

function buildRobot(agent) {
  const group = new THREE.Group();
  const ac = new THREE.Color(agent.color);
  // Warm body base (cream-tan, Ghibli warmth)
  const bodyBase = new THREE.Color(0xE8D8C4);
  const bodyTint = bodyBase.clone().lerp(ac, 0.12);

  // --- Materials ---
  const bodyMat = new THREE.MeshToonMaterial({
    color: bodyTint, gradientMap: gradientMap,
    emissive: new THREE.Color(0x1A1008), emissiveIntensity: 0.1,
  });
  const darkMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(0x3A3530), gradientMap: gradientMap,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: ac, emissive: ac, emissiveIntensity: 0.6,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: ac, emissive: ac, emissiveIntensity: 0.5,
  });
  const visorMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(0x1A1820), gradientMap: gradientMap,
  });

  // --- Legs (short stubby cylinders) ---
  for (const side of [-0.12, 0.12]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.4, 8), darkMat);
    leg.position.set(side, 0.2, 0);
    leg.castShadow = true;
    group.add(leg);
    // Foot (rounded box)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.16), darkMat);
    foot.position.set(side, 0.03, 0.02);
    group.add(foot);
  }

  // --- Body (rounded capsule torso — Ghibli chunky proportions) ---
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 8, 16), bodyMat);
  torso.position.y = 0.9;
  torso.castShadow = true;
  group.add(torso);

  // Chest panel (darker inset — cyberpunk detail)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.06), visorMat);
  panel.position.set(0, 0.88, 0.22);
  group.add(panel);

  // Chest LED strip (agent-colored glow)
  const chestLed = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.02), accentMat);
  chestLed.position.set(0, 0.92, 0.26);
  group.add(chestLed);

  // Belly accent dot (small round LED)
  const bellyLed = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), accentMat.clone());
  bellyLed.position.set(0, 0.78, 0.25);
  group.add(bellyLed);

  // --- Arms (simple tubes hanging at sides) ---
  for (const side of [-1, 1]) {
    const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), darkMat);
    shoulderJoint.position.set(side * 0.28, 1.05, 0);
    group.add(shoulderJoint);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.35, 6, 8), bodyMat);
    arm.position.set(side * 0.30, 0.72, 0);
    arm.castShadow = true;
    group.add(arm);

    // Hand (small sphere)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), bodyMat);
    hand.position.set(side * 0.30, 0.5, 0);
    group.add(hand);
  }

  // --- Neck (short connector) ---
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.12, 8), darkMat);
  neck.position.y = 1.28;
  group.add(neck);

  // --- Head (large sphere — Ghibli big-head proportions) ---
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.52;

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), bodyMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Face visor (dark curved panel — cyberpunk helmet feel)
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI, 0, Math.PI * 0.55), visorMat);
  visor.rotation.x = -0.15;
  visor.position.set(0, 0.02, 0.12);
  headGroup.add(visor);

  // --- Eyes (large, expressive — Ghibli signature) ---
  const eyeGeo = new THREE.SphereGeometry(0.065, 10, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.1, 0.04, 0.24);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
  rightEye.position.set(0.1, 0.04, 0.24);
  headGroup.add(rightEye);

  // Eye pupils (dark inner dot for expression)
  const pupilGeo = new THREE.SphereGeometry(0.025, 8, 6);
  const pupilMat = new THREE.MeshToonMaterial({ color: new THREE.Color(0x0A0A12), gradientMap: gradientMap });
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-0.1, 0.04, 0.30);
  headGroup.add(leftPupil);
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0.1, 0.04, 0.30);
  headGroup.add(rightPupil);

  // --- Antenna (cyberpunk comms) ---
  const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.3, 6), darkMat);
  antennaStem.position.set(0.14, 0.38, -0.05);
  headGroup.add(antennaStem);

  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), accentMat.clone());
  antennaTip.position.set(0.14, 0.55, -0.05);
  headGroup.add(antennaTip);

  // --- Ear panels (small side accents) ---
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.08), darkMat);
    ear.position.set(side * 0.28, 0, 0);
    headGroup.add(ear);
    // Tiny LED on ear
    const earLed = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), accentMat.clone());
    earLed.position.set(side * 0.30, 0.02, 0);
    headGroup.add(earLed);
  }

  group.add(headGroup);

  // --- Set up animation hooks ---
  group.userData.head = headGroup;
  group.userData.eyes = [leftEye, rightEye];

  return group;
}

// Build and position all robots
for (const agent of AGENT_DATA) {
  const [ax, , az] = agent.position;
  const robot = buildRobot(agent);

  const f = agent.facing || 0;
  const dOff = agent.deskOffset ?? 0.8;
  robot.scale.set(1.6, 1.6, 1.6);
  robot.position.set(ax + Math.sin(f) * dOff, 0, az + Math.cos(f) * dOff);
  robot.rotation.y = f + Math.PI;
  scene.add(robot);
  robots[agent.id] = robot;
  console.log('[Terrarium] Procedural robot built:', agent.name);
}


// ============================================================
// 3D → 2D PROJECTION (for bubble positioning)
// ============================================================

window.__projectToScreen = function(agentId) {
  const robot = robots[agentId];
  if (!robot) return null;

  // Get world position of robot head
  const head = robot.userData.head;
  if (!head) return null;

  const worldPos = new THREE.Vector3();
  head.getWorldPosition(worldPos);
  worldPos.y += 0.5; // Above head

  worldPos.project(camera);

  return {
    x: (worldPos.x * 0.5 + 0.5) * 1920,
    y: (-worldPos.y * 0.5 + 0.5) * 1080,
  };
};

// ============================================================
// POST-PROCESSING (Bloom + Outline for illustrated look)
// ============================================================

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom — warm glow, tighter radius to reduce haze
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(1920, 1080), 0.45, 0.55, 0.55
));

// Edge detection outline pass — gives illustrated line-art look
const outlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1920, 1080) },
    edgeStrength: { value: 0.7 },
    edgeColor: { value: new THREE.Vector3(0.15, 0.10, 0.12) },
  },
  vertexShader: [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}',
  ].join('\\n'),
  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform vec2 resolution;',
    'uniform float edgeStrength;',
    'uniform vec3 edgeColor;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec2 texel = vec2(1.0 / resolution.x, 1.0 / resolution.y);',
    '  vec4 center = texture2D(tDiffuse, vUv);',
    '  // Sobel edge detection on luminance',
    '  float tl = dot(texture2D(tDiffuse, vUv + vec2(-texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));',
    '  float t  = dot(texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));',
    '  float tr = dot(texture2D(tDiffuse, vUv + vec2(texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));',
    '  float l  = dot(texture2D(tDiffuse, vUv + vec2(-texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));',
    '  float r  = dot(texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));',
    '  float bl = dot(texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));',
    '  float b  = dot(texture2D(tDiffuse, vUv + vec2(0.0, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));',
    '  float br = dot(texture2D(tDiffuse, vUv + vec2(texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));',
    '  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;',
    '  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;',
    '  float edge = sqrt(gx*gx + gy*gy);',
    '  edge = smoothstep(0.05, 0.15, edge * edgeStrength);',
    '  gl_FragColor = vec4(mix(center.rgb, edgeColor, edge * 0.45), center.a);',
    '}',
  ].join('\\n'),
};
composer.addPass(new ShaderPass(outlineShader));

// Chromatic aberration — subtle corner-weighted RGB split for cinematic texture
const chromAbShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0003 },
    resolution: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}',
  ].join('\\n'),
  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform float amount;',
    'uniform vec2 resolution;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec2 center = vec2(0.5);',
    '  vec2 dir = vUv - center;',
    '  float dist = length(dir);',
    '  float strength = dist * dist * amount;',
    '  vec2 offset = dir * strength;',
    '  float r = texture2D(tDiffuse, vUv + offset).r;',
    '  float g = texture2D(tDiffuse, vUv).g;',
    '  float b = texture2D(tDiffuse, vUv - offset).b;',
    '  float a = texture2D(tDiffuse, vUv).a;',
    '  gl_FragColor = vec4(r, g, b, a);',
    '}',
  ].join('\\n'),
};
composer.addPass(new ShaderPass(chromAbShader));

// Warm color grading — Ghibli golden warmth + slight desaturation of darks
const warmGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    warmth: { value: 0.07 },
    shadowTint: { value: new THREE.Vector3(0.06, 0.03, 0.08) },
  },
  vertexShader: [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}',
  ].join('\\n'),
  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform float warmth;',
    'uniform vec3 shadowTint;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec4 color = texture2D(tDiffuse, vUv);',
    '  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));',
    '  // Warm highlights: push reds up, blues down in bright areas',
    '  color.r += warmth * lum * 0.5;',
    '  color.g += warmth * lum * 0.25;',
    '  color.b -= warmth * lum * 0.15;',
    '  // Tint shadows with warm purple (Ghibli shadow signature)',
    '  float shadowMask = 1.0 - smoothstep(0.0, 0.35, lum);',
    '  color.rgb += shadowTint * shadowMask;',
    '  gl_FragColor = vec4(color.rgb, color.a);',
    '}',
  ].join('\\n'),
};
composer.addPass(new ShaderPass(warmGradeShader));

// OutputPass applies tone mapping + sRGB encoding to the final output.
composer.addPass(new OutputPass());

// ============================================================
// BRANDING — Wall Banner & Vouch Logo
// ============================================================

// --- City Skyline Windows (left wall, panoramic row) ---
// Wide panoramic canvas shared across 3 window panels on the left wall
// Left wall inner surface is at x ≈ -11.85. Windows face +X (into room).

const CITY_W = 1920; // Panoramic canvas width
const CITY_H = 640;  // Canvas height
const cityCanvas = document.createElement('canvas');
cityCanvas.width = CITY_W;
cityCanvas.height = CITY_H;
const cityCtx = cityCanvas.getContext('2d');
const cityWindows = [];

// Seeded random for consistent building placement
let _seed = 42;
function srand() { _seed = (_seed * 16807 + 0) % 2147483647; return (_seed & 0x7fffffff) / 0x7fffffff; }

function paintCity() {
  const ctx = cityCtx;
  const w = CITY_W, h = CITY_H;
  _seed = 42; // reset seed for consistent layout

  // Ghibli twilight sky — warm gradients from deep blue to peach/amber horizon
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0,    '#0A0E24');
  skyGrad.addColorStop(0.12, '#141838');
  skyGrad.addColorStop(0.3,  '#1E2248');
  skyGrad.addColorStop(0.5,  '#2A2850');
  skyGrad.addColorStop(0.65, '#3A2A48');
  skyGrad.addColorStop(0.78, '#5A3840');
  skyGrad.addColorStop(0.88, '#8A5038');
  skyGrad.addColorStop(0.95, '#C07840');
  skyGrad.addColorStop(1,    '#D8944A');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Warm horizon glow (Ghibli sunset remnant)
  const horizGlow = ctx.createRadialGradient(w * 0.4, h * 0.92, 0, w * 0.4, h * 0.92, w * 0.5);
  horizGlow.addColorStop(0, 'rgba(220,140,60,0.2)');
  horizGlow.addColorStop(0.5, 'rgba(180,100,50,0.1)');
  horizGlow.addColorStop(1, 'rgba(180,100,50,0)');
  ctx.fillStyle = horizGlow;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  // Soft clouds (Ghibli signature — layered, wispy)
  function drawCloud(cx, cy, rx, ry, alpha) {
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    cg.addColorStop(0, 'rgba(200,180,160,' + (alpha * 0.6) + ')');
    cg.addColorStop(0.4, 'rgba(180,150,130,' + (alpha * 0.3) + ')');
    cg.addColorStop(1, 'rgba(160,120,100,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Scattered wispy clouds
  drawCloud(w * 0.15, h * 0.08, 120, 30, 0.15);
  drawCloud(w * 0.18, h * 0.10, 80, 20, 0.12);
  drawCloud(w * 0.35, h * 0.14, 140, 28, 0.10);
  drawCloud(w * 0.55, h * 0.06, 100, 22, 0.13);
  drawCloud(w * 0.72, h * 0.18, 110, 25, 0.11);
  drawCloud(w * 0.88, h * 0.10, 90, 18, 0.14);
  // Larger horizon clouds catching last light
  drawCloud(w * 0.25, h * 0.55, 200, 35, 0.08);
  drawCloud(w * 0.60, h * 0.50, 180, 30, 0.07);
  drawCloud(w * 0.85, h * 0.58, 150, 28, 0.06);

  // Stars (sparser, warmer — Ghibli stars are gentle)
  for (let i = 0; i < 120; i++) {
    const sx = srand() * w;
    const sy = srand() * h * 0.35;
    const brightness = 0.15 + srand() * 0.4;
    const size = srand() < 0.04 ? 1.6 : (srand() < 0.12 ? 1.0 : 0.5);
    ctx.fillStyle = 'rgba(235,220,200,' + brightness + ')';
    ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2); ctx.fill();
    // Soft cross on bright stars
    if (size > 1.4) {
      ctx.strokeStyle = 'rgba(240,225,200,' + (brightness * 0.25) + ')';
      ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(sx - 2.5, sy); ctx.lineTo(sx + 2.5, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy - 2.5); ctx.lineTo(sx, sy + 2.5); ctx.stroke();
    }
  }

  // Moon — larger, warmer Ghibli moon with golden halo
  const moonX = w * 0.78, moonY = h * 0.12;
  for (let r = 80; r > 0; r -= 12) {
    const a = 0.015 + (80 - r) * 0.003;
    const mg = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, r);
    mg.addColorStop(0, 'rgba(255,230,180,' + a + ')');
    mg.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(moonX, moonY, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,240,210,0.3)';
  ctx.beginPath(); ctx.arc(moonX, moonY, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,245,225,0.5)';
  ctx.beginPath(); ctx.arc(moonX, moonY, 13, 0, Math.PI * 2); ctx.fill();

  // === BUILDINGS (3 depth layers — Ghibli × Cyberpunk: organic + tech) ===

  // Helper: draw a peaked/gabled roof
  function drawRoof(x, topY, bw, peakH, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 2, topY);
    ctx.lineTo(x + bw / 2, topY - peakH);
    ctx.lineTo(x + bw + 2, topY);
    ctx.closePath();
    ctx.fill();
  }

  // Helper: draw chimney with smoke
  function drawChimney(x, topY, side) {
    const cx = x + (side === 'left' ? 8 : -12);
    ctx.fillStyle = 'rgba(50,35,30,0.9)';
    ctx.fillRect(cx, topY - 18, 6, 20);
    ctx.fillStyle = 'rgba(180,160,140,0.08)';
    ctx.beginPath(); ctx.arc(cx + 3, topY - 22, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 1, topY - 28, 4, 0, Math.PI * 2); ctx.fill();
  }

  // Helper: cyberpunk rooftop features
  function drawCyberRoof(bx, topY, bw) {
    const feat = srand();
    if (feat < 0.25) {
      // Satellite dish (arc + stem)
      const dx = bx + bw * (0.3 + srand() * 0.4);
      ctx.strokeStyle = 'rgba(100,90,80,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(dx, topY - 3); ctx.lineTo(dx, topY - 14); ctx.stroke();
      ctx.beginPath(); ctx.arc(dx, topY - 14, 7, Math.PI * 0.8, Math.PI * 0.2, true); ctx.stroke();
      // Dish glow
      ctx.fillStyle = 'rgba(90,200,180,0.12)';
      ctx.beginPath(); ctx.arc(dx, topY - 14, 4, 0, Math.PI * 2); ctx.fill();
    } else if (feat < 0.5) {
      // Antenna array (multiple thin vertical lines + crossbar)
      const ax = bx + bw * (0.2 + srand() * 0.6);
      ctx.strokeStyle = 'rgba(90,80,70,0.6)';
      ctx.lineWidth = 1;
      for (let a = 0; a < 3; a++) {
        const ah = 8 + srand() * 16;
        ctx.beginPath(); ctx.moveTo(ax + a * 4, topY); ctx.lineTo(ax + a * 4, topY - ah); ctx.stroke();
      }
      // Crossbar
      ctx.beginPath(); ctx.moveTo(ax - 1, topY - 10); ctx.lineTo(ax + 9, topY - 10); ctx.stroke();
      // Blinking light on tallest
      if (srand() > 0.4) {
        ctx.fillStyle = 'rgba(255,80,60,0.6)';
        ctx.beginPath(); ctx.arc(ax + 4, topY - 20, 1.5, 0, Math.PI * 2); ctx.fill();
        const ag = ctx.createRadialGradient(ax + 4, topY - 20, 0, ax + 4, topY - 20, 6);
        ag.addColorStop(0, 'rgba(255,80,60,0.15)'); ag.addColorStop(1, 'rgba(255,80,60,0)');
        ctx.fillStyle = ag;
        ctx.beginPath(); ctx.arc(ax + 4, topY - 20, 6, 0, Math.PI * 2); ctx.fill();
      }
    } else if (feat < 0.7) {
      // Water tank / hodgepodge stack (favela vibe)
      const tx = bx + bw * (0.2 + srand() * 0.5);
      const tw = 10 + srand() * 12;
      const th = 8 + srand() * 14;
      ctx.fillStyle = 'rgba(40,30,28,0.85)';
      ctx.fillRect(tx, topY - th, tw, th);
      // Stacked addition on top
      if (srand() > 0.5) {
        const sw = tw * (0.5 + srand() * 0.3);
        const sh = 5 + srand() * 8;
        ctx.fillStyle = 'rgba(50,38,35,0.8)';
        ctx.fillRect(tx + 2, topY - th - sh, sw, sh);
      }
      // Pipes/cables hanging off
      ctx.strokeStyle = 'rgba(80,70,60,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx + tw, topY - th * 0.6); ctx.lineTo(tx + tw + 8, topY - th * 0.3); ctx.stroke();
    } else {
      // Neon sign / light strip on facade
      const nx = bx + bw * (0.1 + srand() * 0.5);
      const nw = 12 + srand() * 20;
      const ny = topY + 4 + srand() * 10;
      const neonColors = ['rgba(90,200,180,', 'rgba(200,130,180,', 'rgba(140,180,220,', 'rgba(220,160,80,'];
      const nc = neonColors[Math.floor(srand() * neonColors.length)];
      ctx.fillStyle = nc + '0.5)';
      ctx.fillRect(nx, ny, nw, 2);
      // Glow
      const ng = ctx.createRadialGradient(nx + nw / 2, ny, 0, nx + nw / 2, ny, nw * 0.4);
      ng.addColorStop(0, nc + '0.1)'); ng.addColorStop(1, nc + '0)');
      ctx.fillStyle = ng;
      ctx.fillRect(nx - 5, ny - 8, nw + 10, 18);
    }
  }

  // --- Far layer: sparse townscape silhouettes ---
  for (let i = 0; i < 25; i++) {
    const bx = (i / 25) * w - 8 + srand() * 10;
    const bw = 18 + srand() * 30;
    const topY = h * (0.38 + srand() * 0.14);
    const warmShift = Math.floor(srand() * 30);
    ctx.fillStyle = 'rgb(' + (25 + warmShift) + ',' + (20 + warmShift * 0.6) + ',' + (30 + warmShift * 0.3) + ')';
    ctx.fillRect(bx, topY, bw, h - topY);
    if (srand() > 0.4) drawRoof(bx, topY, bw, 3 + srand() * 5, 'rgba(45,32,28,0.9)');
    if (srand() > 0.7) drawCyberRoof(bx, topY, bw);
    for (let wy = topY + 4; wy < h - 3; wy += 6 + srand() * 3) {
      for (let wx = bx + 2; wx < bx + bw - 2; wx += 5 + srand() * 2) {
        cityWindows.push({ x: wx, y: wy, w: 1.5, h: 2, lit: srand() > 0.78, phase: srand() * 100, layer: 'far' });
      }
    }
  }

  // --- Mid layer: mixed architecture with cyber retrofits ---
  const midCount = 12;
  for (let i = 0; i < midCount; i++) {
    const bx = (i / midCount) * w + srand() * 50 - 20;
    const bw = 40 + srand() * 60;
    const topPct = 0.16 + srand() * 0.24;
    const topY = h * topPct;
    const bGrad = ctx.createLinearGradient(bx, topY, bx + bw, topY);
    bGrad.addColorStop(0, '#1A1525');
    bGrad.addColorStop(0.2, '#22182E');
    bGrad.addColorStop(0.8, '#1E1528');
    bGrad.addColorStop(1, '#141020');
    ctx.fillStyle = bGrad;
    ctx.fillRect(bx, topY, bw, h - topY);
    // Roof — peaked or flat with cyber features
    if (srand() > 0.45) {
      const peakH = 8 + srand() * 14;
      drawRoof(bx, topY, bw, peakH, 'rgba(55,38,35,0.85)');
      if (srand() > 0.5) drawChimney(bx + bw, topY - peakH * 0.4, 'left');
    } else {
      ctx.fillStyle = 'rgba(70,55,50,0.4)';
      ctx.fillRect(bx, topY, bw, 2.5);
    }
    // Cyberpunk rooftop additions
    if (srand() > 0.35) drawCyberRoof(bx, topY, bw);
    // Hodgepodge stacked additions on some buildings (favela style)
    if (srand() > 0.7) {
      const stackW = bw * (0.3 + srand() * 0.3);
      const stackH = 10 + srand() * 20;
      const stackX = bx + (srand() > 0.5 ? 0 : bw - stackW);
      ctx.fillStyle = 'rgba(35,28,32,0.85)';
      ctx.fillRect(stackX, topY - stackH, stackW, stackH);
      // Mini windows in stack
      for (let sy = topY - stackH + 3; sy < topY - 2; sy += 6) {
        for (let sx = stackX + 3; sx < stackX + stackW - 3; sx += 6) {
          cityWindows.push({ x: sx, y: sy, w: 2, h: 3, lit: srand() > 0.6, phase: srand() * 100, layer: 'mid' });
        }
      }
    }
    ctx.fillStyle = 'rgba(160,130,90,0.08)';
    ctx.fillRect(bx, topY, 2, h - topY);
    for (let wy = topY + 7; wy < h - 5; wy += 10 + srand() * 4) {
      for (let wx = bx + 4; wx < bx + bw - 4; wx += 8 + srand() * 4) {
        cityWindows.push({ x: wx, y: wy, w: 3, h: 4.5, lit: srand() > 0.72, phase: srand() * 100, layer: 'mid' });
      }
    }
  }

  // --- Close layer: fewer, larger buildings with heavy cyber detail ---
  const closeBuildings = [
    [20, 0.22, 120], [220, 0.30, 100], [440, 0.18, 95],
    [660, 0.25, 110], [900, 0.16, 105], [1120, 0.28, 115],
    [1380, 0.20, 100], [1620, 0.26, 110],
  ];
  for (const [bx, topPct, bw] of closeBuildings) {
    const topY = h * topPct;
    const bGrad = ctx.createLinearGradient(bx, topY, bx + bw, topY);
    bGrad.addColorStop(0, '#1E1830');
    bGrad.addColorStop(0.3, '#261E3A');
    bGrad.addColorStop(0.7, '#221A35');
    bGrad.addColorStop(1, '#161228');
    ctx.fillStyle = bGrad;
    ctx.fillRect(bx, topY, bw, h - topY);
    // Peaked roof + cyber features
    const peakH = 10 + srand() * 16;
    if (srand() > 0.3) {
      drawRoof(bx, topY, bw, peakH, 'rgba(60,42,38,0.9)');
      ctx.strokeStyle = 'rgba(180,140,90,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx - 2, topY);
      ctx.lineTo(bx + bw / 2, topY - peakH);
      ctx.lineTo(bx + bw + 2, topY);
      ctx.stroke();
      if (srand() > 0.5) drawChimney(bx + bw, topY - peakH * 0.3, 'left');
    } else {
      ctx.fillStyle = 'rgba(80,60,50,0.35)';
      ctx.fillRect(bx, topY, bw, 3);
    }
    // Always add cyber rooftop detail on close buildings
    drawCyberRoof(bx, topY, bw);
    // Exposed pipes / scaffolding on building side
    if (srand() > 0.5) {
      const pipeSide = srand() > 0.5 ? bx + bw - 3 : bx + 1;
      ctx.strokeStyle = 'rgba(90,75,65,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pipeSide, topY + 5); ctx.lineTo(pipeSide, topY + h * 0.3); ctx.stroke();
      // Horizontal connector
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pipeSide, topY + 15);
      ctx.lineTo(pipeSide + (pipeSide === bx + 1 ? -6 : 6), topY + 15);
      ctx.stroke();
    }
    // Neon accent strip on facade
    if (srand() > 0.4) {
      const neonColors = ['rgba(90,200,180,', 'rgba(200,130,180,', 'rgba(140,180,220,'];
      const nc = neonColors[Math.floor(srand() * neonColors.length)];
      const ny = topY + 8 + srand() * 20;
      ctx.fillStyle = nc + '0.45)';
      ctx.fillRect(bx + 4, ny, bw - 8, 1.5);
      const ng = ctx.createRadialGradient(bx + bw / 2, ny, 0, bx + bw / 2, ny, bw * 0.3);
      ng.addColorStop(0, nc + '0.08)'); ng.addColorStop(1, nc + '0)');
      ctx.fillStyle = ng;
      ctx.fillRect(bx, ny - 6, bw, 14);
    }
    ctx.fillStyle = 'rgba(180,150,100,0.06)';
    ctx.fillRect(bx, topY, 3, h - topY);
    for (let fy = topY + 20; fy < h; fy += 18 + srand() * 8) {
      ctx.fillStyle = 'rgba(60,45,40,0.15)';
      ctx.fillRect(bx + 3, fy, bw - 6, 1);
    }
    for (let wy = topY + 10; wy < h - 8; wy += 14 + srand() * 5) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 12 + srand() * 5) {
        cityWindows.push({ x: wx, y: wy, w: 5, h: 7, lit: srand() > 0.65, phase: srand() * 100, layer: 'close' });
      }
    }
  }

  // Warm street level glow at bottom
  const streetGrad = ctx.createLinearGradient(0, h - 35, 0, h);
  streetGrad.addColorStop(0, 'rgba(180,120,60,0)');
  streetGrad.addColorStop(1, 'rgba(180,120,60,0.2)');
  ctx.fillStyle = streetGrad;
  ctx.fillRect(0, h - 35, w, 35);

  drawCityWindows(0);
}

function drawCityWindows(t) {
  const ctx = cityCtx;
  for (const win of cityWindows) {
    if (win.lit) {
      const flicker = 0.35 + Math.sin(t * 0.8 + win.phase) * 0.08;
      // Warmer Ghibli window palette — mostly golden/amber with occasional cool accent
      const palettes = [
        '255,210,120', '255,190,90', '255,230,170', '240,200,130',
        '255,220,140', '255,195,100', '245,225,165', '200,180,140',
      ];
      const c = palettes[Math.floor(win.phase) % palettes.length];
      ctx.fillStyle = 'rgba(' + c + ',' + flicker + ')';
      ctx.shadowColor = 'rgba(' + c + ',0.3)';
      ctx.shadowBlur = win.layer === 'far' ? 1.5 : win.layer === 'mid' ? 3 : 5;
    } else {
      ctx.fillStyle = 'rgba(12,10,20,0.8)';
      ctx.shadowBlur = 0;
    }
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }
  ctx.shadowBlur = 0;
}

paintCity();

const cityTex = new THREE.CanvasTexture(cityCanvas);
cityTex.minFilter = THREE.LinearFilter;
cityTex.wrapS = THREE.ClampToEdgeWrapping;

// --- Window panels along left wall ---
// Left wall at x=-12, inner surface ~x=-11.85
// 3 tall windows spanning z=-6 to z=6 (covers area in front of Pixel through Forge)
const WIN_WALL_X = -11.65; // Just in front of wall surface
const WIN_Y = 4.8;         // Center height
const WIN_H = 5.0;         // Tall windows
const WIN_PANEL_W = 3.5;   // Each panel width
const WIN_GAP = 0.5;       // Gap between panels (wall pillar)
const WIN_PANELS = [
  { z: -4.5, uStart: 0.0,  uEnd: 0.333 },  // Left panel (behind Pixel)
  { z: -0.5, uStart: 0.333, uEnd: 0.666 },  // Center panel
  { z:  3.5, uStart: 0.666, uEnd: 1.0 },    // Right panel (near Forge)
];

const frameMat = new THREE.MeshToonMaterial({ color: new THREE.Color(0x1A1A2E), gradientMap: gradientMap });
const frameMat2 = new THREE.MeshToonMaterial({ color: new THREE.Color(0x222238), gradientMap: gradientMap });
const cityPanels = [];

for (const panel of WIN_PANELS) {
  // City texture with UV offset for this panel's portion of the panorama
  const geo = new THREE.PlaneGeometry(WIN_PANEL_W, WIN_H);
  // Adjust UVs to show correct portion of panoramic texture
  const uvAttr = geo.attributes.uv;
  for (let i = 0; i < uvAttr.count; i++) {
    const u = uvAttr.getX(i);
    uvAttr.setX(i, panel.uStart + u * (panel.uEnd - panel.uStart));
  }
  uvAttr.needsUpdate = true;

  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: cityTex }));
  // Left wall faces +X, so rotate the plane to face into the room
  mesh.rotation.y = Math.PI / 2;
  mesh.position.set(WIN_WALL_X, WIN_Y, panel.z);
  scene.add(mesh);
  cityPanels.push(mesh);

  // Window frame (outer border)
  const ft = 0.12;
  // Top & bottom bars
  for (const yOff of [WIN_H / 2 + ft / 2, -WIN_H / 2 - ft / 2]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(ft, ft, WIN_PANEL_W + 0.2), frameMat2);
    bar.position.set(WIN_WALL_X + 0.04, WIN_Y + yOff, panel.z);
    scene.add(bar);
  }
  // Left & right bars
  for (const zOff of [WIN_PANEL_W / 2 + ft / 2, -WIN_PANEL_W / 2 - ft / 2]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(ft, WIN_H + 0.2, ft), frameMat2);
    bar.position.set(WIN_WALL_X + 0.04, WIN_Y, panel.z + zOff);
    scene.add(bar);
  }

  // Horizontal mullion (divides window into upper and lower panes)
  const mulH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, WIN_PANEL_W + 0.1), frameMat);
  mulH.position.set(WIN_WALL_X + 0.04, WIN_Y + 0.3, panel.z);
  scene.add(mulH);

  // Vertical mullion (center cross)
  const mulV = new THREE.Mesh(new THREE.BoxGeometry(0.06, WIN_H + 0.1, 0.06), frameMat);
  mulV.position.set(WIN_WALL_X + 0.04, WIN_Y, panel.z);
  scene.add(mulV);
}

// Warm city light spilling from windows into room
for (const panel of WIN_PANELS) {
  const wl = new THREE.SpotLight(0xFFAA44, 1.8, 14, Math.PI / 3.5, 0.7, 1);
  wl.position.set(WIN_WALL_X + 0.3, WIN_Y, panel.z);
  wl.target.position.set(WIN_WALL_X + 8, 1, panel.z);
  scene.add(wl);
  scene.add(wl.target);
}

// Ambient window sill glow (warm strip along left wall base)
const sillGlow = new THREE.PointLight(0xFFBB66, 0.5, 6);
sillGlow.position.set(WIN_WALL_X + 0.3, WIN_Y - WIN_H / 2, WIN_PANELS[1].z);
scene.add(sillGlow);

// --- Back wall window near Percy ---
// Back wall at z=-11, inner surface ~z=-10.85. Percy's desk at x≈-4.
// Two panels wrapping the corner from the left wall, showing the far end of the panorama.
const BACK_WALL_Z = -10.65;
const BACK_PANELS = [
  { x: -7, uStart: 0.82, uEnd: 1.0 },   // Left panel (closer to corner)
  { x: -3, uStart: 0.65, uEnd: 0.82 },   // Right panel (above Percy)
];

for (const bp of BACK_PANELS) {
  const bpW = 3.5;
  const bpH = WIN_H;
  const geo = new THREE.PlaneGeometry(bpW, bpH);
  // UV mapping to panorama slice
  const uvAttr = geo.attributes.uv;
  for (let i = 0; i < uvAttr.count; i++) {
    const u = uvAttr.getX(i);
    uvAttr.setX(i, bp.uStart + u * (bp.uEnd - bp.uStart));
  }
  uvAttr.needsUpdate = true;

  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: cityTex }));
  // Back wall faces +Z (into room) — default PlaneGeometry faces +Z, no rotation needed
  mesh.position.set(bp.x, WIN_Y, BACK_WALL_Z);
  scene.add(mesh);

  // Window frame
  const ft = 0.12;
  // Top & bottom
  for (const yOff of [bpH / 2 + ft / 2, -bpH / 2 - ft / 2]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bpW + 0.2, ft, 0.1), frameMat2);
    bar.position.set(bp.x, WIN_Y + yOff, BACK_WALL_Z + 0.04);
    scene.add(bar);
  }
  // Left & right
  for (const xOff of [bpW / 2 + ft / 2, -bpW / 2 - ft / 2]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(ft, bpH + 0.2, 0.1), frameMat2);
    bar.position.set(bp.x + xOff, WIN_Y, BACK_WALL_Z + 0.04);
    scene.add(bar);
  }
  // Mullion cross
  const mulH = new THREE.Mesh(new THREE.BoxGeometry(bpW + 0.1, 0.06, 0.06), frameMat);
  mulH.position.set(bp.x, WIN_Y + 0.3, BACK_WALL_Z + 0.04);
  scene.add(mulH);
  const mulV = new THREE.Mesh(new THREE.BoxGeometry(0.06, bpH + 0.1, 0.06), frameMat);
  mulV.position.set(bp.x, WIN_Y, BACK_WALL_Z + 0.04);
  scene.add(mulV);

  // Warm city light spilling in
  const wl = new THREE.SpotLight(0xFFAA44, 1.8, 14, Math.PI / 3.5, 0.7, 1);
  wl.position.set(bp.x, WIN_Y, BACK_WALL_Z + 0.3);
  wl.target.position.set(bp.x, 1, BACK_WALL_Z + 8);
  scene.add(wl);
  scene.add(wl.target);
}

// Back wall sill glow
const backSillGlow = new THREE.PointLight(0xFFBB66, 0.4, 5);
backSillGlow.position.set(-5, WIN_Y - WIN_H / 2, BACK_WALL_Z + 0.3);
scene.add(backSillGlow);

// Twinkle updater
let winFrameCount = 0;
function updateCityWindows(t) {
  winFrameCount++;
  if (winFrameCount % 8 !== 0) return; // ~7.5fps for twinkling

  const toggleCount = 5 + Math.floor(Math.random() * 6);
  for (let i = 0; i < toggleCount; i++) {
    const idx = Math.floor(Math.random() * cityWindows.length);
    cityWindows[idx].lit = !cityWindows[idx].lit;
  }
  drawCityWindows(t);
  cityTex.needsUpdate = true;
}

// Banner removed — back wall has the GLB round window + TV status board already

// Table logo removed — kept original GLB material to avoid transparency issues

// ============================================================
// MONITOR & TV SCREEN CONTENT
// ============================================================

// --- Agent monitor CanvasTextures (256×192) ---
const monitorCanvases = {};
const monitorContexts = {};
const monitorTextures = {};
const monitorLines = {};

// Per-agent fake terminal content
const TERMINAL_CONTENT = {
  percy:    ['> deploying registry v0.2.1...', '> auth module: 45 tests passing', '> token analysis: 2.3k/day avg', '> ADR-007: agent memory schema', '> event bus refactored for SSE', '> build: SUCCESS in 4.2s'],
  scout:    ['$ scanning huggingface/new...', '$ found: flux-lora-v3.safetensors', '$ benchmark: MLX 23tok/s', '$ indexing anthropic changelog', '$ ComfyUI workflow #847 saved', '$ IP-Adapter v2: +12% quality'],
  sage:     ['[AUDIT] PR #42: 2 issues found', '[SCAN] deps: 0 critical vulns', '[CHECK] injection vectors: clear', '[VERIFY] schema v3 validated', '[PERF] p99 latency: 230ms', '[AUDIT] rate limiter: OK'],
  pixel:    ['~ rendering scene_v4.png...', '~ IP-Adapter: strength=0.65', '~ sprites: 7/7 at 512x512', '~ color grading: warm +15%', '~ compositing layers: 3', '~ export: 1920x1080 @ 60fps'],
  forge:    ['$ bun test -- all green', '$ building workflow-builder.ts', '$ fix: strict mode errors (3)', '$ --ref flag: implemented', '$ ComfyUI client: v0.3.0', '$ upload pipeline: optimized'],
  relay:    ['[OK] containers: 7/7 healthy', '[LOG] rotated: 12MB compressed', '[SYNC] agent memory -> disk', '[BACKUP] registry db: complete', '[SSL] cert expiry: 89 days', '[SCALE] workers: 4 instances'],
  'worker-coder': ['$ bun test -- 47/47 pass', '$ tsc --noEmit: clean', '$ building endpoint...', '$ patching middleware', '$ docker exec a0-coder', '$ git diff: +84 -12'],
  'worker-researcher': ['~ scanning 12 sources...', '~ extracting API docs', '~ cross-referencing v2.1', '~ browsing github.com/...', '~ summarizing findings', '~ verified: 3 sources'],
  'worker-general': ['> batch: 200/200 rows', '> formatting report.md', '> converting csv→json', '> organizing /output/', '> compiling summary', '> task queue: 3 remaining'],
};

for (const agent of AGENT_DATA) {
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 192;
  const ctx = cvs.getContext('2d');
  monitorCanvases[agent.id] = cvs;
  monitorContexts[agent.id] = ctx;
  monitorLines[agent.id] = { lines: [], cursor: 0, lineTimer: 0 };
  const tex = new THREE.CanvasTexture(cvs);
  tex.minFilter = THREE.LinearFilter;
  monitorTextures[agent.id] = tex;
}

// Detect MonitorGlow meshes during GLB traverse and replace material
const monitorMeshes = {};

// --- Wall TV (programmatic geometry, 512×256) ---
const tvCanvas = document.createElement('canvas');
tvCanvas.width = 512;
tvCanvas.height = 256;
const tvCtx = tvCanvas.getContext('2d');
const tvTexture = new THREE.CanvasTexture(tvCanvas);
tvTexture.minFilter = THREE.LinearFilter;

// TV bezel
const tvBezelGeo = new THREE.BoxGeometry(4.5, 2.8, 0.15);
const tvBezelMat = new THREE.MeshToonMaterial({ color: new THREE.Color(0x1A1A2A), gradientMap: gradientMap });
const tvBezel = new THREE.Mesh(tvBezelGeo, tvBezelMat);
tvBezel.position.set(5, 3.8, -10.75);
scene.add(tvBezel);

// TV screen
const tvScreenGeo = new THREE.PlaneGeometry(4.0, 2.3);
const tvScreenMat = new THREE.MeshBasicMaterial({ map: tvTexture, blending: THREE.AdditiveBlending });
const tvScreen = new THREE.Mesh(tvScreenGeo, tvScreenMat);
tvScreen.position.set(5, 3.8, -10.67);
scene.add(tvScreen);

// Cyan glow in front of TV
const tvGlow = new THREE.PointLight(0x00E5FF, 0.8, 6);
tvGlow.position.set(5, 3.8, -10.2);
scene.add(tvGlow);

// TV ticker items (hardcoded + live)
const tvTickerItems = [
  'PERCIVAL LABS // ALL SYSTEMS NOMINAL',
  'ROUND TABLE v0.1 // BUILDING',
  'TERRARIUM v0.5 // COZY CYBERPUNK',
  'MAKE C > D // COOPERATION WINS',
  'AGENT COUNT: 7 // ONLINE',
];

let tvTickerOffset = 0;
let tvFrameCount = 0;

function updateMonitors(t, dt) {
  tvFrameCount++;
  if (tvFrameCount % 3 !== 0) return; // 20fps

  // --- Agent monitors ---
  for (const agent of AGENT_DATA) {
    const ctx = monitorContexts[agent.id];
    if (!ctx) continue;
    const state = animState[agent.id];
    const content = TERMINAL_CONTENT[agent.id] || TERMINAL_CONTENT.percy;
    const ml = monitorLines[agent.id];

    ctx.fillStyle = 'rgba(5, 8, 15, 0.95)';
    ctx.fillRect(0, 0, 256, 192);

    if (state && state.isActive) {
      // Active: scrolling terminal text
      ctx.font = '10px monospace';
      ctx.fillStyle = agent.color;

      ml.lineTimer += dt * 3;
      if (ml.lineTimer > 1) {
        ml.lineTimer = 0;
        ml.lines.push(content[ml.cursor % content.length]);
        ml.cursor++;
        if (ml.lines.length > 14) ml.lines.shift();
      }

      for (let i = 0; i < ml.lines.length; i++) {
        ctx.globalAlpha = 0.6 + (i / ml.lines.length) * 0.4;
        ctx.fillText(ml.lines[i], 8, 16 + i * 13);
      }
      ctx.globalAlpha = 1;

      // Blinking cursor
      if (Math.sin(t * 4) > 0) {
        ctx.fillRect(8 + (ml.lines.length > 0 ? ctx.measureText(ml.lines[ml.lines.length - 1] || '').width : 0), 16 + (ml.lines.length - 1) * 13 - 8, 6, 10);
      }

      // Scanline overlay
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      for (let y = 0; y < 192; y += 3) {
        ctx.fillRect(0, y, 256, 1);
      }
    } else {
      // Idle: dim pulsing agent initial
      const pulse = 0.15 + Math.sin(t * 1.5) * 0.1;
      ctx.globalAlpha = pulse;
      ctx.font = 'bold 60px monospace';
      ctx.fillStyle = agent.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(agent.name[0], 128, 96);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }

    monitorTextures[agent.id].needsUpdate = true;
  }

  // --- Wall TV ---
  tvCtx.fillStyle = '#080A12';
  tvCtx.fillRect(0, 0, 512, 256);

  // Grid bg
  tvCtx.strokeStyle = 'rgba(0, 200, 255, 0.05)';
  tvCtx.lineWidth = 0.5;
  for (let x = 0; x < 512; x += 20) { tvCtx.beginPath(); tvCtx.moveTo(x, 0); tvCtx.lineTo(x, 256); tvCtx.stroke(); }
  for (let y = 0; y < 256; y += 20) { tvCtx.beginPath(); tvCtx.moveTo(0, y); tvCtx.lineTo(512, y); tvCtx.stroke(); }

  // Header
  tvCtx.font = 'bold 14px monospace';
  tvCtx.fillStyle = '#00E5FF';
  tvCtx.fillText('PERCIVAL LABS // STATUS BOARD', 16, 24);

  // Clock
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  tvCtx.font = '11px monospace';
  tvCtx.fillStyle = 'rgba(0, 229, 255, 0.6)';
  tvCtx.textAlign = 'right';
  tvCtx.fillText(timeStr, 496, 24);
  tvCtx.textAlign = 'left';

  // Separator
  tvCtx.fillStyle = 'rgba(0, 229, 255, 0.15)';
  tvCtx.fillRect(16, 32, 480, 1);

  // Agent status indicators
  tvCtx.font = '10px monospace';
  for (let i = 0; i < AGENT_DATA.length; i++) {
    const ag = AGENT_DATA[i];
    const y = 48 + i * 22;
    const st = animState[ag.id];
    const isActive = st && st.isActive;

    // Status dot
    tvCtx.fillStyle = isActive ? '#00FF88' : 'rgba(255,255,255,0.2)';
    tvCtx.beginPath();
    tvCtx.arc(24, y, 3, 0, Math.PI * 2);
    tvCtx.fill();

    // Name
    tvCtx.fillStyle = ag.color;
    tvCtx.fillText(ag.name.toUpperCase(), 36, y + 4);

    // Role
    tvCtx.fillStyle = 'rgba(255,255,255,0.3)';
    tvCtx.fillText(ag.role || '', 120, y + 4);

    // Status
    tvCtx.fillStyle = isActive ? '#00FF88' : 'rgba(255,255,255,0.15)';
    tvCtx.textAlign = 'right';
    tvCtx.fillText(isActive ? 'ACTIVE' : 'IDLE', 496, y + 4);
    tvCtx.textAlign = 'left';
  }

  // Bottom ticker
  tvCtx.fillStyle = 'rgba(0, 229, 255, 0.1)';
  tvCtx.fillRect(0, 236, 512, 20);
  tvCtx.font = '9px monospace';
  tvCtx.fillStyle = '#00CCFF';
  const tickerText = tvTickerItems.join('  ///  ');
  tvTickerOffset -= 0.5;
  if (tvTickerOffset < -tvCtx.measureText(tickerText).width) tvTickerOffset = 512;
  tvCtx.fillText(tickerText, tvTickerOffset, 250);

  tvTexture.needsUpdate = true;
}

// ============================================================
// PARTICLE SYSTEMS
// ============================================================

// --- Dust mote sprite (circle texture) ---
const dustSprite = (function() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,232,192,0.6)');
  grad.addColorStop(0.4, 'rgba(255,232,192,0.2)');
  grad.addColorStop(1, 'rgba(255,232,192,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  return tex;
})();

// --- Dust motes (cozy warm amber) ---
let dustMotes = null;
{
  const dustCount = 150;
  const dustGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(dustCount * 3);
  const velocities = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = Math.random() * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    velocities[i] = 0.05 + Math.random() * 0.08;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xFFE8C0,
    size: 0.12,
    map: dustSprite,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  dustMotes = new THREE.Points(dustGeo, dustMat);
  dustMotes.userData.velocities = velocities;
  scene.add(dustMotes);
}

// --- Digital sparks (agent-colored, near active monitors) ---
let digitalSparks = null;
{
  const sparkCount = 80;
  const sparkGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(sparkCount * 3);
  const colors = new Float32Array(sparkCount * 3);
  const lifetimes = new Float32Array(sparkCount);
  const agentIndices = new Uint8Array(sparkCount);
  const sparksPerAgent = Math.floor(sparkCount / AGENT_DATA.length);
  for (let i = 0; i < sparkCount; i++) {
    const ai = Math.min(Math.floor(i / sparksPerAgent), AGENT_DATA.length - 1);
    agentIndices[i] = ai;
    const agentColor = new THREE.Color(AGENT_DATA[ai].color);
    colors[i * 3] = agentColor.r;
    colors[i * 3 + 1] = agentColor.g;
    colors[i * 3 + 2] = agentColor.b;
    positions[i * 3] = 0;
    positions[i * 3 + 1] = -100; // Start hidden
    positions[i * 3 + 2] = 0;
    lifetimes[i] = Math.random() * 2;
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.08,
    map: dustSprite,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    vertexColors: true,
  });
  digitalSparks = new THREE.Points(sparkGeo, sparkMat);
  digitalSparks.userData.lifetimes = lifetimes;
  digitalSparks.userData.agentIndices = agentIndices;
  scene.add(digitalSparks);
}

// ============================================================
// RENDER LOOP — Enhanced animations
// ============================================================

const clock = new THREE.Clock();
const cameraBaseX = camera.position.x;
const cameraBaseY = camera.position.y;
const cameraBaseZ = camera.position.z;

// Per-agent personality profiles
const PERSONALITY = {
  percy:    { breathSpeed: 0.5,  leanSpeed: 0.1,  leanAmpIdle: 0.008, leanAmpActive: 0.025, headTurnMin: 8,  headTurnMax: 15, headTurnRange: 0.1,  blinkMin: 4,   blinkMax: 8,  activeMult: 1.5 },
  scout:    { breathSpeed: 0.7,  leanSpeed: 0.2,  leanAmpIdle: 0.012, leanAmpActive: 0.04,  headTurnMin: 2,  headTurnMax: 5,  headTurnRange: 0.35, blinkMin: 2,   blinkMax: 4,  activeMult: 3.5 },
  sage:     { breathSpeed: 0.4,  leanSpeed: 0.08, leanAmpIdle: 0.01,  leanAmpActive: 0.02,  headTurnMin: 6,  headTurnMax: 12, headTurnRange: 0.15, blinkMin: 5,   blinkMax: 10, activeMult: 2.0 },
  pixel:    { breathSpeed: 0.8,  leanSpeed: 0.25, leanAmpIdle: 0.02,  leanAmpActive: 0.05,  headTurnMin: 3,  headTurnMax: 6,  headTurnRange: 0.25, blinkMin: 3,   blinkMax: 5,  activeMult: 4.0 },
  forge:    { breathSpeed: 0.6,  leanSpeed: 0.18, leanAmpIdle: 0.015, leanAmpActive: 0.045, headTurnMin: 5,  headTurnMax: 10, headTurnRange: 0.12, blinkMin: 3,   blinkMax: 6,  activeMult: 3.0 },
  relay:    { breathSpeed: 0.55, leanSpeed: 0.12, leanAmpIdle: 0.01,  leanAmpActive: 0.03,  headTurnMin: 3,  headTurnMax: 7,  headTurnRange: 0.3,  blinkMin: 4,   blinkMax: 7,  activeMult: 2.0 },
  'worker-coder':      { breathSpeed: 0.7,  leanSpeed: 0.20, leanAmpIdle: 0.015, leanAmpActive: 0.04,  headTurnMin: 4,  headTurnMax: 8,  headTurnRange: 0.15, blinkMin: 3,   blinkMax: 6,  activeMult: 3.5 },
  'worker-researcher': { breathSpeed: 0.65, leanSpeed: 0.22, leanAmpIdle: 0.02,  leanAmpActive: 0.05,  headTurnMin: 3,  headTurnMax: 6,  headTurnRange: 0.20, blinkMin: 3,   blinkMax: 5,  activeMult: 3.0 },
  'worker-general':    { breathSpeed: 0.75, leanSpeed: 0.18, leanAmpIdle: 0.015, leanAmpActive: 0.04,  headTurnMin: 4,  headTurnMax: 9,  headTurnRange: 0.12, blinkMin: 3.5, blinkMax: 6,  activeMult: 2.5 },
};

// Per-agent animation state (initialized from personality)
const animState = {};
for (const agent of AGENT_DATA) {
  const p = PERSONALITY[agent.id] || PERSONALITY.percy;
  animState[agent.id] = {
    breathPhase: Math.random() * Math.PI * 2,
    breathSpeed: p.breathSpeed,
    leanPhase: Math.random() * Math.PI * 2,
    leanSpeed: p.leanSpeed,
    leanAmpIdle: p.leanAmpIdle,
    leanAmpActive: p.leanAmpActive,
    headTurnMin: p.headTurnMin,
    headTurnMax: p.headTurnMax,
    headTurnRange: p.headTurnRange,
    blinkMin: p.blinkMin,
    blinkMax: p.blinkMax,
    activeMult: p.activeMult,
    nextHeadTurn: p.headTurnMin + Math.random() * (p.headTurnMax - p.headTurnMin),
    headTurnTarget: 0,
    headTurnCurrent: 0,
    nextBlink: p.blinkMin + Math.random() * (p.blinkMax - p.blinkMin),
    blinkTimer: 0,
    isBlinking: false,
    isActive: false,
    twitchZ: 0,
    nextTwitch: 9999,
  };
}

// Expose activity setter for overlay JS to call
window.__setAgentActive = function(agentId, active) {
  if (animState[agentId]) {
    animState[agentId].isActive = active;
  }
};

// Expose ticker push for SSE events
window.__pushTicker = function(text) {
  tvTickerItems.push(text);
  if (tvTickerItems.length > 20) tvTickerItems.shift();
};


function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  // Camera: static (drift removed — caused unsettling whole-room sway)

  // Animate robots
  for (let i = 0; i < AGENT_DATA.length; i++) {
    const agent = AGENT_DATA[i];
    const robot = robots[agent.id];
    if (!robot) continue;

    const state = animState[agent.id];
    const offset = i * 1.1;

    // --- Work lean: personality-driven amplitude (only when active) ---
    const leanMult = state.isActive ? state.activeMult : 1.0;
    const leanAmp = state.isActive ? state.leanAmpActive : 0;
    const leanVal = Math.sin(t * state.leanSpeed * leanMult + state.leanPhase);
    robot.rotation.x = leanVal * leanAmp;

    // --- Head turn: personality-driven intervals & range ---
    state.nextHeadTurn -= dt;
    if (state.nextHeadTurn <= 0) {
      const range = state.headTurnRange;
      const choices = [0, -range, range, range * 0.5, 0];
      state.headTurnTarget = choices[Math.floor(Math.random() * choices.length)];
      state.nextHeadTurn = state.headTurnMin + Math.random() * (state.headTurnMax - state.headTurnMin);
    }
    // Smooth interpolate head rotation
    state.headTurnCurrent += (state.headTurnTarget - state.headTurnCurrent) * 0.02;
    const head = robot.userData.head;
    if (head) {
      head.rotation.y = state.headTurnCurrent;
    }

    // --- Eye blink ---
    state.nextBlink -= dt;
    const eyes = robot.userData.eyes;
    if (eyes && eyes.length > 0) {
      if (state.nextBlink <= 0 && !state.isBlinking) {
        state.isBlinking = true;
        state.blinkTimer = 0.15; // Blink duration
        state.nextBlink = state.blinkMin + Math.random() * (state.blinkMax - state.blinkMin);
      }
      if (state.isBlinking) {
        state.blinkTimer -= dt;
        if (state.blinkTimer <= 0) state.isBlinking = false;
      }

      // Eye glow pulse + blink dim — brighter when active
      const baseGlow = state.isActive ? 0.8 : 0.4;
      const glowRange = state.isActive ? 0.2 : 0.3;
      const glowSpeed = state.isActive ? 4 : 2;
      const glowPulse = baseGlow + Math.sin(t * glowSpeed + offset) * glowRange;
      const blinkDim = state.isBlinking ? 0.05 : 1.0;
      for (const eye of eyes) {
        eye.material.emissiveIntensity = glowPulse * blinkDim;
        // Scale Y for blink squint effect
        eye.scale.y = state.isBlinking ? 0.1 : 1.0;
      }
    }
  }

  // --- Update monitor & TV textures ---
  updateMonitors(t, dt);

  // --- Twinkle city windows ---
  updateCityWindows(t);

  // --- Dust motes: gentle upward drift ---
  if (dustMotes) {
    const dustPos = dustMotes.geometry.attributes.position;
    const dustVel = dustMotes.userData.velocities;
    for (let i = 0; i < dustPos.count; i++) {
      let y = dustPos.getY(i) + dustVel[i] * dt;
      let x = dustPos.getX(i) + Math.sin(t * 0.3 + i) * 0.002;
      if (y > 10) { y = 0.5; x = (Math.random() - 0.5) * 24; }
      dustPos.setY(i, y);
      dustPos.setX(i, x);
    }
    dustPos.needsUpdate = true;
  }

  // --- Digital sparks: float up from active agent monitors ---
  if (digitalSparks) {
    const sparkPos = digitalSparks.geometry.attributes.position;
    const sparkLife = digitalSparks.userData.lifetimes;
    const sparkAgent = digitalSparks.userData.agentIndices;
    for (let i = 0; i < sparkPos.count; i++) {
      sparkLife[i] -= dt;
      if (sparkLife[i] <= 0) {
        // Respawn near parent agent desk
        const ai = sparkAgent[i];
        const ag = AGENT_DATA[ai];
        const isActive = animState[ag.id] && animState[ag.id].isActive;
        if (isActive) {
          sparkPos.setXYZ(i, ag.position[0] + (Math.random() - 0.5) * 1.5, ag.position[1] + 2 + Math.random(), ag.position[2] + (Math.random() - 0.5) * 1.5);
        } else {
          sparkPos.setY(i, -100); // Hide inactive
        }
        sparkLife[i] = 1 + Math.random() * 2;
      } else {
        sparkPos.setY(i, sparkPos.getY(i) + dt * 1.5);
        sparkPos.setX(i, sparkPos.getX(i) + Math.sin(t * 2 + i * 0.7) * 0.003);
      }
    }
    sparkPos.needsUpdate = true;
  }

  // --- Cat idle animation: breathing + tail flick ---
  for (const catPart of catMeshes) {
    if (catPart.name === 'Cat_Body' || catPart.name === 'Cat_Head') {
      // Slow breathing bob
      catPart.position.y += Math.sin(t * 0.8) * 0.0008;
    }
    if (catPart.name.startsWith('Cat_Tail_')) {
      // Lazy tail flick
      const tailIdx = catPart.name.endsWith('2') ? 1.5 : 1.0;
      catPart.rotation.y = Math.sin(t * 0.6 + tailIdx) * 0.15 * tailIdx;
      catPart.rotation.z = Math.sin(t * 0.4) * 0.05;
    }
    if (catPart.name.startsWith('Cat_Ear_')) {
      // Occasional ear twitch
      catPart.rotation.z = Math.sin(t * 1.2 + (catPart.name.endsWith('L') ? 0 : Math.PI)) * 0.06;
    }
  }

  // --- Plant sway: gentle breeze ---
  for (let i = 0; i < plantMeshes.length; i++) {
    const plant = plantMeshes[i];
    const phase = i * 2.3;  // Offset each plant
    const swaySpeed = 0.3 + (i % 3) * 0.1;
    const swayAmp = 0.015 + (i % 2) * 0.008;
    plant.rotation.x = Math.sin(t * swaySpeed + phase) * swayAmp;
    plant.rotation.z = Math.cos(t * swaySpeed * 0.7 + phase) * swayAmp * 0.6;
  }

  // --- Light shaft shimmer ---
  scene.children.forEach(child => {
    if (child.userData && child.userData.isLightShaft) {
      const base = child.userData.baseOpacity;
      child.material.opacity = base + Math.sin(t * 0.5 + child.position.x) * base * 0.3;
    }
  });

  // Update bubble positions (called from overlay JS)
  if (window.__updateBubblePositions) {
    window.__updateBubblePositions();
  }

  composer.render();
}

animate();
  `;
}

// --- Overlay JS (SSE, bubbles, clock — non-module) ---

function generateOverlayJS(): string {
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
      if (window.__projectToScreen) {
        const pos = window.__projectToScreen(agent.id);
        if (pos) {
          el.style.left = Math.max(4, Math.min(1660, pos.x - 110)) + 'px';
          el.style.top = Math.max(4, pos.y - 90) + 'px';
          return;
        }
      }
      // Fallback
      el.style.left = '50%';
      el.style.top = '40%';
    }

    // Continuously reposition bubbles as camera drifts
    window.__updateBubblePositions = function() {
      for (const [agentId, el] of activeBubbles) {
        const agent = AGENTS.find(a => a.id === agentId);
        if (agent) positionBubble(el, agent);
      }
    };

    function createBubbleEl(agent, message) {
      const el = document.createElement('div');
      el.className = 'bubble';
      el.style.setProperty('--agent-color', agent.color);
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
          if (event.type === 'connected') {
            // Track upstream status from initial connection event
            if (event.upstream !== undefined) updateUpstreamStatus(event.upstream);
            return;
          }
          if (event.type === 'heartbeat') return;

          const agentName = (event.data && event.data.agentName) || '';
          // Route agent-less events (tick_started, tick_completed) to Percy
          const agent = agentByName[agentName.toLowerCase()] || (agentName === '' ? agentByName['percy'] : null);
          if (!agent) return;

          const message = eventToMessage(event);
          if (!message) return;

          // Track active agents for 3D indicators
          if (event.type === 'agent_started' && window.__setAgentActive) {
            if (agent.id) window.__setAgentActive(agent.id, true);
          }
          if ((event.type === 'agent_completed' || event.type === 'agent_failed') && window.__setAgentActive) {
            if (agent.id) window.__setAgentActive(agent.id, false);
          }

          if (!hasReceivedRealEvent) { hasReceivedRealEvent = true; stopMockCycle(); }
          lastEventTime = Date.now();
          showMessage(agent, message);

          // Push to TV ticker
          if (window.__pushTicker) {
            window.__pushTicker(agent.name.toUpperCase() + ': ' + message);
          }
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
        case 'task_assigned':      return 'Picking up: ' + (d.taskTitle || 'task');
        case 'agent_started':      return 'Working on ' + (d.taskTitle || 'task') + '...';
        case 'agent_completed':    return 'Done: ' + (d.taskTitle || 'task') + (d.duration ? ' (' + (d.duration / 1000).toFixed(1) + 's)' : '');
        case 'agent_failed':       return 'Hit a wall on ' + (d.taskTitle || 'task') + ' \\u2014 retrying';
        case 'tick_started':       return 'Execution cycle #' + (d.tickNumber || '?') + ' starting';
        case 'tick_completed':     return 'Cycle done: ' + (d.succeeded || 0) + ' tasks completed';
        case 'task_submitted':     return 'New task received: ' + (d.taskTitle || 'task');
        case 'task_decomposed':    return 'Decomposed into ' + (d.subtaskCount || '?') + ' subtasks';
        case 'budget_warning':     return 'Budget alert: ' + (d.percentage || '?') + '% used today';
        case 'proposal_created':   return 'Proposal: ' + (d.title || 'untitled') + ' (' + (d.subtaskCount || '?') + ' subtasks)';
        case 'proposal_approved':  return 'Proposal approved \\u2014 starting work';
        case 'proposal_rejected':  return 'Proposal rejected';
        case 'task_budget_blocked': return 'Task blocked: budget limit reached';
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

    // --- Upstream status ---
    const upstreamDot = document.getElementById('upstream-dot');

    function updateUpstreamStatus(connected) {
      upstreamDot.className = 'upstream-dot ' + (connected ? 'up' : 'down');
    }

    async function pollUpstreamStatus() {
      try {
        const res = await fetch('/status');
        const data = await res.json();
        updateUpstreamStatus(data.upstreamConnected);
      } catch {}
    }

    setInterval(pollUpstreamStatus, 30000);

    // --- Boot ---
    // Wait for Three.js module to initialize, then start
    function boot() { startMockCycle(); connectSSE(); pollUpstreamStatus(); }
    setTimeout(boot, 1500);
  `;
}

// --- Music Player JS ---

function generateMusicJS(): string {
  return `
    (function() {
      const audio = document.getElementById('bg-music');
      const toggleBtn = document.getElementById('music-toggle');
      const trackLabel = document.getElementById('music-track');
      let playlist = [];
      let currentIndex = 0;
      let isPlaying = false;

      async function loadPlaylist() {
        try {
          const res = await fetch('/playlist');
          playlist = await res.json();
          if (playlist.length > 0) {
            loadTrack(0);
          }
        } catch {}
      }

      function loadTrack(index) {
        if (!playlist[index]) return;
        currentIndex = index;
        audio.src = playlist[index].url;
        trackLabel.textContent = playlist[index].name;
      }

      audio.addEventListener('ended', function() {
        currentIndex = (currentIndex + 1) % playlist.length;
        loadTrack(currentIndex);
        if (isPlaying) audio.play();
      });

      toggleBtn.addEventListener('click', function() {
        if (isPlaying) {
          audio.pause();
          isPlaying = false;
          toggleBtn.classList.remove('playing');
        } else {
          audio.volume = 0.3;
          audio.play().then(function() {
            isPlaying = true;
            toggleBtn.classList.add('playing');
          }).catch(function() {});
        }
      });

      // Auto-start on first user interaction (browser autoplay policy)
      document.addEventListener('click', function autoStart() {
        if (!isPlaying && playlist.length > 0) {
          audio.volume = 0.3;
          audio.play().then(function() {
            isPlaying = true;
            toggleBtn.classList.add('playing');
          }).catch(function() {});
        }
        document.removeEventListener('click', autoStart);
      }, { once: true });

      loadPlaylist();
    })();
  `;
}
