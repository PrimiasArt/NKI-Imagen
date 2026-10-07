export interface TalkingActorParams {
  actorName: string;
  portraitImageSrc?: string;
  dialogueText: string;
  emotion: 'confident' | 'dramatic' | 'cyberpunk' | 'whispering' | 'mysterious' | 'energetic';
  headMovement: 'subtle_nod' | 'camera_stare' | 'slow_turn' | 'expressive';
  voicePacing: 'slow_thoughtful' | 'natural_cadence' | 'rapid_intense';
}

export interface TalkingActorOutput {
  veoVideoPrompt: string;
  audioVoiceoverDirection: string;
  phonemeCadenceSummary: string;
  estimatedDurationSeconds: number;
}

export const TALKING_EMOTIONS = [
  { id: 'confident', label: 'Tự tin, Quyết đoán', icon: '🦁', cue: 'Direct magnetic eye contact, firm jawline, subtle authoritative smirk' },
  { id: 'dramatic', label: 'Kịch tính, Xúc động', icon: '🎭', cue: 'Glistening eyes, heavy emotional breathing, micro-tremor of lower lip' },
  { id: 'cyberpunk', label: 'Lạnh lùng, Cyberpunk', icon: '🤖', cue: 'Minimal expression, steady icy gaze, neon reflection in pupils' },
  { id: 'whispering', label: 'Thì thầm, Bí ẩn', icon: '🤫', cue: 'Intimate close-up, soft mouth movements, leaning slightly toward camera' },
  { id: 'mysterious', label: 'Bí ẩn, Khó đoán', icon: '🔮', cue: 'Subtle tilt of head, knowing enigmatic half-smile, shadowing over eyes' },
  { id: 'energetic', label: 'Sôi nổi, Năng lượng', icon: '⚡', cue: 'Animated expressive eyebrow raises, lively mouth articulation, dynamic head movement' }
];

/**
 * Synthesizes talking character motion directives calibrated for Google Veo 3
 */
export function generateTalkingActorDirectives(params: TalkingActorParams): TalkingActorOutput {
  const words = params.dialogueText.trim().split(/\s+/).length;
  // Estimate ~2.5 words per second
  const estimatedDuration = Math.max(3, Math.min(15, Math.ceil(words / 2.5) + 1));

  const emotionMeta = TALKING_EMOTIONS.find(e => e.id === params.emotion) || TALKING_EMOTIONS[0];

  const headMovementDescriptions = {
    subtle_nod: 'subtle rhythmic head nods reinforcing speech cadence, gentle natural blinking',
    camera_stare: 'piercing unwavering eye contact directly into the camera lens, minimal head movement',
    slow_turn: 'character begins turned 20 degrees profile and slowly rotates to address camera front-on while speaking',
    expressive: 'dynamic natural gesticulation, expressive tilt of chin, active eyebrows matching sentence stress'
  };

  const pacingDescriptions = {
    slow_thoughtful: 'measured deliberate speech pacing with meaningful pauses between clauses',
    natural_cadence: 'smooth, natural conversational rhythm with effortless phoneme articulation',
    rapid_intense: 'urgent rapid dialogue delivery with sharp consonant mouth shapes'
  };

  const veoVideoPrompt = `Cinematic portrait shot of ${params.actorName} talking directly to camera: "${params.dialogueText}". Highly synchronized realistic speech articulation, organic lip sync with visible teeth and tongue movement matching words. Emotional demeanor: ${emotionMeta.cue}. Camera action: ${headMovementDescriptions[params.headMovement]}. Facial animation: natural eye blinks every 3 seconds, subtle eyelid micro-twitches, authentic throat swallowing motion. 85mm portrait prime lens, f/1.8 shallow depth of field, 24fps film cadence, studio lighting.`;

  const audioVoiceoverDirection = `Tone: ${emotionMeta.label}. Speech rate: ${pacingDescriptions[params.voicePacing]}. Dialogue: "${params.dialogueText}"`;

  const phonemeCadenceSummary = `Estimated ${words} words over ${estimatedDuration}s. Speech articulation cadence: ~${(words / estimatedDuration).toFixed(1)} words/sec.`;

  return {
    veoVideoPrompt,
    audioVoiceoverDirection,
    phonemeCadenceSummary,
    estimatedDurationSeconds: estimatedDuration
  };
}
