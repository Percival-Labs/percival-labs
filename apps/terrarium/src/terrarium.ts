/**
 * terrarium.ts — Live agent observation page (Three.js 3D rebuild)
 *
 * Low-poly 3D office scene rendered with Three.js via CDN importmap.
 * 3D geometric robot agents at workstations with per-agent accessories.
 * SSE overlay for live chat bubbles projected from 3D→2D coordinates.
 *
 * Designed for OBS browser source (1920x1080).
 * v0.4: 3D robots, vibrant "cozy hacker lab at night" rebrand.
 */

// --- Types ---

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  rpgClass: string;
  color: string;
  /** 3D position in the scene (x, y, z) */
  position: [number, number, number];
  messages: string[];
}

// --- Agent Layout (3D coordinates) ---

const AGENTS: AgentConfig[] = [
  // --- BACK ROW ---
  {
    id: "percy",
    name: "Percy",
    role: "Lead Architect",
    rpgClass: "Commander",
    color: "#3b82f6",
    position: [0, 0, -5],
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
    position: [6, 0, -4],
    messages: [
      "Scanning HuggingFace for new LoRA models...",
      "Found 3 promising ComfyUI workflows",
      "Indexing documentation updates",
      "Comparing MLX vs ONNX benchmarks",
      "Pulling latest Anthropic changelog",
      "Evaluating IP-Adapter v2 improvements",
    ],
  },
  // --- MIDDLE ROW ---
  {
    id: "pixel",
    name: "Pixel",
    role: "Art Director",
    rpgClass: "Artisan",
    color: "#ec4899",
    position: [-7, 0, -1],
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
    position: [6, 0, 1],
    messages: [
      "Reviewing PR #42 — found 2 issues",
      "Running security audit on dependencies",
      "Checking for prompt injection vectors",
      "Validating API response schemas",
      "Benchmarking latency: p99 = 230ms",
      "Auditing rate limiter configuration",
    ],
  },
  // --- FRONT ROW ---
  {
    id: "forge",
    name: "Forge",
    role: "Engineer",
    rpgClass: "Artificer",
    color: "#f59e0b",
    position: [-4, 0, 4],
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
    position: [3, 0, 4],
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
    <span class="clock" id="clock"></span>
  </div>
  <script type="module">
    ${generateSceneJS()}
  </script>
  <script>
    ${generateOverlayJS()}
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
        ellipse 80% 75% at 50% 45%,
        transparent 55%,
        rgba(0, 0, 0, 0.15) 100%
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
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(10px);
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

// --- Three.js Scene (ES Module) ---

function generateSceneJS(): string {
  return `
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
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
renderer.toneMappingExposure = 1.6;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#E8D8C4');
scene.fog = new THREE.FogExp2(0xE8D8C4, 0.006);

const camera = new THREE.PerspectiveCamera(35, 1920 / 1080, 0.1, 100);
camera.position.set(0, 14, 16);
camera.lookAt(0, 0, -1);

// ============================================================
// MATERIALS (robot-only — office materials come from GLB)
// ============================================================

const mat = {
  robotDark: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.3 }),
};

// ============================================================
// LIGHTING — Golden Hour Cartoon Style
// ============================================================

// Hemisphere: warm golden sky + warm wood floor bounce
const hemi = new THREE.HemisphereLight(0xFFE8C0, 0xC09060, 0.8);
scene.add(hemi);

// Warm ambient — keeps everything readable, golden tint
const ambient = new THREE.AmbientLight(0xFFE8D0, 0.5);
scene.add(ambient);

// Golden sun — strong warm directional from upper-left through window
const sunLight = new THREE.DirectionalLight(0xFFD890, 2.5);
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

// Window sunbeam — dramatic golden shaft through circular window
const windowBeam = new THREE.SpotLight(0xFFE0A0, 3.5, 25, Math.PI / 4, 0.5, 1);
windowBeam.position.set(0, 10, -10);
windowBeam.target.position.set(2, 0, -2);
windowBeam.castShadow = true;
scene.add(windowBeam);
scene.add(windowBeam.target);

// Secondary sun fill — softer, from the right
const fillSun = new THREE.DirectionalLight(0xFFE8B0, 1.0);
fillSun.position.set(8, 10, 4);
scene.add(fillSun);

// Overhead warm fills — simulate warm ceiling bounces
const overhead1 = new THREE.PointLight(0xFFE0B0, 0.7, 25);
overhead1.position.set(-5, 10, -3);
scene.add(overhead1);
const overhead2 = new THREE.PointLight(0xFFE0B0, 0.7, 25);
overhead2.position.set(5, 10, 2);
scene.add(overhead2);
const overhead3 = new THREE.PointLight(0xFFE0B0, 0.5, 20);
overhead3.position.set(0, 10, -7);
scene.add(overhead3);

// Subtle cool rim from back — just a hint for depth
const rimLight = new THREE.PointLight(0x88AACC, 0.3, 25);
rimLight.position.set(0, 5, -9);
scene.add(rimLight);

// ============================================================
// LOAD OFFICE ENVIRONMENT (GLB)
// ============================================================

const AGENT_DATA = ${JSON.stringify(AGENTS.map((a) => ({ id: a.id, name: a.name, color: a.color, position: a.position })))};

// Per-desk PointLights (agent-colored)
const deskLights = [];
for (const agent of AGENT_DATA) {
  const [ax, , az] = agent.position;
  const deskLight = new THREE.PointLight(new THREE.Color(agent.color), 2.0, 5);
  deskLight.position.set(ax + 1.0, 2.3, az + 0.1);
  scene.add(deskLight);
  deskLights.push(deskLight);
}

// --- Toon gradient map (3-step: crisp cartoon shadows) ---
function createGradientMap() {
  const size = 3;
  const data = new Uint8Array(size * 4);
  // Step 0: shadow — warm-tinted, not too dark
  data[0] = 140; data[1] = 130; data[2] = 120; data[3] = 255;
  // Step 1: midtone — the main lit surface
  data[4] = 230; data[5] = 225; data[6] = 218; data[7] = 255;
  // Step 2: highlight
  data[8] = 255; data[9] = 252; data[10] = 245; data[11] = 255;

  const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const gradientMap = createGradientMap();

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

      // Emissive objects (monitors, LEDs, bulbs, lamp shades, window glass) keep PBR
      // for proper glow through bloom pass
      const hasEmissive = oldMat.emissiveIntensity > 0.3;
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

  scene.add(office);
  console.log('[Terrarium] GLB loaded:', meshCount, 'meshes,', toonCount, 'converted to toon');
}, undefined, (error) => {
  console.error('[Terrarium] GLB load failed:', error);
});

// ============================================================
// 3D ROBOT FACTORY
// ============================================================

function createRobot(color, config) {
  const group = new THREE.Group();
  const bodyColor = new THREE.Color(color);
  const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor, gradientMap: gradientMap });
  const darkMat = new THREE.MeshToonMaterial({ color: 0x444444, gradientMap: gradientMap });
  const whiteMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: gradientMap });
  const skinMat = new THREE.MeshToonMaterial({ color: 0x555555, gradientMap: gradientMap });

  // --- Torso (humanoid: wider shoulders, tapered to waist) ---
  const shoulderW = config.stocky ? 0.85 : 0.72;
  const waistW = config.stocky ? 0.7 : 0.55;
  // Upper torso (chest/shoulders)
  const chestGeo = new RoundedBoxGeometry(shoulderW, 0.35, 0.38, 3, 0.06);
  const chest = new THREE.Mesh(chestGeo, bodyMat);
  chest.position.set(0, 1.02, 0);
  chest.castShadow = true;
  group.add(chest);
  // Lower torso (waist) — slightly narrower
  const waistGeo = new RoundedBoxGeometry(waistW, 0.25, 0.34, 3, 0.05);
  const waist = new THREE.Mesh(waistGeo, bodyMat);
  waist.position.set(0, 0.72, 0);
  waist.castShadow = true;
  group.add(waist);

  // --- Neck ---
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.set(0, 1.26, 0);
  group.add(neck);

  // --- Head (rounded-corner block) ---
  const headGeo = new RoundedBoxGeometry(0.55, 0.48, 0.5, 4, 0.1);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 1.58, 0);
  head.castShadow = true;
  group.add(head);
  group.userData.head = head;

  // --- Face plate (darker inset on front of head) ---
  const faceGeo = new RoundedBoxGeometry(0.44, 0.32, 0.06, 3, 0.04);
  const faceMat = new THREE.MeshToonMaterial({ color: 0x1a1a2e, gradientMap: gradientMap });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 1.55, 0.24);
  group.add(face);

  // --- Eyes (big, expressive — white sclera + colored iris + black pupil) ---
  const eyeSpacing = 0.12;
  const eyeY = 1.58;
  const eyeZ = 0.28;

  // Sclera (white rounded boxes)
  const scleraGeo = new RoundedBoxGeometry(0.14, 0.16, 0.06, 2, 0.03);
  const leftSclera = new THREE.Mesh(scleraGeo, whiteMat);
  leftSclera.position.set(-eyeSpacing, eyeY, eyeZ);
  group.add(leftSclera);
  const rightSclera = new THREE.Mesh(scleraGeo, whiteMat);
  rightSclera.position.set(eyeSpacing, eyeY, eyeZ);
  group.add(rightSclera);

  // Iris (agent color, glowing)
  const irisGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const irisMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    emissive: bodyColor,
    emissiveIntensity: 0.6,
  });
  const leftIris = new THREE.Mesh(irisGeo, irisMat);
  leftIris.position.set(-eyeSpacing, eyeY, eyeZ + 0.03);
  group.add(leftIris);
  const rightIris = new THREE.Mesh(irisGeo, irisMat.clone());
  rightIris.position.set(eyeSpacing, eyeY, eyeZ + 0.03);
  group.add(rightIris);
  group.userData.eyes = [leftIris, rightIris];

  // Pupils (black dots)
  const pupilGeo = new THREE.SphereGeometry(0.025, 6, 4);
  const pupilMat = new THREE.MeshToonMaterial({ color: 0x000000, gradientMap: gradientMap });
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(-eyeSpacing, eyeY, eyeZ + 0.06);
  group.add(leftPupil);
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(eyeSpacing, eyeY, eyeZ + 0.06);
  group.add(rightPupil);

  // --- Eyebrows (small tilted rounded boxes) ---
  const browGeo = new RoundedBoxGeometry(0.12, 0.03, 0.02, 2, 0.008);
  const browMat = new THREE.MeshToonMaterial({ color: 0x333333, gradientMap: gradientMap });
  const leftBrow = new THREE.Mesh(browGeo, browMat);
  leftBrow.position.set(-eyeSpacing, eyeY + 0.12, eyeZ + 0.01);
  leftBrow.rotation.z = 0.12;
  group.add(leftBrow);
  const rightBrow = new THREE.Mesh(browGeo, browMat);
  rightBrow.position.set(eyeSpacing, eyeY + 0.12, eyeZ + 0.01);
  rightBrow.rotation.z = -0.12;
  group.add(rightBrow);

  // --- Mouth (small line — friendly) ---
  const mouthGeo = new THREE.TorusGeometry(0.05, 0.012, 6, 8, Math.PI);
  const mouthMat = new THREE.MeshToonMaterial({ color: 0x222222, gradientMap: gradientMap });
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.position.set(0, 1.44, eyeZ + 0.01);
  mouth.rotation.x = Math.PI;
  group.add(mouth);

  // --- Antenna ---
  const antennaGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6);
  const antenna = new THREE.Mesh(antennaGeo, darkMat);
  antenna.position.set(0, 1.92, 0);
  group.add(antenna);
  const antennaTipGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const antennaTipMat = new THREE.MeshStandardMaterial({
    color: bodyColor, emissive: bodyColor, emissiveIntensity: 1.5,
  });
  const antennaTip = new THREE.Mesh(antennaTipGeo, antennaTipMat);
  antennaTip.position.set(0, 2.04, 0);
  group.add(antennaTip);

  // --- Arms (humanoid: shoulder joint + upper arm + elbow sphere + forearm + hand) ---
  const armThick = config.bulkyArms ? 0.065 : 0.05;
  const shoulderX = shoulderW / 2 + 0.04;

  // Shoulder joints
  const jointGeo = new THREE.SphereGeometry(armThick + 0.02, 8, 6);
  const lShoulderJoint = new THREE.Mesh(jointGeo, skinMat);
  lShoulderJoint.position.set(-shoulderX, 1.1, 0);
  group.add(lShoulderJoint);
  const rShoulderJoint = new THREE.Mesh(jointGeo, skinMat);
  rShoulderJoint.position.set(shoulderX, 1.1, 0);
  group.add(rShoulderJoint);

  // Upper arms
  const upperArmGeo = new THREE.CylinderGeometry(armThick, armThick, 0.28, 8);
  const leftUpperArm = new THREE.Mesh(upperArmGeo, skinMat);
  leftUpperArm.position.set(-shoulderX, 0.92, 0);
  leftUpperArm.rotation.z = 0.08;
  leftUpperArm.castShadow = true;
  group.add(leftUpperArm);
  const rightUpperArm = new THREE.Mesh(upperArmGeo, skinMat);
  rightUpperArm.position.set(shoulderX, 0.92, 0);
  rightUpperArm.rotation.z = -0.08;
  rightUpperArm.castShadow = true;
  group.add(rightUpperArm);
  group.userData.arms = [leftUpperArm, rightUpperArm];

  // Elbow joints
  const elbowGeo = new THREE.SphereGeometry(armThick + 0.01, 6, 4);
  const lElbow = new THREE.Mesh(elbowGeo, skinMat);
  lElbow.position.set(-(shoulderX + 0.02), 0.76, 0);
  group.add(lElbow);
  const rElbow = new THREE.Mesh(elbowGeo, skinMat);
  rElbow.position.set(shoulderX + 0.02, 0.76, 0);
  group.add(rElbow);

  // Forearms
  const forearmGeo = new THREE.CylinderGeometry(armThick * 0.9, armThick * 0.85, 0.22, 8);
  const lForearm = new THREE.Mesh(forearmGeo, skinMat);
  lForearm.position.set(-(shoulderX + 0.03), 0.62, 0.02);
  group.add(lForearm);
  const rForearm = new THREE.Mesh(forearmGeo, skinMat);
  rForearm.position.set(shoulderX + 0.03, 0.62, 0.02);
  group.add(rForearm);

  // Hands (agent colored spheres)
  const handGeo = new THREE.SphereGeometry(armThick + 0.005, 8, 6);
  const lHand = new THREE.Mesh(handGeo, bodyMat);
  lHand.position.set(-(shoulderX + 0.03), 0.48, 0.02);
  group.add(lHand);
  const rHand = new THREE.Mesh(handGeo, bodyMat);
  rHand.position.set(shoulderX + 0.03, 0.48, 0.02);
  group.add(rHand);

  // --- Hips ---
  const hipGeo = new RoundedBoxGeometry(waistW * 0.9, 0.1, 0.3, 2, 0.03);
  const hips = new THREE.Mesh(hipGeo, skinMat);
  hips.position.set(0, 0.56, 0);
  group.add(hips);

  // --- Legs (humanoid: thigh + knee + calf) ---
  const legSpacing = 0.14;
  const legThick = 0.06;

  // Thighs
  const thighGeo = new THREE.CylinderGeometry(legThick, legThick * 0.95, 0.22, 8);
  const lThigh = new THREE.Mesh(thighGeo, skinMat);
  lThigh.position.set(-legSpacing, 0.42, 0);
  lThigh.castShadow = true;
  group.add(lThigh);
  const rThigh = new THREE.Mesh(thighGeo, skinMat);
  rThigh.position.set(legSpacing, 0.42, 0);
  rThigh.castShadow = true;
  group.add(rThigh);

  // Knees
  const kneeGeo = new THREE.SphereGeometry(legThick, 6, 4);
  const lKnee = new THREE.Mesh(kneeGeo, skinMat);
  lKnee.position.set(-legSpacing, 0.30, 0);
  group.add(lKnee);
  const rKnee = new THREE.Mesh(kneeGeo, skinMat);
  rKnee.position.set(legSpacing, 0.30, 0);
  group.add(rKnee);

  // Calves
  const calfGeo = new THREE.CylinderGeometry(legThick * 0.9, legThick * 0.85, 0.18, 8);
  const lCalf = new THREE.Mesh(calfGeo, skinMat);
  lCalf.position.set(-legSpacing, 0.2, 0);
  group.add(lCalf);
  const rCalf = new THREE.Mesh(calfGeo, skinMat);
  rCalf.position.set(legSpacing, 0.2, 0);
  group.add(rCalf);

  // --- Feet (rounded boxes — like shoes) ---
  const footGeo = new RoundedBoxGeometry(0.12, 0.06, 0.18, 2, 0.02);
  const lFoot = new THREE.Mesh(footGeo, darkMat);
  lFoot.position.set(-legSpacing, 0.08, 0.03);
  group.add(lFoot);
  const rFoot = new THREE.Mesh(footGeo, darkMat);
  rFoot.position.set(legSpacing, 0.08, 0.03);
  group.add(rFoot);

  // ============================================================
  // PER-AGENT ACCESSORIES
  // ============================================================

  if (config.scarf) {
    // Percy — scarf around neck
    const scarfGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 12);
    const scarfMat = new THREE.MeshToonMaterial({ color: bodyColor, gradientMap: gradientMap });
    const scarf = new THREE.Mesh(scarfGeo, scarfMat);
    scarf.position.set(0, 1.26, 0);
    scarf.rotation.x = Math.PI / 2;
    group.add(scarf);
    // Scarf tail
    const tailGeo = new RoundedBoxGeometry(0.08, 0.2, 0.03, 2, 0.01);
    const tail = new THREE.Mesh(tailGeo, scarfMat);
    tail.position.set(0.1, 1.15, 0.12);
    tail.rotation.z = -0.3;
    group.add(tail);
  }

  if (config.cap) {
    // Scout — cap on block head
    const capGeo = new RoundedBoxGeometry(0.56, 0.1, 0.5, 3, 0.04);
    const capMat = new THREE.MeshToonMaterial({ color: bodyColor, gradientMap: gradientMap });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 1.86, 0);
    group.add(cap);
    // Brim
    const brimGeo = new RoundedBoxGeometry(0.3, 0.03, 0.16, 2, 0.01);
    const brim = new THREE.Mesh(brimGeo, capMat);
    brim.position.set(0, 1.82, 0.28);
    brim.rotation.x = -0.1;
    group.add(brim);
  }

  if (config.backpack) {
    // Scout — backpack
    const bpGeo = new RoundedBoxGeometry(0.35, 0.4, 0.18, 3, 0.04);
    const bpMat = new THREE.MeshToonMaterial({ color: bodyColor.clone().multiplyScalar(0.7), gradientMap: gradientMap });
    const bp = new THREE.Mesh(bpGeo, bpMat);
    bp.position.set(0, 0.9, -0.28);
    group.add(bp);
  }

  if (config.beret) {
    // Pixel — tilted beret on block head
    const beretGeo = new THREE.CylinderGeometry(0.28, 0.26, 0.08, 10);
    const beretMat = new THREE.MeshToonMaterial({ color: bodyColor, gradientMap: gradientMap });
    const beret = new THREE.Mesh(beretGeo, beretMat);
    beret.position.set(0.05, 1.86, 0);
    beret.rotation.z = 0.2;
    group.add(beret);
  }

  if (config.tablet) {
    // Pixel — tablet held in left hand
    const tabletGeo = new RoundedBoxGeometry(0.16, 0.24, 0.02, 2, 0.005);
    const tabletMat = new THREE.MeshStandardMaterial({
      color: 0x222222, emissive: bodyColor, emissiveIntensity: 1.0,
    });
    const tablet = new THREE.Mesh(tabletGeo, tabletMat);
    tablet.position.set(-(shoulderX + 0.12), 0.55, 0.1);
    tablet.rotation.z = 0.3;
    group.add(tablet);
  }

  if (config.coatTails) {
    // Sage — coat tails below waist
    const ctGeo = new RoundedBoxGeometry(waistW * 1.05, 0.2, 0.32, 2, 0.03);
    const ctMat = new THREE.MeshToonMaterial({ color: bodyColor.clone().multiplyScalar(0.6), gradientMap: gradientMap });
    const ct = new THREE.Mesh(ctGeo, ctMat);
    ct.position.set(0, 0.5, -0.02);
    group.add(ct);
  }

  if (config.monocle) {
    // Sage — monocle on right eye
    const monocleGeo = new THREE.TorusGeometry(0.065, 0.01, 8, 12);
    const monocleMat = new THREE.MeshStandardMaterial({
      color: 0xddddaa, emissive: 0xddddaa, emissiveIntensity: 0.5,
    });
    const monocle = new THREE.Mesh(monocleGeo, monocleMat);
    monocle.position.set(eyeSpacing + 0.01, eyeY, eyeZ + 0.02);
    group.add(monocle);
  }

  if (config.apron) {
    // Forge — work apron
    const apronGeo = new RoundedBoxGeometry(shoulderW * 0.7, 0.45, 0.04, 2, 0.01);
    const apronMat = new THREE.MeshToonMaterial({ color: new THREE.Color(0x8B6914), gradientMap: gradientMap });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.position.set(0, 0.82, 0.2);
    group.add(apron);
  }

  if (config.hardHat) {
    // Forge — hard hat (rounded box that sits on block head)
    const hatGeo = new RoundedBoxGeometry(0.58, 0.14, 0.52, 3, 0.06);
    const hatMat = new THREE.MeshToonMaterial({ color: bodyColor, gradientMap: gradientMap });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.set(0, 1.86, 0);
    group.add(hat);
    // Brim
    const brimGeo = new RoundedBoxGeometry(0.62, 0.03, 0.56, 3, 0.01);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.set(0, 1.80, 0);
    group.add(brim);
  }

  if (config.chestPanel) {
    // Relay — chest panel with LEDs
    const panelGeo = new RoundedBoxGeometry(0.3, 0.22, 0.04, 2, 0.02);
    const panelMat = new THREE.MeshToonMaterial({ color: new THREE.Color(0x222233), gradientMap: gradientMap });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 0.98, 0.2);
    group.add(panel);

    const ledGeo = new THREE.SphereGeometry(0.025, 6, 4);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2.0,
    });
    for (let i = 0; i < 3; i++) {
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(-0.08 + i * 0.08, 0.98, 0.23);
      group.add(led);
    }
  }

  return group;
}

// Per-agent accessory configs
const ROBOT_CONFIGS = {
  percy:  { scarf: true },
  scout:  { cap: true, backpack: true },
  pixel:  { beret: true, tablet: true },
  sage:   { coatTails: true, monocle: true },
  forge:  { apron: true, hardHat: true, stocky: true },
  relay:  { chestPanel: true, bulkyArms: true },
};

// ============================================================
// 3D ROBOT AGENTS
// ============================================================

const robots = {};

for (const agent of AGENT_DATA) {
  const config = ROBOT_CONFIGS[agent.id] || {};
  const robot = createRobot(agent.color, config);
  const [ax, , az] = agent.position;
  // Position robot at desk, between chair and desk
  robot.position.set(ax, 0, az + 0.8);
  robot.castShadow = true;
  scene.add(robot);
  robots[agent.id] = robot;
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
// POST-PROCESSING (Bloom for emissive surfaces)
// ============================================================

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(1920, 1080), 0.15, 0.3, 0.9
));
// OutputPass applies tone mapping + sRGB encoding to the final output.
// Without this, the EffectComposer outputs in linear space (everything too dark).
composer.addPass(new OutputPass());

// ============================================================
// RENDER LOOP
// ============================================================

const clock = new THREE.Clock();
const cameraBaseX = camera.position.x;
const cameraBaseZ = camera.position.z;

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Camera drift — very slow orbit
  camera.position.x = cameraBaseX + Math.sin(t * 0.08) * 0.5;
  camera.position.z = cameraBaseZ + Math.cos(t * 0.08) * 0.3;
  camera.lookAt(0, 0, -1);

  // Animate robots
  for (let i = 0; i < AGENT_DATA.length; i++) {
    const agent = AGENT_DATA[i];
    const robot = robots[agent.id];
    if (!robot) continue;

    const offset = i * 1.1;

    // Idle bob — whole group on Y
    robot.position.y = Math.sin(t + offset) * 0.04;

    // Arm sway
    const arms = robot.userData.arms;
    if (arms) {
      arms[0].rotation.z = 0.1 + Math.sin(t * 0.8 + offset) * 0.12;
      arms[1].rotation.z = -0.1 - Math.sin(t * 0.8 + offset) * 0.12;
    }

    // Eye iris glow pulse
    const eyes = robot.userData.eyes;
    if (eyes) {
      const intensity = 0.4 + Math.sin(t * 2 + offset) * 0.3;
      for (const eye of eyes) {
        eye.material.emissiveIntensity = intensity;
      }
    }
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
    // Wait for Three.js module to initialize, then start
    function boot() { startMockCycle(); connectSSE(); }
    setTimeout(boot, 1500);
  `;
}
