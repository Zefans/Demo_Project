import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DEFAULT_INVITATION } from '../../types/invitation';
import type { InvitationData, TemplateId, EventInfo, StoryEntry, BankAccount } from '../../types/invitation';
import { saveDraft, loadDraft } from '../../services/storage';
import { saveInvitation, getUserInvitations } from '../../services/invitationService';
import { useAuth } from '../../context/AuthContext';
import TemplateRenderer from '../templates/TemplateRenderer';
import TemplatePicker from '../templates/TemplatePicker';

/**
 * InvitationBuilder — works in two modes:
 * 1. Standalone demo (/builder) — uses localStorage draft, no auth required.
 * 2. Dashboard mode (/dashboard/editor/:id) — user-scoped, auth required.
 */
export default function InvitationBuilder() {
  const { id: paramId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isDashboardMode = !!paramId && !!user;

  const [data, setData] = React.useState<InvitationData>(() => {
    // Dashboard mode: load from user's invitations
    if (paramId && user) {
      const userInvs = getUserInvitations(user.id);
      const found = userInvs.find(i => i.id === paramId);
      if (found) return found;
    }
    // Standalone demo mode: load from legacy draft storage
    const saved = loadDraft('demo-001');
    return saved ?? DEFAULT_INVITATION;
  });

  const [activeSection, setActiveSection] = React.useState<Section>('template');
  const [saveMsg, setSaveMsg] = React.useState('');
  const [showPreview, setShowPreview] = React.useState(false);

  type Section = 'template' | 'couple' | 'event' | 'story' | 'text' | 'bank';

  function update(patch: Partial<InvitationData>) {
    setData(prev => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  }

  function updateCouple(patch: Partial<InvitationData['couple']>) {
    setData(prev => ({ ...prev, couple: { ...prev.couple, ...patch }, updatedAt: new Date().toISOString() }));
  }

  function handleSave() {
    if (isDashboardMode && user) {
      saveInvitation(user.id, data);
      setSaveMsg('✅ Tersimpan ke akun (lokal-demo).');
    } else {
      saveDraft(data);
      setSaveMsg('✅ Draft tersimpan (lokal).');
    }
    setTimeout(() => setSaveMsg(''), 3000);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => update({ coverPhotoUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  }

  function updateEvent(i: number, patch: Partial<EventInfo>) {
    update({ events: data.events.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  }

  function addEvent() {
    update({
      events: [
        ...data.events,
        { title: 'Acara Baru', date: '2025-10-18', time: '09:00', timezone: 'Asia/Jakarta', venue: '', address: '' },
      ],
    });
  }

  function removeEvent(i: number) {
    if (data.events.length <= 1) return;
    update({ events: data.events.filter((_, idx) => idx !== i) });
  }

  function updateStory(i: number, patch: Partial<StoryEntry>) {
    update({ story: data.story.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  }

  function addStory() {
    update({ story: [...data.story, { year: String(new Date().getFullYear()), title: '', description: '' }] });
  }

  function removeStory(i: number) {
    update({ story: data.story.filter((_, idx) => idx !== i) });
  }

  function updateBank(i: number, patch: Partial<BankAccount>) {
    update({ bankAccounts: data.bankAccounts.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) });
  }

  function addBank() {
    update({ bankAccounts: [...data.bankAccounts, { bank: '', accountNumber: '', accountName: '' }] });
  }

  function removeBank(i: number) {
    update({ bankAccounts: data.bankAccounts.filter((_, idx) => idx !== i) });
  }

  const input =
    'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition bg-white';
  const label = 'block text-xs font-medium text-gray-600 mb-1';

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: 'template', label: 'Template', icon: '🎨' },
    { id: 'couple', label: 'Pasangan', icon: '💑' },
    { id: 'event', label: 'Acara', icon: '🗓️' },
    { id: 'story', label: 'Cerita', icon: '💕' },
    { id: 'text', label: 'Teks', icon: '✍️' },
    { id: 'bank', label: 'Rekening', icon: '💳' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDashboardMode ? (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-800 transition mr-1"
            >
              ← Dashboard
            </button>
          ) : null}
          <span className="text-xl">💌</span>
          <span className="font-semibold text-sm">Editor Undangan</span>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
              {saveMsg}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
          >
            {showPreview ? '✏️ Editor' : '👁️ Preview'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="text-sm px-4 py-1.5 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition"
          >
            Simpan
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* ── Left: Editor panel ── */}
        <aside
          className={`${showPreview ? 'hidden lg:flex' : 'flex'} w-full lg:w-[380px] xl:w-[420px] flex-col border-r border-gray-200 bg-white overflow-hidden shrink-0`}
        >
          {/* Section nav */}
          <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="flex flex-col items-center gap-0.5 px-4 py-2.5 text-xs whitespace-nowrap transition border-b-2"
                style={{
                  borderColor: activeSection === s.id ? '#7c3aed' : 'transparent',
                  color: activeSection === s.id ? '#7c3aed' : '#6b7280',
                  background: activeSection === s.id ? '#f5f3ff' : 'transparent',
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {activeSection === 'template' && (
              <TemplatePicker selected={data.templateId} onSelect={(id: TemplateId) => update({ templateId: id })} />
            )}

            {activeSection === 'couple' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-800">Data Pasangan</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Nama Pria</label>
                    <input className={input} value={data.couple.groomName} onChange={e => updateCouple({ groomName: e.target.value })} maxLength={80} />
                  </div>
                  <div>
                    <label className={label}>Nama Wanita</label>
                    <input className={input} value={data.couple.brideName} onChange={e => updateCouple({ brideName: e.target.value })} maxLength={80} />
                  </div>
                  <div>
                    <label className={label}>Sapaan Pria</label>
                    <input className={input} value={data.couple.groomNickname ?? ''} onChange={e => updateCouple({ groomNickname: e.target.value })} placeholder="Opsional" maxLength={40} />
                  </div>
                  <div>
                    <label className={label}>Sapaan Wanita</label>
                    <input className={input} value={data.couple.brideNickname ?? ''} onChange={e => updateCouple({ brideNickname: e.target.value })} placeholder="Opsional" maxLength={40} />
                  </div>
                </div>
                <div>
                  <label className={label}>Orang Tua Pria</label>
                  <input className={input} value={data.couple.groomParents ?? ''} onChange={e => updateCouple({ groomParents: e.target.value })} maxLength={120} />
                </div>
                <div>
                  <label className={label}>Orang Tua Wanita</label>
                  <input className={input} value={data.couple.brideParents ?? ''} onChange={e => updateCouple({ brideParents: e.target.value })} maxLength={120} />
                </div>
                <div>
                  <label className={label}>Hashtag</label>
                  <input className={input} value={data.couple.hashtag ?? ''} onChange={e => updateCouple({ hashtag: e.target.value })} placeholder="#NamaPasangan2025" maxLength={60} />
                </div>
                <div>
                  <label className={label}>Foto Utama</label>
                  {data.coverPhotoUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden">
                      <img src={data.coverPhotoUrl} alt="Cover" className="w-full h-40 object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-gray-500 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-violet-50 file:text-violet-600 file:text-xs file:font-medium cursor-pointer"
                  />
                  <p className="text-xs text-gray-400 mt-1">Maks. 5MB. Data URL (demo).</p>
                  {data.coverPhotoUrl && (
                    <button type="button" onClick={() => update({ coverPhotoUrl: '' })} className="text-xs text-red-500 mt-1 hover:underline">
                      Hapus foto
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'event' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-800">Detail Acara</p>
                {data.events.map((event, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acara {i + 1}</p>
                      {data.events.length > 1 && (
                        <button type="button" onClick={() => removeEvent(i)} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                      )}
                    </div>
                    <div>
                      <label className={label}>Nama Acara</label>
                      <input className={input} value={event.title} onChange={e => updateEvent(i, { title: e.target.value })} maxLength={60} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={label}>Tanggal</label>
                        <input type="date" className={input} value={event.date} onChange={e => updateEvent(i, { date: e.target.value })} />
                      </div>
                      <div>
                        <label className={label}>Waktu Mulai</label>
                        <input type="time" className={input} value={event.time} onChange={e => updateEvent(i, { time: e.target.value })} />
                      </div>
                      <div>
                        <label className={label}>Waktu Selesai</label>
                        <input type="time" className={input} value={event.endTime ?? ''} onChange={e => updateEvent(i, { endTime: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className={label}>Nama Venue</label>
                      <input className={input} value={event.venue} onChange={e => updateEvent(i, { venue: e.target.value })} maxLength={100} />
                    </div>
                    <div>
                      <label className={label}>Alamat</label>
                      <textarea className={input} rows={2} value={event.address} onChange={e => updateEvent(i, { address: e.target.value })} maxLength={200} />
                    </div>
                    <div>
                      <label className={label}>URL Google Maps</label>
                      <input type="url" className={input} value={event.mapsUrl ?? ''} onChange={e => updateEvent(i, { mapsUrl: e.target.value })} placeholder="https://maps.google.com/..." />
                    </div>
                    <div>
                      <label className={label}>Dresscode</label>
                      <input className={input} value={event.dresscode ?? ''} onChange={e => updateEvent(i, { dresscode: e.target.value })} placeholder="Formal / Batik" maxLength={60} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addEvent} className="w-full py-2.5 rounded-xl border border-dashed border-violet-300 text-violet-600 text-sm font-medium hover:bg-violet-50 transition">
                  + Tambah Acara
                </button>
              </div>
            )}

            {activeSection === 'story' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-800">Cerita Cinta</p>
                {data.story.map((entry, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chapter {i + 1}</p>
                      <button type="button" onClick={() => removeStory(i)} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                    </div>
                    <div>
                      <label className={label}>Tahun</label>
                      <input className={input} value={entry.year} onChange={e => updateStory(i, { year: e.target.value })} maxLength={10} />
                    </div>
                    <div>
                      <label className={label}>Judul</label>
                      <input className={input} value={entry.title} onChange={e => updateStory(i, { title: e.target.value })} maxLength={80} />
                    </div>
                    <div>
                      <label className={label}>Deskripsi</label>
                      <textarea className={input} rows={3} value={entry.description} onChange={e => updateStory(i, { description: e.target.value })} maxLength={300} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addStory} className="w-full py-2.5 rounded-xl border border-dashed border-violet-300 text-violet-600 text-sm font-medium hover:bg-violet-50 transition">
                  + Tambah Chapter
                </button>
              </div>
            )}

            {activeSection === 'text' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-800">Teks Undangan</p>
                <div>
                  <label className={label}>Teks Pembuka</label>
                  <textarea className={input} rows={5} value={data.openingText} onChange={e => update({ openingText: e.target.value })} maxLength={600} />
                  <p className="text-xs text-gray-400 text-right">{data.openingText.length}/600</p>
                </div>
                <div>
                  <label className={label}>Teks Penutup</label>
                  <textarea className={input} rows={5} value={data.closingText} onChange={e => update({ closingText: e.target.value })} maxLength={600} />
                  <p className="text-xs text-gray-400 text-right">{data.closingText.length}/600</p>
                </div>
              </div>
            )}

            {activeSection === 'bank' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-800">Informasi Hadiah / Rekening</p>
                <p className="text-xs text-gray-500">Opsional. Kosongkan jika tidak ingin menampilkan.</p>
                {data.bankAccounts.map((acc, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rekening {i + 1}</p>
                      <button type="button" onClick={() => removeBank(i)} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                    </div>
                    <div>
                      <label className={label}>Nama Bank</label>
                      <input className={input} value={acc.bank} onChange={e => updateBank(i, { bank: e.target.value })} placeholder="BCA, Mandiri..." maxLength={40} />
                    </div>
                    <div>
                      <label className={label}>Nomor Rekening</label>
                      <input className={input} value={acc.accountNumber} onChange={e => updateBank(i, { accountNumber: e.target.value })} maxLength={30} />
                    </div>
                    <div>
                      <label className={label}>Nama Pemilik</label>
                      <input className={input} value={acc.accountName} onChange={e => updateBank(i, { accountName: e.target.value })} maxLength={80} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addBank} className="w-full py-2.5 rounded-xl border border-dashed border-violet-300 text-violet-600 text-sm font-medium hover:bg-violet-50 transition">
                  + Tambah Rekening
                </button>
              </div>
            )}

          </div>

          {/* Bottom actions */}
          <div className="border-t border-gray-100 p-3 flex gap-2">
            <Link
              to={`/invitation/${data.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              🔗 Lihat Live
            </Link>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition"
            >
              💾 Simpan
            </button>
          </div>
        </aside>

        {/* ── Right: Live preview ── */}
        <main className={`${showPreview ? 'flex' : 'hidden lg:flex'} flex-1 overflow-y-auto`}>
          <div className="w-full max-w-2xl mx-auto">
            <TemplateRenderer data={data} isPreview={true} />
          </div>
        </main>
      </div>
    </div>
  );
}

