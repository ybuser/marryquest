import React from 'react';
import { format } from 'date-fns';
import type { InvitationDetails, SectionConfig } from '@/types/invitation';
import { DEFAULT_SECTIONS } from '@/types/invitation';
import { cn } from '@/lib/utils';

interface InvitationViewProps {
  invitation: InvitationDetails;
}

function SectionWrapper({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="section-grid px-4 py-6">
      <div className="lg:col-span-12">{children}</div>
    </section>
  );
}

function renderSection(invitation: InvitationDetails, section: SectionConfig) {
  switch (section.key) {
    case 'hero':
      return (
        <SectionWrapper id="hero">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="uppercase tracking-[0.2em] text-slate-500">You are invited</p>
            <h1 className="text-4xl font-semibold">
              {invitation.groomName} &amp; {invitation.brideName}
            </h1>
            <p className="text-slate-600">{format(new Date(invitation.dateTime), 'MMMM d, yyyy')}</p>
          </div>
        </SectionWrapper>
      );
    case 'details':
      return (
        <SectionWrapper id="details">
          <div className="card-surface p-6">
            <h2 className="text-2xl font-semibold mb-3">Wedding Details</h2>
            <div className="space-y-2 text-slate-700">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500">Date &amp; Time</p>
                <p>{format(new Date(invitation.dateTime), 'PPPP p')}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500">Venue</p>
                <p>{invitation.venueName}</p>
                <p className="text-slate-500">{invitation.address}</p>
              </div>
            </div>
          </div>
        </SectionWrapper>
      );
    case 'story':
      return (
        <SectionWrapper id="story">
          <div className="card-surface p-6">
            <h2 className="text-2xl font-semibold mb-3">Our Story</h2>
            <p className="text-slate-700">
              Every great adventure has a beginning. Join us as we celebrate the journey that brought us together and the future
              we are building.
            </p>
          </div>
        </SectionWrapper>
      );
    case 'gallery':
      return (
        <SectionWrapper id="gallery">
          <div className="card-surface p-6">
            <h2 className="text-2xl font-semibold mb-3">Gallery</h2>
            <p className="text-slate-700">Photos will appear here.</p>
          </div>
        </SectionWrapper>
      );
    case 'rsvp':
      return (
        <SectionWrapper id="rsvp">
          <div className="card-surface p-6 text-center space-y-3">
            <h2 className="text-2xl font-semibold">RSVP</h2>
            <p className="text-slate-700">Let us know if you will celebrate with us.</p>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-white">RSVP coming soon</button>
          </div>
        </SectionWrapper>
      );
    case 'guestbook':
      return (
        <SectionWrapper id="guestbook">
          <div className="card-surface p-6">
            <h2 className="text-2xl font-semibold mb-3">Guestbook</h2>
            <p className="text-slate-700">Guestbook entries will appear here.</p>
          </div>
        </SectionWrapper>
      );
    default:
      return null;
  }
}

export function InvitationView({ invitation }: InvitationViewProps) {
  const orderedSections = React.useMemo(() => {
    const keyed = invitation.sections.reduce<Record<string, SectionConfig>>((acc, section) => {
      acc[section.key] = section;
      return acc;
    }, {});

    return DEFAULT_SECTIONS.map((def, index) =>
      keyed[def.key] ?? {
        id: def.key,
        key: def.key,
        enabled: true,
        order: index
      }
    )
      .filter((section) => section.enabled)
      .sort((a, b) => a.order - b.order);
  }, [invitation.sections]);

  return (
    <div className={cn('mx-auto max-w-md', 'bg-[var(--mq-bg)] text-[var(--mq-fg)] min-h-[700px] rounded-3xl shadow-lg')}
      style={{ boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)' }}>
      <div className="flex flex-col divide-y divide-slate-200/50">
        {orderedSections.map((section) => (
          <React.Fragment key={section.key}>{renderSection(invitation, section)}</React.Fragment>
        ))}
      </div>
    </div>
  );
}
