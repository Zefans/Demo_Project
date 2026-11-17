import React from 'react';
import './InvitationPages.css';

interface PageItem {
  id: string;
  label: string;
}

const pageLabels = [
  'Sampul', 'Pembuka', 'Mempelai', 'Foto', 'Acara', 'Hitung Mundur',
  'Cerita', 'Galeri', 'RSVP', 'Hadiah', 'Penutup', 'Bagikan',
];

export default function InvitationPages({ children }: { children: React.ReactNode }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [pages, setPages] = React.useState<PageItem[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    document.documentElement.classList.add('invitation-page-mode');
    const sections = Array.from(container.querySelectorAll<HTMLElement>('section'));
    const items = sections.map((section, index) => {
      const id = section.id || `undangan-halaman-${index + 1}`;
      section.id = id;
      section.dataset.invitationPage = 'true';
      section.setAttribute('aria-label', pageLabels[index] ?? `Halaman ${index + 1}`);
      return { id, label: pageLabels[index] ?? `Halaman ${index + 1}` };
    });
    setPages(items);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = sections.indexOf(visible.target as HTMLElement);
      if (index >= 0) setActiveIndex(index);
    }, { threshold: [0.15, 0.35, 0.6] });
    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('invitation-page-mode');
      sections.forEach((section) => {
        delete section.dataset.invitationPage;
        section.removeAttribute('aria-label');
      });
    };
  }, []);

  function goTo(index: number) {
    const safeIndex = Math.max(0, Math.min(index, pages.length - 1));
    const page = pages[safeIndex];
    if (!page) return;
    document.getElementById(page.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveIndex(safeIndex);
  }

  return (
    <div ref={containerRef} className="invitation-pages" id="public-invitation-pages">
      {children}
      {pages.length > 1 && (
        <nav className="invitation-page-nav" aria-label="Navigasi halaman undangan">
          <button
            type="button"
            className="invitation-page-arrow"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Halaman sebelumnya"
          >
            ←
          </button>
          <div className="invitation-page-status" aria-live="polite">
            <span>{String(activeIndex + 1).padStart(2, '0')}</span>
            <span className="invitation-page-divider">/</span>
            <span>{String(pages.length).padStart(2, '0')}</span>
            <span className="invitation-page-label">{pages[activeIndex]?.label}</span>
          </div>
          <button
            type="button"
            className="invitation-page-arrow"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex >= pages.length - 1}
            aria-label="Halaman berikutnya"
          >
            →
          </button>
        </nav>
      )}
    </div>
  );
}
