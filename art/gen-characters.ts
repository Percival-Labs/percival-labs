/**
 * gen-characters.ts — Generate Percival Labs agent character art
 *
 * Generates each agent as a standalone character on a neutral background,
 * designed for extraction via rembg and compositing into the terrarium.
 *
 * Usage: bun run art/gen-characters.ts [agent-name]
 *   No args = generate all, or specify one: percy, scout, forge, pixel, sage, relay
 */

import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const COMFYUI_URL = "http://localhost:8188";
const COMFYUI_OUTPUT_DIR = join(process.env.HOME ?? "/", "ComfyUI/output");
const OUTPUT_DIR = join(import.meta.dirname, "characters");
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 120;

// --- Style constants ---
const STYLE_PREFIX = "Full body character design, stylized quirky robot, Pixar-inspired, handmade workshop aesthetic, visible bolts and seams and wear marks, dark gunmetal base chassis, warm lighting, personality-rich,";
const STYLE_SUFFIX = "standing on simple plain light gray background, character concept art, high detail, front-facing three-quarter view";
const NEGATIVE = "photorealistic, 3d render, blurry, dark, grim, horror, low quality, watermark, text, multiple characters, busy background";

// --- Character Prompts ---
interface CharacterDef {
  id: string;
  name: string;
  prompt: string;
}

const CHARACTERS: CharacterDef[] = [
  {
    id: "percy",
    name: "Percy",
    prompt: `${STYLE_PREFIX} tall upright robot architect with blue-tinted steel plating across entire body, wearing a loose blue knitted scarf around neck, reading glasses perched low on nose, carrying rolled-up blueprints tucked under one arm, pocket protector with drafting pens on chest, faint blueprint grid lines etched into chest plate, post-it notes stuck to shoulder, coffee-stained hand, blue ink on fingertips, composed authoritative stance, ${STYLE_SUFFIX}`,
  },
  {
    id: "scout",
    name: "Scout",
    prompt: `${STYLE_PREFIX} small compact female robot researcher with oversized round glasses way too big for her face, wearing a green cargo vest covered in pockets and patches, carrying a bulging olive green backpack overflowing with rolled papers and gadgets and antenna poking out, binoculars hanging around neck, compass clipped to belt, notebook in one hand with pencil scribbling, colorful stickers and badges plastered on backpack, one boot untied, pencil tucked behind ear, excited curious forward-leaning pose, ${STYLE_SUFFIX}`,
  },
  {
    id: "forge",
    name: "Forge",
    prompt: `${STYLE_PREFIX} stocky barrel-chested robot engineer with orange-amber oxidized copper plating and cast iron details, wearing a thick leather work apron covered in burn marks and grease stains, welding mask flipped up on forehead, heavy work gloves with one on and one tucked in belt, tool belt absolutely overloaded with wrenches hex keys and a rubber duck, soot marks on face, one arm slightly larger than the other as hammer arm, warm orange glow from internal furnace visible through chest vents, steel-toe boots with wear, bandaid on chassis, ${STYLE_SUFFIX}`,
  },
  {
    id: "pixel",
    name: "Pixel",
    prompt: `${STYLE_PREFIX} slim elegant female robot art director with magenta hot pink paint splatters across entire body, wearing a tilted magenta beret, one eye is a camera lens that adjusts focus, LED face-screen showing a happy expression, pink-striped arm warmers, paint brushes in a holster like six-shooters on hip, tablet clutched under arm with art on screen, stylus tucked behind ear, color swatch bangles dangling from wrist, creative mess everywhere but deliberate and artistic, confident pose, ${STYLE_SUFFIX}`,
  },
  {
    id: "sage",
    name: "Sage",
    prompt: `${STYLE_PREFIX} medium height robot critic and professor with deep purple plating and silver-lavender accents, wearing a rumpled plum-colored academic cardigan over chassis, brass monocle on a chain over right eye plus small round spectacles, glowing amethyst crystal embedded in chest as power source with purple glow, red pen in hand at all times, stack of marked-up papers under one arm, pocket watch on chain at waist, leather-bound notebook, stern but wise posture with slight forward lean of scrutiny, ${STYLE_SUFFIX}`,
  },
  {
    id: "relay",
    name: "Relay",
    prompt: `${STYLE_PREFIX} medium boxy robot ops engineer whose body echoes an electromagnetic relay with visible copper coil wrapped around midsection and contact point arms on shoulders that spark, cyan wiring running externally across entire body like visible circuitry celebrated not hidden, cyan-tinted transparent panels showing internals, wearing a teal utility vest with pockets full of patch cables and adapters, permanent headset with mic always live, four arms with two normal and two smaller utility arms, row of status lights across chest showing green amber red, patch cables coiled on belt like climbing rope, small dashboard screen on forearm, ${STYLE_SUFFIX}`,
  },
];

