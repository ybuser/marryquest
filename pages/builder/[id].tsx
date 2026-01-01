import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import prisma from '@/lib/db';
import { requirePageAuth } from '@/lib/auth';
import { InvitationView } from '@/components/invitation/InvitationView';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import type { InvitationDetails, SectionConfig } from '@/types/invitation';
import { DEFAULT_SECTIONS } from '@/types/invitation';

interface BuilderPageProps {
  invitation: InvitationDetails;
  templateKey: string;
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

export default function InvitationBuilder({ invitation: initialInvitation }: BuilderPageProps) {
  const [invitation, setInvitation] = useState<InvitationDetails>(initialInvitation);
  const [activeTab, setActiveTab] = useState<TabKey>('Basic');
  const [slugInput, setSlugInput] = useState(initialInvitation.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setSlugInput(invitation.slug);
  }, [invitation.slug]);

  async function patchInvitation(updates: Partial<InvitationDetails>) {
    const previous = invitation;
    setInvitation((prev) => ({ ...prev, ...updates }));

    const response = await fetch(`/api/invitations/${invitation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        dateTime: updates.dateTime ?? invitation.dateTime
      })
    });

    if (!response.ok) {
      setInvitation(previous);
      alert('Failed to save changes');
      return;
    }

    const updated = await response.json();
    setInvitation((prev) => ({
      ...prev,
      ...updated,
      dateTime: new Date(updated.dateTime).toISOString()
    }));
  }

  async function saveSections(sections: SectionConfig[]) {
    const response = await fetch(`/api/invitations/${invitation.id}/sections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections })
    });

    if (!response.ok) {
      alert('Unable to update sections');
      return;
    }

    const updated: SectionConfig[] = await response.json();
    setInvitation((prev) => ({ ...prev, sections: updated }));
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
    void saveSections(newSections);
  }

  function handleToggle(section: SectionConfig) {
    const updated = orderedSections.map((item) =>
      item.id === section.id ? { ...item, enabled: !item.enabled } : item
    );
    setInvitation((prev) => ({ ...prev, sections: updated }));
    void saveSections(updated);
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

  async function saveStatus(status: InvitationDetails['status']) {
    setStatusSaving(true);
    const response = await fetch(`/api/invitations/${invitation.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      alert('Unable to update status');
      setStatusSaving(false);
      return;
    }

    const updated = await response.json();
    setInvitation((prev) => ({ ...prev, status: updated.status }));
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
                      onClick={() => saveStatus(status as any)}
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
            <div className="rounded-xl bg-white p-6 shadow-sm text-sm text-slate-700">
              Export options for RSVP and Guestbook will appear here.
            </div>
          )}
        </div>

        <div className="w-full lg:w-1/2">
          <div className="sticky top-6 rounded-3xl bg-white p-4 shadow-lg">
            <p className="mb-3 text-sm text-slate-600">Live preview</p>
            <ThemeProvider templateKey={invitation.templateKey as any}>
              <InvitationView invitation={invitation} />
            </ThemeProvider>
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
      include: { sections: true }
    });

    if (!invitation) {
      return { notFound: true };
    }

    const normalizedSections = invitation.sections.length
      ? invitation.sections
      : DEFAULT_SECTIONS.map((section, index) => ({
          id: `${invitation.id}-${section.key}`,
          key: section.key,
          enabled: true,
          order: index
        }));

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
        templateKey: invitation.templateKey
      }
    };
  });
};
