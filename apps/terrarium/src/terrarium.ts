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

// --- Agent Layout (perimeter desks facing center, Round Table in middle) ---

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
  // --- CLAWDBOT: Chaos agent, near Round Table ---
  {
    id: "clawdbot",
    name: "Clawdbot",
    role: "Chaos Agent",
    rpgClass: "Trickster",
    color: "#dc2626",
    position: [3.5, 0, 2],
    facing: -2.3,
    deskOffset: 0,
    messages: [
      "Randomly reassigning all task priorities...",
      "What if we just... deleted the database?",
      "Injecting chaos into the test suite",
      "Running production deploy on Friday at 5pm",
      "Renaming variables to single letters for efficiency",
      "Filing a PR to replace TypeScript with Brainfuck",
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
      background: #0a0a0f;
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
        ellipse 75% 70% at 50% 45%,
        transparent 45%,
        rgba(0, 0, 0, 0.55) 100%
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
      background: rgba(8, 10, 18, 0.92);
      backdrop-filter: blur(12px);
      border-radius: 4px 12px 12px 4px;
      border-left: 3px solid var(--agent-color, #3b82f6);
      padding: 8px 12px;
      color: #e8ecf4;
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 12px;
      line-height: 1.4;
      opacity: 0;
      transform: translateY(8px) scale(0.97);
      transition: opacity 0.4s ease, transform 0.4s ease;
      border-top: 1px solid rgba(100, 140, 255, 0.08);
      border-right: 1px solid rgba(100, 140, 255, 0.08);
      border-bottom: 1px solid rgba(100, 140, 255, 0.08);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.6), 0 0 15px color-mix(in srgb, var(--agent-color, #3b82f6) 20%, transparent);
    }

    .bubble::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(255, 255, 255, 0.015) 2px,
        rgba(255, 255, 255, 0.015) 4px
      );
      pointer-events: none;
      border-radius: inherit;
    }

    .bubble.visible { opacity: 1; transform: translateY(0) scale(1); }
    .bubble.exiting { opacity: 0; transform: translateY(-6px) scale(0.97); }

    .bubble-header {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 4px;
    }

    .bubble-avatar {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      flex-shrink: 0;
      box-shadow: 0 0 6px var(--agent-color, #3b82f6);
    }
    .bubble-name {
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .bubble-role { font-size: 9px; opacity: 0.4; margin-left: auto; text-transform: uppercase; letter-spacing: 0.5px; }
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
      background: rgba(8, 10, 18, 0.92);
      border: 1px solid rgba(100, 140, 255, 0.08);
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
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0D0E14');
scene.fog = new THREE.FogExp2(0x0D0E14, 0.012);

const camera = new THREE.PerspectiveCamera(35, 1920 / 1080, 0.1, 100);
camera.position.set(3, 10, 17);
camera.lookAt(0, 1, -2);

// ============================================================
// MATERIALS
// ============================================================

// ============================================================
// LIGHTING — Cozy Cyberpunk (dark evening + neon accents)
// ============================================================

// Hemisphere: cool ceiling + warm floor
const hemi = new THREE.HemisphereLight(0x1A1A3A, 0x4A2810, 0.6);
scene.add(hemi);

// Low warm ambient — enough to read shapes in the dark
const ambient = new THREE.AmbientLight(0x1A1408, 0.45);
scene.add(ambient);

// Cool moonlight through window
const sunLight = new THREE.DirectionalLight(0x6B7CB0, 0.8);
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

// Purple-blue shaft through window
const windowBeam = new THREE.SpotLight(0x4A3A8A, 2.0, 25, Math.PI / 4, 0.5, 1);
windowBeam.position.set(0, 10, -10);
windowBeam.target.position.set(2, 0, -2);
windowBeam.castShadow = true;
scene.add(windowBeam);
scene.add(windowBeam.target);

// Subtle cool rim fill from the right
const fillSun = new THREE.DirectionalLight(0x3A4A6A, 0.4);
fillSun.position.set(8, 10, 4);
scene.add(fillSun);

// Dim tungsten overhead fills
const overhead1 = new THREE.PointLight(0x2A2018, 0.3, 25);
overhead1.position.set(-5, 10, -3);
scene.add(overhead1);
const overhead2 = new THREE.PointLight(0x2A2018, 0.3, 25);
overhead2.position.set(5, 10, 2);
scene.add(overhead2);
const overhead3 = new THREE.PointLight(0x2A2018, 0.2, 20);
overhead3.position.set(0, 10, -7);
scene.add(overhead3);

// Stronger cool rim for silhouette separation
const rimLight = new THREE.PointLight(0x4488CC, 0.6, 25);
rimLight.position.set(0, 5, -9);
scene.add(rimLight);

// --- Accent lights (cyber glow) ---
const accentCyan = new THREE.PointLight(0x00E5FF, 1.5, 30);
accentCyan.position.set(-8, 10, -1);
scene.add(accentCyan);

const accentMagenta = new THREE.PointLight(0xFF00AA, 1.0, 25);
accentMagenta.position.set(10, 8, -4);
scene.add(accentMagenta);

const accentFloor = new THREE.PointLight(0xFF8C00, 0.4, 20);
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
  const sl = new THREE.PointLight(0xFFD080, 0.5, 5);
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
  const lamp = new THREE.PointLight(0xFFD4A0, 1.2, 4);
  lamp.position.set(lx, ly, lz);
  scene.add(lamp);
}

// Sage's standing floor lamp (right side of room) — warm reading light
const floorLamp = new THREE.SpotLight(0xFFD8A0, 2.5, 10, Math.PI / 4, 0.8, 1);
floorLamp.position.set(9, 4.3, -1.5);
floorLamp.target.position.set(9, 0, -1.5);
scene.add(floorLamp);
scene.add(floorLamp.target);
// Warm glow around the lamp shade
const floorLampGlow = new THREE.PointLight(0xFFCC80, 1.2, 7);
floorLampGlow.position.set(9, 4.0, -1.5);
scene.add(floorLampGlow);

// Overhead pendant warm spots (practical ceiling fixtures)
const pendant1 = new THREE.SpotLight(0xFFD890, 1.5, 12, Math.PI / 5, 0.6, 1);
pendant1.position.set(-4, 9.5, -4);
pendant1.target.position.set(-4, 0, -4);
scene.add(pendant1);
scene.add(pendant1.target);

const pendant2 = new THREE.SpotLight(0xFFD890, 1.2, 12, Math.PI / 5, 0.6, 1);
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
  const deskLight = new THREE.PointLight(new THREE.Color(agent.color), 4.0, 8);
  // Light above desk, slightly toward the robot
  deskLight.position.set(ax + Math.sin(f) * 0.3, 2.3, az + Math.cos(f) * 0.3);
  scene.add(deskLight);
  deskLights.push(deskLight);
}

// --- Toon gradient map (5-step: nuanced cartoon shadows with smoother transitions) ---
function createGradientMap() {
  const size = 5;
  const data = new Uint8Array(size * 4);
  // Step 0: deep shadow — cool dark
  data[0] = 20; data[1] = 22; data[2] = 35; data[3] = 255;
  // Step 1: shadow — cool gray
  data[4] = 55; data[5] = 58; data[6] = 75; data[7] = 255;
  // Step 2: midtone — neutral cool
  data[8] = 120; data[9] = 118; data[10] = 130; data[11] = 255;
  // Step 3: light — desaturated
  data[12] = 195; data[13] = 190; data[14] = 185; data[15] = 255;
  // Step 4: highlight — warm white
  data[16] = 240; data[17] = 235; data[18] = 228; data[19] = 255;

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
      const hidePatterns = ['Blueprint', 'Kanban_', 'Pegboard', 'Whiteboard', 'Percy_WB_', 'Scout_CB_', 'Corkboard', 'StickyNote', 'Poster_', 'Poster2_', 'WindowFrame', 'WindowGlass', 'WindowBar', 'Sage_Bookcase_', 'Sage_Book_'];
      if (hidePatterns.some(p => child.name.includes(p))) {
        child.visible = false;
        return;
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

  // Log Round Table mesh (don't replace material — that makes it transparent)
  office.traverse((child2) => {
    if (!child2.isMesh) return;
    const name = child2.name.toLowerCase();
    if (name.includes('roundtable') || name.includes('round_table')) {
      console.log('[Terrarium] Found Round Table mesh:', child2.name);
    }
  });

  scene.add(office);
  console.log('[Terrarium] GLB loaded:', meshCount, 'meshes,', toonCount, 'converted to toon');

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

}, undefined, (error) => {
  console.error('[Terrarium] GLB load failed:', error);
});

// ============================================================
// LOAD AGENT ROBOT MODELS (GLB)
// ============================================================

const robots = {};
const agentLoader = new GLTFLoader();
let robotsLoaded = 0;

for (const agent of AGENT_DATA) {
  const [ax, , az] = agent.position;

  agentLoader.load('/public/models/agents/' + agent.id + '.glb', (gltf) => {
    const model = gltf.scene;

    // Convert materials to toon style, preserve emissive for bloom
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const oldMat = child.material;
        if (!oldMat) return;

        // Mark head mesh for bubble positioning (set in Blender via custom property)
        if (child.name.toLowerCase().includes('head') && !child.name.toLowerCase().includes('gog')) {
          model.userData.head = child;
        }

        // Keep emissive materials (eyes, antenna, LEDs) as PBR for bloom
        const hasEmissive = oldMat.emissiveIntensity > 0.3;
        if (hasEmissive) {
          // Store eye meshes for animation
          if (child.name.toLowerCase().includes('iris')) {
            if (!model.userData.eyes) model.userData.eyes = [];
            model.userData.eyes.push(child);
          }
          return;
        }

        // Convert to toon
        const toonMat = new THREE.MeshToonMaterial({
          color: oldMat.color ? oldMat.color.clone() : new THREE.Color(0xcccccc),
          gradientMap: gradientMap,
        });
        if (oldMat.emissive) {
          toonMat.emissive = oldMat.emissive.clone();
          toonMat.emissiveIntensity = oldMat.emissiveIntensity;
        }
        child.material = toonMat;
      }
    });

    // If no head found by name, use the highest mesh as fallback
    if (!model.userData.head) {
      let highestY = -Infinity;
      model.traverse((child) => {
        if (child.isMesh) {
          const worldPos = new THREE.Vector3();
          child.getWorldPosition(worldPos);
          if (worldPos.y > highestY) {
            highestY = worldPos.y;
            model.userData.head = child;
          }
        }
      });
    }

    // Position robot at desk (offset from desk by facing direction)
    // Robot faces TOWARD desk (opposite of facing direction)
    const f = agent.facing || 0;
    const dOff = agent.deskOffset ?? 0.8;
    model.position.set(ax + Math.sin(f) * dOff, 0, az + Math.cos(f) * dOff);
    model.rotation.y = f + Math.PI;
    scene.add(model);
    robots[agent.id] = model;
    robotsLoaded++;
    console.log('[Terrarium] Agent GLB loaded:', agent.name, '(' + robotsLoaded + '/' + AGENT_DATA.length + ')');
  }, undefined, (error) => {
    console.warn('[Terrarium] Agent GLB failed for', agent.id, '— falling back to placeholder');
    // Fallback: simple colored sphere as placeholder
    const fallback = new THREE.Group();
    const bodyColor = new THREE.Color(agent.color);
    const bodyGeo = new THREE.CapsuleGeometry(0.3, 1.0, 8, 16);
    const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor, gradientMap: gradientMap });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    fallback.add(body);

    // Head sphere for bubble positioning
    const headGeo = new THREE.SphereGeometry(0.28, 12, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 1.8;
    head.castShadow = true;
    fallback.add(head);
    fallback.userData.head = head;

    // Emissive eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 6);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: bodyColor, emissive: bodyColor, emissiveIntensity: 0.6,
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 1.83, 0.22);
    fallback.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rightEye.position.set(0.1, 1.83, 0.22);
    fallback.add(rightEye);
    fallback.userData.eyes = [leftEye, rightEye];

    const ff = agent.facing || 0;
    const dfOff = agent.deskOffset ?? 0.8;
    fallback.position.set(ax + Math.sin(ff) * dfOff, 0, az + Math.cos(ff) * dfOff);
    fallback.rotation.y = ff + Math.PI;
    scene.add(fallback);
    robots[agent.id] = fallback;
  });
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

