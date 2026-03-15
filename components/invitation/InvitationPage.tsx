import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { FoodVoteSection } from './sections/FoodVoteSection';

interface InvitationPageProps {
  invitation: InvitationDetails;
  sections: SectionConfig[];
  photos: GalleryPhoto[];
  quiz?: QuizDto | null;
  timelinePuzzle?: TimelinePuzzleDto | null;
  previewGuestbookEntries?: GuestbookEntryDto[];
  previewMode?: boolean;
  previewFocusRequest?: { targetId: string; requestId: number } | null;
  previewScrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  foodVoteOptions?: import('@/types/foodvote').FoodVoteOptionDto[];
}

function mergeSections(invitationId: string, sections: SectionConfig[]) {
  const defaults = DEFAULT_SECTIONS.map((section, index) => ({
    id: `${invitationId}-${section.key}`,
    key: section.key,
    enabled: section.key === 'quiz' || section.key === 'timeline' || section.key === 'foodVote' ? false : true,
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
  previewMode,
  previewFocusRequest,
  previewScrollContainerRef,
  foodVoteOptions = []
}: InvitationPageProps) {
  const orderedSections = useMemo(() => mergeSections(invitation.id, sections), [invitation.id, sections]);
  const sortedPhotos = useMemo(() => [...photos].sort((a, b) => a.order - b.order), [photos]);
  const quizData = quiz ?? invitation.quiz ?? null;
  const [quizBadgeToken, setQuizBadgeToken] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const showBloomDecor = invitation.templateKey === 'bloom';
  const showLuxeDecor = invitation.templateKey === 'luxe';
  const showModernDecor = invitation.templateKey === 'modern';
  const showHanokDecor = invitation.templateKey === 'hanok';

  useEffect(() => {
    if (!previewMode || !previewFocusRequest?.targetId) return;

    let cancelled = false;
    let attempts = 0;
    const targetId = previewFocusRequest.targetId;
    const maxAttempts = 10;

    const tryScroll = () => {
      if (cancelled) return;
      const root = rootRef.current;
      if (!root) return;

      const directMatch = root.querySelector(`[data-preview-id="${targetId}"]`) as HTMLElement | null;
      const fallbackId = targetId.startsWith('guestbook-entry-') || targetId.startsWith('quiz-question-')
        ? 'section-guestbook'
        : targetId.startsWith('timeline-card-')
          ? 'section-timeline'
          : null;
      const fallbackMatch = fallbackId
        ? (root.querySelector(`[data-preview-id="${fallbackId}"]`) as HTMLElement | null)
        : null;
      const targetNode = directMatch ?? fallbackMatch;

      if (targetNode) {
        const scrollContainer = previewScrollContainerRef?.current;
        if (scrollContainer) {
          const targetRect = targetNode.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const centerOffset = targetRect.top - containerRect.top + scrollContainer.scrollTop
            - containerRect.height / 2
            + targetRect.height / 2;
          scrollContainer.scrollTo({ top: Math.max(0, centerOffset), behavior: 'smooth' });
          return;
        }

        targetNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        requestAnimationFrame(tryScroll);
      }
    };

    tryScroll();
    return () => {
      cancelled = true;
    };
  }, [previewMode, previewFocusRequest?.requestId, previewFocusRequest?.targetId, previewScrollContainerRef]);

  return (
    <ThemeProvider templateKey={invitation.templateKey}>
      <div
        ref={rootRef}
        className="mq-invitation-shell relative isolate overflow-hidden bg-[var(--mq-bg)]"
        style={{ color: 'var(--mq-fg)' }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden>
          <div className="absolute left-10 top-[-120px] h-64 w-64 rounded-full bg-[var(--mq-accent)]/20 blur-3xl" />
          <div className="absolute right-4 bottom-[-140px] h-72 w-72 rounded-full bg-[var(--mq-muted)]/40 blur-3xl" />
        </div>
        {showBloomDecor && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <span className="mq-bloom-popup left-5 top-12">❤</span>
            <span className="mq-bloom-popup right-6 top-24">✦</span>
            <span className="mq-bloom-popup left-10 bottom-24">♡</span>
          </div>
        )}
        {showLuxeDecor && (
          <div className="pointer-events-none absolute inset-5 rounded-[36px] border border-[var(--mq-accent)]/25" aria-hidden />
        )}
        {showModernDecor && (
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:42px_42px]" aria-hidden />
        )}
        {showHanokDecor && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0,rgba(139,94,52,0.12),transparent_42%)]" aria-hidden />
        )}

        <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-[var(--mq-spacing-section)] px-4 py-10 sm:px-6 sm:py-14">
          {orderedSections.map((section, index) => {
            let sectionNode: React.ReactNode = null;
            switch (section.key) {
              case 'hero':
                sectionNode = (
                  <HeroSection
                    groomName={invitation.groomName}
                    brideName={invitation.brideName}
                    dateTime={invitation.dateTime}
                    venueName={invitation.venueName}
                  />
                );
                break;
              case 'info':
              case 'details':
                sectionNode = (
                  <InfoSection
                    dateTime={invitation.dateTime}
                    venueName={invitation.venueName}
                    address={invitation.address}
                  />
                );
                break;
              case 'maps':
                sectionNode = (
                  <MapButtons key={section.key} venueName={invitation.venueName} address={invitation.address} />
                );
                break;
              case 'gallery':
                sectionNode = <GallerySection key={section.key} photos={sortedPhotos} />;
                break;
              case 'accounts':
                sectionNode = (
                  <AccountsSection
                    groomName={invitation.groomName}
                    brideName={invitation.brideName}
                    accountGroom={invitation.accountGroom}
                    accountBride={invitation.accountBride}
                  />
                );
                break;
              case 'timeline':
                sectionNode = (
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
                break;
              case 'foodVote':
                sectionNode = (
                  <SectionCard key={section.key} title="Food Vote" eyebrow="Menu">
                    <FoodVoteSection
                      slug={invitation.slug}
                      invitationStatus={invitation.status}
                      previewMode={previewMode}
                      initialOptions={foodVoteOptions}
                    />
                  </SectionCard>
                );
                break;
              case 'guestbook':
                sectionNode = (
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
                break;
              case 'rsvp':
                sectionNode = (
                  <SectionCard key={section.key} title="RSVP" eyebrow="Attendance">
                    <RSVPSection invitationId={invitation.id} invitationStatus={invitation.status} />
                  </SectionCard>
                );
                break;
              default:
                sectionNode = null;
                break;
            }

            if (!sectionNode) return null;

            return (
              <div
                key={section.id}
                className="mq-section-shell"
                style={{ ['--mq-section-index' as string]: index } as React.CSSProperties}
                data-preview-id={`section-${section.key}`}
              >
                {sectionNode}
              </div>
            );
          })}
        </main>
      </div>
    </ThemeProvider>
  );
}
