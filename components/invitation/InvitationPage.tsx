import React, { useMemo, useState } from 'react';
import type { GalleryPhoto, InvitationDetails, SectionConfig } from '@/types/invitation';
import { DEFAULT_SECTIONS } from '@/types/invitation';
import { PublicGuestbook } from '@/components/guestbook/PublicGuestbook';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import type { QuizDto } from '@/types/quiz';
import type { TimelinePuzzleDto } from '@/types/timeline';
import type { GuestbookEntryDto } from '@/types/guestbook';
import { HeroSection } from './sections/Hero';
import { InfoSection } from './sections/Info';
import { MapButtons } from './sections/MapButtons';
import { GallerySection } from './sections/Gallery';
import { AccountsSection } from './sections/Accounts';
import { SectionCard } from './sections/SectionCard';
import { RSVPSection } from './sections/RSVPSection';
import { TimelineSection } from './sections/TimelineSection';

interface InvitationPageProps {
  invitation: InvitationDetails;
  sections: SectionConfig[];
  photos: GalleryPhoto[];
  quiz?: QuizDto | null;
  timelinePuzzle?: TimelinePuzzleDto | null;
  previewGuestbookEntries?: GuestbookEntryDto[];
  previewMode?: boolean;
}

function mergeSections(invitationId: string, sections: SectionConfig[]) {
  const defaults = DEFAULT_SECTIONS.map((section, index) => ({
    id: `${invitationId}-${section.key}`,
    key: section.key,
    enabled: section.key === 'quiz' || section.key === 'timeline' ? false : true,
    order: index
  }));

  const keyed = new Map(defaults.map((section) => [section.key, section]));
  sections.forEach((section) => {
    keyed.set(section.key, section);
  });

  return Array.from(keyed.values())
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);
}

export function InvitationPage({
  invitation,
  sections,
  photos,
  quiz,
  timelinePuzzle,
  previewGuestbookEntries,
  previewMode
}: InvitationPageProps) {
  const orderedSections = useMemo(() => mergeSections(invitation.id, sections), [invitation.id, sections]);
  const sortedPhotos = useMemo(() => [...photos].sort((a, b) => a.order - b.order), [photos]);
  const quizData = quiz ?? invitation.quiz ?? null;
  const [quizBadgeToken, setQuizBadgeToken] = useState<string | null>(null);

  return (
    <ThemeProvider templateKey={invitation.templateKey}>
      <div className="relative isolate overflow-hidden bg-[var(--mq-bg)]" style={{ color: 'var(--mq-fg)' }}>
        <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden>
          <div className="absolute left-10 top-[-120px] h-64 w-64 rounded-full bg-[var(--mq-accent)]/20 blur-3xl" />
          <div className="absolute right-4 bottom-[-140px] h-72 w-72 rounded-full bg-[var(--mq-muted)]/40 blur-3xl" />
        </div>

        <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-[var(--mq-spacing-section)] px-4 py-16">
          {orderedSections.map((section) => {
            switch (section.key) {
              case 'hero':
                return (
                  <HeroSection
                    key={section.key}
                    groomName={invitation.groomName}
                    brideName={invitation.brideName}
                    dateTime={invitation.dateTime}
                    venueName={invitation.venueName}
                  />
                );
              case 'info':
              case 'details':
                return (
                  <InfoSection
                    key={section.key}
                    dateTime={invitation.dateTime}
                    venueName={invitation.venueName}
                    address={invitation.address}
                  />
                );
              case 'maps':
                return (
                  <MapButtons key={section.key} venueName={invitation.venueName} address={invitation.address} />
                );
              case 'gallery':
                return <GallerySection key={section.key} photos={sortedPhotos} />;
              case 'accounts':
                return (
                  <AccountsSection
                    key={section.key}
                    groomName={invitation.groomName}
                    brideName={invitation.brideName}
                    accountGroom={invitation.accountGroom}
                    accountBride={invitation.accountBride}
                  />
                );
              case 'timeline':
                return (
                  <SectionCard key={section.key} title="Timeline" eyebrow="Moments">
                    <TimelineSection
                      invitationId={invitation.id}
                      slug={invitation.slug}
                      invitationStatus={invitation.status}
                      puzzle={timelinePuzzle ?? invitation.timelinePuzzle ?? null}
                      previewMode={previewMode}
                    />
                  </SectionCard>
                );
              case 'guestbook':
                return (
                  <SectionCard key={section.key} title="Guestbook" eyebrow="Messages">
                    <PublicGuestbook
                      invitationId={invitation.id}
                      slug={invitation.slug}
                      invitationStatus={invitation.status}
                      quiz={quizData}
                      onBadgeEarned={(token) => setQuizBadgeToken(token)}
                      badgeToken={quizBadgeToken}
                      previewEntries={previewGuestbookEntries}
                      previewMode={previewMode}
                    />
                  </SectionCard>
                );
              case 'rsvp':
                return (
                  <SectionCard key={section.key} title="RSVP" eyebrow="Attendance">
                    <RSVPSection invitationId={invitation.id} invitationStatus={invitation.status} />
                  </SectionCard>
                );
              default:
                return null;
            }
          })}
        </main>
      </div>
    </ThemeProvider>
  );
}
