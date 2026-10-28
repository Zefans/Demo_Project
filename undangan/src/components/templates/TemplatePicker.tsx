import React from 'react';
import { TEMPLATE_THEMES } from '../../types/invitation';
import type { TemplateId } from '../../types/invitation';

interface Props {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
}

const PREVIEW_CONTENT: Record<TemplateId, { icon: string; sample: React.ReactNode }> = {
  'playful-garden': {
    icon: '🌸',
    sample: (
      <div className="h-full flex flex-col items-center justify-center p-4 font-body">
        <div className="text-2xl mb-1">🌸🦋🌿</div>
        <p className="text-xs tracking-widest opacity-60 mb-1">The Wedding of</p>
        <p className="font-handwrite text-2xl leading-none" style={{ color: '#ec4899' }}>Rizky</p>
        <p className="text-xs opacity-50">&amp;</p>
        <p className="font-handwrite text-2xl leading-none" style={{ color: '#ec4899' }}>Salsa</p>
        <div className="mt-3 flex gap-1">
          {['🌷', '✨', '🌼'].map(e => <span key={e} className="text-sm">{e}</span>)}
        </div>
      </div>
    ),
  },
  'retro-love': {
    icon: '♡',
    sample: (
      <div className="h-full flex flex-col items-center justify-center p-4 font-body">
        <div className="text-xl font-bold mb-2 opacity-30">♡ ★ ♡</div>
        <div className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 mb-2" style={{ background: '#dc2626', color: '#fff' }}>
          The Wedding Of
        </div>
        <p className="font-retro text-2xl leading-none" style={{ color: '#dc2626' }}>Rizky</p>
        <p className="font-handwrite text-xl opacity-60">&amp;</p>
        <p className="font-retro text-2xl leading-none" style={{ color: '#dc2626' }}>Salsa</p>
        <div className="mt-3 border-2 border-dashed px-3 py-1 text-xs" style={{ borderColor: '#fde68a', color: '#78350f' }}>
          2025
        </div>
      </div>
    ),
  },
  'modern-editorial': {
    icon: '—',
    sample: (
      <div className="h-full grid grid-cols-2">
        <div className="flex flex-col justify-end p-3" style={{ background: '#0f172a' }}>
          <p className="font-mono text-xs text-white opacity-30 mb-1">01 /</p>
          <p className="font-display text-xl text-white leading-tight">Rizky</p>
          <div className="h-px bg-white opacity-20 my-1" />
          <p className="font-display text-xl text-white leading-tight">Salsa</p>
        </div>
        <div className="flex flex-col justify-center p-3" style={{ background: '#f8fafc' }}>
          <div className="w-full aspect-square mb-2" style={{ background: '#e2e8f0' }} />
          <p className="font-mono text-xs" style={{ color: '#64748b' }}>Editorial</p>
        </div>
      </div>
    ),
  },
};

export default function TemplatePicker({ selected, onSelect }: Props) {
  const templates = Object.values(TEMPLATE_THEMES);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Pilih Template</p>
      <div className="grid gap-3">
        {templates.map((tmpl) => {
          const isSelected = selected === tmpl.id;
          const preview = PREVIEW_CONTENT[tmpl.id];
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => onSelect(tmpl.id)}
              className="w-full text-left rounded-2xl overflow-hidden border-2 transition hover:shadow-md active:scale-[0.99]"
              style={{
                borderColor: isSelected ? tmpl.colors.primary : '#e5e7eb',
                background: isSelected ? `${tmpl.colors.primary}08` : '#fff',
              }}
              aria-pressed={isSelected}
              aria-label={`Template: ${tmpl.name}`}
            >
              <div
                className="h-32 relative overflow-hidden"
                style={{ background: tmpl.previewBg }}
              >
                {preview.sample}
              </div>
              <div className="p-3 flex items-start gap-2">
                <span className="text-xl">{preview.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{tmpl.name}</p>
                  <p className="text-xs text-gray-500 leading-snug">{tmpl.description}</p>
                </div>
                {isSelected && (
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ background: tmpl.colors.primary }}
                  >
                    ✓ Aktif
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

