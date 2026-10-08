/**
 * Cinematic Storyboard Sequencer & Veo 3 Motion Vector Director
 * NKI Studio v4.3 Breakthrough Pillar 2
 * 
 * Direct AI Cinema & Multi-Act Visual Storyboarding with Camera Motion Vectors
 * for Google Veo 3, Runway Gen-3, Sora, and Midjourney/Imagen.
 */

export type CameraMovement = 
  | 'static'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'dolly_in'
  | 'dolly_out'
  | 'dolly_zoom'
  | 'orbit_360'
  | 'crane_boom'
  | 'fpv_drone'
  | 'dutch_angle'
  | 'whip_pan';

export type LensType = 
  | '14mm_ultra_wide'
  | '24mm_wide'
  | '35mm_master'
  | '50mm_standard'
  | '85mm_portrait'
  | '135mm_telephoto'
  | 'anamorphic_2x';

export type DirectorStyle = 
  | 'christopher_nolan'
  | 'denis_villeneuve'
  | 'wes_anderson'
  | 'cyberpunk_anime'
  | 'david_fincher'
  | 'cinematic_documentary';

export interface StoryboardScene {
  id: string;
  sceneNumber: number;
  actTitle: string;
  shotType: 'Extreme Wide Shot' | 'Wide Shot' | 'Medium Shot' | 'Close Up' | 'Extreme Close Up' | 'Dutch Tilt';
  cameraMovement: CameraMovement;
  lens: LensType;
  actionDescription: string;
  lightingMood: string;
  generatedImageSrc?: string;
  veoPrompt: string;
  status: 'idle' | 'generating' | 'ready' | 'error';
}

export interface DirectorPreset {
  id: DirectorStyle;
  name: string;
  description: string;
  visualKeywords: string;
  cameraPhilosophy: string;
}

export const DIRECTOR_PRESETS: DirectorPreset[] = [
  {
    id: 'denis_villeneuve',
    name: 'Denis Villeneuve (Dune / Blade Runner 2049)',
    description: 'Brutalist scale, monolithic architecture, muted sand & cyan tones, slow deliberate push-ins.',
    visualKeywords: 'monolithic brutalism, atmospheric haze, dust particles, golden desert ochre, 65mm IMAX format, tactile realism',
    cameraPhilosophy: 'slow steady forward dolly, architectural symmetry, grand establishing scale'
  },
  {
    id: 'christopher_nolan',
    name: 'Christopher Nolan (Oppenheimer / Inception)',
    description: 'Photochemical 70mm IMAX grain, ticking practical tension, cross-cutting momentum, naturalistic lighting.',
    visualKeywords: 'IMAX 70mm photochemical aesthetic, high-contrast chiaroscuro, natural golden practical lights, film negative grain',
    cameraPhilosophy: 'steadicam tracking following subject closely, sudden dramatic rack focus'
  },
  {
    id: 'wes_anderson',
    name: 'Wes Anderson (Grand Budapest Hotel)',
    description: 'Perfect geometric symmetry, pastel color palettes, flat frontal 90° pans, whimsical diorama framing.',
    visualKeywords: 'ultra-meticulous planar symmetry, pastel color blocking, retro 35mm film stock, vibrant saturated palette, diorama stage aesthetics',
    cameraPhilosophy: 'perfect 90-degree whip-pan, locked-off frontal center framing, flat lateral tracking'
  },
  {
    id: 'cyberpunk_anime',
    name: 'Cyberpunk Edgerunners / Ghost in the Shell',
    description: 'Neon volumetric bloom, rainy reflections, chromatic aberration, explosive anime motion vectors.',
    visualKeywords: 'volumetric neon pink and cyan fog, glossy wet asphalt reflections, holographic glare, anime cel-shaded edge highlights, raw anamorphic flares',
    cameraPhilosophy: 'dynamic Dutch angle, rapid zoom snap, high-speed FPV tracking'
  },
  {
    id: 'david_fincher',
    name: 'David Fincher (Mindhunter / Se7en)',
    description: 'Clinical robotic camera precision, murky green/yellow tint, ultra-clean low-key lighting, razor-sharp focus.',
    visualKeywords: 'meticulous low-key green-amber tint, clinical precision, deep blacks, high micro-contrast, sterile modern composition',
    cameraPhilosophy: 'mechanical robotic tripod pan, zero handheld jitter, measured pacing'
  },
  {
    id: 'cinematic_documentary',
    name: 'National Geographic / HBO Documentary',
    description: 'Unfiltered raw human truth, natural ambient light, authentic texture, cinematic telephoto isolation.',
    visualKeywords: 'hyper-realistic documentary texture, unvarnished natural daylight, shallow depth of field, real skin imperfections, candid emotion',
    cameraPhilosophy: 'subtle handheld breath, observational zoom, organic reframing'
  }
];

