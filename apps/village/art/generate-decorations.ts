#!/usr/bin/env bun
/**
 * generate-decorations.ts — Queue decoration asset generations to ComfyUI.
 *
 * Generates 256x256 decoration sprites on green backgrounds.
 * 6 assets: 3 trees, 2 bushes, 1 lantern.
 *
 * Usage: bun art/generate-decorations.ts [--no-ipadapter]
 */

const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const USE_IPADAPTER = !process.argv.includes('--no-ipadapter');

interface DecoPrompt {
  id: string;
  clipL: string;
  t5xxl: string;
}

const ISO_SUFFIX =
  ', on solid bright green background, isolated object, no ground shadows, 30 degree isometric angle, Studio Ghibli aesthetic';

const DECO_PROMPTS: DecoPrompt[] = [
  {
    id: 'tree-1',
    clipL: 'ghibli style, lush deciduous tree with layered canopy' + ISO_SUFFIX,
    t5xxl:
      'ghibli style, a single lush deciduous tree with layered green canopy, warm golden sunlight filtering through leaves, thick brown trunk' +
      ISO_SUFFIX,
  },
  {
    id: 'tree-2',
    clipL: 'ghibli style, round bushy tree with pink flowers' + ISO_SUFFIX,
    t5xxl:
      'ghibli style, a single round bushy tree with pink cherry blossom flowers, soft petals, warm spring light' +
      ISO_SUFFIX,
  },
  {
    id: 'tree-3',
    clipL: 'ghibli style, tall conifer pine tree' + ISO_SUFFIX,
    t5xxl:
      'ghibli style, a single tall conifer pine tree, dark green needles, triangular shape, forest sentinel' +
      ISO_SUFFIX,
  },
  {
    id: 'bush-1',
    clipL: 'ghibli style, flowering bush with purple flowers' + ISO_SUFFIX,
    t5xxl:
      'ghibli style, a small flowering bush with purple flowers, lush green leaves, garden hedge' +
      ISO_SUFFIX,
  },
  {
    id: 'bush-2',
    clipL: 'ghibli style, round green hedge bush' + ISO_SUFFIX,
    t5xxl:
      'ghibli style, a small round green hedge bush, neatly trimmed, garden topiary' +
      ISO_SUFFIX,
  },
  {
    id: 'lantern',
    clipL: 'ghibli style, ornate iron lamp post with warm glow' + ISO_SUFFIX,
    t5xxl:
      'ghibli style, an ornate iron lamp post with warm golden glow, glass lantern head, decorative metalwork' +
      ISO_SUFFIX,
  },
];

const SEEDS = [42, 123];

function buildWorkflow(
  prompt: DecoPrompt,
  seed: number,
): Record<string, unknown> {
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
        filename_prefix: `deco-${prompt.id}-seed${seed}`,
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

async function queuePrompt(
  workflow: Record<string, unknown>,
): Promise<string> {
  const resp = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!resp.ok) {
    throw new Error(
      `ComfyUI queue failed: ${resp.status} ${await resp.text()}`,
    );
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
  const totalGens = DECO_PROMPTS.length * SEEDS.length;
  console.log(
    `🌳 Generating decoration assets (IP-Adapter: ${USE_IPADAPTER ? 'ON' : 'OFF'})`,
  );
  console.log(`   ComfyUI: ${COMFYUI_URL}`);
  console.log(
    `   Decorations: ${DECO_PROMPTS.length}, Total generations: ${totalGens}\n`,
  );

  for (const prompt of DECO_PROMPTS) {
    for (const seed of SEEDS) {
      const workflow = buildWorkflow(prompt, seed);
      console.log(`⏳ Queuing: deco-${prompt.id}-seed${seed}...`);
      try {
        const promptId = await queuePrompt(workflow);
        console.log(`   → Queued: ${promptId}`);
        console.log(`   ⏳ Waiting for completion...`);
        await waitForCompletion(promptId);
        console.log(`   ✅ Done: deco-${prompt.id}-seed${seed}`);
      } catch (err) {
        console.error(`   ❌ Failed: ${(err as Error).message}`);
      }
    }
  }

  console.log('\n✅ All decoration generations complete!');
  console.log('Run: python3 art/scripts/process-buildings.py');
}

main().catch(console.error);
