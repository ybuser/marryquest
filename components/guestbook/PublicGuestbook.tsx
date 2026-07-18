import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useLanguage, getDateLocale } from '@/components/i18n/LanguageProvider';
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

type GuestbookLoadError = 'load_failed' | 'rate_limited';

const EMPTY_PREVIEW_ENTRIES = Object.freeze([]) as readonly GuestbookEntryDto[];

function guestbookEntriesEqual(
  current: readonly GuestbookEntryDto[],
  next: readonly GuestbookEntryDto[]
): boolean {
  return (
    current.length === next.length &&
    current.every((entry, index) => {
      const candidate = next[index];
      if (!candidate) return false;
      return (
        candidate.id === entry.id &&
        candidate.nickname === entry.nickname &&
        candidate.message === entry.message &&
        candidate.badge === entry.badge &&
        candidate.hidden === entry.hidden &&
        candidate.createdAt === entry.createdAt
      );
    })
  );
}

export function PublicGuestbook({
  invitationId,
  slug,
  invitationStatus,
  badgeToken,
  quiz,
  onBadgeEarned,
  previewEntries,
  previewMode = false
}: PublicGuestbookProps) {
  const { language, isKorean } = useLanguage();
  const resolvedPreviewEntries = previewEntries ?? EMPTY_PREVIEW_ENTRIES;
  const [entries, setEntries] = useState<GuestbookEntryDto[]>(() =>
    previewMode ? resolvedPreviewEntries.filter((entry) => !entry.hidden) : []
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<GuestbookLoadError | null>(null);
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
    if (!previewMode) return;

    const visibleEntries = resolvedPreviewEntries.filter((entry) => !entry.hidden);
    setEntries((current) => (guestbookEntriesEqual(current, visibleEntries) ? current : visibleEntries));
    setLoading(false);
    setLoadError(null);
  }, [previewMode, resolvedPreviewEntries]);

  useEffect(() => {
    if (previewMode) return;
    if (invitationStatus !== 'published' || !slug.trim()) {
      setEntries((current) => (current.length === 0 ? current : []));
      setLoading(false);
      setLoadError(null);
      return;
    }

    const abortController = new AbortController();
    setEntries((current) => (current.length === 0 ? current : []));

    async function fetchEntries() {
      setLoading(true);
      setError(null);
      setLoadError(null);
      try {
        const response = await fetch(`/api/guestbook?slug=${encodeURIComponent(slug)}`, {
          signal: abortController.signal
        });
        if (abortController.signal.aborted) return;
        if (!response.ok) {
          setLoadError(response.status === 429 ? 'rate_limited' : 'load_failed');
          return;
        }
        const data: GuestbookEntryDto[] = await response.json();
        if (!abortController.signal.aborted) {
          setEntries(data);
        }
      } catch (fetchError) {
        if (abortController.signal.aborted || (fetchError instanceof Error && fetchError.name === 'AbortError')) {
          return;
        }
        setLoadError('load_failed');
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchEntries();
    return () => abortController.abort();
  }, [invitationStatus, previewMode, slug]);

  useEffect(() => {
    if (!previewMode) return;
    setQuizOpen(Boolean(quiz?.enabled && quiz.questions.length > 0));
  }, [previewMode, quiz?.enabled, quiz?.questions.length]);

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (previewMode) {
      setSuccessMessage(isKorean ? '미리보기에서는 방명록 작성이 비활성화됩니다.' : 'Preview mode: guestbook submission disabled.');
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
              ? isKorean
                ? '이 기기에서는 더 이상 방명록을 남길 수 없습니다.'
                : 'This device cannot add any more guestbook messages.'
              : isKorean
                ? '이 기기에서는 기본 1회, 퀴즈 만점 시 1회 추가로 방명록을 남길 수 있습니다.'
                : 'This device can leave one guestbook message by default, plus one more after a perfect quiz score.'
          );
          return;
        }

        const errorPayload = await response.json().catch(() => null);
        const messageText = errorPayload?.error ?? (isKorean ? '방명록을 등록하지 못했습니다.' : 'Unable to sign the guestbook.');
        setError(Array.isArray(messageText) ? messageText.join(', ') : messageText);
        return;
      }

      const created: GuestbookEntryDto = await response.json();
      setEntries((prev) => [created, ...prev]);
      setNickname('');
      setMessage('');
      setSuccessMessage(isKorean ? '축하 메시지가 등록되었습니다.' : 'Thanks for leaving a message!');
    } catch (err) {
      console.error(err);
      setError(isKorean ? '방명록을 등록하지 못했습니다.' : 'Unable to sign the guestbook.');
    } finally {
      setSubmitting(false);
    }
  }

  const badgeLabel = (badge: GuestbookEntryDto['badge']) => {
    if (badge === 'none') return null;
    if (badge === 'quizPerfect') {
      return isKorean ? '퀴즈 만점 배지' : 'Quiz Perfect';
    }
    const label = badge.replace(/_/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const quizAvailable = Boolean(quiz?.enabled && quiz.questions.length > 0);
  const loadErrorMessage =
    loadError === 'rate_limited'
      ? isKorean
        ? '요청이 너무 많습니다. 잠시 후 페이지를 새로고침해 주세요.'
        : 'Too many requests. Please refresh the page later.'
      : loadError === 'load_failed'
        ? isKorean
          ? '방명록을 불러오지 못했습니다.'
          : 'Unable to load guestbook right now.'
        : null;
  const displayedError = error ?? loadErrorMessage;

  return (
    <div className="space-y-6">
      {quizAvailable && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--mq-fg)]">{isKorean ? '축하 퀴즈' : 'Quiz challenge'}</p>
              <p className="text-xs text-[var(--mq-fg)]/70">
                {isKorean
                  ? '퀴즈를 모두 맞히면 방명록에 특별 배지를 함께 남길 수 있어요.'
                  : 'Solve the wedding quiz to unlock a special guestbook badge.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuizOpen((prev) => !prev)}
              className="mq-toggle-btn rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[var(--mq-fg)] transition hover:border-white/40"
              aria-expanded={quizOpen}
            >
              {quizOpen ? (isKorean ? '퀴즈 접기' : 'Close quiz') : isKorean ? '퀴즈 열기' : 'Open quiz'}
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
        <p className="opacity-80">{isKorean ? '청첩장이 공개되면 방명록이 열립니다.' : 'Guestbook will be available once this invitation is published.'}</p>
      ) : (
        <form onSubmit={submitEntry} className="space-y-4">
          {previewMode && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--mq-fg)]/80">
              {isKorean ? '미리보기에서는 방명록 작성이 비활성화됩니다.' : 'Preview mode: guestbook submissions are disabled.'}
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              <span className="opacity-80">{isKorean ? '성함 또는 닉네임' : 'Nickname'}</span>
              <input
                required
                maxLength={20}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder={isKorean ? '이름이나 닉네임을 입력해 주세요' : 'Your nickname'}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base text-[var(--mq-fg)] placeholder:text-white/70 focus:border-white/40 focus:outline-none"
                disabled={previewMode}
              />
              <span className="block text-xs opacity-70">{characterCounts.nickname}/20</span>
            </label>
            <label className="space-y-1 text-sm font-medium">
              <span className="opacity-80">{isKorean ? '축하 메시지' : 'Message'}</span>
              <textarea
                required
                maxLength={300}
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={isKorean ? '축하의 마음을 남겨 주세요' : 'Share your wishes'}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base text-[var(--mq-fg)] placeholder:text-white/70 focus:border-white/40 focus:outline-none"
                disabled={previewMode}
              />
              <span className="block text-xs opacity-70">{characterCounts.message}/300</span>
            </label>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="submit"
              disabled={previewMode || submitting || !nickname.trim() || !message.trim()}
              className="mq-guestbook-submit rounded-full bg-[var(--mq-fg)] px-5 py-2 text-sm font-semibold text-[var(--mq-bg)] transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (isKorean ? '등록 중…' : 'Submitting…') : isKorean ? '방명록 남기기' : 'Sign guestbook'}
            </button>
            {badgeToken && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[var(--mq-fg)]">
                {isKorean ? '퀴즈 배지가 준비되었어요' : 'quizPerfect badge ready'}
              </span>
            )}
            {successMessage && <span className="text-sm text-emerald-100">{successMessage}</span>}
            {displayedError && <span className="text-sm text-amber-200">{displayedError}</span>}
          </div>
        </form>
      )}

      <div className="space-y-4">
        {loading && <p className="opacity-80">{isKorean ? '방명록을 불러오는 중…' : 'Loading messages…'}</p>}
        {!loading && entries.length === 0 && <p className="opacity-70">{isKorean ? '아직 남겨진 방명록이 없습니다.' : 'No guestbook entries yet.'}</p>}
        <ul className="space-y-3">
          {entries.map((entry) => {
            const isPerfect = entry.badge === 'quizPerfect';
            return (
              <li
                key={entry.id}
                data-preview-id={`guestbook-entry-${entry.id}`}
                className={`mq-guestbook-item rounded-2xl border p-4 shadow-lg ${
                  isPerfect
                    ? 'border-amber-300/70 bg-amber-100/10 shadow-amber-200/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm opacity-80">
                  <span className="font-semibold text-[var(--mq-fg)]">{entry.nickname}</span>
                  <span>{format(new Date(entry.createdAt), 'PPP', { locale: getDateLocale(language) })}</span>
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
