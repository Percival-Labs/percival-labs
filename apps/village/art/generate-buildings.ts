#!/usr/bin/env bun
/**
 * generate-buildings.ts — Queue building asset generations to ComfyUI.
 *
 * Generates 512x512 isometric buildings on green backgrounds.
 * 2-3 seeds per building = 10-15 generations.
 *
 * Usage: bun art/generate-buildings.ts [--no-ipadapter]
 */

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const USE_IPADAPTER = !process.argv.includes('--no-ipadapter');

interface BuildingPrompt {
  id: string;
  clipL: string;
  t5xxl: string;
  seeds: number[];
}

const ISO_SUFFIX = ', on solid bright green background, isolated building, no ground shadows, 30 degree isometric angle, Studio Ghibli aesthetic';

const BUILDING_PROMPTS: BuildingPrompt[] = [
  {
    id: 'sanctum',
    clipL: 'ghibli style, open-air stone shrine with teal roof and glowing flame' + ISO_SUFFIX,
    t5xxl: 'ghibli style, open-air stone shrine with four pillars, peaked teal roof, glowing teal flame in center, sacred flowers at base, warm golden light' + ISO_SUFFIX,
    seeds: [42, 123, 256],
  },
  {
    id: 'observatory',
    clipL: 'ghibli style, tall purple stone tower with copper dome and telescope' + ISO_SUFFIX,
    t5xxl: 'ghibli style, tall purple stone tower with copper dome and telescope on top, glowing yellow windows, elegant astronomical observatory' + ISO_SUFFIX,
    seeds: [42, 123],
  },
  {
    id: 'workshop',
    clipL: 'ghibli style, cozy amber wooden workshop with smoking chimney' + ISO_SUFFIX,
    t5xxl: 'ghibli style, cozy amber wooden workshop with smoking chimney, red tile roof, anvil outside, glowing orange windows, warm and inviting' + ISO_SUFFIX,
    seeds: [42, 123, 256],
  },
  {
    id: 'library',
    clipL: 'ghibli style, green ivy-covered stone library with arched windows' + ISO_SUFFIX,
    t5xxl: 'ghibli style, green ivy-covered stone library with arched windows showing colorful books, warm lamp post, moss and vines growing on walls' + ISO_SUFFIX,
    seeds: [42, 123],
  },
  {
    id: 'fountain',
    clipL: 'ghibli style, ornate stone fountain with flowing water' + ISO_SUFFIX,
    t5xxl: 'ghibli style, ornate stone fountain with flowing water, two tiers, cobblestone base, decorative carved stone' + ISO_SUFFIX,
    seeds: [42, 123],
  },
];

