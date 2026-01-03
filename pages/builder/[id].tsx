import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import prisma from '@/lib/db';
import { requirePageAuth } from '@/lib/auth';
import { InvitationPage } from '@/components/invitation/InvitationPage';
import type { GalleryPhoto, InvitationDetails, SectionConfig } from '@/types/invitation';
import { DEFAULT_SECTIONS } from '@/types/invitation';
import type { GuestbookEntryDto } from '@/types/guestbook';

interface BuilderPageProps {
  invitation: InvitationDetails;
  templateKey: string;
  photos: GalleryPhoto[];
  guestbookEntries: GuestbookEntryDto[];
}

const tabs = ['Basic', 'Design', 'Sections', 'Guestbook', 'Games', 'Publish', 'Export'] as const;
type TabKey = (typeof tabs)[number];

interface SortableItemProps {
  section: SectionConfig;
  label: string;
  onToggle: (section: SectionConfig) => void;
}

function SortableItem({ section, label, onToggle }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <div className="flex items-center gap-3" {...attributes} {...listeners}>
        <span className="cursor-grab text-slate-500">⋮⋮</span>
        <span className="font-medium">{label}</span>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={() => onToggle(section)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Enabled
      </label>
    </div>
  );
}

export default function InvitationBuilder({ invitation: initialInvitation, photos, guestbookEntries }: BuilderPageProps) {
  const [savedInvitation, setSavedInvitation] = useState<InvitationDetails>(initialInvitation);
  const [draftInvitation, setDraftInvitation] = useState<InvitationDetails>(initialInvitation);
  const [savedSections, setSavedSections] = useState<SectionConfig[]>(initialInvitation.sections);
  const [draftSections, setDraftSections] = useState<SectionConfig[]>(initialInvitation.sections);
  const [savedGuestbookEntries, setSavedGuestbookEntries] = useState<GuestbookEntryDto[]>(guestbookEntries);
  const [draftGuestbookEntries, setDraftGuestbookEntries] = useState<GuestbookEntryDto[]>(guestbookEntries);
  const [activeTab, setActiveTab] = useState<TabKey>('Basic');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [rsvpSummary, setRsvpSummary] = useState<{
    countsByAttendance: { yes: number; no: number; maybe: number };
    totals: { guestsTotal: number; kidsTotal: number; responsesTotal: number };
    recentSampleCount?: number;
  } | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [basicSaving, setBasicSaving] = useState(false);
  const [designSaving, setDesignSaving] = useState(false);
  const [sectionsSaving, setSectionsSaving] = useState(false);
  const [guestbookSaving, setGuestbookSaving] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const lastErrorTimeRef = useRef(0);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    async function fetchSummary() {
      setRsvpLoading(true);
      const response = await fetch(`/api/invitations/${savedInvitation.id}/rsvp-summary`);
      if (response.ok) {
        const data = await response.json();
        setRsvpSummary(data);
      }
      setRsvpLoading(false);
    }

    if (activeTab === 'Export' && !rsvpSummary && !rsvpLoading) {
      void fetchSummary();
    }
  }, [activeTab, savedInvitation.id, rsvpLoading, rsvpSummary]);

  const hasBasicChanges = useMemo(() => {
    const fields: (keyof InvitationDetails)[] = [
      'groomName',
      'brideName',
      'dateTime',
      'venueName',
      'address',
      'accountGroom',
      'accountBride',
      'contactGroom',
      'contactBride'
    ];

    return fields.some((field) => draftInvitation[field] !== savedInvitation[field]);
  }, [draftInvitation, savedInvitation]);

  const hasDesignChanges = useMemo(
    () => draftInvitation.templateKey !== savedInvitation.templateKey,
    [draftInvitation.templateKey, savedInvitation.templateKey]
  );

  const hasSectionsChanges = useMemo(() => {
    if (draftSections.length !== savedSections.length) return true;
    return draftSections.some((section, index) => {
      const saved = savedSections[index];
      return section.id !== saved.id || section.enabled !== saved.enabled || section.order !== saved.order;
    });
  }, [draftSections, savedSections]);

  const hasGuestbookChanges = useMemo(() => {
    if (draftGuestbookEntries.length !== savedGuestbookEntries.length) return true;
    return draftGuestbookEntries.some((entry, index) => {
      const saved = savedGuestbookEntries[index];
      return entry.id !== saved.id || entry.hidden !== saved.hidden;
    });
  }, [draftGuestbookEntries, savedGuestbookEntries]);

  const hasPublishChanges = useMemo(
    () => draftInvitation.slug !== savedInvitation.slug || draftInvitation.status !== savedInvitation.status,
    [draftInvitation.slug, draftInvitation.status, savedInvitation.slug, savedInvitation.status]
  );

  const hasUnsavedChanges =
    hasBasicChanges || hasDesignChanges || hasSectionsChanges || hasGuestbookChanges || hasPublishChanges;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    const handler = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  function showError(message: string) {
    const now = Date.now();
    if (statusMessage === message && now - lastErrorTimeRef.current < 5000) {
      return;
    }
    lastErrorTimeRef.current = now;
    setStatusMessage(message);
  }

  function resetStatus(message: string | null = null) {
    setStatusMessage(message);
  }

  async function saveBasic() {
    setBasicSaving(true);
    resetStatus('Saving…');
    try {
      const response = await fetch(`/api/invitations/${savedInvitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groomName: draftInvitation.groomName,
          brideName: draftInvitation.brideName,
          dateTime: draftInvitation.dateTime,
          venueName: draftInvitation.venueName,
          address: draftInvitation.address,
          accountGroom: draftInvitation.accountGroom,
          accountBride: draftInvitation.accountBride,
          contactGroom: draftInvitation.contactGroom,
          contactBride: draftInvitation.contactBride,
          templateKey: savedInvitation.templateKey,
          slug: savedInvitation.slug
        })
      });

      if (!response.ok) {
        showError('Failed to save basic details');
        return;
      }

      const updated = await response.json();
      const normalizedDate = updated.dateTime ? new Date(updated.dateTime).toISOString() : draftInvitation.dateTime;
      const next = { ...draftInvitation, ...updated, dateTime: normalizedDate } as InvitationDetails;
      setSavedInvitation((prev) => ({ ...prev, ...next }));
      setDraftInvitation((prev) => ({ ...prev, ...next }));
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Failed to save basic details');
    } finally {
      setBasicSaving(false);
    }
  }

  async function saveDesign() {
    setDesignSaving(true);
    resetStatus('Saving…');
    try {
      const response = await fetch(`/api/invitations/${savedInvitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey: draftInvitation.templateKey })
      });

      if (!response.ok) {
        showError('Failed to save design');
        return;
      }

      const updated = await response.json();
      const next = { ...draftInvitation, ...updated } as InvitationDetails;
      setSavedInvitation((prev) => ({ ...prev, ...next }));
      setDraftInvitation((prev) => ({ ...prev, ...next }));
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Failed to save design');
    } finally {
      setDesignSaving(false);
    }
  }

  async function saveSections() {
    setSectionsSaving(true);
    resetStatus('Saving…');
    try {
      const response = await fetch(`/api/invitations/${savedInvitation.id}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: draftSections })
      });

      if (!response.ok) {
        showError('Unable to update sections');
        return;
      }

      const updated: SectionConfig[] = await response.json();
      setSavedSections(updated);
      setDraftSections(updated);
      setSavedInvitation((prev) => ({ ...prev, sections: updated }));
      setDraftInvitation((prev) => ({ ...prev, sections: updated }));
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Unable to update sections');
    } finally {
      setSectionsSaving(false);
    }
  }

  async function saveGuestbook() {
    setGuestbookSaving(true);
    resetStatus('Saving…');

    const updates = draftGuestbookEntries
      .filter((entry, index) => entry.hidden !== savedGuestbookEntries[index]?.hidden)
      .map((entry) => ({ id: entry.id, hidden: entry.hidden }));

    if (updates.length === 0) {
      resetStatus('Saved');
      setGuestbookSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/guestbook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        showError('Unable to update guestbook');
        return;
      }

      const refreshed: GuestbookEntryDto[] = await response.json();
      setSavedGuestbookEntries(refreshed);
      setDraftGuestbookEntries(refreshed);
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Unable to update guestbook');
    } finally {
      setGuestbookSaving(false);
    }
  }

  async function savePublish() {
    setPublishSaving(true);
    resetStatus('Saving…');

    try {
      if (draftInvitation.slug !== savedInvitation.slug) {
        const slugResponse = await fetch(`/api/invitations/${savedInvitation.id}/slug`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: draftInvitation.slug.trim() })
        });

        if (!slugResponse.ok) {
          const error = await slugResponse.json();
          setSlugError(Array.isArray(error.error) ? error.error.join(', ') : error.error);
          showError('Failed to update slug');
          return;
        }

        const updated = await slugResponse.json();
        setDraftInvitation((prev) => ({ ...prev, slug: updated.slug }));
        setSavedInvitation((prev) => ({ ...prev, slug: updated.slug }));
        setSlugError(null);
      }

      if (draftInvitation.status !== savedInvitation.status) {
        const statusResponse = await fetch(`/api/invitations/${savedInvitation.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: draftInvitation.status })
        });

        if (!statusResponse.ok) {
          showError('Unable to update status');
          return;
        }

        const updated = await statusResponse.json();
        setDraftInvitation((prev) => ({ ...prev, status: updated.status }));
        setSavedInvitation((prev) => ({ ...prev, status: updated.status }));
      }

      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Unable to save publish settings');
    } finally {
      setPublishSaving(false);
    }
  }

  const orderedSections = useMemo(() => {
    const merged = DEFAULT_SECTIONS.map((def, index) =>
      draftSections.find((section) => section.key === def.key) ?? {
        id: `${draftInvitation.id}-${def.key}`,
        key: def.key,
        enabled: true,
        order: index
      }
    );

    return merged.sort((a, b) => a.order - b.order);
  }, [draftInvitation.id, draftSections]);

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIndex = orderedSections.findIndex((item) => item.id === active.id);
    const overIndex = orderedSections.findIndex((item) => item.id === over.id);
    const newSections = arrayMove(orderedSections, currentIndex, overIndex).map((section, index) => ({
      ...section,
      order: index
    }));

    setDraftSections(newSections);
  }

  function handleToggle(section: SectionConfig) {
    const updated = orderedSections.map((item) => (item.id === section.id ? { ...item, enabled: !item.enabled } : item));
    setDraftSections(updated);
  }

  function handleGuestbookToggle(entryId: string) {
    setDraftGuestbookEntries((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, hidden: !entry.hidden } : entry))
    );
  }

  const publishUrl = useMemo(() => {
    const slugPart = draftInvitation.slug?.trim() ?? '';
    if (!origin) return slugPart ? `/${slugPart}` : '';
    return `${origin}/${slugPart}`;
  }, [draftInvitation.slug, origin]);

  useEffect(() => {
    if (!copyMessage) return;
    const timer = setTimeout(() => setCopyMessage(null), 1500);
    return () => clearTimeout(timer);
  }, [copyMessage]);

  async function copyPublishUrl() {
    if (!publishUrl) return;

    try {
      await navigator.clipboard.writeText(publishUrl);
      setCopyMessage('Copied!');
    } catch (error) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = publishUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopyMessage('Copied!');
      } catch (fallbackError) {
        console.error(fallbackError);
        showError('Unable to copy link');
      }
    }
  }

  const guestbookDate = (value: string) =>
    new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));

  const guestbookBadgeLabel = (badge: GuestbookEntryDto['badge']) => {
    if (badge === 'none') return null;
    const label = badge.replace(/_/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const unsavedLabel = (tab: TabKey) => {
    const hasChanges =
      tab === 'Basic'
        ? hasBasicChanges
        : tab === 'Design'
          ? hasDesignChanges
          : tab === 'Sections'
            ? hasSectionsChanges
            : tab === 'Guestbook'
              ? hasGuestbookChanges
              : tab === 'Publish'
                ? hasPublishChanges
                : false;

    return hasChanges ? (
      <span className="text-xs font-medium text-amber-700">Unsaved changes</span>
    ) : (
      <span className="text-xs text-slate-500">Saved</span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Invitation Builder • {draftInvitation.title ?? 'Untitled'}</title>
      </Head>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <div className="w-full space-y-4 lg:w-1/2">
          {statusMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
              <span>ℹ️</span>
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto rounded-lg bg-white p-2 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`rounded-md px-3 py-2 text-sm font-medium ${activeTab === tab ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Basic' && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Basic')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveBasic}
                  disabled={!hasBasicChanges || basicSaving}
                >
                  {basicSaving ? 'Saving…' : 'Save Basic'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Groom name
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.groomName}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, groomName: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Bride name
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.brideName}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, brideName: e.target.value }))}
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Wedding date &amp; time
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={draftInvitation.dateTime.slice(0, 16)}
                  onChange={(e) =>
                    setDraftInvitation((prev) => ({ ...prev, dateTime: new Date(e.target.value).toISOString() }))
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Venue name
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.venueName}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, venueName: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Address
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.address}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Accounts (groom)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.accountGroom ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, accountGroom: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Accounts (bride)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.accountBride ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, accountBride: e.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Contacts (groom)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.contactGroom ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, contactGroom: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Contacts (bride)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.contactBride ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, contactBride: e.target.value }))}
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Design' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Design')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveDesign}
                  disabled={!hasDesignChanges || designSaving}
                >
                  {designSaving ? 'Saving…' : 'Save Design'}
                </button>
              </div>
              <p className="text-sm text-slate-700">Choose a template style.</p>
              <div className="flex gap-3">
                {['mono', 'editorial', 'film'].map((key) => (
                  <button
                    key={key}
                    onClick={() => setDraftInvitation((prev) => ({ ...prev, templateKey: key as any }))}
                    className={`rounded-lg border px-4 py-3 text-sm capitalize shadow-sm ${
                      draftInvitation.templateKey === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Sections' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Sections')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveSections}
                  disabled={!hasSectionsChanges || sectionsSaving}
                >
                  {sectionsSaving ? 'Saving…' : 'Save Sections'}
                </button>
              </div>
              <p className="text-sm text-slate-700">Drag to reorder sections. Toggle visibility as needed.</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedSections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {orderedSections.map((section) => (
                      <SortableItem
                        key={section.id}
                        section={section}
                        label={DEFAULT_SECTIONS.find((def) => def.key === section.key)?.label ?? section.key}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {activeTab === 'Guestbook' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Guestbook')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveGuestbook}
                  disabled={!hasGuestbookChanges || guestbookSaving}
                >
                  {guestbookSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
              <p className="text-sm text-slate-700">Toggle visibility to hide messages from the public guestbook.</p>
              <div className="space-y-3">
                {draftGuestbookEntries.length === 0 && (
                  <p className="text-sm text-slate-600">No guestbook entries yet.</p>
                )}
                {draftGuestbookEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{entry.nickname}</p>
                        <p className="text-slate-700">{entry.message}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span>{guestbookDate(entry.createdAt)}</span>
                          {guestbookBadgeLabel(entry.badge) && (
                            <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 font-medium text-slate-800">
                              {guestbookBadgeLabel(entry.badge)}
                            </span>
                          )}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={entry.hidden}
                          onChange={() => handleGuestbookToggle(entry.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Hidden
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Games' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Coming soon</span>
                <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" disabled>
                  Save Games
                </button>
              </div>
              <p className="text-sm text-slate-700">Mini-games will arrive soon. Toggle placeholders for now.</p>
              {['Quiz', 'Timeline', 'Food'].map((game) => (
                <label key={game} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <span className="font-medium text-slate-800">{game}</span>
                  <input type="checkbox" className="h-4 w-4" defaultChecked />
                </label>
              ))}
            </div>
          )}

          {activeTab === 'Publish' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Publish')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={savePublish}
                  disabled={!hasPublishChanges || publishSaving}
                >
                  {publishSaving ? 'Saving…' : 'Save Publish'}
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Status</p>
                <div className="flex gap-2">
                  {['draft', 'published', 'private'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setDraftInvitation((prev) => ({ ...prev, status: status as any }))}
                      className={`rounded-lg border px-3 py-2 text-sm capitalize shadow-sm ${
                        draftInvitation.status === status ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Slug</p>
                <input
                  value={draftInvitation.slug}
                  onChange={(e) => setDraftInvitation((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
                {slugError && <p className="text-xs text-red-600">{slugError}</p>}
                {draftInvitation.status === 'published' && (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Public URL</p>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
                        <span className="text-slate-600">{origin ? `${origin}/` : '/'}</span>
                        <span className="rounded-full bg-slate-900/5 px-3 py-1 font-mono text-slate-900 underline">
                          {draftInvitation.slug || 'your-slug'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={copyPublishUrl}
                        className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
                        disabled={!draftInvitation.slug}
                      >
                        Copy
                      </button>
                    </div>
                    {copyMessage && <p className="text-xs text-emerald-600">{copyMessage}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Export' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <p className="text-base font-semibold text-slate-900">RSVP Summary</p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Quick attendance snapshot</p>
              </div>
              <a
                href={`/api/export/rsvp.csv?invitationId=${savedInvitation.id}`}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
              >
                Download CSV
              </a>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Responses</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.totals.responsesTotal : rsvpLoading ? '…' : '0'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Guests</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.totals.guestsTotal : rsvpLoading ? '…' : '0'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Kids</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.totals.kidsTotal : rsvpLoading ? '…' : '0'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Recent Samples</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.recentSampleCount ?? 0 : rsvpLoading ? '…' : '0'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {(['yes', 'maybe', 'no'] as const).map((key) => (
                  <div key={key} className="rounded-lg border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{key}</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {rsvpSummary ? rsvpSummary.countsByAttendance[key] : rsvpLoading ? '…' : '0'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-1/2">
          <div className="sticky top-6 rounded-3xl bg-white p-4 shadow-lg">
            <p className="mb-3 text-sm text-slate-600">Live preview</p>
            <InvitationPage invitation={draftInvitation} sections={orderedSections} photos={photos} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<BuilderPageProps> = async (context) => {
  return requirePageAuth<BuilderPageProps>(context, async (userId) => {
    const id = context.params?.id as string;

    const invitation = await prisma.invitation.findFirst({
      where: {
        userId,
        OR: [{ id }, { slug: id }]
      },
      include: { sections: true, galleryPhotos: true }
    });

    if (!invitation) {
      return { notFound: true };
    }

    const normalizedSections = (
      invitation.sections.length
        ? invitation.sections
        : DEFAULT_SECTIONS.map((section, index) => ({
            id: `${invitation.id}-${section.key}`,
            key: section.key,
            enabled: true,
            order: index
          }))
    ).sort((a, b) => a.order - b.order);

    const photos: GalleryPhoto[] = invitation.galleryPhotos
      .map((photo) => ({
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        order: photo.order
      }))
      .sort((a, b) => a.order - b.order);

    const guestbookEntries = await prisma.guestbookEntry
      .findMany({
        where: { invitationId: invitation.id },
        orderBy: { createdAt: 'desc' }
      })
      .then((entries) =>
        entries.map((entry) => ({
          id: entry.id,
          invitationId: entry.invitationId,
          nickname: entry.nickname,
          message: entry.message,
          badge: entry.badge,
          hidden: entry.hidden,
          createdAt: entry.createdAt.toISOString()
        }))
      );

    const invitationDetails: InvitationDetails = {
      id: invitation.id,
      slug: invitation.slug,
      status: invitation.status,
      templateKey: invitation.templateKey,
      title: invitation.title,
      groomName: invitation.groomName,
      brideName: invitation.brideName,
      dateTime: invitation.dateTime.toISOString(),
      venueName: invitation.venueName,
      address: invitation.address,
      accountGroom: invitation.accountGroom,
      accountBride: invitation.accountBride,
      contactGroom: invitation.contactGroom,
      contactBride: invitation.contactBride,
      sections: normalizedSections
    };

    return {
      props: {
        invitation: invitationDetails,
        templateKey: invitation.templateKey,
        photos,
        guestbookEntries
      }
    };
  });
};