export const CAMERA_MOTION_LABELS: Record<CameraMovement, { label: string; motionVector: string }> = {
  static: { label: 'Static Lock (Chân máy cố định)', motionVector: 'locked-off tripod shot, zero camera shake, pure stillness' },
  pan_left: { label: 'Pan Left (Quay trái)', motionVector: 'smooth camera pan left across the horizon, sweeping transition' },
  pan_right: { label: 'Pan Right (Quay phải)', motionVector: 'fluid camera pan right following the subject motion vector' },
  tilt_up: { label: 'Tilt Up (Chếch lên)', motionVector: 'slow vertical tilt up revealing towering height and sky' },
  tilt_down: { label: 'Tilt Down (Chếch xuống)', motionVector: "dramatic tilt down from above down to the protagonist's eyes" },
  dolly_in: { label: 'Dolly In (Đẩy vào cận)', motionVector: 'smooth slow dolly push-in toward the focal subject, increasing dramatic tension' },
  dolly_out: { label: 'Dolly Out (Lùi xa dần)', motionVector: 'steady dolly zoom pull-out expanding the monumental surroundings' },
  dolly_zoom: { label: 'Vertigo Dolly Zoom (Co giãn tiêu cự)', motionVector: 'classic Hitchcock Vertigo dolly zoom, background warping while subject maintains frame size' },
  orbit_360: { label: 'Orbit 360° (Xoay tròn quanh mẫu)', motionVector: '360 degree circular camera orbit around the protagonist in heroic cinematic motion' },
  crane_boom: { label: 'Crane / Jib Boom Up (Cẩu máy nâng cao)', motionVector: 'high crane jib boom ascending smoothly into the heavens, bird eye reveal' },
  fpv_drone: { label: 'FPV Kinetic Fly-through (Flycam tốc độ cao)', motionVector: 'high-speed dynamic FPV racing drone trajectory swooping through obstacles' },
  dutch_angle: { label: 'Dutch Tilt (Góc nghiêng điện ảnh)', motionVector: 'canted dutch angle with slow rotating momentum, psychological disorientation' },
  whip_pan: { label: 'Whip Pan (Vụt máy nhanh)', motionVector: 'ultra-fast kinetic whip pan with directional motion blur transition' }
};

export const LENS_LABELS: Record<LensType, { label: string; opticDetails: string }> = {
  '14mm_ultra_wide': { label: '14mm Ultra-Wide', opticDetails: '14mm rectilinear ultra-wide lens, expansive panoramic perspective, dramatic foreground scale' },
  '24mm_wide': { label: '24mm Wide Master', opticDetails: '24mm cinematic wide lens, natural environmental context with slight perspective stretch' },
  '35mm_master': { label: '35mm Prime', opticDetails: '35mm master cine prime, classic cinematic storytelling balance between human and environment' },
  '50mm_standard': { label: '50mm Human Eye', opticDetails: '50mm focal length, true-to-life zero optical distortion, natural human perception' },
  '85mm_portrait': { label: '85mm Portrait Bokeh', opticDetails: '85mm f/1.2 cine lens, creamy blurred background bokeh, extreme subject isolation' },
  '135mm_telephoto': { label: '135mm Telephoto', opticDetails: '135mm telephoto compression, cinematic spatial flattening, cinematic intimacy' },
  'anamorphic_2x': { label: '2.39:1 Anamorphic 2x', opticDetails: '2.39:1 cinemascope anamorphic glass, oval bokeh, horizontal blue streak flares' }
};

