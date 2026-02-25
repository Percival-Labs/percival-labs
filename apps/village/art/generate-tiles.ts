#!/usr/bin/env bun
/**
 * generate-tiles.ts — Queue tile texture generations to ComfyUI.
 *
 * Generates 256x256 flat top-down textures per zone with Ghibli LoRA + IP-Adapter style-lock.
 * 2 seeds per zone = 12 generations total.
 *
 * Usage: bun art/generate-tiles.ts [--no-ipadapter]
 */

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const USE_IPADAPTER = !process.argv.includes('--no-ipadapter');

interface TilePrompt {
  zone: string;
  clipL: string;
  t5xxl: string;
}

const TILE_PROMPTS: TilePrompt[] = [
  {
    zone: 'sanctum',
    clipL: 'ghibli style, top-down sacred teal mossy stone ground with cyan flowers, seamless texture, on bright green background',
    t5xxl: 'ghibli style, top-down view of sacred teal mossy stone ground, ancient temple floor with tiny cyan flowers, warm golden light, seamless texture, flat overhead view, on solid bright green background',
  },
  {
    zone: 'observatory',
    clipL: 'ghibli style, top-down purple stone cobblestones, observatory courtyard, seamless texture, on bright green background',
    t5xxl: 'ghibli style, top-down view of purple-tinted stone cobbles, observatory courtyard, seamless texture, flat overhead view, on solid bright green background',
  },
  {
    zone: 'town-square',
    clipL: 'ghibli style, top-down warm sandstone cobblestone path, village square, seamless texture, on bright green background',
    t5xxl: 'ghibli style, top-down view of warm sandstone cobblestone path, village square paving, seamless texture, flat overhead view, on solid bright green background',
  },
  {
    zone: 'workshop',
    clipL: 'ghibli style, top-down amber packed earth and wooden planks, workshop floor, seamless texture, on bright green background',
    t5xxl: 'ghibli style, top-down view of amber packed earth and wooden planks, workshop floor, seamless texture, flat overhead view, on solid bright green background',
  },
  {
    zone: 'library',
    clipL: 'ghibli style, top-down green mossy stone path with ivy, library garden, seamless texture, on bright green background',
    t5xxl: 'ghibli style, top-down view of green mossy stone path, ivy tendrils, library garden, seamless texture, flat overhead view, on solid bright green background',
  },
  {
    zone: 'empty',
    clipL: 'ghibli style, top-down lush green grass with wildflowers, meadow, seamless texture, on bright green background',
    t5xxl: 'ghibli style, top-down view of lush green grass with tiny wildflowers, meadow, seamless texture, flat overhead view, on solid bright green background',
  },
];

const SEEDS = [42, 123];

function buildWorkflow(prompt: TilePrompt, seed: number): Record<string, unknown> {
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
      inputs: { width: 256, height: 256, batch_size: 1 },
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
        filename_prefix: `tile-${prompt.zone}-seed${seed}`,
      },
    },
  };

  // Model reference — either IP-Adapter modified or raw LoRA
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
  console.log(`🎨 Generating tile textures (IP-Adapter: ${USE_IPADAPTER ? 'ON' : 'OFF'})`);
  console.log(`   ComfyUI: ${COMFYUI_URL}`);
  console.log(`   Zones: ${TILE_PROMPTS.length}, Seeds: ${SEEDS.length}`);
  console.log(`   Total generations: ${TILE_PROMPTS.length * SEEDS.length}\n`);

  for (const prompt of TILE_PROMPTS) {
    for (const seed of SEEDS) {
      const workflow = buildWorkflow(prompt, seed);
      console.log(`⏳ Queuing: tile-${prompt.zone}-seed${seed}...`);
      try {
        const promptId = await queuePrompt(workflow);
        console.log(`   → Queued: ${promptId}`);
        console.log(`   ⏳ Waiting for completion...`);
        await waitForCompletion(promptId);
        console.log(`   ✅ Done: tile-${prompt.zone}-seed${seed}`);
      } catch (err) {
        console.error(`   ❌ Failed: ${(err as Error).message}`);
      }
    }
  }

  console.log('\n✅ All tile generations complete!');
  console.log('Run: python3 art/scripts/process-tiles.py');
}

main().catch(console.error);
