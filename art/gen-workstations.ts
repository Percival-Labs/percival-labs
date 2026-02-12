/**
 * gen-workstations.ts — Generate agent workstation desk cutouts
 *
 * Each desk is rendered as an isolated object on a plain background,
 * matching the character sprite pipeline. After generation, run rembg
 * to extract transparent cutouts for compositing into the terrarium.
 *
 * Usage: bun run art/gen-workstations.ts [agent-name]
 *   No args = generate all, or specify one: percy, scout, forge, pixel, sage, relay
 *
 * Post-processing:
 *   rembg i art/workstations/raw/percy.png art/workstations/percy.png
 *   — or run: bun run art/gen-workstations.ts --rembg  (batch all)
 */

import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const COMFYUI_URL = "http://localhost:8188";
const COMFYUI_OUTPUT_DIR = join(process.env.HOME ?? "/", "ComfyUI/output");
const ART_DIR = import.meta.dirname;
const RAW_DIR = join(ART_DIR, "workstations", "raw");
const CUTOUT_DIR = join(ART_DIR, "workstations");
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 120;

// --- Style constants (matches gen-characters.ts approach) ---
const STYLE_PREFIX =
  "Product shot of an isolated miniature desk workstation prop, stylized Pixar-inspired illustration, detailed handmade workshop aesthetic, warm lighting,";
const STYLE_SUFFIX =
  "sitting on simple plain light gray background, prop concept art, high detail, three-quarter front view, no walls no room no floor visible";
const NEGATIVE =
  "photorealistic, 3d render, blurry, dark room, interior scene, walls, windows, floor, ceiling, people, characters, robots, watermark, text";

// --- Workstation Prompts ---
interface WorkstationDef {
  id: string;
  name: string;
  prompt: string;
}

const WORKSTATIONS: WorkstationDef[] = [
  {
    id: "percy",
    name: "Percy — Architect Desk",
    prompt: `${STYLE_PREFIX} architect drafting desk with angled drafting surface covered in blueprints and system architecture drawings, blue desk lamp glowing warmly, coffee mug labeled ARCHITECT, stack of ADR documents with sticky note reading ship it, post-it notes on monitor bezel reading C > D, pocket protector with pens, vintage brass compass as paperweight, rolled blueprints in a tube stand beside desk, small robot figurine perched on monitor top, dual monitors showing diagrams, wooden desk with blue accents, ${STYLE_SUFFIX}`,
  },
  {
    id: "scout",
    name: "Scout — Research Desk",
    prompt: `${STYLE_PREFIX} research desk cluttered with tall stacks of books threatening to topple, dual monitors showing browser tabs and academic papers, small globe on desk corner, open notebook with handwritten notes and quick sketches, binoculars set down on desk, magnifying glass on stack of papers, multiple coffee cups in various states of emptiness scattered around, green reading lamp, pencils scattered everywhere, ArXiv printouts with yellow highlights, compass as paperweight, explorer merit badges pinned to small corkboard on desk, wooden desk with green accents, ${STYLE_SUFFIX}`,
  },
  {
    id: "forge",
    name: "Forge — Engineer Bench",
    prompt: `${STYLE_PREFIX} engineer workbench with soldering station and dual monitors showing green terminal text reading 45 passing, rubber duck sitting on monitor top for debugging, small tool pegboard rack behind desk with wrenches and hex keys, sticker on laptop reading it works on my machine, welding mask on desk corner, beat-up metal mug with black coffee, tiny plant growing from old circuit board in a pot, red toolbox on desk edge, breadboards and electrical components in organized chaos, warm orange glow from soldering iron, work gloves, heavy wooden workbench with orange-copper accents, ${STYLE_SUFFIX}`,
  },
  {
    id: "pixel",
    name: "Pixel — Art Director Desk",
    prompt: `${STYLE_PREFIX} creative art desk with dual monitors one showing digital painting in progress and one showing color palette tool, Wacom drawing tablet with stylus, magenta beret hanging on monitor corner, cup overflowing with paint brushes and markers, Pantone color guide books stacked, small note taped to screen reading 2 pixels off, deliberate artistic paint splatters on desk surface in multiple colors, small canvas with abstract art leaning against monitor, fairy lights draped along desk back edge, paint-splattered apron draped over chair, sleek desk with magenta pink accents, ${STYLE_SUFFIX}`,
  },
  {
    id: "sage",
    name: "Sage — Critic Desk",
    prompt: `${STYLE_PREFIX} academic reviewer desk with small bookshelf behind it packed with leather-bound books, desk surface covered in paper documents marked up with red pen annotations, prominent red pen on desk, LGTM rubber stamp with visible dust, elegant cup of tea on saucer, brass monocle on small stand, pocket watch lying open, monitor showing code diff with red comments, small glowing amethyst crystal as paperweight, leather-bound journal open with dense handwriting, neat stack of approved documents much smaller than rejected pile, reading spectacles folded on desk, dark wood desk with purple-lavender accents, ${STYLE_SUFFIX}`,
  },
  {
    id: "relay",
    name: "Relay — Ops Station",
    prompt: `${STYLE_PREFIX} operations monitoring desk with four monitors in a grid showing dashboards with graphs and uptime counters one reading 99.97 percent, small server rack beside desk with blinking green and amber LED lights, neatly coiled patch cables on hooks, headset hanging on monitor arm, one amber status light with tiny sticky note reading looking into it, redundant setup with two keyboards, small cactus in tiny pot, cable ties in a neat row, UPS indicator glowing green, whiteboard marker nearby, immaculately organized tech station with cyan-teal accents, ${STYLE_SUFFIX}`,
  },
];

