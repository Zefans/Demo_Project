import React from 'react';
import type { InvitationData, TemplateId } from '../../types/invitation';
import PlayfulGardenTemplate from './PlayfulGardenTemplate';
import RetroLoveTemplate from './RetroLoveTemplate';
import ModernEditorialTemplate from './ModernEditorialTemplate';
import OliveLinenTemplate from './OliveLinenTemplate';

function BackgroundMusic({ musicUrl }: { musicUrl?: string }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);

  let safeUrl = '';
  try {
    const url = new URL(musicUrl ?? '');
    if (url.protocol === 'https:' || url.protocol === 'http:') safeUrl = url.toString();
  } catch { /* No valid direct audio URL has been provided. */ }

  React.useEffect(() => {
    setPlaying(false);
    audioRef.current?.pause();
  }, [safeUrl]);

  if (!safeUrl) return null;

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); setPlaying(true); }
      catch { setPlaying(false); }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <div style={{ position: 'fixed', zIndex: 1000, right: '1rem', bottom: '1rem' }}>
      <audio ref={audioRef} src={safeUrl} loop preload="none" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Jeda musik latar' : 'Putar musik latar'}
        style={{ border: '1px solid #d9d7c8', borderRadius: 999, padding: '.7rem 1rem', background: '#fffdf8', color: '#39483b', boxShadow: '0 6px 24px #30352e25', fontSize: '.8rem', cursor: 'pointer' }}
      >
        {playing ? 'Ⅱ Jeda musik' : '▶ Putar musik'}
      </button>
    </div>
  );
}

interface Props {
  data: InvitationData;
  guestName?: string;
  isPreview?: boolean;
}

export default function TemplateRenderer({ data, guestName, isPreview = false }: Props) {
  const map: Record<TemplateId, React.ComponentType<Props>> = {
    'playful-garden': PlayfulGardenTemplate,
    'retro-love': RetroLoveTemplate,
    'modern-editorial': ModernEditorialTemplate,
    'olive-linen': OliveLinenTemplate,
  };

  const Component = map[data.templateId] ?? PlayfulGardenTemplate;
  return (
    <>
      <Component data={data} guestName={guestName} isPreview={isPreview} />
      <BackgroundMusic musicUrl={data.musicUrl} />
    </>
  );
}

