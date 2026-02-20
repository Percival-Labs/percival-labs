# Terrarium Environment Upgrade: Research Brief

*Research conducted 2026-02-13 for Percival Labs terrarium scene upgrade*

---

## Executive Summary

The terrarium currently uses ~1400 lines of procedural Three.js box/cylinder/sphere geometry to build a "cozy hacker lab at night." The robots are built from the same primitives. To upgrade both environment and characters to match a polished stylized look while maintaining visual cohesion, the research points to a clear strategy:

**The recommended approach is a hybrid pipeline:**
1. Build the base environment in Blender with baked lighting, export as a single GLB
2. Generate robot characters in Tripo AI using Flux Kontext for cross-asset consistency
3. Unify everything with a shared color palette texture + MeshToonMaterial + post-processing
4. Add life through lightweight Three.js animations (particles, monitor flicker, eye glow)

---

## 1. Environment Asset Pipelines for Stylized Scenes

### 1.1 Modular Environment Kits

The standard indie approach for building room interiors is **modular asset construction** - pre-designed, interchangeable pieces that snap together like puzzle pieces. According to industry surveys, 70% of indie developers use modular assets to cut production time by up to 40%.

For a single-room scene like the terrarium, full modularity is overkill. Instead, the approach should be:

- **Build the room shell as one piece** (walls, floor, ceiling, window) in Blender
- **Treat furniture as individual props** that can be placed and repositioned
- **Export the static environment as a single merged GLB** with baked lighting
- **Export movable/animated props separately** (robot characters, monitor screens)

**Key insight from the Codrops "3D World in Browser" tutorial:** The workflow is to model everything in Blender, bake lighting at 4096x4096 resolution, join all static objects into one mesh to reduce draw calls, then export as GLB. Textures compressed via KTX format. A full room can load under 5MB.

### 1.2 AI Generation for Environment Props

**Tripo AI** - Best overall for workflow and editability. Supports text-to-3D, image-to-3D, and multi-view-to-3D. Clean quad topology, auto-retopology. Exports GLB/FBX/OBJ. The Flux Kontext integration is specifically designed for maintaining style consistency across multiple generated assets. Best for: characters, organic props.

**Meshy AI** - Strong for hard-surface props. "For props and hard-surface assets, the results can be shockingly good, especially with realistic grunge and wear." Simple props generate in 1-2 minutes. AI Prompt Helper steers toward better topology. 85-95% accuracy on common objects like furniture. Best for: desks, chairs, shelves, monitors, mugs.

**Sloyd** - Parametric templates with slider customization, not true AI generation. Clean topology, auto UVs, LODs, game-ready output. Templates for common game assets. Instant generation. Exports GLB/FBX. The Studio/Enterprise plan includes "AI customization trained on your style" - meaning you can train it on your art direction and it generates assets matching that style. Best for: rapid prototyping of standard furniture shapes. The free/Plus tier ($15/mo) is limited to premade templates.

**Comparison for terrarium props:**

| Prop | Best Tool | Why |
|------|-----------|-----|
| Desks | Meshy or Sloyd | Hard surface, common geometry |
| Chairs | Sloyd | Standard parametric shape |
| Bookshelves | Meshy | Hard surface with detail |
| Lamps | Meshy | Simple geometry |
| Plants | Tripo | Organic shapes |
| Monitors | Sloyd or manual | Very simple geometry |
| Mugs | Meshy | Simple prop |
| Beanbag | Tripo | Organic/soft body |
| Robots | Tripo | Characters need best quality |

**Key finding:** AI 3D tools handle hard-surface props (furniture) BETTER than organic characters. Furniture is geometrically simple and predictable. Characters have more failure modes (proportions, limb attachment, face detail).

### 1.3 Existing Asset Packs Worth Evaluating

**Free:**
- **KayKit Furniture Bits** (itch.io) - 50+ low-poly furniture models, CC0 license, includes OBJ/FBX/GLTF formats. Has desks, chairs, monitors, lamps, accessories. Uses a single 1024x1024 gradient atlas texture. This is the strongest free option.
  - URL: https://kaylousberg.itch.io/furniture-bits
  - Style: Cartoon low-poly, consistent across all pieces
  - Format: GLTF ready

