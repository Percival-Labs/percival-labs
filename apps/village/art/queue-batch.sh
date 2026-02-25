#!/bin/bash
# Queue 5 golden reference variations with robot characters
# Seeds: 100, 256, 777, 1337, 2025

CLIP_L="ghibli style, isometric cozy village with cute robots, warm golden light, soft watercolor atmosphere"

T5XXL="ghibli style, A beautiful isometric view of a cozy AI agent village at golden hour. Five distinct zones visible: a small open-air stone shrine with a softly glowing teal flame at its center surrounded by sacred flowers (top-left), a purple stone observatory tower with a copper telescope dome and twinkling stars (top-right), a warm central town square with a stone fountain and cobblestone paths (center), an amber wooden workshop with a smoking chimney, anvil, and glowing windows (bottom-left), and a green ivy-covered library with arched windows showing colorful book spines and a warm lamp post (bottom-right). Scattered between the zones are lush green trees with layered canopies, flowering bushes, and softly glowing lanterns along winding paths. Tiny cute robot characters with rounded bodies, glowing LED eyes, and colorful antenna walk between buildings. Each robot has a unique color and small accessories matching their role. The robots have a friendly Ghibli-inspired design with soft rounded edges and warm metallic tones. The scene has warm Ghibli-inspired lighting with dappled golden sunlight, soft purple shadows, and a sense of peaceful productivity. Watercolor-soft sky gradient from warm peach to soft blue. Cozy, lived-in, hand-crafted feeling. Stardew Valley meets Studio Ghibli aesthetic. Isometric 2:1 diamond grid perspective, top-down 30 degree angle."

for SEED in 100 256 777 1337 2025; do
  # Build JSON with escaped prompt
  WORKFLOW=$(cat <<JSONEOF
{
  "1": {
    "class_type": "UnetLoaderGGUF",
    "inputs": { "unet_name": "flux1-dev-Q6_K.gguf" }
  },
  "2": {
    "class_type": "DualCLIPLoaderGGUF",
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5-v1_1-xxl-encoder-Q6_K.gguf",
      "type": "flux"
    }
  },
  "3": {
    "class_type": "LoraLoader",
    "inputs": {
      "lora_name": "ghibli_style.safetensors",
      "strength_model": 0.75,
      "strength_clip": 0.75,
      "model": ["1", 0],
      "clip": ["2", 0]
    }
  },
  "4": {
    "class_type": "CLIPTextEncodeFlux",
    "inputs": {
      "clip": ["3", 1],
      "clip_l": "${CLIP_L}",
      "t5xxl": "${T5XXL}",
      "guidance": 3.5
    }
  },
  "5": {
    "class_type": "VAELoader",
    "inputs": { "vae_name": "ae.safetensors" }
  },
  "6": {
    "class_type": "EmptyLatentImage",
    "inputs": { "width": 1280, "height": 832, "batch_size": 1 }
  },
  "7": {
    "class_type": "RandomNoise",
    "inputs": { "noise_seed": ${SEED} }
  },
  "8": {
    "class_type": "BasicScheduler",
    "inputs": {
      "model": ["3", 0],
      "scheduler": "normal",
      "steps": 30,
      "denoise": 1.0
    }
  },
  "9": {
    "class_type": "KSamplerSelect",
    "inputs": { "sampler_name": "euler" }
  },
  "10": {
    "class_type": "FluxGuidance",
    "inputs": { "conditioning": ["4", 0], "guidance": 3.5 }
  },
  "11": {
    "class_type": "BasicGuider",
    "inputs": { "model": ["3", 0], "conditioning": ["10", 0] }
  },
  "12": {
    "class_type": "SamplerCustomAdvanced",
    "inputs": {
      "noise": ["7", 0],
      "guider": ["11", 0],
      "sampler": ["9", 0],
      "sigmas": ["8", 0],
      "latent_image": ["6", 0]
    }
  },
  "13": {
    "class_type": "VAEDecode",
    "inputs": { "samples": ["12", 0], "vae": ["5", 0] }
  },
  "14": {
    "class_type": "SaveImage",
    "inputs": {
      "images": ["13", 0],
      "filename_prefix": "village-robots-seed${SEED}"
    }
  }
}
JSONEOF
)

  # Queue the prompt
  RESPONSE=$(curl -s -X POST http://127.0.0.1:8188/prompt \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": ${WORKFLOW}}")

  echo "Seed ${SEED}: ${RESPONSE}"
done

echo ""
echo "All 5 seeds queued! Check /Users/alancarroll/ComfyUI/output/ for results."
echo "Each generation takes ~8 minutes. Total batch: ~40 minutes."