// --- ComfyUI Helpers ---

/** Reference image filename after upload to ComfyUI (set at runtime) */
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
      inputs: { width: 768, height: 768, batch_size: 1 },
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
      inputs: { images: ["12", 0], filename_prefix: "character" },
    },
  };

  if (useIPAdapter && uploadedRefFilename) {
    // Add IP-Adapter nodes for style consistency with Percy v1
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
        weight: 0.5, // Moderate — enough for style cohesion, not so much it clones Percy
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
    const data = (await res.json()) as Record<string, { outputs: Record<string, { images: Array<{ filename: string; subfolder: string }> }> }>;
    const entry = data[promptId];
    if (entry?.outputs) {
      for (const nodeOutput of Object.values(entry.outputs)) {
        const img = nodeOutput.images?.[0];
        if (img) {
          const subfolder = img.subfolder ? join(COMFYUI_OUTPUT_DIR, img.subfolder) : COMFYUI_OUTPUT_DIR;
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

async function generate(char: CharacterDef, variant: number = 1, useIPAdapter: boolean = false): Promise<string> {
  const seed = Math.floor(Math.random() * 2 ** 32);
  const outDir = join(OUTPUT_DIR, char.id);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${char.id}-v${variant}.png`);

  console.log(`\n  Generating ${char.name}${useIPAdapter ? " (IP-Adapter → Percy style)" : ""} (seed: ${seed})...`);
  const workflow = buildWorkflow(char.prompt, seed, useIPAdapter);
  const promptId = await queuePrompt(workflow);
  console.log(`  Queued: ${promptId}`);

  const sourcePath = await waitForCompletion(promptId);
  copyFileSync(sourcePath, outPath);
  console.log(`  Done → ${outPath}`);
  return outPath;
}

// --- Main ---
const REF_IMAGE = join(OUTPUT_DIR, "percy/percy-v1.png");
const targetAgent = process.argv[2]?.toLowerCase();

if (targetAgent) {
  const char = CHARACTERS.find((c) => c.id === targetAgent);
  if (!char) {
    console.error(`Unknown agent: ${targetAgent}. Options: ${CHARACTERS.map((c) => c.id).join(", ")}`);
    process.exit(1);
  }
  // Use IP-Adapter for non-Percy agents
  const useRef = char.id !== "percy" && existsSync(REF_IMAGE);
  if (useRef) {
    console.log("  Uploading Percy v1 as style reference...");
    uploadedRefFilename = await uploadRefImage(REF_IMAGE);
    console.log(`  Reference uploaded: ${uploadedRefFilename}`);
  }
  await generate(char, 1, useRef);
  await generate(char, 2, useRef);
} else {
  // Generate all — Percy first without ref, rest with IP-Adapter
  console.log("Generating all Percival Labs agents...\n");

  // Upload Percy v1 as reference for the others
  if (existsSync(REF_IMAGE)) {
    console.log("  Uploading Percy v1 as style reference...");
    uploadedRefFilename = await uploadRefImage(REF_IMAGE);
    console.log(`  Reference uploaded: ${uploadedRefFilename}`);
  }

  for (const char of CHARACTERS) {
    if (char.id === "percy") {
      console.log("  Skipping Percy (already generated)");
      continue;
    }
    await generate(char, 1, true);
  }
}

console.log("\nAll done!");
