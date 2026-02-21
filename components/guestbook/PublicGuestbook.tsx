import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { GuestbookEntryDto } from '@/types/guestbook';
import type { InvitationDetails } from '@/types/invitation';
import type { QuizDto } from '@/types/quiz';
import { QuizSection } from '@/components/invitation/sections/Quiz';

interface PublicGuestbookProps {
  invitationId: string;
  slug: string;
  invitationStatus: InvitationDetails['status'];
  badgeToken?: string | null;
  quiz?: QuizDto | null;
  onBadgeEarned?: (token: string | null) => void;
  previewEntries?: GuestbookEntryDto[];
  previewMode?: boolean;
}

export function PublicGuestbook({
  invitationId,
  slug,
  invitationStatus,
  badgeToken,
  quiz,
  onBadgeEarned,
  previewEntries = [],
  previewMode = false
}: PublicGuestbookProps) {
  const [entries, setEntries] = useState<GuestbookEntryDto[]>(previewEntries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const characterCounts = useMemo(
    () => ({ nickname: nickname.length, message: message.length }),
    [nickname.length, message.length]
  );

  useEffect(() => {
    if (previewMode) {
      setEntries(previewEntries.filter((entry) => !entry.hidden));
      return;
    }
    if (invitationStatus !== 'published') return;

    async function fetchEntries() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/guestbook?slug=${encodeURIComponent(slug)}`);
        if (!response.ok) {
          setError('Unable to load guestbook right now.');
          return;
        }
        const data: GuestbookEntryDto[] = await response.json();
        setEntries(data);
      } catch (err) {
        console.error(err);
        setError('Unable to load guestbook right now.');
      } finally {
        setLoading(false);
      }
    }

    void fetchEntries();
  }, [invitationStatus, previewEntries, previewMode, slug]);

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewMode) {
      setSuccessMessage('Preview mode: guestbook submission disabled.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const requestPayload: Record<string, unknown> = {
        invitationId,
        nickname: nickname.trim(),
        message: message.trim()
      };

      if (badgeToken) {
        requestPayload.badge = 'quizPerfect';
        requestPayload.badgeToken = badgeToken;
      }

      const response = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        if (response.status === 429) {
          const attemptedBonus = Boolean(requestPayload.badgeToken || requestPayload.badge === 'quizPerfect');
          setError(
            attemptedBonus
              ? '이 기기에서는 방명록을 더 이상 작성할 수 없어요.'
              : '이 기기에서는 방명록을 1회만 작성할 수 있어요. (퀴즈 정답 시 1회 추가)'
          );
          return;
        }

        const errorPayload = await response.json().catch(() => null);
        const messageText = errorPayload?.error ?? 'Unable to sign the guestbook.';
        setError(Array.isArray(messageText) ? messageText.join(', ') : messageText);
        return;
      }

      const created: GuestbookEntryDto = await response.json();
      setEntries((prev) => [created, ...prev]);
      setNickname('');
      setMessage('');
      setSuccessMessage('Thanks for leaving a message!');
    } catch (err) {
      console.error(err);
      setError('Unable to sign the guestbook.');
    } finally {
      setSubmitting(false);
    }
  }

  const badgeLabel = (badge: GuestbookEntryDto['badge']) => {
    if (badge === 'none') return null;
    const label = badge.replace(/_/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const quizAvailable = Boolean(quiz?.enabled && quiz.questions.length > 0);

  return (
    <div className="space-y-6">
      {quizAvailable && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--mq-fg)]">퀴즈 참여</p>
              <p className="text-xs text-[var(--mq-fg)]/70">
                결혼 주인공의 퀴즈를 풀고 금색 테두리를 얻으세요
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuizOpen((prev) => !prev)}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[var(--mq-fg)] transition hover:border-white/40"
              aria-expanded={quizOpen}
            >
              {quizOpen ? '퀴즈 닫기' : '퀴즈 풀기'}
            </button>
          </div>
          {quizOpen && quiz && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <QuizSection
                quiz={quiz}
                invitationId={invitationId}
                invitationStatus={invitationStatus}
                onBadgeEarned={onBadgeEarned}
                badgeToken={badgeToken}
              />
            </div>
          )}
        </div>
      )}
      {invitationStatus !== 'published' && !previewMode ? (
        <p className="opacity-80">Guestbook will be available once this invitation is published.</p>
      ) : (
        <form onSubmit={submitEntry} className="space-y-4">
          {previewMode && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--mq-fg)]/80">
              Preview mode: guestbook submissions are disabled.
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              <span className="opacity-80">Nickname</span>
              <input
                required
                maxLength={20}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Your nickname"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base text-[var(--mq-fg)] placeholder:text-white/70 focus:border-white/40 focus:outline-none"
                disabled={previewMode}
              />
              <span className="block text-xs opacity-70">{characterCounts.nickname}/20</span>
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span className="opacity-80">Message</span>
              <textarea
                required
                maxLength={300}
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share your wishes"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base text-[var(--mq-fg)] placeholder:text-white/70 focus:border-white/40 focus:outline-none"
                disabled={previewMode}
              />
              <span className="block text-xs opacity-70">{characterCounts.message}/300</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={previewMode || submitting || !nickname.trim() || !message.trim()}
              className="rounded-full bg-[var(--mq-fg)] px-5 py-2 text-sm font-semibold text-[var(--mq-bg)] transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Sign guestbook'}
            </button>
            {badgeToken && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[var(--mq-fg)]">
                quizPerfect badge ready
              </span>
            )}
            {successMessage && <span className="text-sm text-emerald-100">{successMessage}</span>}
            {error && <span className="text-sm text-amber-200">{error}</span>}
          </div>
        </form>
      )}

      <div className="space-y-4">
        {loading && <p className="opacity-80">Loading messages…</p>}
        {!loading && entries.length === 0 && <p className="opacity-70">No guestbook entries yet.</p>}
        <ul className="space-y-3">
          {entries.map((entry) => {
            const isPerfect = entry.badge === 'quizPerfect';
            return (
              <li
                key={entry.id}
                className={`rounded-2xl border p-4 shadow-lg ${
                  isPerfect
                    ? 'border-amber-300/70 bg-amber-100/10 shadow-amber-200/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm opacity-80">
                  <span className="font-semibold text-[var(--mq-fg)]">{entry.nickname}</span>
                  <span>{format(new Date(entry.createdAt), 'PPP')}</span>
                </div>
                {badgeLabel(entry.badge) && (
                  <span className="mt-1 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-[var(--mq-fg)]">
                    {badgeLabel(entry.badge)}
                  </span>
                )}
                <p className="mt-2 leading-relaxed text-[var(--mq-fg)]/90">{entry.message}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