- **Free 25 Low Poly Props** by Your 3D Character (Sketchfab) - Game-ready general props

- **Low Poly Office Furniture Set** by Anais3Dcraft (Sketchfab) - Cabinet, chairs, table, coat rack. Stylized low-poly, good for sci-fi/modern interiors.

**Paid (under $20):**
- **Low Poly Office Furniture and Props** by POLYTRICITY (Sketchfab) - 265+ office props sharing a single 1024x1024 texture atlas. Designed for VR/mobile.

- **Modern Minimal Office Low Poly Furniture Pack** by Studio Ochi (Sketchfab) - Comprehensive office collection with GLB export.

**Recommendation:** Start with KayKit Furniture Bits (free, CC0, GLTF-ready). If the style doesn't match the robots, use it as reference for AI-generating matching props.

### 1.4 MagicaVoxel for Environments

MagicaVoxel is excellent for voxel-art environments but has significant limitations for the terrarium use case:

**Pros:**
- Very fast to create blocky, stylized environments
- Built-in rendering for beautiful reference images
- Free tool, intuitive interface

**Cons:**
- No native glTF export (only .obj, .ply)
- Exports lose metallic/transparency/emissive properties
- Requires V-Optimizer or Smooth Voxel Playground for glTF conversion
- Voxel meshes need optimization before game use (excessive poly count per voxel cube)
- **Style lock-in**: If robots are NOT voxel-style, the environment will clash

**Verdict:** MagicaVoxel is a viable "one tool for everything" approach IF you commit to a voxel aesthetic for both robots AND environment. This means the robots would need to be voxel-style too (Tripo has a voxel stylization feature that could work). However, voxel style is a strong aesthetic choice that limits the "cozy" feel - it trends more toward Minecraft/Crossy Road than Overcooked/Astroneer.

### 1.5 Lighting Strategy for GLB Scenes

This is critical for the terrarium. There are two main approaches:

**Option A: Baked Lighting (recommended for static environment)**

Bake lighting in Blender's Cycles engine into texture maps, then load in Three.js. The baked texture captures ray-traced shadows, ambient occlusion, and color bleeding.

Workflow:
1. Set up scene in Blender with lights positioned exactly as desired
2. Create separate UV maps for baking (second UV channel)
3. Bake at 4096x4096, 128 samples
4. Apply denoising
5. Export GLB with baked texture as the base color
6. In Three.js, load GLB - the lighting is "free" (no runtime cost)

**Performance benefit:** "Baked lighting is essentially free at render time." Perfect for a scene running in OBS browser source.

**Limitation:** Objects with baked lighting CANNOT move (shadows are permanent). This is fine for walls/floor/furniture but NOT for robots or animated props.

**Option B: Hybrid (baked environment + dynamic character lighting)**

This is the best approach for the terrarium:
- Bake lighting into the static room (walls, floor, ceiling, desks, shelves, plants)
- Use 2-3 dynamic lights for the robots (so they react to light correctly)
- Use emissive materials for monitors, LED strips, string lights (no light baking needed)

**Implementation in Three.js:**
```
// Static environment - uses baked lightmap
const envMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture });

// Dynamic characters - use standard material with real-time lights
const robotMaterial = new THREE.MeshToonMaterial({ color: agentColor });
```

**The "warm cozy" feel** comes from:
- Warm color temperature baked lighting (3000K-ish)
- Emissive materials on monitors (agent colors)
- Point lights near lamp positions (warm yellow/orange)
- Fog (FogExp2) for depth
- Vignette overlay (already implemented)

---

## 2. Style Consistency Strategies (THE HARD PROBLEM)

This is the most critical section. When you mix AI-generated robots, handmade Blender environments, and free asset pack furniture, everything looks like it came from different games. Here are the strategies for solving this, ranked by effectiveness.

### 2.1 Style Bible / Art Direction Document

Before generating ANY asset, define the visual rules. This is what studios call an "art bible." For the terrarium, it should specify:

**Geometry Rules:**
- Target polygon density: 200-500 tris per small prop, 500-2000 tris per large prop, 1000-3000 tris per character
- Soft bevels on hard edges (no razor-sharp corners)
- Slight imperfection in proportions (slightly oversized heads, chunky limbs - the Overcooked approach)
- No perfectly straight lines in organic objects (plants, beanbag)