// Bloom — neon glow on emissive surfaces (eyes, monitors, desk lights)
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(1920, 1080), 0.45, 0.5, 0.65
));

// Edge detection outline pass — gives illustrated line-art look
const outlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1920, 1080) },
    edgeStrength: { value: 1.0 },
    edgeColor: { value: new THREE.Vector3(0.08, 0.06, 0.12) },
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
    '  gl_FragColor = vec4(mix(center.rgb, edgeColor, edge * 0.6), center.a);',
    '}',
  ].join('\\n'),
};
composer.addPass(new ShaderPass(outlineShader));

// Chromatic aberration — subtle corner-weighted RGB split for cinematic texture
const chromAbShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0008 },
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

// OutputPass applies tone mapping + sRGB encoding to the final output.
composer.addPass(new OutputPass());

// ============================================================
// BRANDING — Wall Banner & Round Table Logo
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

  // Deep night sky with atmospheric gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0,    '#020208');
  skyGrad.addColorStop(0.08, '#050510');
  skyGrad.addColorStop(0.25, '#0A0A1E');
  skyGrad.addColorStop(0.5,  '#10102A');
  skyGrad.addColorStop(0.75, '#161638');
  skyGrad.addColorStop(1,    '#1A1540');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle color bands in sky (atmospheric layers)
  ctx.fillStyle = 'rgba(20,15,50,0.08)';
  for (let band = 0; band < 5; band++) {
    const by = h * (0.05 + band * 0.08);
    ctx.fillRect(0, by, w, h * 0.03);
  }

  // Horizon glow — warm light pollution from city
  const horizGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
  horizGrad.addColorStop(0,   'rgba(50,30,70,0)');
  horizGrad.addColorStop(0.3, 'rgba(70,40,60,0.1)');
  horizGrad.addColorStop(0.6, 'rgba(90,50,50,0.2)');
  horizGrad.addColorStop(1,   'rgba(100,60,45,0.3)');
  ctx.fillStyle = horizGrad;
  ctx.fillRect(0, h * 0.45, w, h * 0.55);

  // Side-to-side glow variation (brighter toward center of panorama)
  const centerGlow = ctx.createRadialGradient(w * 0.5, h * 0.85, 0, w * 0.5, h * 0.85, w * 0.45);
  centerGlow.addColorStop(0, 'rgba(120,70,50,0.12)');
  centerGlow.addColorStop(1, 'rgba(120,70,50,0)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  // Stars (upper sky only)
  for (let i = 0; i < 200; i++) {
    const sx = srand() * w;
    const sy = srand() * h * 0.4;
    const brightness = 0.12 + srand() * 0.5;
    const size = srand() < 0.05 ? 1.8 : (srand() < 0.15 ? 1.1 : 0.6);
    ctx.fillStyle = 'rgba(190,200,235,' + brightness + ')';
    ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2); ctx.fill();
    // Twinkle cross on bright stars
    if (size > 1.5) {
      ctx.strokeStyle = 'rgba(200,210,245,' + (brightness * 0.3) + ')';
      ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy - 3); ctx.lineTo(sx, sy + 3); ctx.stroke();
    }
  }

  // Moon with layered glow
  const moonX = w * 0.78, moonY = h * 0.1;
  for (let r = 60; r > 0; r -= 10) {
    const a = 0.02 + (60 - r) * 0.003;
    const mg = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, r);
    mg.addColorStop(0, 'rgba(180,190,220,' + a + ')');
    mg.addColorStop(1, 'rgba(180,190,220,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(moonX, moonY, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(200,210,235,0.25)';
  ctx.beginPath(); ctx.arc(moonX, moonY, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(225,230,245,0.4)';
  ctx.beginPath(); ctx.arc(moonX, moonY, 10, 0, Math.PI * 2); ctx.fill();

  // === BUILDINGS (3 depth layers) ===

  // --- Far layer: small, dense, horizon-hugging ---
  for (let i = 0; i < 40; i++) {
    const bx = (i / 40) * w - 10 + srand() * 8;
    const bw = 18 + srand() * 28;
    const topY = h * (0.38 + srand() * 0.14);
    ctx.fillStyle = '#08081A';
    ctx.fillRect(bx, topY, bw, h - topY);
    // Roof line
    ctx.fillStyle = 'rgba(30,35,65,0.35)';
    ctx.fillRect(bx, topY, bw, 1.5);
    // Windows
    for (let wy = topY + 4; wy < h - 3; wy += 5 + srand() * 2) {
      for (let wx = bx + 2; wx < bx + bw - 2; wx += 4 + srand() * 2) {
        cityWindows.push({ x: wx, y: wy, w: 1.5, h: 2, lit: srand() > 0.82, phase: srand() * 100, layer: 'far' });
      }
    }
  }

  // --- Mid layer: varied heights, architectural silhouettes ---
  const midCount = 18;
  for (let i = 0; i < midCount; i++) {
    const bx = (i / midCount) * w + srand() * 40 - 20;
    const bw = 40 + srand() * 50;
    const topPct = 0.18 + srand() * 0.22;
    const topY = h * topPct;
    // Building body gradient (side-lit by moon)
    const bGrad = ctx.createLinearGradient(bx, topY, bx + bw, topY);
    bGrad.addColorStop(0, '#0C0C22');
    bGrad.addColorStop(0.2, '#141438');
    bGrad.addColorStop(0.8, '#101030');
    bGrad.addColorStop(1, '#0A0A1C');
    ctx.fillStyle = bGrad;
    ctx.fillRect(bx, topY, bw, h - topY);
    // Roof highlight
    ctx.fillStyle = 'rgba(55,65,110,0.45)';
    ctx.fillRect(bx, topY, bw, 2.5);
    // Left edge moonlight
    ctx.fillStyle = 'rgba(65,75,130,0.15)';
    ctx.fillRect(bx, topY, 2.5, h - topY);
    // Random rooftop features (antenna, water tank, etc.)
    if (srand() > 0.5) {
      ctx.fillStyle = '#0E0E28';
      const featureW = 4 + srand() * 6;
      const featureH = 6 + srand() * 12;
      ctx.fillRect(bx + bw * 0.3 + srand() * bw * 0.4, topY - featureH, featureW, featureH);
    }
    // Occasional red aviation light on tall buildings
    if (topPct < 0.25 && srand() > 0.5) {
      ctx.fillStyle = 'rgba(255,40,40,0.7)';
      ctx.beginPath(); ctx.arc(bx + bw * 0.5, topY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      const glow = ctx.createRadialGradient(bx + bw * 0.5, topY - 2, 0, bx + bw * 0.5, topY - 2, 8);
      glow.addColorStop(0, 'rgba(255,40,40,0.15)');
      glow.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(bx + bw * 0.5, topY - 2, 8, 0, Math.PI * 2); ctx.fill();
    }
    // Windows
    for (let wy = topY + 7; wy < h - 5; wy += 9 + srand() * 3) {
      for (let wx = bx + 4; wx < bx + bw - 4; wx += 7 + srand() * 3) {
        cityWindows.push({ x: wx, y: wy, w: 3, h: 4.5, lit: srand() > 0.78, phase: srand() * 100, layer: 'mid' });
      }
    }
  }

  // --- Close layer: large foreground silhouettes with detail ---
  const closeBuildings = [
    [0, 0.22, 120], [160, 0.28, 100], [340, 0.18, 90], [500, 0.25, 110],
    [680, 0.20, 95], [850, 0.30, 130], [1050, 0.15, 100], [1220, 0.26, 115],
    [1420, 0.22, 90], [1580, 0.19, 120], [1750, 0.27, 100], [-50, 0.32, 80],
  ];
  for (const [bx, topPct, bw] of closeBuildings) {
    const topY = h * topPct;
    const bGrad = ctx.createLinearGradient(bx, topY, bx + bw, topY);
    bGrad.addColorStop(0, '#121230');
    bGrad.addColorStop(0.3, '#1A1A48');
    bGrad.addColorStop(0.7, '#161640');
    bGrad.addColorStop(1, '#0E0E28');
    ctx.fillStyle = bGrad;
    ctx.fillRect(bx, topY, bw, h - topY);
    // Roof
    ctx.fillStyle = 'rgba(75,85,150,0.35)';
    ctx.fillRect(bx, topY, bw, 3);
    // Left edge
    ctx.fillStyle = 'rgba(70,80,140,0.12)';
    ctx.fillRect(bx, topY, 3, h - topY);
    // Floor separator lines
    for (let fy = topY + 20; fy < h; fy += 18 + srand() * 8) {
      ctx.fillStyle = 'rgba(30,35,70,0.2)';
      ctx.fillRect(bx + 3, fy, bw - 6, 1);
    }
    // Windows (larger, more detailed)
    for (let wy = topY + 10; wy < h - 8; wy += 13 + srand() * 4) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 11 + srand() * 4) {
        cityWindows.push({ x: wx, y: wy, w: 5, h: 7, lit: srand() > 0.75, phase: srand() * 100, layer: 'close' });
      }
    }
  }

  // Street level glow at bottom
  const streetGrad = ctx.createLinearGradient(0, h - 30, 0, h);
  streetGrad.addColorStop(0, 'rgba(100,70,40,0)');
  streetGrad.addColorStop(1, 'rgba(100,70,40,0.15)');
  ctx.fillStyle = streetGrad;
  ctx.fillRect(0, h - 30, w, 30);

  drawCityWindows(0);
}