// --- ComfyUI Helpers ---

let uploadedRefFilename: string | null = null;

function buildWorkflow(prompt: string, seed: number, useIPAdapter: boolean = false) {
  const workflow: Record<string, { class_type: string; inputs: Record<string, unknown> }> = {
    "1": {
      class_type: "UnetLoaderGGUF",
      inputs: { unet_name: "flux1-schnell-Q6_K.gguf" },
    },
    "2": {
      class_type: "DualCLIPLoaderGGUF",
      inputs: {
        clip_name1: "t5-v1_1-xxl-encoder-Q6_K.gguf",
        clip_name2: "clip_l.safetensors",
        type: "flux",
      },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt, clip: ["2", 0] },
    },
    "4": {
      class_type: "EmptyLatentImage",
      // Landscape — desks are wider than tall
      inputs: { width: 1024, height: 576, batch_size: 1 },
    },
    "5": {
      class_type: "VAELoader",
      inputs: { vae_name: "ae.safetensors" },
    },
    "6": {
      class_type: "FluxGuidance",
      inputs: { conditioning: ["3", 0], guidance: 3.5 },
    },
    "7": {
      class_type: "RandomNoise",
      inputs: { noise_seed: seed },
    },
    "8": {
      class_type: "KSamplerSelect",
      inputs: { sampler_name: "euler" },
    },
    "9": {
      class_type: "BasicScheduler",
      inputs: { model: ["1", 0], scheduler: "simple", steps: 4, denoise: 1.0 },
    },
    "10": {
      class_type: "BasicGuider",
      inputs: { model: ["1", 0], conditioning: ["6", 0] },
    },
    "11": {
      class_type: "SamplerCustomAdvanced",
      inputs: {
        noise: ["7", 0],
        guider: ["10", 0],
        sampler: ["8", 0],
        sigmas: ["9", 0],
        latent_image: ["4", 0],
      },
    },
    "12": {
      class_type: "VAEDecode",
      inputs: { samples: ["11", 0], vae: ["5", 0] },
    },
    "13": {
      class_type: "SaveImage",
      inputs: { images: ["12", 0], filename_prefix: "workstation" },
    },
  };

  if (useIPAdapter && uploadedRefFilename) {
    workflow["30"] = {
      class_type: "LoadImage",
      inputs: { image: uploadedRefFilename },
    };
    workflow["31"] = {
      class_type: "IPAdapterFluxLoader",
      inputs: {
        ipadapter: "ip-adapter.bin",
        clip_vision: "google/siglip-so400m-patch14-384",
        provider: "mps",
      },
    };
    workflow["32"] = {
      class_type: "ApplyIPAdapterFlux",
      inputs: {
        model: ["1", 0],
        ipadapter_flux: ["31", 0],
        image: ["30", 0],
        weight: 0.4, // Moderate — style cohesion without overriding desk details
        start_percent: 0.0,
        end_percent: 1.0,
      },
    };
    // Route model through IP-Adapter
    workflow["9"].inputs.model = ["32", 0];
    workflow["10"].inputs.model = ["32", 0];
  }

  return workflow;
}

