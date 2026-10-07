import { getGeminiClient, compressBase64Image, prepareInlineData, callWithRetry, trackRequest } from './geminiService';
import { getStudioModelConfig } from './modelConfigService';

export type WardrobeCategory = 'haute_couture' | 'cyberpunk' | 'traditional' | 'streetwear' | 'tactical';

export interface WardrobeOutfit {
  id: string;
  name: string;
  category: WardrobeCategory;
  icon: string;
  description: string;
  promptDirective: string;
}

export const WARDROBE_COLLECTION: WardrobeOutfit[] = [
  {
    id: 'gala_sequin',
    name: 'Dạ Hội Kim Sa (Gala Sequin Gown)',
    category: 'haute_couture',
    icon: '✨',
    description: 'Váy dạ hội đuôi cá kim sa lấp lánh ánh bạc quý phái',
    promptDirective: 'luxurious haute couture floor-length mermaid gown embroidered with iridescent silver sequins, elegant sweetheart neckline, premium silk chiffon drape'
  },
  {
    id: 'champagne_satin',
    name: 'Đầm Lụa Satin Champagne (Silk Slip Dress)',
    category: 'haute_couture',
    icon: '🥂',
    description: 'Đầm lụa tơ tằm màu vàng champagne óng ả mềm mại',
    promptDirective: 'high-fashion fluid champagne gold silk satin cowl-neck slip dress, delicate bias cut, natural liquid sheen under studio lights'
  },
  {
    id: 'cyber_led_coat',
    name: 'Áo Khoác Da LED (Cyber Trench)',
    category: 'cyberpunk',
    icon: '⚡',
    description: 'Áo khoác da đen cổ đứng dạ quang neon xanh tương lai',
    promptDirective: 'cutting-edge cyberpunk matte black distressed leather trench coat with luminescent cyan LED fiber optic trims along high collar and lapels, techwear modular buckles'
  },
  {
    id: 'carbon_tactical',
    name: 'Giáp Sợi Carbon (Exo-Armor)',
    category: 'tactical',
    icon: '🛡️',
    description: 'Bộ giáp chiến thuật composite sợi carbon siêu nhẹ',
    promptDirective: 'military-grade sleek composite carbon fiber tactical vest, matte titanium reinforced shoulder pauldrons, ergonomic ballistic mesh underlayer'
  },
  {
    id: 'ao_dai_hoang_gia',
    name: 'Áo Dài Hoàng Gia Lụa Hà Đông',
    category: 'traditional',
    icon: '🎋',
    description: 'Áo dài lụa tơ tằm thêu hoa sen chỉ vàng truyền thống',
    promptDirective: 'traditional Vietnamese royal silk Áo Dài, imperial golden lotus embroidery across chest and cuffs, flowing translucent silk pants, regal Vietnamese haute heritage'
  },
  {
    id: 'kimono_gam',
    name: 'Kimono Gấm Hoa Nhật Bản',
    category: 'traditional',
    icon: '🌸',
    description: 'Kimono lụa gấm dệt hoa anh đào và đai Obi chỉ vàng',
    promptDirective: 'ceremonial Japanese silk brocade kimono with golden cherry blossom motifs, elaborate silk obi sash, exquisite folded fabric collar'
  },
  {
    id: 'y2k_leather_bomber',
    name: 'Bomber Retro Da Vintage (Y2K Streetwear)',
    category: 'streetwear',
    icon: '🛹',
    description: 'Áo khoác bomber da nâu vintage dáng oversized phong trần',
    promptDirective: 'oversized vintage distressed brown leather bomber jacket with ribbed cuffs, heavy metallic brass zip, paired with washed relaxed-fit denim'
  }
];

/**
 * Runs Virtual Outfit Swap using Gemini Multimodal.
 * Replaces clothing while locking body anatomy, pose, head, and facial identity 100%.
 */
export async function runVirtualOutfitSwap(
  baseImage: string,
  outfitPrompt: string,
  clothingMaskBase64?: string,
  referenceImageBase64?: string,
  customModel?: string
): Promise<{ resultImage: string }> {
  trackRequest(2800, "Studio Virtual Wardrobe Swap");

  const compressedBase = await compressBase64Image(baseImage);
  const baseInline = prepareInlineData(compressedBase, 'image/jpeg');

  const parts: any[] = [];
  if (baseInline) parts.push(baseInline);

  if (clothingMaskBase64) {
    const compressedMask = await compressBase64Image(clothingMaskBase64);
    const maskInline = prepareInlineData(compressedMask, 'image/png');
    if (maskInline) parts.push(maskInline);
  }

  if (referenceImageBase64) {
    const compressedRef = await compressBase64Image(referenceImageBase64);
    const refInline = prepareInlineData(compressedRef, 'image/jpeg');
    if (refInline) {
      parts.push({ text: 'REFERENCE OUTFIT / CLOTHING DESIGN:' });
      parts.push(refInline);
    }
  }

  const instructionsText = `You are a high-end virtual fashion stylist and AI clothing replacement engine (Virtual Try-On VFX).
TASK: Change the clothing / outfit worn by the person in the base image to:
"${outfitPrompt}".

CRITICAL ANATOMY & IDENTITY LOCK:
1. 100% PRESERVE HEAD & FACE: Do not alter the person's face, facial features, hair, gaze, expression, or skin tone in any way.
2. 100% PRESERVE POSE & BODY SHAPE: Maintain the exact body posture, shoulder angles, hand positions, waist curves, and stature.
3. ORGANIC FABRIC DRAPE: Realistically drape the new fabric over the body, matching natural gravity, physical folds, ambient lighting, shadows, and environment color reflections.
4. If a reference outfit image is provided, replicate its exact material, color palette, pattern, and design tailoring.
Output ONLY the final photorealistic image with the new outfit.`;

  parts.push({ text: instructionsText });

  const studioConfig = getStudioModelConfig();
  const modelsToTry = [
    customModel || studioConfig.studioModel,
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-3.1-flash-lite-image',
    'gemini-2.5-flash-image'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const client = getGeminiClient();
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await callWithRetry(() => client.models.generateContent({
        model,
        contents: { parts }
      }), 2, 2000);

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return {
              resultImage: `data:${mime};base64,${part.inlineData.data}`
            };
          }
        }
      }
    } catch (err) {
      console.warn(`Model ${model} failed for wardrobe swap, trying fallback...`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("Virtual Wardrobe swap failed across available engines.");
}
