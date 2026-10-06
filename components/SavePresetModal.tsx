import React, { useState } from 'react';
import { PersonalPreset, ImagePromptJson } from '../types';

interface SavePresetModalProps {
  currentJsonString: string;
  onSave: (name: string, category: PersonalPreset['category'], description: string, data: Partial<ImagePromptJson>) => void;
  onClose: () => void;
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  currentJsonString,
  onSave,
  onClose
}) => {
  let parsedJson: Partial<ImagePromptJson> = {};
  let isValidJson = false;

  try {
    parsedJson = JSON.parse(currentJsonString);
    isValidJson = true;
  } catch {
    isValidJson = false;
  }

  const [name, setName] = useState('');
  const [category, setCategory] = useState<PersonalPreset['category']>('Character');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'all' | 'character' | 'style'>('all');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a preset name.');
      return;
    }
    if (!isValidJson) {
      setError('Current JSON structure in the editor is invalid.');
      return;
    }

    let dataToSave: Partial<ImagePromptJson> = {};

    if (scope === 'character') {
      dataToSave = {
        subject: parsedJson.subject,
        posing: parsedJson.posing,
        skin_texture: parsedJson.skin_texture,
        additional_details: parsedJson.additional_details,
        mood: parsedJson.mood
      };
    } else if (scope === 'style') {
      dataToSave = {
        art_style: parsedJson.art_style,
        lighting: parsedJson.lighting,
        texture: parsedJson.texture,
        color_palette: parsedJson.color_palette,
        composition: parsedJson.composition,
        camera_angle: parsedJson.camera_angle,
        mood: parsedJson.mood
      };
    } else {
      dataToSave = { ...parsedJson };
    }

    // Clean undefined/empty keys
    Object.keys(dataToSave).forEach((k) => {
      const key = k as keyof ImagePromptJson;
      if (dataToSave[key] === undefined) delete dataToSave[key];
    });

    onSave(name.trim(), category, description.trim(), dataToSave);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-card rounded-[2.5rem] max-w-lg w-full p-8 shadow-[0_0_50px_rgba(var(--primary-500-rgb),0.25)] border border-primary-500/30 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold text-lg">
              ⭐
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Save Personal Preset</h3>
              <p className="text-xs text-white/50">Store this JSON configuration in localStorage</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Preset Name */}
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">
              Preset Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="e.g. Cyber Detective, Ethereal Oil Style, Chibi Mascot..."
              className="w-full glass-input rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">
              Configuration Type / Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Character', 'Art Style', 'Scene', 'Custom'] as PersonalPreset['category'][]).map(cat => {
                const isSelected = category === cat;
                const icon = cat === 'Character' ? '👤' : cat === 'Art Style' ? '🎨' : cat === 'Scene' ? '🏙️' : '⚙️';
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      if (cat === 'Character') setScope('character');
                      else if (cat === 'Art Style') setScope('style');
                      else setScope('all');
                    }}
                    className={`py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1 border transition-all ${
                      isSelected
                        ? 'bg-primary-500 text-white border-primary-400 shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.3)]'
                        : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{icon}</span>
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">
              Parameters to Include
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`py-2 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                  scope === 'all'
                    ? 'bg-white/15 text-white border-white/30'
                    : 'bg-white/5 text-white/40 border-white/5 hover:text-white'
                }`}
              >
                All Fields
              </button>
              <button
                type="button"
                onClick={() => setScope('character')}
                className={`py-2 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                  scope === 'character'
                    ? 'bg-white/15 text-white border-white/30'
                    : 'bg-white/5 text-white/40 border-white/5 hover:text-white'
                }`}
              >
                Character Core
              </button>
              <button
                type="button"
                onClick={() => setScope('style')}
                className={`py-2 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                  scope === 'style'
                    ? 'bg-white/15 text-white border-white/30'
                    : 'bg-white/5 text-white/40 border-white/5 hover:text-white'
                }`}
              >
                Art & Lighting
              </button>
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. For recurring sci-fi protagonist with cyber visor"
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white/80 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold rounded-xl transition-all uppercase text-xs tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-black rounded-xl transition-all uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(var(--primary-500-rgb),0.4)]"
            >
              Save to Presets
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