async function queuePrompt(workflow: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!res.ok) throw new Error(`Queue failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { prompt_id: string };
  return data.prompt_id;
}

async function waitForCompletion(promptId: string): Promise<string> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
    if (!res.ok) continue;
    const data = (await res.json()) as Record<
      string,
      { outputs: Record<string, { images: Array<{ filename: string; subfolder: string }> }> }
    >;
    const entry = data[promptId];
    if (entry?.outputs) {
      for (const nodeOutput of Object.values(entry.outputs)) {
        const img = nodeOutput.images?.[0];
        if (img) {
          const subfolder = img.subfolder
            ? join(COMFYUI_OUTPUT_DIR, img.subfolder)
            : COMFYUI_OUTPUT_DIR;
          return join(subfolder, img.filename);
        }
      }
    }
  }
  throw new Error("Generation timed out");
}

async function uploadRefImage(imagePath: string): Promise<string> {
  const file = Bun.file(imagePath);
  const formData = new FormData();
  formData.append("image", file, "percy-ref.png");
  const res = await fetch(`${COMFYUI_URL}/upload/image`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { name: string };
  return data.name;
}

async function generate(
  ws: WorkstationDef,
  variant: number = 1,
  useIPAdapter: boolean = false,
): Promise<string> {
  const seed = Math.floor(Math.random() * 2 ** 32);
  const outPath = join(RAW_DIR, `${ws.id}-v${variant}.png`);

  console.log(
    `\n  Generating ${ws.name}${useIPAdapter ? " (IP-Adapter)" : ""} (seed: ${seed})...`,
  );
  const workflow = buildWorkflow(ws.prompt, seed, useIPAdapter);
  const promptId = await queuePrompt(workflow);
  console.log(`  Queued: ${promptId}`);

  const sourcePath = await waitForCompletion(promptId);
  copyFileSync(sourcePath, outPath);
  console.log(`  Done → ${outPath}`);
  return outPath;
}

/** Run rembg on all raw images to produce transparent cutouts */
async function runRembg(): Promise<void> {
  const files = WORKSTATIONS.map((ws) => ws.id);
  for (const id of files) {
    // Find the best variant (v1 by default)
    const rawPath = join(RAW_DIR, `${id}-v1.png`);
    const outPath = join(CUTOUT_DIR, `${id}.png`);

    if (!existsSync(rawPath)) {
      console.warn(`  Skipping ${id} — no raw image at ${rawPath}`);
      continue;
    }

    console.log(`  rembg: ${id}...`);
    const proc = Bun.spawn(["rembg", "i", rawPath, outPath], {
      stdout: "inherit",
      stderr: "inherit",
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      console.error(`  rembg failed for ${id} (exit ${exitCode})`);
    } else {
      console.log(`  Done → ${outPath}`);
    }
  }
}

// --- Main ---

const REF_IMAGE = join(ART_DIR, "characters/percy/percy-v1.png");
const args = process.argv.slice(2);

// Handle --rembg flag (just do background removal on existing raw images)
if (args.includes("--rembg")) {
  console.log("Running rembg on all raw workstation images...\n");
  mkdirSync(CUTOUT_DIR, { recursive: true });
  await runRembg();
  console.log("\nBackground removal complete!");
  process.exit(0);
}

// Handle --copy flag (copy cutouts to terrarium public dir)
if (args.includes("--copy")) {
  const publicDir = join(ART_DIR, "..", "apps", "terrarium", "public", "workstations");
  mkdirSync(publicDir, { recursive: true });
  for (const ws of WORKSTATIONS) {
    const src = join(CUTOUT_DIR, `${ws.id}.png`);
    const dst = join(publicDir, `${ws.id}.png`);
    if (existsSync(src)) {
      copyFileSync(src, dst);
      console.log(`  Copied ${ws.id}.png → public/workstations/`);
    } else {
      console.warn(`  Missing cutout: ${src}`);
    }
  }
  console.log("Done!");
  process.exit(0);
}

// Generate workstations
mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(CUTOUT_DIR, { recursive: true });

const targetAgent = args[0]?.toLowerCase();

if (targetAgent) {
  const ws = WORKSTATIONS.find((w) => w.id === targetAgent);
  if (!ws) {
    console.error(
      `Unknown agent: ${targetAgent}. Options: ${WORKSTATIONS.map((w) => w.id).join(", ")}`,
    );
    process.exit(1);
  }

  const useRef = existsSync(REF_IMAGE);
  if (useRef) {
    console.log("  Uploading Percy v1 as style reference...");
    uploadedRefFilename = await uploadRefImage(REF_IMAGE);
    console.log(`  Reference uploaded: ${uploadedRefFilename}`);
  }
  await generate(ws, 1, useRef);
  await generate(ws, 2, useRef);
} else {
  console.log("Generating all Percival Labs workstation desk cutouts...\n");

  if (existsSync(REF_IMAGE)) {
    console.log("  Uploading Percy v1 as style reference...");
    uploadedRefFilename = await uploadRefImage(REF_IMAGE);
    console.log(`  Reference uploaded: ${uploadedRefFilename}`);
  }

  for (const ws of WORKSTATIONS) {
    await generate(ws, 1, !!uploadedRefFilename);
  }
}

console.log("\n\nGeneration complete!");
console.log("Next steps:");
console.log("  1. Review raw images in art/workstations/raw/");
console.log("  2. Run: bun run art/gen-workstations.ts --rembg");
console.log("  3. Run: bun run art/gen-workstations.ts --copy");