**Color Palette:**
- Primary: Deep navy (#10132a), warm wood (#7D4E2A), dark metal (#333333)
- Agent accent colors: Blue (#3b82f6), green (#10b981), pink (#ec4899), purple (#8b5cf6), amber (#f59e0b), cyan (#06b6d4)
- Lighting: Warm amber (#FFB060), cool cyan (#22d3ee), moonlight blue (#88bbee)
- Constraint: All materials reference a shared palette texture (see section 2.4)

**Material Rules:**
- Matte surfaces (roughness > 0.6) for most objects
- Only metal/shiny for robot joints, monitor frames, lamp hardware
- No PBR detail textures (no normal maps, no roughness maps)
- Flat or gradient colors only - NO photorealistic textures
- Emissive materials for screens, LEDs, string lights

**Proportions:**
- Robots: ~2 head-heights tall (chibi/super-deformed proportions)
- Furniture: Slightly larger than realistic scale (chairs are chunky, desks are thick)
- Plants: Simplified cone/sphere foliage, oversized relative to pots

**References:**
- Astroneer (bold geometric shapes, flat materials, no textures)
- Overcooked (chunky props, warm color palette, cozy scale)
- Lo-fi beats YouTube channels (cozy night scene, warm lighting, animated details)

### 2.2 Style Transfer in AI 3D Tools

**Tripo's Flux Kontext Integration** (most promising):
- Flux Kontext is an AI framework that "adds context-aware control, keeping details and style consistent across multiple inputs"
- Workflow: Define style prompt -> Flux Kontext aligns parameters -> Tripo generates 3D -> Export GLB
- The system "keeps style, proportions, and detail aligned across multiple assets or scenes"
- Users report it "cut down retries, results align with prompts faster"
- **This is the key to generating robots that match**: Use the same style prompt and Flux Kontext context for all 6 robots

**Tripo Stylization Feature:**
- One-click style transfer to Lego, Voxel, or Voronoi aesthetics (10 credits per stylization)
- Can be applied during generation or as post-processing
- Style transfer is "consistent, with every part of the mesh staying aligned"
- **Limitation**: Only 3 preset styles. None are "low-poly stylized" specifically. You'd need to use image-to-3D with a reference image in your desired style.

**Tripo Image-to-3D with Reference:**
- Upload a concept art image and generate a 3D model matching it
- **Strategy**: Use ComfyUI + Flux + IP-Adapter to generate concept art for each robot and prop in a consistent 2D style, THEN feed those images to Tripo for 3D conversion
- This gives you style control through the 2D concept art stage

**Sloyd's "AI Trained on Your Style" (Enterprise only):**
- Studio/Enterprise custom plans include AI customization trained on your style
- Would be ideal but is enterprise-priced, not practical for a solo dev project

### 2.3 Shader-Based Unification (THE GREAT EQUALIZER)

This is the single most effective technique for making disparate assets look cohesive. Even if your robots come from Tripo, your furniture from KayKit, and your room from Blender, applying the SAME shader/material setup to everything forces visual unity.

**Strategy: MeshToonMaterial for everything**

Three.js's `MeshToonMaterial` creates cel-shaded / toon-shaded rendering with sharp light-to-shadow transitions instead of smooth gradients. When everything uses toon shading, everything looks like it belongs in the same cartoon.

Implementation:
```javascript
// Create a gradient map (3-4 color stops)
const gradientMap = new THREE.DataTexture(
  new Uint8Array([0, 0, 0, 128, 128, 128, 255, 255, 255]),
  3, 1, THREE.RedFormat
);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;

// Apply to all materials
const toonMaterial = new THREE.MeshToonMaterial({
  color: 0x7D4E2A,
  gradientMap: gradientMap
});
```

**Key detail:** Set `minFilter` and `magFilter` to `THREE.NearestFilter` on the gradient texture. Without this, the cel-shading effect is lost and it looks like smooth standard shading.

**Custom Toon Shader (advanced option):**
For more control, use a custom `ShaderMaterial` with:
1. Flat color base (from uniform or vertex color)
2. Core shadow via smoothstep on NdotL (normal dot light direction)
3. Specular highlights using half-vector calculation
4. Rim lighting for edge definition
5. Shadow map sampling for cast shadows

The smoothstep function creates the characteristic hard cutoff:
```glsl
float lightIntensity = smoothstep(0.0, 0.01, NdotL);
```

**Post-Processing as a Unifier:**

Layer these post-processing effects via `EffectComposer`:

| Effect | Purpose | Performance |
|--------|---------|-------------|
| **OutlinePass** | Draws edge outlines around all objects (cartoon look) | Low cost |
| **UnrealBloomPass** | Soft glow on emissive materials (monitors, LEDs) | Medium cost |
| **Color grading** | LUT-based color correction to enforce palette | Low cost |
| **RenderPixelatedPass** | Optional pixelation for retro feel | Low cost |
| **SSAO** | Ambient occlusion for depth | Medium cost |

**Recommendation:** OutlinePass + UnrealBloomPass + color grading LUT. This trio forces visual unity more than anything else.

### 2.4 Texture Atlas / Shared Color Palette (THE ASTRONEER APPROACH)

This is the technique that makes games like Astroneer, Crossy Road, and Monument Valley visually coherent despite having hundreds of different assets.

**The concept:** Instead of each asset having its own detailed texture, ALL assets in the scene reference a SINGLE small texture that contains the entire color palette. UVs are mapped to point at the specific color/gradient on this shared texture.

**How it works:**
1. Create a small texture (e.g., 256x256 or even 64x64) containing all your scene colors as horizontal gradient strips
2. Row 1: Wood tones (light -> dark)
3. Row 2: Metal tones
4. Row 3: Agent accent colors
5. Row 4: Plant greens
6. Row 5: Warm light colors
7. Row 6: Cool accent colors
8. UV-map every asset to point at the appropriate color strip on this shared texture
9. Because everything samples from the same palette, everything matches

**Astroneer's specific approach:**
- Completely eliminated textures from their pipeline
- "No unwrapping or UV textures" - just flat vertex colors from a shared palette
- This allows "quick iteration and changing art on the fly"
- The geometric low-poly look "works great up close, far away, in thumbnails or at high resolution"

**Monument Valley's approach:**
- Strict 30-degree isometric grid (every angle is 30, 120, or vertical)
- Delicate, vibrant color palettes matched to each level's mood
- Geometric simplicity as the style anchor

**Implementation for the terrarium:**

```javascript
// Create a palette texture
const paletteCanvas = document.createElement('canvas');
paletteCanvas.width = 256;
paletteCanvas.height = 256;
const ctx = paletteCanvas.getContext('2d');

// Row 0: Wood tones
const woodGrad = ctx.createLinearGradient(0, 0, 256, 0);
woodGrad.addColorStop(0, '#3a2010');
woodGrad.addColorStop(1, '#c08050');
ctx.fillStyle = woodGrad;
ctx.fillRect(0, 0, 256, 32);

// Row 1: Metal tones
// ... etc for each material category

const paletteTexture = new THREE.CanvasTexture(paletteCanvas);
paletteTexture.minFilter = THREE.NearestFilter;
paletteTexture.magFilter = THREE.NearestFilter;
```

**Verdict:** This is extremely effective but requires all assets to be UV-mapped to the shared texture. Works best when building everything from scratch or retexturing imported assets in Blender. May be difficult to apply to AI-generated models (which come with their own textures).

### 2.5 The "One Tool" Approach

**Using Tripo for EVERYTHING (robots + all props):**

Pros:
- Inherent style consistency from same generation model
- Flux Kontext can maintain cross-asset coherence
- Single workflow to learn

Cons:
- AI furniture can be inconsistent between generations
- More expensive (credits per generation)
- Less control over exact geometry
- May need many iterations to get matching results

**Using Blender for EVERYTHING:**

Pros:
- Total control over style, geometry, materials
- Can enforce color palette texture across all assets
- Baked lighting workflow is native
- One export pipeline

Cons:
- Requires 3D modeling skill (Alan is not a 3D artist)
- Time-intensive for 20+ props
- Steeper learning curve

**Using KayKit + manual Blender tweaks:**

Pros:
- 50+ props already done in consistent style
- CC0 license, GLTF format ready
- Can modify in Blender (source files available for $5.95)
- Gradient atlas texture already built in

Cons:
- Robots need to be generated separately (won't match automatically)
- Style may not match the "cozy hacker lab" vibe perfectly
- Limited office-specific items

**RECOMMENDATION: Hybrid approach (see Section 4)**

---

## 3. Specific Techniques for "Cozy Hacker Lab at Night"

### 3.1 Reference Analysis

**What makes these reference scenes feel "cozy" and "alive":**

**Lo-fi beats YouTube channels:**
- Warm lighting (amber/orange dominant)
- Night-time setting with window showing stars/moon
- Animated micro-details: steam from cup, blinking cursor, swaying plants
- Soft shadows, no harsh edges
- Limited color palette (usually warm + one cool accent)
- The "someone was just here" feeling from personal items scattered around

**Overcooked kitchens:**
- Chunky, oversized props (everything slightly too big)
- Bold, saturated colors
- Clean flat materials (no texture noise)
- Strong silhouettes (every prop is instantly readable)
- Consistent edge treatment (soft bevels everywhere)

**Astroneer bases:**
- Bold geometric shapes, vibrant flat colors
- No textures at all - pure geometry and color
- Contrast between angular terrain and smoother man-made objects
- Asset creation in "just a day or two - if not hours"
- "The geometric low-poly look works great up close, far away, in thumbnails"

### 3.2 Animated Environment Details

These are the details that make a scene feel alive. Ranked by impact-to-performance ratio:

**High Impact, Low Cost:**
- Monitor screen flicker/glow pulse (already partially implemented via emissive materials)
- String light gentle brightness oscillation (sine wave on emissiveIntensity)
- Robot idle bob (already implemented)
- Robot eye glow pulse (already implemented)
- Floating dust particles (GPU-based particle system, 50-100 particles)
- Clock/text on monitors changing (texture swap)

**Medium Impact, Low Cost:**
- Steam/smoke from coffee mugs (20-30 sprite particles per mug)
- Plant sway (gentle vertex displacement or rotation)
- Cursor blink on whiteboard (emissive material toggle)
- LED strip color cycling (slow hue shift)

**High Impact, Medium Cost:**
- Ambient floating particles in light beams (volumetric-look via billboard sprites in spotlight cone)
- Subtle camera bob (already implemented as camera drift)
- Keyboard typing animation on robot arms (small rotation cycles)

**Avoid (too expensive for browser):**
- Real volumetric lighting
- Real-time ray tracing
- Complex cloth simulation (for beanbag deformation)
- Fluid simulation (for mug steam)

**Three.js particle implementation:**
```javascript
// Dust motes floating in moonlight
const particleCount = 80;
const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 6;     // x spread
  positions[i * 3 + 1] = Math.random() * 8;           // y height
  positions[i * 3 + 2] = (Math.random() - 0.5) * 6;  // z spread
}

particleGeometry.setAttribute('position',
  new THREE.BufferAttribute(positions, 3));

const particleMaterial = new THREE.PointsMaterial({
  color: 0xffffee,
  size: 0.03,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// Animate in render loop
function animateParticles(time) {
  const positions = particles.geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 1] += 0.002 * Math.sin(time + i); // gentle float
    if (positions[i * 3 + 1] > 10) positions[i * 3 + 1] = 0;
  }
  particles.geometry.attributes.position.needsUpdate = true;
}
```

### 3.3 Lighting as "The Great Unifier"

Good lighting can make mismatched assets feel 80% more cohesive. The current terrarium has 8 lights, which is already well-structured. Key improvements:

**Warm-cool contrast:** The current setup has warm key light + cool fill/rim, which is correct. Amplify this contrast.

**Color-coded desk lights:** Already implemented (each desk glows with agent color). This is excellent for visual identity.

**Practical considerations for baked vs dynamic:**
- If moving to baked environment lighting, only 2-3 dynamic lights are needed for the robots
- Baked lighting handles ambient occlusion, soft shadows, and color bleeding that are expensive to compute in real-time
- Emissive materials (monitors, LEDs, string lights) don't need real lights - they just glow

---

## 4. Practical Workflow Recommendation

Given the constraints (solo dev, not a 3D artist, M4 Max, ComfyUI + Flux available, Tripo/Meshy access, Three.js target), here is the recommended pipeline:

### Phase 1: Establish the Style Bible (1-2 hours)

1. Create a reference mood board (lo-fi beats scenes, Overcooked, Astroneer)
2. Define the color palette (use the existing terrarium colors as starting point)
3. Create a shared palette texture (256x256 gradient atlas)
4. Document geometry rules (target poly count, edge treatment, proportions)
5. Save as `research/TERRARIUM-STYLE-BIBLE.md`

### Phase 2: Generate 2D Concept Art Sheet (2-3 hours)

Use ComfyUI + Flux + IP-Adapter to generate:
1. A concept art sheet showing the office from the same camera angle as the terrarium
2. Individual prop concept art (desk, chair, bookshelf, etc.) in consistent style
3. Robot concept art for each of the 6 agents in consistent style

**Key technique:** Use IP-Adapter with a single reference image to maintain style across all generations. The reference image defines the "look" and every generation inherits it.

**Prompt template for props:**
```
"Low-poly stylized [ITEM], cute cartoon style, soft matte materials,
warm ambient lighting, Overcooked game art style, studio lighting,
centered on gray background, game-ready prop"
```

### Phase 3: Build Base Environment in Blender (4-6 hours)

Even as a non-3D-artist, Blender box modeling for a simple room is approachable:

1. **Room shell:** Box-model walls, floor, ceiling (30 minutes)
2. **Circular window:** Boolean operation on back wall (15 minutes)
3. **Import KayKit furniture** or AI-generate with Meshy (1-2 hours)
4. **Set up lighting** to match current terrarium mood (1 hour)
5. **Bake lighting** at 4096x4096 (automated, ~30 min render time)
6. **Export static environment** as single GLB with baked texture

**Alternative: Skip Blender entirely.** Keep the procedural Three.js room geometry but upgrade it with:
- MeshToonMaterial instead of MeshStandardMaterial
- Post-processing pipeline (OutlinePass + BloomPass + color grading)
- Replace box-geometry props with imported GLB models from KayKit or AI

This is faster but won't have baked lighting quality.

### Phase 4: Generate Robots in Tripo (2-3 hours)

1. Use the 2D concept art from Phase 2 as reference images
2. Generate all 6 robots using Tripo with Flux Kontext for style consistency
3. Apply the same prompt context for all robots, varying only color and accessories
4. Export each robot as individual GLB
5. If Tripo output doesn't match, retexture in Blender using the shared palette texture

### Phase 5: Integrate in Three.js (3-4 hours)

1. Load environment GLB (static, baked lighting, rendered with MeshBasicMaterial)
2. Load 6 robot GLBs (dynamic, rendered with MeshToonMaterial or custom toon shader)
3. Add 2-3 dynamic lights for robot illumination
4. Set up post-processing pipeline:
   - RenderPass (base scene)
   - OutlinePass (cartoon edges on robots)
   - UnrealBloomPass (monitor/LED glow)
   - Custom color grading ShaderPass
5. Add animated details (particles, eye glow, arm sway, monitor flicker)
6. Wire up SSE overlay system

### Phase 6: Polish and Animate (2-3 hours)

1. Add dust particles floating in window light beam
2. Add steam sprites from coffee mugs
3. Add subtle plant sway
4. Add string light brightness oscillation
5. Fine-tune post-processing values
6. Test in OBS browser source at 1920x1080

### Total Estimated Time: 14-21 hours

### The Fastest Path (if time is the constraint):

**"Shader unification" approach (4-6 hours total):**
1. Keep the current procedural Three.js geometry
2. Switch ALL materials to MeshToonMaterial with shared gradientMap
3. Add OutlinePass + UnrealBloomPass post-processing
4. Add floating particles + string light animation
5. Optionally import 2-3 KayKit GLB props (desk, chair) to replace the box geometry versions

This gives you 80% of the visual improvement with 20% of the effort. The toon shader + outline pass alone transforms the scene from "programmer art" to "stylized indie game."

---

## 5. Tool Quick Reference

### AI 3D Generation

| Tool | Best For | Cost | Quality | GLB Export |
|------|----------|------|---------|------------|
| **Tripo AI** | Characters, style consistency | Free tier / $9.90/mo | Best workflow | Yes |
| **Meshy AI** | Hard-surface props, furniture | Free tier / $9.99/mo | Good for props | Yes |
| **Sloyd** | Rapid parametric furniture | Free tier / $15/mo | Clean topology | Yes |

### Free Asset Sources

| Source | Best For | License | Format |
|--------|----------|---------|--------|
| **KayKit Furniture Bits** | Office furniture (50+ models) | CC0 | GLTF/FBX/OBJ |
| **Sketchfab** (filtered: low-poly, office) | Individual props | Varies | GLTF |
| **Kenney.nl** | General game assets | CC0 | GLTF/FBX |
| **Poly Haven** | HDRIs for lighting reference | CC0 | HDR |

### Three.js Techniques

| Technique | Purpose | Difficulty |
|-----------|---------|------------|
| **MeshToonMaterial** | Cel-shading for stylized look | Easy |
| **Custom toon shader** | More control over cel-shading | Medium |
| **EffectComposer** | Post-processing pipeline | Easy |
| **OutlinePass** | Cartoon outlines | Easy |
| **UnrealBloomPass** | Glow effects | Easy |
| **PointsMaterial particles** | Dust, sparkles | Easy |
| **Baked lighting via GLB** | Pre-computed lighting | Hard (Blender) |
| **GLTFLoader** | Import 3D models | Easy |

---

## 6. Key Takeaways

1. **The shader is more important than the models.** MeshToonMaterial + OutlinePass can make even box geometry look cohesive and stylized. This is the highest-leverage upgrade.

2. **Baked lighting is the performance cheat code.** For a static room, bake everything in Blender and the GPU basically runs for free. Only dynamic lights for the robots.

3. **Color palette enforcement is non-negotiable.** Either use a shared texture atlas or strictly define colors. When everything samples from the same 20-30 colors, it inherently looks unified.

4. **Tripo + Flux Kontext is the best AI approach for consistent characters.** The context-aware generation specifically solves the "assets from different games" problem.

5. **Astroneer's lesson: constraint IS the style.** By removing textures entirely and using only flat colors + geometry, they achieved instant visual cohesion. Consider this extreme approach - it would mean stripping texture maps from AI-generated models and applying flat palette colors.

6. **The fastest upgrade is post-processing.** Adding OutlinePass + BloomPass to the existing scene (zero model changes) immediately shifts the aesthetic from "WebGL demo" to "stylized indie game."

7. **Animated micro-details sell "aliveness."** Floating dust particles, string light oscillation, and monitor flicker cost almost nothing in performance but dramatically increase the "cozy lab" feel.

---

## Sources

### Environment Pipeline & Workflow
- [3D AI Studio: Ultimate Indie Game Development Toolkit](https://www.3daistudio.com/blog/ultimate-indie-game-development-toolkit-2025)
- [Thundercloud Studio: Stylized 3D Environment Workflow](https://thundercloud-studio.com/article/stylized-3d-environment-tip-tricks/)
- [Codrops: 3D World in Browser with Blender and Three.js](https://tympanus.net/codrops/2025/04/08/3d-world-in-the-browser-with-blender-and-three-js/)
- [Animatics: Modular 3D Models in Game Development](https://www.animaticsassetstore.com/2025/07/28/modular-3d-models-revolutionizing-game-development/)

### AI 3D Generation Tools
- [Medium: AI 3D Model Generators Compared (Jan 2026)](https://medium.com/data-science-in-your-pocket/ai-3d-model-generators-compared-tripo-ai-meshy-ai-rodin-ai-and-more-8d42cc841049)
- [3D AI Studio: Best Meshy Alternatives 2026](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/meshy-alternative)
- [3D AI Studio: 10 AI 3D Tools for Game Devs 2026](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/best-3d-generation-tools-2026/10-ai-3d-tools-game-devs-playable-assets-2026)
- [Sloyd AI: 3D AI Pricing Comparison 2026](https://www.sloyd.ai/blog/3d-ai-price-comparison)
- [SimInsights: Is AI Ready for High-Quality 3D Assets in 2025?](https://www.siminsights.com/ai-3d-generators-2025-production-readiness/)

### Tripo AI Style Consistency
- [Tripo: AI Model Stylization Feature](https://www.tripo3d.ai/features/ai-model-stylization)
- [Tripo: Flux Kontext Enhanced Inputs](https://www.tripo3d.ai/features/image-gen-flux-kontext)
- [Tripo: How to Achieve Different Artistic Styles](https://www.tripo3d.ai/blog/how-to-achieve-different-artistic-styles)

### Style Consistency & Art Bibles
- [Juego Studios: Visual Consistency in Game Art](https://www.juegostudio.com/blog/maintain-visual-consistency-external-art-teams)
- [Art Bible Reference Guide](https://dusthandler.github.io/Art_Bible/)
- [Whizzy Studios: Consistency Across 3D Character Lineups](https://www.whizzystudios.com/post/maintaining-consistency-across3d-character-lineups)
- [Number Analytics: Mastering Style Guides in Game Art](https://www.numberanalytics.com/blog/mastering-style-guides-in-game-art)

### Astroneer & Monument Valley Art Style
- [Astroneer Blog: The Art of Astroneer - Low Poly](https://blog.astroneer.space/p/the-art-of-astroneer-low-poly/)
- [Nate Bauer: Monument Valley Design Analysis](https://nabauer.com/monument-valley-design-analysis/)
- [Creative Bloq: The Making of Monument Valley](https://www.creativebloq.com/computer-arts/making-monument-valley-71412213)

### Three.js Shaders & Post-Processing
- [Maya NDLJK: Custom Toon Shader in Three.js Tutorial](https://www.maya-ndljk.com/blog/threejs-basic-toon-shader)
- [GitHub: mayacoda/toon-shader](https://github.com/mayacoda/toon-shader)
- [SBCode: MeshToonMaterial Tutorial](https://sbcode.net/threejs/meshtoonmaterial/)
- [GitHub: pmndrs/postprocessing](https://github.com/pmndrs/postprocessing)
- [MoldStud: Color Grading in Three.js](https://moldstud.com/articles/p-an-in-depth-look-at-color-grading-techniques-in-threejs-post-processing)

### Baked Lighting
- [tchayen: Baked Lighting in r3f](https://tchayen.github.io/posts/baked-lighting-in-r3f)
- [Pixel Capture: Lightmap Baking in Blender for Three.js](https://www.pixel-capture.com/tutorials/lightmap-baking-in-blender)
- [Three.js Journey: Baking and Exporting the Scene](https://threejs-journey.com/lessons/baking-and-exporting-the-scene)

### Color Palette & Texture Atlas
- [Rhombico Games: Color Atlas Generator](https://www.rhombicogames.com/for-developers/color-atlas-generator/)
- [BlenderNation: Texturing Low Poly Art with Color Palettes](https://www.blendernation.com/2020/05/21/texturing-low-poly-art-with-color-palettes/)
- [GlobalStep: Textures and Surfaces in Stylized Game Art](https://globalstep.com/blog/textures-and-surfaces-crafting-stylized-appeal-in-video-game-art/)
- [Wintermute Digital: Texturing Low Poly Art with Colour Palettes](https://wintermutedigital.com/post/lowpoly-colour-palettes/)

### Free Asset Packs
- [KayKit Furniture Bits (itch.io)](https://kaylousberg.itch.io/furniture-bits)
- [Sketchfab: Low Poly Office Furniture](https://sketchfab.com/tags/low-poly-furniture)
- [Sketchfab: Office Room 15 Low-poly](https://sketchfab.com/3d-models/office-room-15-low-poly-3d-model-0402e7c67e0e4a6abc51a7269f59600a)

### Three.js Particles & Animation
- [Three.js Journey: Particles](https://threejs-journey.com/lessons/particles)
- [Codrops: Dreamy Particle Effect with Three.js](https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/)
- [Medium: Particle VFX in Three.js](https://jowwii.medium.com/why-does-your-three-js-project-feel-empty-discover-the-power-of-particle-vfx-a83d16ce5335)

### MagicaVoxel
- [MagicaVoxel Official](https://ephtracy.github.io/)
- [Mega Voxels: How to Export from MagicaVoxel](https://www.megavoxels.com/learn/how-to-export-from-magicavoxel/)
- [V-Optimizer by Vailor1 (itch.io)](https://vailor1.itch.io/v-optimizer)