/**
 * Creates default 4-Act Storyboard for a given concept
 */
export function createDefaultStoryboard(
  projectTitle: string,
  conceptDesc: string,
  directorStyle: DirectorStyle = 'denis_villeneuve'
): StoryboardScene[] {
  const acts = [
    {
      actTitle: 'Hồi 1: Thiết Lập Bối Cảnh (Establishing)',
      shotType: 'Extreme Wide Shot' as const,
      cameraMovement: 'crane_boom' as const,
      lens: '24mm_wide' as const,
      action: `Toàn cảnh không gian rộng lớn của ${conceptDesc}. Khung cảnh hùng vĩ dần lộ diện dưới ánh sáng bình minh.`,
      lighting: 'Atmospheric golden hour, low sun angle, sweeping volumetric god rays'
    },
    {
      actTitle: 'Hồi 2: Biến Cố & Hành Trình (Inciting Action)',
      shotType: 'Medium Shot' as const,
      cameraMovement: 'pan_right' as const,
      lens: '35mm_master' as const,
      action: `Nhân vật chính bước đi giữa khung cảnh, tương tác với môi trường xung quanh, phát hiện ra dấu vết bí ẩn.`,
      lighting: 'Chiaroscuro side lighting with rim light highlighting silhouette'
    },
    {
      actTitle: 'Hồi 3: Đỉnh Điểm Cao Trào (Dynamic Climax)',
      shotType: 'Close Up' as const,
      cameraMovement: 'dolly_in' as const,
      lens: '85mm_portrait' as const,
      action: `Cận cảnh ánh mắt quyết đoán và cảm xúc mãnh liệt khi đối diện thử thách then chốt. Hạt bụi và hơi thở mờ ảo.`,
      lighting: 'Dramatic high-contrast key light, intense optical reflection in iris'
    },
    {
      actTitle: 'Hồi 4: Hồi Kết & Dư Ba (Cinematic Outro)',
      shotType: 'Wide Shot' as const,
      cameraMovement: 'dolly_out' as const,
      lens: 'anamorphic_2x' as const,
      action: `Camera từ từ lùi xa, nhân vật hòa vào bức tranh toàn cảnh bất tận, để lại dư âm điện ảnh sâu lắng.`,
      lighting: 'Dusk twilight, deep cerulean and crimson gradient horizon'
    }
  ];

  return acts.map((act, index) => {
    const scene: StoryboardScene = {
      id: `scene-${Date.now()}-${index + 1}`,
      sceneNumber: index + 1,
      actTitle: act.actTitle,
      shotType: act.shotType,
      cameraMovement: act.cameraMovement,
      lens: act.lens,
      actionDescription: act.action,
      lightingMood: act.lighting,
      veoPrompt: '',
      status: 'idle'
    };

    scene.veoPrompt = synthesizeVeo3Prompt(scene, directorStyle, 24, 5);
    return scene;
  });
}

/**
 * Synthesizes specialized Prompt for Google Veo 3 / Runway Gen-3 Alpha
 */
