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

interface BuilderPageProps {
  invitation: InvitationDetails;
  templateKey: string;
  photos: GalleryPhoto[];
}

const tabs = ['Basic', 'Design', 'Sections', 'Games', 'Publish', 'Export'] as const;
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

export default function InvitationBuilder({ invitation: initialInvitation, photos }: BuilderPageProps) {
  const [invitation, setInvitation] = useState<InvitationDetails>(initialInvitation);
  const [activeTab, setActiveTab] = useState<TabKey>('Basic');
  const [slugInput, setSlugInput] = useState(initialInvitation.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [rsvpSummary, setRsvpSummary] = useState<{
    countsByAttendance: { yes: number; no: number; maybe: number };
    totals: { guestsTotal: number; kidsTotal: number; responsesTotal: number };
    recentSampleCount?: number;
  } | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const invitationRef = useRef(invitation);
  const pendingUpdatesRef = useRef<Partial<InvitationDetails>>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const requestIdRef = useRef(0);
  const lastErrorTimeRef = useRef(0);
  const pendingSectionsRef = useRef<SectionConfig[] | null>(null);
  const sectionsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const sectionsSaveInFlightRef = useRef(false);
  const sectionsPendingSaveRef = useRef(false);
  const sectionsRequestIdRef = useRef(0);
  const [sectionsSaving, setSectionsSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setSlugInput(invitation.slug);
  }, [invitation.slug]);

  useEffect(() => {
    invitationRef.current = invitation;
  }, [invitation]);

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (sectionsDebounceRef.current) {
      clearTimeout(sectionsDebounceRef.current);
    }
  }, []);

  useEffect(() => {
    async function fetchSummary() {
      setRsvpLoading(true);
      const response = await fetch(`/api/invitations/${invitation.id}/rsvp-summary`);
      if (response.ok) {
        const data = await response.json();
        setRsvpSummary(data);
      }
      setRsvpLoading(false);
    }

    if (activeTab === 'Export' && !rsvpSummary && !rsvpLoading) {
      void fetchSummary();
    }
  }, [activeTab, invitation.id, rsvpLoading, rsvpSummary]);

  function showError(message: string) {
    const now = Date.now();
    if (saveErrorMessage === message && now - lastErrorTimeRef.current < 5000) {
      return;
    }
    lastErrorTimeRef.current = now;
    setSaveErrorMessage(message);
    setSaveStatus('error');
  }

  async function flushInvitationUpdates(allowRetry = true) {
    if (saveInFlightRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const updates = pendingUpdatesRef.current;
    pendingUpdatesRef.current = {};

    if (!Object.keys(updates).length) return;

    saveInFlightRef.current = true;
    pendingSaveRef.current = false;
    setSaveStatus('saving');

    const requestId = ++requestIdRef.current;
    let scheduleDelayedRetry = false;
    let skipImmediateFlush = false;

    try {
      const currentInvitation = invitationRef.current;
      const response = await fetch(`/api/invitations/${currentInvitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          dateTime: updates.dateTime ?? currentInvitation.dateTime
        })
      });

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          const callbackUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?callbackUrl=${callbackUrl}`;
        }
        return;
      }

      if (response.status === 429) {
        showError('Saving too fast. Retrying…');
        pendingUpdatesRef.current = { ...updates, ...pendingUpdatesRef.current };
        skipImmediateFlush = true;
        if (allowRetry) {
          scheduleDelayedRetry = true;
        }
      }

      if (!response.ok) {
        showError('Failed to save changes');
        return;
      }

      const updated = await response.json();

      if (requestId === requestIdRef.current) {
        setInvitation((prev) => ({
          ...prev,
          dateTime: updates.dateTime && updated.dateTime ? new Date(updated.dateTime).toISOString() : prev.dateTime
        }));
        setSaveErrorMessage(null);
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error(error);
      showError('Failed to save changes');
    } finally {
      saveInFlightRef.current = false;
    }

    if (scheduleDelayedRetry) {
      pendingSaveRef.current = false;
      setTimeout(() => {
        void flushInvitationUpdates(false);
      }, 2000);
      return;
    }

    if (!skipImmediateFlush && (pendingSaveRef.current || Object.keys(pendingUpdatesRef.current).length)) {
      pendingSaveRef.current = false;
      void flushInvitationUpdates();
    }
  }

  function patchInvitation(updates: Partial<InvitationDetails>) {
    setInvitation((prev) => ({ ...prev, ...updates }));
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    setSaveErrorMessage(null);
    setSaveStatus('saving');

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void flushInvitationUpdates();
    }, 800);
  }

  function queueSectionsSave(sections: SectionConfig[]) {
    pendingSectionsRef.current = sections;
    setSaveErrorMessage(null);
    setSaveStatus('saving');

    if (sectionsDebounceRef.current) {
      clearTimeout(sectionsDebounceRef.current);
    }

    sectionsDebounceRef.current = setTimeout(() => {
      void flushSections();
    }, 500);
  }

  async function flushSections() {
    if (sectionsSaveInFlightRef.current) {
      sectionsPendingSaveRef.current = true;
      return;
    }

    const sections = pendingSectionsRef.current;
    pendingSectionsRef.current = null;

    if (!sections) return;

    sectionsSaveInFlightRef.current = true;
    sectionsPendingSaveRef.current = false;
    setSectionsSaving(true);

    const requestId = ++sectionsRequestIdRef.current;

    try {
      const response = await fetch(`/api/invitations/${invitation.id}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections })
      });

      if (!response.ok) {
        showError('Unable to update sections');
        return;
      }

      const updated: SectionConfig[] = await response.json();
      if (requestId === sectionsRequestIdRef.current) {
        setInvitation((prev) => ({ ...prev, sections: updated }));
        setSaveErrorMessage(null);
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error(error);
      showError('Unable to update sections');
    } finally {
      sectionsSaveInFlightRef.current = false;
      setSectionsSaving(false);
    }

    if (sectionsPendingSaveRef.current || pendingSectionsRef.current) {
      sectionsPendingSaveRef.current = false;
      void flushSections();
    }
  }

  const orderedSections = useMemo(() => {
    const merged = DEFAULT_SECTIONS.map((def, index) =>
      invitation.sections.find((section) => section.key === def.key) ?? {
        id: `${invitation.id}-${def.key}`,
        key: def.key,
        enabled: true,
        order: index
      }
    );

    return merged.sort((a, b) => a.order - b.order);
  }, [invitation.id, invitation.sections]);

  const activeSections = useMemo(
    () => orderedSections.filter((section) => section.enabled),
    [orderedSections]
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIndex = orderedSections.findIndex((item) => item.id === active.id);
    const overIndex = orderedSections.findIndex((item) => item.id === over.id);
    const newSections = arrayMove(orderedSections, currentIndex, overIndex).map((section, index) => ({
      ...section,
      order: index
    }));

    setInvitation((prev) => ({ ...prev, sections: newSections }));
    queueSectionsSave(newSections);
  }

  function handleToggle(section: SectionConfig) {
    const updated = orderedSections.map((item) =>
      item.id === section.id ? { ...item, enabled: !item.enabled } : item
    );
    setInvitation((prev) => ({ ...prev, sections: updated }));
    queueSectionsSave(updated);
  }

  async function saveSlug() {
    setSlugError(null);
    const response = await fetch(`/api/invitations/${invitation.id}/slug`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slugInput.trim() })
    });

    if (!response.ok) {
      const error = await response.json();
      setSlugError(Array.isArray(error.error) ? error.error.join(', ') : error.error);
      return;
    }

    const updated = await response.json();
    setInvitation((prev) => ({ ...prev, slug: updated.slug }));
  }

  async function updateStatus(status: InvitationDetails['status']) {
    setStatusSaving(true);
    const response = await fetch(`/api/invitations/${invitation.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      showError('Unable to update status');
      setStatusSaving(false);
      return;
    }

    const updated = await response.json();
    setInvitation((prev) => ({ ...prev, status: updated.status }));
    setSaveErrorMessage(null);
    setSaveStatus('saved');
    setStatusSaving(false);
  }

  const publishUrl = useMemo(
    () => `${typeof window === 'undefined' ? '' : window.location.origin}/${invitation.slug}`,
    [invitation.slug]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Invitation Builder • {invitation.title ?? 'Untitled'}</title>
      </Head>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <div className="w-full space-y-4 lg:w-1/2">
          {saveErrorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span className="mt-0.5">⚠️</span>
              <div>
                <p className="font-medium">{saveErrorMessage}</p>
                {saveStatus === 'saving' && <p className="text-xs text-red-700">Retrying…</p>}
              </div>
            </div>
          )}

          {saveStatus === 'saving' && !saveErrorMessage && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              Saving…
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto rounded-lg bg-white p-2 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === tab ? 'bg-slate-900 text-white' : 'text-slate-700'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Basic' && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Groom name
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={invitation.groomName}
                    onChange={(e) => patchInvitation({ groomName: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Bride name
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={invitation.brideName}
                    onChange={(e) => patchInvitation({ brideName: e.target.value })}
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Wedding date &amp; time
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={invitation.dateTime.slice(0, 16)}
                  onChange={(e) => patchInvitation({ dateTime: new Date(e.target.value).toISOString() })}
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Venue name
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={invitation.venueName}
                    onChange={(e) => patchInvitation({ venueName: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Address
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={invitation.address}
                    onChange={(e) => patchInvitation({ address: e.target.value })}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Accounts (groom)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={invitation.accountGroom ?? ''}
                    onChange={(e) => patchInvitation({ accountGroom: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Accounts (bride)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={invitation.accountBride ?? ''}
                    onChange={(e) => patchInvitation({ accountBride: e.target.value })}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Contacts (groom)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={invitation.contactGroom ?? ''}
                    onChange={(e) => patchInvitation({ contactGroom: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Contacts (bride)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={invitation.contactBride ?? ''}
                    onChange={(e) => patchInvitation({ contactBride: e.target.value })}
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Design' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-700">Choose a template style.</p>
              <div className="flex gap-3">
                {['mono', 'editorial', 'film'].map((key) => (
                  <button
                    key={key}
                    onClick={() => patchInvitation({ templateKey: key as any })}
                    className={`rounded-lg border px-4 py-3 text-sm capitalize shadow-sm ${
                      invitation.templateKey === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
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
              <div className="flex items-center justify-between text-sm text-slate-700">
                <p>Drag to reorder sections. Toggle visibility as needed.</p>
                {sectionsSaving && <span className="text-xs text-slate-500">Saving…</span>}
              </div>
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

          {activeTab === 'Games' && (
            <div className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
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
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Status</p>
                <div className="flex gap-2">
                  {['draft', 'published', 'private'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStatus(status as any)}
                      disabled={statusSaving}
                      className={`rounded-lg border px-3 py-2 text-sm capitalize shadow-sm ${
                        invitation.status === status ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Slug</p>
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={slugInput}
                    onChange={(e) => setSlugInput(e.target.value)}
                    onBlur={() => void saveSlug()}
                  />
                  <button
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                    onClick={() => void saveSlug()}
                  >
                    Save
                  </button>
                </div>
                {slugError && <p className="text-sm text-red-600">{slugError}</p>}
              </div>
              {invitation.status === 'published' && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  Public URL: <a href={`/${invitation.slug}`}>{publishUrl}</a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Export' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">RSVP Summary</p>
                  <p className="text-base font-semibold text-slate-900">Quick attendance snapshot</p>
                </div>
                <a
                  href={`/api/export/rsvp.csv?invitationId=${invitation.id}`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
                >
                  Download CSV
                </a>
              </div>

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
            <InvitationPage invitation={invitation} sections={activeSections} photos={photos} />
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

    const normalizedSections = (invitation.sections.length
      ? invitation.sections
      : DEFAULT_SECTIONS.map((section, index) => ({
          id: `${invitation.id}-${section.key}`,
          key: section.key,
          enabled: true,
          order: index
        })))
      .sort((a, b) => a.order - b.order);

    const photos: GalleryPhoto[] = invitation.galleryPhotos
      .map((photo) => ({
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        order: photo.order
      }))
      .sort((a, b) => a.order - b.order);

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
        photos
      }
    };
  });
};
