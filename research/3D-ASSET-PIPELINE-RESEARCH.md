# 3D Asset Pipeline Research: Terrarium Character & Environment Upgrade

*Research Date: February 13, 2026*
*Scope: AI-assisted 3D asset creation for the Percival Labs Terrarium*

---

## Table of Contents

1. [AI 3D Generation Tools (State of the Art)](#1-ai-3d-generation-tools)
2. [Traditional Stylized Asset Workflows](#2-traditional-stylized-asset-workflows)
3. [Hybrid AI + Manual Workflows](#3-hybrid-ai--manual-workflows)
4. [Three.js Integration](#4-threejs-integration)
5. [Specific Recommendations for Our Use Case](#5-recommendations-for-terrarium)
6. [Recommended Pipeline](#6-recommended-pipeline)

---

## 1. AI 3D Generation Tools

The AI text-to-3D and image-to-3D space has matured significantly. Here is every major tool assessed for our stylized robot character use case.

### Tier 1: Best for Our Use Case

#### Meshy AI
- **URL**: https://www.meshy.ai
- **What it does**: Text-to-3D, Image-to-3D, AI Texturing, Auto-Rigging, Animation library (500+ game-ready motions)
- **Quality**: Good for fast prototyping and simple organic/stylized shapes. Struggles with precision hard-surface or commercial-quality characters. For our chunky robots? Likely good enough as a starting point.
- **Output formats**: FBX, GLB, OBJ, STL, USDZ, BLEND
- **PBR textures**: Yes -- Diffuse, Roughness, Metallic, Normal maps
- **Rigging/Animation**: Built-in auto-rigging + 500+ animation library
- **Pricing**:
  - Free: 100 credits/month, 1 queue slot
  - Pro: $20/month, 1,000 credits, 10 queue slots
  - Max: $60/month, 4,000 credits, 20 queue slots
  - Max Unlimited: $120/month, 4,000 credits, maximized priority
- **API**: Available on Pro tier and above (credit-based)
- **Verdict**: Strong all-rounder. The built-in rigging + animation library is a huge win for solo devs. The texturing tool alone is valuable -- upload any mesh and retexture it with a prompt.

#### Tripo AI (v3.0)
- **URL**: https://www.tripo3d.ai
- **What it does**: Text-to-3D, Image-to-3D, auto-rigging, smart low-poly output
- **Quality**: Tripo 3.0 is a significant leap -- sharper edges, cleaner surfaces, coherent structures. Clean quad-based topology that is actually usable for animation without manual retopology. This is the key differentiator.
- **Output formats**: GLB, FBX, OBJ (rigged outputs should use GLB/FBX)
- **Rigging**: Auto-rigging feature -- not feature-film quality, but good enough for quick posing, game animations, and proportion checking
- **Pricing**:
  - Basic (Free): 300 credits/month, 1 concurrent task, public models (CC BY 4.0)
  - Professional: $19.90/month, 3,000 credits, 10 concurrent tasks, private/commercial
  - Advanced: $49.90/month, 8,000 credits, 15 concurrent tasks
  - Premium: 25,000 credits/month
- **API**: Available, with Blender add-on, Unity plugin, and ComfyUI nodes
- **Verdict**: Best topology of any AI 3D tool -- models come out cleaner and more animation-ready. The explicit polycount and mesh density controls are perfect for targeting web-friendly low-poly output. Top pick for game-ready stylized assets.

### Tier 2: Specialized / Worth Knowing

#### Sloyd
- **URL**: https://www.sloyd.ai
- **What it does**: Parametric 3D model generation using handcrafted templates + AI customization
- **Quality**: Consistent and predictable because it uses procedural templates rather than pure generation. Great for "many variations fast."
- **Pricing**:
  - Free: Preview text/image-to-3D
  - Plus: $15/month, unlimited downloads + AI generations
  - Pro: $50/month, AI trained on your style, private generators
- **API**: Available for real-time in-app generation
- **Verdict**: Interesting hybrid approach. Less "creative surprise" but more predictable quality. Good for props and environment pieces. Less ideal for unique character designs.

#### Rodin / Hyper3D (Gen-2)
- **URL**: https://hyper3d.ai
- **What it does**: Highest quality photorealistic 3D from text/images. 10B parameter model (BANG architecture). 4K PBR textures.
- **Quality**: Industry-leading for photorealistic objects. Overkill for stylized low-poly -- this targets product visualization and film.
- **Pricing**:
  - Free: $0/month at $1.50/credit
  - Creator: $20-30/month
  - Business: $60-120/month
  - Per-generation on fal.ai: $0.40; on WaveSpeedAI: $0.30
- **Verdict**: Too expensive and too photorealistic for our needs. Skip for terrarium.

#### 3DAI Studio (Aggregator)
- **URL**: https://www.3daistudio.com
- **What it does**: Multi-engine platform giving access to Meshy, Tripo, Rodin, and others in one subscription
- **Pricing**: $14/month for 1,000 credits, or $29 one-time for 2,000 credits
- **Verdict**: Great value if you want to compare outputs from multiple engines. The one-time $29 option is a no-brainer for experimentation.

#### Luma Genie
- **URL**: https://lumalabs.ai
- **What it does**: Text-to-3D using NeRF and Gaussian Splatting
- **Quality**: Good geometric understanding, reasonable texturing. Excels in spatial accuracy.
- **Pricing**: Generous free tier
- **Verdict**: Worth trying the free tier. Good for quick concept exploration.

### Tier 3: Open-Source / Local Generation

#### Tencent Hunyuan3D (2.0 / 2.1)
- **URL**: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- **What it does**: Free, open-source text-to-3D and image-to-3D with PBR textures
- **Quality**: Production-ready quality. Two-stage pipeline (mesh generation, then texture synthesis). Outputs OBJ, GLB.
- **3M+ downloads on Hugging Face** -- most popular open-source 3D model
- **Apple Silicon compatibility**: PROBLEMATIC
  - Shape generation works (11.5 GB VRAM needed)
  - Texture generation relies on CUDA rasterizer -- fails on Mac
  - Community fork exists: [Hunyuan3D-2-Mac](https://github.com/Maxim-Lanskoy/Hunyuan3D-2-Mac) by Maxim Lanskoy (MPS backend)
  - With 128GB M4 Max, shape generation should work. Texture generation is hit-or-miss.
- **Verdict**: The most powerful free option, but Mac support is experimental. Worth trying the Mac fork for untextured mesh generation, then texture in Meshy or Blender. Could also run via ComfyUI (which you already have).

#### InstantMesh / TripoSR (Open Source)
- **InstantMesh**: Feed-forward 3D mesh from single image. Sharper textures than TripoSR.
- **TripoSR**: Very fast (<5s) but bakes lighting into texture, making it hard to use in dynamic scenes.
- **Apple Silicon**: PyTorch MPS support works for inference, but custom rasterization libraries (nvdiffrast) need CUDA. CPU fallback is slow.
- **Verdict**: Good for quick experiments. InstantMesh produces better textures. Neither is turnkey on Mac.

### Summary Table: AI 3D Tools

| Tool | Quality | Rigging | Animation | Price | Best For |
|------|---------|---------|-----------|-------|----------|
| **Tripo 3.0** | High (clean topology) | Auto-rig | Basic | $20/mo | Game-ready characters |
| **Meshy** | Good (stylized) | Auto-rig | 500+ motions | $20/mo | All-in-one workflow |
| **Sloyd** | Consistent | No | No | $15/mo | Props, variations |
| **3DAI Studio** | Multi-engine | Via engines | Via engines | $14/mo | Comparison shopping |
| **Luma Genie** | Good | No | No | Free tier | Quick concepts |
| **Rodin** | Excellent (photorealistic) | No | No | ~$0.40/gen | Product viz (skip) |
| **Hunyuan3D** | Excellent (open source) | No | No | Free | Local generation |

---

## 2. Traditional Stylized Asset Workflows

### How Indie Devs Make Chunky/Cute Robots

#### Blender (Free, Open Source)
- **The industry standard** for indie 3D. Model, rig, animate, export -- all in one tool.
- **For chunky robots**: Use subdivision modeling with low-poly base meshes. Bevel edges for that "manufactured" look. Separate parts (head, torso, arms, legs) for easy rigging.
- **glTF export**: Native support. The built-in exporter is well-maintained. Use GLB format for self-contained files.
- **Learning curve**: Steep but well-documented. For simple robot characters (box-based, limited detail), a beginner can produce usable models in 1-2 weeks of learning.
- **Key tip**: For web-ready models, keep polycount under 10K per character. Use baked textures (small texture atlases, 512x512 or 1024x1024).

#### MagicaVoxel (Free)
- **URL**: https://ephtracy.github.io
- **What it does**: Voxel editor with beautiful path-tracing renderer
- **For chunky robots**: Perfect aesthetic match. Voxels naturally produce the chunky/blocky look. Build robot characters block by block.
- **Pipeline**: MagicaVoxel (.vox) -> Export as OBJ -> Import to Blender -> Optimize/rig -> Export as GLB
- **Limitation**: No rigging or animation in MagicaVoxel itself. It is purely a modeling/rendering tool. You must move to Blender for animation.
- **Verdict**: If you want a truly blocky/voxel aesthetic, this is the fastest path to beautiful models. The voxel-to-mesh export is clean.

### Existing Asset Sources

#### Sketchfab
- **URL**: https://sketchfab.com/tags/robot
- **Available**: "Cute Robot Companion" GLB, "Low-Poly Robot" (cute mecha), "Futuristic Flying Animated Robot" (5.7K polys, animated)
- **Licensing**: Free models available under CC licenses. Paid models with commercial licenses.
- **Format**: Direct GLB download available on many models
- **Verdict**: Excellent for quick prototyping. Download a few robot models, test them in the terrarium scene, get a feel for what works before committing to custom creation.

#### itch.io
- **URL**: https://itch.io/game-assets/free/tag-low-poly/tag-robots
- **Available**: Voxel robot packs (modular parts, separable), low-poly robot characters, rigged spider bots, stylized N64-era robots
- **Standout**: Max Parata's "Voxel Mechas" -- free voxel robot assets with separated modular parts, PBR maps, .VOX and .OBJ files
- **Verdict**: Great starting point. Modular robot packs let you mix-and-match parts to create distinct silhouettes for 6 characters.

#### Turbosquid / CGTrader
- **Paid marketplace** with professional models. Typically $10-50 for low-poly game characters.
- **Verdict**: Worth browsing if free options don't hit the quality bar, but itch.io and Sketchfab likely have what we need.

---

## 3. Hybrid AI + Manual Workflows

This is where the real magic happens for a solo developer. The most practical pipeline combines AI speed with manual control.

### Workflow A: AI Base Model + Blender Refinement

1. **Generate concept images** with Flux (you already have this in ComfyUI)
   - Prompt: "Cute chunky robot character, low poly, stylized, solid color palette, [unique feature], front and side view, white background"
   - Generate 4-8 variations per character
2. **Image-to-3D** with Tripo or Meshy
   - Upload the best concept image
   - Specify low-poly target (e.g., "low poly, game ready, under 5K triangles")
   - Generate 2-3 variations
3. **Refine in Blender**
   - Import the GLB/FBX
   - Clean up geometry (merge loose vertices, fix normals)
   - Simplify if needed (Decimate modifier)
   - Add custom details (antennas, screens, accessories)
4. **Rig and animate in Blender**
   - Simple bone setup (15-20 bones per robot)
   - Create idle animations (bobbing, head turn, arm movement)
   - Or use Mixamo for auto-rigging + animation
5. **Export as GLB** with optimized settings

### Workflow B: AI Texturing on Manual Models

1. **Model a simple robot base** in Blender or MagicaVoxel
   - Box-based modeling: head, torso, limbs, accessories
   - Keep it untextured (gray mesh)
2. **AI Texture** with Meshy's texturing tool
   - Upload the untextured mesh
   - Prompt: "Cute robot, matte plastic, pastel blue with orange accents, cartoon style"
   - Generates full PBR texture set (diffuse, roughness, metallic, normal)
   - Try multiple style variations per character
3. **Tweak in Blender** if needed
4. **Export as GLB**

### Workflow C: Concept Art Pipeline (Most Control)

1. **Write character descriptions** for each of 6 robots
   - Define: name, role, silhouette, color palette, unique feature (antenna type, screen shape, accessory)
2. **Generate 2D concept art** with Flux/ComfyUI
   - Use IP-Adapter for style consistency across all 6
   - Generate front/side/back views (turnaround sheet)
3. **Image-to-3D** conversion
   - Feed the concept art into Tripo/Meshy
   - The consistent reference images produce more consistent 3D output
4. **Refine, rig, animate** in Blender
5. **Export as GLB**

### AI Texture Generation Tools

| Tool | What It Does | Pricing | Best For |
|------|-------------|---------|----------|
| **Meshy AI Texturing** | Upload mesh, prompt for texture. Full PBR output. | Included in Meshy plans | Retexturing generated or handmade models |
| **Polycam AI Textures** | Generate tileable textures from prompts. Up to 2048px. | Free tier available | Environment textures, materials |
| **WithPoly** | AI texture generation | Free tier | Quick texture experiments |

---

## 4. Three.js Integration

### Preferred Format: GLB

GLB (Binary glTF) is the unambiguous winner for Three.js:
- **Self-contained**: Single file with geometry, textures, animations, materials
- **Compact**: Binary format, smaller than multi-file glTF
- **Native support**: `GLTFLoader` is the recommended loader in Three.js
- **PBR materials**: Maps directly to Three.js `MeshStandardMaterial`
- **Skeletal animation**: Full support via `AnimationMixer`
- **Industry standard**: Khronos Group specification, widely supported

### Animation Options

#### Skeletal Animation (Recommended for Characters)
- Uses bone hierarchies (armatures) to deform mesh
- **Advantages**: Less storage, less streaming data per frame, easier procedural blending
- **Target**: 15-20 bones per robot character for web performance
- **Implementation**: `SkinnedMesh` + `AnimationMixer` in Three.js
- **Note**: Materials used with skinning cannot be shared between meshes -- create unique materials per character

#### Morph Targets (Good for Facial Expressions)
- Shape key animation (e.g., screen face changing expression)
- **Limitation**: Draco compression cannot compress morph targets -- use Meshopt instead
- **Use case**: Robot face/screen expressions, button presses

#### Procedural Animation (Good for Idle Motion)
- Bobbing, swaying, looking around via code (sin waves, noise)
- **Advantages**: Zero file size, infinite variation, no animation data to load
- **Implementation**: Transform bones or mesh positions in `useFrame` / animation loop
- **Recommended for**: Idle breathing/bobbing, subtle sway, ambient motion
- **Can be combined** with baked skeletal animations (e.g., typing animation + procedural bobbing)

### Performance Budget: 6 Animated Characters at 1920x1080

**Target: 60fps, <100 draw calls**

| Resource | Budget Per Character | Total (6 chars) |
|----------|---------------------|-----------------|
| Triangles | 3K-8K | 18K-48K |
| Bones | 15-20 | 90-120 |
| Texture atlas | 512x512 or 1024x1024 | 3-6 textures |
| Draw calls | 1-3 | 6-18 |
| Animation clips | 3-5 (idle, typing, looking) | 18-30 |
| GLB file size | 100-300KB | 600KB-1.8MB |

**This is very comfortable for modern browsers.** Even mobile could handle this budget. The terrarium is a simple scene -- with proper optimization, you could push much higher.

### Optimization Tools

#### gltf-transform (CLI)
```bash
npx @gltf-transform/cli optimize input.glb output.glb \
  --compress meshopt \
  --texture-compress webp \
  --texture-resize 1024
```
- Reduces file sizes by 60-95%
- Meshopt compression handles geometry, morph targets, AND animation data
- WebP textures are ~30% smaller than PNG/JPEG
- Use Meshopt over Draco for animated models (Draco cannot compress morph targets or animation)

#### GLTFJSX (React Three Fiber)
```bash
npx gltfjsx model.glb --transform
```
- Generates a React component wrapper for your GLB
- Auto-applies Draco/Meshopt decompression
- Creates typed, tree-shakeable component

### Blender to Three.js Export Checklist

1. **One armature per glTF file** (don't mix multiple skeletons)
2. **No bendy bones** (not supported in glTF)
3. **No "child of" constraints** (won't export)
4. **Sample IK animations** in export settings (IK chains need baking)
5. **Use GLB format** (single file, embedded textures)
6. **Test with Don McCurdy's glTF Viewer** before importing to your app
7. **Keep total scene under a few hundred thousand polygons** (our 48K budget is fine)

### Loading Strategy

```typescript
// Preload all characters during splash/loading screen
useGLTF.preload('/models/robot-alpha.glb')
useGLTF.preload('/models/robot-beta.glb')
// ... etc

// Use Suspense for graceful loading
<Suspense fallback={<LoadingScreen />}>
  <TerrariumScene />
</Suspense>
```

- **Preload assets** during loading screen
- **frameloop="demand"** when scene is idle (only render on changes/animation)
- **Reuse materials** where possible (shared metal material, shared screen material)
- **LOD not needed** -- at our scale (6 characters), full-detail rendering is fine

---

## 5. Recommendations for Terrarium

### Requirements Recap
- 6 distinct robot characters with unique accessories/silhouettes
- Low-poly / stylized aesthetic (Overcooked, Astroneer, cute robots)
- Idle animations (bobbing, looking around, typing)
- Browser performance at 1920x1080
- Solo developer workflow
- M4 Max Mac (128GB RAM)

### Character Design: 6 Distinct Robots

Each robot needs a unique silhouette + color + accessory. Example:

| Robot | Role | Silhouette | Unique Feature | Color |
|-------|------|-----------|----------------|-------|
| Alpha | Lead Engineer | Tall, thin | Antenna array, clipboard | Deep blue |
| Beta | Creative | Round, squat | Paint splatter, beret | Warm orange |
| Gamma | Security | Boxy, wide | Shield icon, visor | Forest green |
| Delta | Analyst | Medium, sleek | Glasses, floating screens | Purple |
| Epsilon | Builder | Stocky, arms | Tool belt, hard hat | Yellow |
| Zeta | Researcher | Small, hovering | Book stack, magnifying glass | Teal |

### What Will Actually Work for a Solo Dev

**Reality check**: You are not a 3D artist, and learning Blender modeling from scratch to produce 6 polished characters is a significant time investment. Here is what is realistic:

1. **Fastest path (1-2 days)**: Buy/download existing robot GLB models from Sketchfab/itch.io. Customize colors in Blender. Add procedural idle animation in Three.js code.

2. **Best quality/effort ratio (1-2 weeks)**: Use AI tools (Meshy or Tripo) to generate base models from concept art. Light cleanup in Blender. Use Mixamo or Meshy's animation library for rigging and idle animations. Export as GLB.

3. **Highest quality (3-4 weeks)**: Generate concept art in ComfyUI with IP-Adapter for style consistency. Use Tripo image-to-3D for base meshes. Refine in Blender. Custom rig and animate in Blender. Export as optimized GLB.

4. **Commission option**: Hire a freelance 3D artist on Fiverr/Upwork for 6 stylized robot characters. Expect $200-600 for the set, delivered rigged and animated. Specify GLB format and polycount requirements.

---

## 6. Recommended Pipeline

### My Recommendation: Option 2 (AI-Assisted, 1-2 Week Timeline)

This balances quality, speed, and learning. Here is the step-by-step:

#### Phase 1: Concept Art (Day 1)
- Write character briefs for all 6 robots (name, personality, silhouette, colors, unique features)
- Generate concept art in ComfyUI using Flux + IP-Adapter
  - Style reference: one "master style" image of the desired aesthetic
  - IP-Adapter weight 0.4-0.6 for consistency
  - Generate front + 3/4 view for each character
  - Prompt pattern: "Cute stylized robot character, [description], low poly game asset, solid matte materials, white background, character design sheet"
- Select best concept per character

#### Phase 2: 3D Generation (Day 2-3)
- Sign up for Tripo Professional ($20/month -- cancel after) or use 3DAI Studio ($29 one-time)
- Upload each concept image for image-to-3D generation
- Request low-poly output (specify under 5K triangles)
- Generate 2-3 variants per character, pick the best
- Download as GLB

#### Phase 3: Refinement (Day 4-6)
- Import each GLB into Blender
- Cleanup: merge loose geometry, fix normals, remove internal faces
- Differentiation: add unique accessories (antenna, hat, glasses) if the AI didn't nail them
- Texture touchup: use Meshy's AI texturing to generate PBR textures, or paint directly in Blender
- Target: under 5K triangles per character, 512x512 texture atlas

#### Phase 4: Rigging & Animation (Day 7-10)
Two options:

**Option A: Mixamo (Faster)**
- Upload each character to Mixamo (free, Adobe account)
- Auto-rig
- Download idle animations: "Idle", "Looking Around", "Typing"
- Combine animations into single GLB using [Mixamo Animation Combiner](https://mixamo2gltf.com/)

**Option B: Manual Blender Rig (More Control)**
- Simple armature: spine, head, 2 arms, optional legs
- 15-20 bones per character
- Create 3 NLA strips: idle bob, head turn, typing motion
- Advantage: custom animations that feel more "robotic"

#### Phase 5: Optimization & Export (Day 11)
- Export each character as GLB from Blender
- Optimize with gltf-transform:
  ```bash
  npx @gltf-transform/cli optimize robot-alpha.glb robot-alpha-opt.glb \
    --compress meshopt \
    --texture-compress webp \
    --texture-resize 512
  ```
- Validate in glTF Viewer (https://gltf-viewer.donmccurdy.com/)
- Target: 100-300KB per character GLB

#### Phase 6: Three.js Integration (Day 12-14)
- Load GLBs with `GLTFLoader` (or `useGLTF` in R3F)
- Set up `AnimationMixer` per character
- Add procedural animation layer (subtle bobbing via sin wave on Y axis)
- Position characters at desks
- Add desk/environment models (AI-generated or simple box geometry with nice textures)

### Tool Budget

| Tool | Cost | Purpose |
|------|------|---------|
| Tripo Pro (1 month) | $20 | Image-to-3D generation |
| Blender | Free | Refinement, rigging, animation |
| Mixamo | Free | Auto-rigging + animation library |
| ComfyUI + Flux | Free (local) | Concept art generation |
| gltf-transform | Free | GLB optimization |
| MagicaVoxel (optional) | Free | Alternative voxel modeling |
| **Total** | **$20** | |

### Local AI Tools for M4 Max (128GB)

| Tool | Status on Mac | Notes |
|------|---------------|-------|
| ComfyUI + Flux GGUF | Working | Already set up, 26-40s/image |
| Hunyuan3D-2-Mac (fork) | Experimental | Shape gen works (11.5GB VRAM). Texture gen unreliable on MPS. |
| InstantMesh | Partial | Inference works via MPS. Custom rasterizer needs CPU fallback. |
| TripoSR | Works | Fast but bakes lighting -- hard to use in dynamic scenes |
| Meshy/Tripo (cloud) | N/A | Cloud-based, works from browser. Best option. |

**Recommendation**: Use cloud tools (Tripo/Meshy) for 3D generation. Use local ComfyUI for concept art. The $20 investment in Tripo Pro is worth more than the hours you would spend fighting Mac compatibility issues with open-source 3D models.

---

## Key Takeaways

1. **AI 3D tools are good enough** for stylized low-poly characters in 2026. They are not good enough for AAA characters, but for cute chunky robots in a lo-fi scene? Absolutely.

2. **Tripo 3.0 has the best topology** -- its models come out with clean quads that are animation-ready without manual retopology. This matters a lot.

3. **The image-to-3D path is better than text-to-3D** for characters. Generate consistent concept art first (you have ComfyUI + IP-Adapter), then convert. More control, more consistency.

4. **6 animated characters at <50K total triangles is trivial** for modern browsers. Performance is not a concern at this scale. Focus on aesthetic quality, not technical optimization.

5. **Mixamo is an underrated shortcut** for auto-rigging and animation. Free, works with any humanoid mesh, exports to GLB. Perfect for "I need idle animations and I'm not an animator."

6. **Budget: $20 and 1-2 weeks** gets you from procedural box geometry to 6 distinct, animated, stylized robot characters. That is an extraordinary value proposition compared to even 2 years ago.

7. **Don't over-engineer the first pass.** Get any 6 GLB robots into the scene, even ugly ones. Then iterate. The terrarium is a living thing -- it will improve over time.

---

## Sources

### AI 3D Generation
- [Meshy AI](https://www.meshy.ai/) -- [Pricing](https://www.meshy.ai/pricing) -- [API Docs](https://docs.meshy.ai/en/api/pricing)
- [Tripo AI](https://www.tripo3d.ai/) -- [Pricing](https://www.tripo3d.ai/pricing) -- [Review (2025)](https://skywork.ai/blog/tripo-ai-review-2025/)
- [Tripo 3.0 Review](https://skywork.ai/skypage/en/Tripo-AI-3.0-In-Depth-Review-The-AI-3D-Generator-That-Actually-Feels-Professional/1974872733789122560)
- [Sloyd](https://www.sloyd.ai/) -- [Pricing Comparison](https://www.sloyd.ai/blog/3d-ai-price-comparison)
- [Hyper3D / Rodin](https://hyper3d.ai/) -- [API Docs](https://developer.hyper3d.ai/api-specification/rodin-generation-gen2)
- [3DAI Studio](https://www.3daistudio.com/) -- [Best Tools 2026](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/best-3d-generation-tools-2026/12-best-text-to-3d-tools-creators-2026)
- [Luma AI](https://lumalabs.ai/)
- [Hunyuan3D 2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) -- [Mac Fork](https://github.com/Maxim-Lanskoy/Hunyuan3D-2-Mac)
- [InstantMesh](https://github.com/TencentARC/InstantMesh)

### Traditional Workflows
- [MagicaVoxel](https://ephtracy.github.io/)
- [Sketchfab Robot Models](https://sketchfab.com/tags/robot)
- [itch.io Low-Poly Robot Assets](https://itch.io/game-assets/free/tag-low-poly/tag-robots)
- [Max Parata Voxel Mechas](https://maxparata.itch.io/voxel-mechas)

### Hybrid Workflows
- [Meshy AI Texturing](https://www.meshy.ai/features/ai-texture-generator)
- [Polycam AI Textures](https://poly.cam/tools/ai-texture-generator)
- [Concept Art to 3D with Sloyd](https://www.sloyd.ai/blog/from-concept-art-to-3d-model)

### Three.js Integration
- [Blender to Three.js Export Guide](https://github.com/funwithtriangles/blender-to-threejs-export-guide)
- [glTF Animations in Three.js](https://sbcode.net/threejs/gltf-animation/)
- [Three.js Animation System](https://discoverthreejs.com/book/first-steps/animation-system/)
- [glTF-Transform](https://gltf-transform.dev/)
- [Mixamo Animation Combiner](https://mixamo2gltf.com/)
- [GLTFJSX](https://github.com/pmndrs/gltfjsx)
- [Three.js Performance Optimization (Codrops)](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)
- [React Three Fiber Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [100 Three.js Tips (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [Skeletal Animation in glTF](https://lisyarus.github.io/blog/posts/gltf-animation.html)
- [glTF Viewer](https://gltf-viewer.donmccurdy.com/)
- [Khronos Asset Creation Guidelines 2.0](https://www.khronos.org/blog/introducing-asset-creation-guidelines-2.0-siggraph-2025)