export function synthesizeVeo3Prompt(
  scene: StoryboardScene,
  directorStyle: DirectorStyle,
  fps = 24,
  durationSec = 5
): string {
  const dir = DIRECTOR_PRESETS.find(d => d.id === directorStyle) || DIRECTOR_PRESETS[0];
  const motion = CAMERA_MOTION_LABELS[scene.cameraMovement] || CAMERA_MOTION_LABELS.static;
  const lens = LENS_LABELS[scene.lens] || LENS_LABELS['35mm_master'];

  return [
    `[Veo 3 Cinematic Video Motion Prompt]`,
    `SHOT: ${scene.shotType}, ${scene.actTitle}.`,
    `ACTION: ${scene.actionDescription}`,
    `CAMERA MOVEMENT: ${motion.motionVector}.`,
    `OPTICS & LENS: ${lens.opticDetails}.`,
    `LIGHTING & COLOR: ${scene.lightingMood}. Directed in the cinematic style of ${dir.name}.`,
    `VISUAL SIGNATURE: ${dir.visualKeywords}. Film grain, photorealistic motion vectors, ${fps}fps cinematic cadence, ${durationSec} seconds continuous take.`
  ].join(' ');
}

/**
 * Synthesizes Image Generation Prompt for NKI Studio Canvas
 */
export function synthesizeImagePromptForScene(
  scene: StoryboardScene,
  directorStyle: DirectorStyle,
  characterSubject: string = ''
): string {
  const dir = DIRECTOR_PRESETS.find(d => d.id === directorStyle) || DIRECTOR_PRESETS[0];
  const lens = LENS_LABELS[scene.lens] || LENS_LABELS['35mm_master'];

  const subjectChunk = characterSubject ? `Featuring character: ${characterSubject}. ` : '';

  return `Cinematic movie film still, ${scene.shotType}. ${subjectChunk}${scene.actionDescription}. Directed by ${dir.name}. ${dir.visualKeywords}. Shot on ${lens.opticDetails}. ${scene.lightingMood}. Masterpiece cinematic photography, 8k resolution, photorealistic, IMAX production quality, flawless composition.`;
}

/**
 * Export Storyboard project as formatted JSON
 */
export function exportStoryboardProjectJson(title: string, scenes: StoryboardScene[]): string {
  const payload = {
    projectTitle: title,
    exportedAt: new Date().toISOString(),
    totalScenes: scenes.length,
    scenes: scenes.map(s => ({
      sceneNumber: s.sceneNumber,
      actTitle: s.actTitle,
      shotType: s.shotType,
      cameraMovement: s.cameraMovement,
      lens: s.lens,
      actionDescription: s.actionDescription,
      lightingMood: s.lightingMood,
      veoPrompt: s.veoPrompt,
      hasImage: !!s.generatedImageSrc
    }))
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Export Storyboard as clean Markdown for Production Directors
 */
export function exportStoryboardMarkdown(title: string, scenes: StoryboardScene[], directorStyle: DirectorStyle): string {
  const dir = DIRECTOR_PRESETS.find(d => d.id === directorStyle) || DIRECTOR_PRESETS[0];
  let md = `# CINEMATIC STORYBOARD DIRECTOR'S SHEET: ${title}\n`;
  md += `**Director Vision Style:** ${dir.name}\n`;
  md += `**Aesthetic:** ${dir.description}\n`;
  md += `**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n`;

  scenes.forEach(s => {
    md += `## Scene ${s.sceneNumber}: ${s.actTitle}\n`;
    md += `- **Shot Framing:** ${s.shotType}\n`;
    md += `- **Camera Motion Vector:** ${CAMERA_MOTION_LABELS[s.cameraMovement]?.label}\n`;
    md += `- **Lens / Optics:** ${LENS_LABELS[s.lens]?.label}\n`;
    md += `- **Action & Beats:** ${s.actionDescription}\n`;
    md += `- **Lighting Atmosphere:** ${s.lightingMood}\n\n`;
    md += `### 🎬 Google Veo 3 / Runway Motion Prompt:\n`;
    md += `\`\`\`text\n${s.veoPrompt}\n\`\`\`\n\n---\n\n`;
  });

  return md;
}