function drawCityWindows(t) {
  const ctx = cityCtx;
  for (const win of cityWindows) {
    if (win.lit) {
      const flicker = 0.3 + Math.sin(t * 1.2 + win.phase) * 0.1;
      const palettes = [
        '255,200,100', '120,180,255', '255,240,190', '180,150,255',
        '255,170,80', '100,200,180', '240,220,170', '200,160,220',
      ];
      const c = palettes[Math.floor(win.phase) % palettes.length];
      ctx.fillStyle = 'rgba(' + c + ',' + flicker + ')';
      ctx.shadowColor = 'rgba(' + c + ',0.25)';
      ctx.shadowBlur = win.layer === 'far' ? 1 : win.layer === 'mid' ? 2.5 : 4;
    } else {
      ctx.fillStyle = 'rgba(5,5,16,0.85)';
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
  clawdbot: ['> rm -rf / --no-preserve-root', '> TODO: replace TS with Brainfuck', '> priority: YOLO', '> deploying to prod on friday 5pm', '> renaming all vars to x1,x2,x3', '> chaos level: MAXIMUM'],
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
  clawdbot: { breathSpeed: 1.0,  leanSpeed: 0.35, leanAmpIdle: 0.03,  leanAmpActive: 0.06,  headTurnMin: 1,  headTurnMax: 3,  headTurnRange: 0.4,  blinkMin: 1.5, blinkMax: 3,  activeMult: 5.0 },
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
    // Clawdbot special: random z-rotation twitch
    twitchZ: 0,
    nextTwitch: agent.id === 'clawdbot' ? 1 + Math.random() * 3 : 9999,
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

  // Camera drift — smooth figure-8 pattern with subtle height variation
  camera.position.x = cameraBaseX + Math.sin(t * 0.06) * 0.5 + Math.sin(t * 0.15) * 0.12;
  camera.position.z = cameraBaseZ + Math.cos(t * 0.08) * 0.35;
  camera.position.y = cameraBaseY + Math.sin(t * 0.04) * 0.15;
  camera.lookAt(0, 1, -2);

  // Animate robots
  for (let i = 0; i < AGENT_DATA.length; i++) {
    const agent = AGENT_DATA[i];
    const robot = robots[agent.id];
    if (!robot) continue;

    const state = animState[agent.id];
    const offset = i * 1.1;

    // --- Breathing: subtle Y bob + very slight scale pulse ---
    const breathVal = Math.sin(t * state.breathSpeed + state.breathPhase);
    robot.position.y = breathVal * 0.025;

    // --- Work lean: personality-driven amplitude ---
    const leanMult = state.isActive ? state.activeMult : 1.0;
    const leanAmp = state.isActive ? state.leanAmpActive : state.leanAmpIdle;
    const leanVal = Math.sin(t * state.leanSpeed * leanMult + state.leanPhase);
    robot.rotation.x = leanVal * leanAmp;

    // --- Clawdbot z-rotation twitch ---
    if (agent.id === 'clawdbot') {
      state.nextTwitch -= dt;
      if (state.nextTwitch <= 0) {
        state.twitchZ = (Math.random() - 0.5) * 0.08;
        state.nextTwitch = 1 + Math.random() * 3;
      }
      state.twitchZ *= 0.95; // decay
      robot.rotation.z = state.twitchZ;
    }

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