function buildWorkflow(prompt: BuildingPrompt, seed: number): Record<string, unknown> {
  const base: Record<string, unknown> = {
    '1': {
      class_type: 'UnetLoaderGGUF',
      inputs: { unet_name: 'flux1-dev-Q6_K.gguf' },
    },
    '2': {
      class_type: 'DualCLIPLoaderGGUF',
      inputs: {
        clip_name1: 'clip_l.safetensors',
        clip_name2: 't5-v1_1-xxl-encoder-Q6_K.gguf',
        type: 'flux',
      },
    },
    '3': {
      class_type: 'LoraLoader',
      inputs: {
        lora_name: 'ghibli_style.safetensors',
        strength_model: 0.75,
        strength_clip: 0.75,
        model: ['1', 0],
        clip: ['2', 0],
      },
    },
    '4': {
      class_type: 'CLIPTextEncodeFlux',
      inputs: {
        clip: ['3', 1],
        clip_l: prompt.clipL,
        t5xxl: prompt.t5xxl,
        guidance: 3.5,
      },
    },
    '5': {
      class_type: 'VAELoader',
      inputs: { vae_name: 'ae.safetensors' },
    },
    '6': {
      class_type: 'EmptyLatentImage',
      inputs: { width: 512, height: 512, batch_size: 1 },
    },
    '7': {
      class_type: 'RandomNoise',
      inputs: { noise_seed: seed },
    },
    '9': {
      class_type: 'KSamplerSelect',
      inputs: { sampler_name: 'euler' },
    },
    '10': {
      class_type: 'FluxGuidance',
      inputs: { conditioning: ['4', 0], guidance: 3.5 },
    },
    '13': {
      class_type: 'VAEDecode',
      inputs: { samples: ['12', 0], vae: ['5', 0] },
    },
    '14': {
      class_type: 'SaveImage',
      inputs: {
        images: ['13', 0],
        filename_prefix: `building-${prompt.id}-seed${seed}`,
      },
    },
  };

  let modelRef: [string, number] = ['3', 0];

  if (USE_IPADAPTER) {
    base['15'] = {
      class_type: 'IPAdapterFluxLoader',
      inputs: {
        ipadapter: 'ip-adapter.bin',
        clip_vision: 'google/siglip-so400m-patch14-384',
        provider: 'mps',
      },
    };
    base['16'] = {
      class_type: 'LoadImage',
      inputs: { image: 'golden-reference.png' },
    };
    base['17'] = {
      class_type: 'ApplyIPAdapterFlux',
      inputs: {
        model: ['3', 0],
        ipadapter_flux: ['15', 0],
        image: ['16', 0],
        weight: 0.7,
        start_percent: 0.0,
        end_percent: 1.0,
      },
    };
    modelRef = ['17', 0];
  }

  base['8'] = {
    class_type: 'BasicScheduler',
    inputs: {
      model: modelRef,
      scheduler: 'normal',
      steps: 30,
      denoise: 1.0,
    },
  };
  base['11'] = {
    class_type: 'BasicGuider',
    inputs: { model: modelRef, conditioning: ['10', 0] },
  };
  base['12'] = {
    class_type: 'SamplerCustomAdvanced',
    inputs: {
      noise: ['7', 0],
      guider: ['11', 0],
      sampler: ['9', 0],
      sigmas: ['8', 0],
      latent_image: ['6', 0],
    },
  };

  return base;
}

async function queuePrompt(workflow: Record<string, unknown>): Promise<string> {
  const resp = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!resp.ok) {
    throw new Error(`ComfyUI queue failed: ${resp.status} ${await resp.text()}`);
  }
  const data = (await resp.json()) as { prompt_id: string };
  return data.prompt_id;
}

async function waitForCompletion(promptId: string): Promise<void> {
  while (true) {
    const resp = await fetch(`${COMFYUI_URL}/history/${promptId}`);
    const data = (await resp.json()) as Record<string, unknown>;
    if (data[promptId]) return;
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function main() {
  const totalGens = BUILDING_PROMPTS.reduce((sum, b) => sum + b.seeds.length, 0);
  console.log(`🏗️  Generating building assets (IP-Adapter: ${USE_IPADAPTER ? 'ON' : 'OFF'})`);
  console.log(`   ComfyUI: ${COMFYUI_URL}`);
  console.log(`   Buildings: ${BUILDING_PROMPTS.length}, Total generations: ${totalGens}\n`);

  for (const prompt of BUILDING_PROMPTS) {
    for (const seed of prompt.seeds) {
      const workflow = buildWorkflow(prompt, seed);
      console.log(`⏳ Queuing: building-${prompt.id}-seed${seed}...`);
      try {
        const promptId = await queuePrompt(workflow);
        console.log(`   → Queued: ${promptId}`);
        console.log(`   ⏳ Waiting for completion...`);
        await waitForCompletion(promptId);
        console.log(`   ✅ Done: building-${prompt.id}-seed${seed}`);
      } catch (err) {
        console.error(`   ❌ Failed: ${(err as Error).message}`);
      }
    }
  }

  console.log('\n✅ All building generations complete!');
  console.log('Run: python3 art/scripts/process-buildings.py');
}

main().catch(console.error);
