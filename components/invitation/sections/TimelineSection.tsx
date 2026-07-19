import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { TimelineCardDto, TimelinePuzzleDto } from '@/types/timeline';
import type { MusicResponseDto } from '@/types/music';
import { getTimelineReadiness } from '@/lib/timeline/readiness';

interface TimelineSectionProps {
  invitationId: string;
  slug: string;
  puzzle?: TimelinePuzzleDto | null;
  previewMode?: boolean;
}

interface SortableCardProps {
  card: TimelineCardDto;
  disabled?: boolean;
}

function SortableCard({ card, disabled = false }: SortableCardProps) {
  const { isKorean } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-preview-id={`timeline-card-${card.id}`}
      className="mq-timeline-card mq-themed-focus-ring mq-themed-surface flex flex-col gap-3 rounded-2xl border px-3 py-3 text-sm shadow-sm sm:flex-row sm:items-center"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <span className={disabled ? 'mq-themed-muted' : 'mq-themed-muted cursor-grab'}>↕</span>
        {card.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photoUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <div className="mq-themed-surface-elevated mq-themed-muted flex h-14 w-14 items-center justify-center rounded-xl border border-dashed text-[10px]">
            {isKorean ? '사진 없음' : 'No photo'}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--mq-surface-fg)]">{card.text}</p>
        {card.description && <p className="mq-themed-muted mt-1 text-xs leading-5">{card.description}</p>}
      </div>
    </div>
  );
}

function MusicPanel({ invitationId, slug }: { invitationId: string; slug: string }) {
  const { isKorean } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [musicData, setMusicData] = useState<MusicResponseDto | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadMusic = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/music?slug=${encodeURIComponent(slug)}`);
      if (!response.ok) {
        throw new Error(isKorean ? '음악 목록을 불러오지 못했습니다.' : 'Unable to load music');
      }
      const payload: MusicResponseDto = await response.json();
      setMusicData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : isKorean ? '음악 목록을 불러오지 못했습니다.' : 'Unable to load music');
    } finally {
      setLoading(false);
    }
  }, [isKorean, slug]);

  useEffect(() => {
    void loadMusic();
  }, [loadMusic]);

  const handleVote = async (trackId: string) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/music/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, trackId })
      });
      if (response.status === 409) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? (isKorean ? '이 기기에서는 이미 음악 투표를 완료했습니다.' : 'Already used your vote'));
        return;
      }
      if (!response.ok) {
        throw new Error(isKorean ? '투표를 저장하지 못했습니다.' : 'Unable to save vote');
      }
      await loadMusic();
    } catch (err) {
      setError(err instanceof Error ? err.message : isKorean ? '투표를 저장하지 못했습니다.' : 'Unable to save vote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdd = async () => {
    if (submitting || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/music/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId,
          title: title.trim(),
          artist: artist.trim() || ''
        })
      });
      if (response.status === 409) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? (isKorean ? '이 기기에서는 이미 음악 투표를 완료했습니다.' : 'Already used your vote'));
        return;
      }
      if (!response.ok) {
        throw new Error(isKorean ? '곡을 추가하지 못했습니다.' : 'Unable to add track');
      }
      setTitle('');
      setArtist('');
      await loadMusic();
    } catch (err) {
      setError(err instanceof Error ? err.message : isKorean ? '곡을 추가하지 못했습니다.' : 'Unable to add track');
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyUsed = musicData?.alreadyUsed ?? false;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-semibold text-[var(--mq-surface-fg)]">{isKorean ? '식전 음악 투표' : 'Music voting'}</p>
        {alreadyUsed && <span className="mq-themed-status text-xs font-medium">{isKorean ? '투표 완료' : 'Vote used'}</span>}
      </div>
      {loading && <p className="mq-themed-status text-sm">{isKorean ? '곡 목록을 불러오는 중…' : 'Loading tracks…'}</p>}
      {error && <p className="mq-themed-error text-sm">{error}</p>}
      {!loading && musicData && (
        <div className="space-y-3">
          {musicData.tracks.length === 0 && (
            <p className="mq-themed-muted text-sm">{isKorean ? '아직 등록된 곡이 없습니다. 아래에서 직접 추가해 주세요.' : 'No tracks yet. Add one below.'}</p>
          )}
          {musicData.tracks.map((track) => (
            <div key={track.id} className="mq-music-track mq-themed-surface flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--mq-surface-fg)]">{track.title}</p>
                {track.artist && <p className="mq-themed-muted text-xs">{track.artist}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--mq-surface-fg)]">{track.voteCount}</span>
                <button
                  type="button"
                  onClick={() => handleVote(track.id)}
                  disabled={alreadyUsed || submitting}
                  className="mq-music-action mq-themed-control rounded-md border px-3 py-1 text-xs font-semibold"
                >
                  {isKorean ? '투표' : 'Vote'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mq-themed-surface-elevated rounded-2xl border p-4">
        <p className="text-sm font-semibold text-[var(--mq-surface-fg)]">{isKorean ? '직접 곡 추가' : 'Add a song'}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isKorean ? '곡 제목' : 'Song title'}
            className="mq-themed-field w-full rounded-md border px-3 py-2 text-sm"
            disabled={alreadyUsed || submitting}
          />
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder={isKorean ? '가수명 (선택)' : 'Artist (optional)'}
            className="mq-themed-field w-full rounded-md border px-3 py-2 text-sm"
            disabled={alreadyUsed || submitting}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={alreadyUsed || submitting || !title.trim()}
          className="mq-music-action mq-themed-control mt-3 rounded-md border px-3 py-2 text-sm font-semibold"
        >
          {isKorean ? '추가하고 투표하기' : 'Add & Vote'}
        </button>
      </div>
    </div>
  );
}

export function TimelineSection({ invitationId, slug, puzzle, previewMode }: TimelineSectionProps) {
  const { isKorean } = useLanguage();
  const previewing = Boolean(previewMode);
  const [cards, setCards] = useState<TimelineCardDto[]>(() => puzzle?.cards ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [guestKey, setGuestKey] = useState<string | null>(null);
  const [randomSeed] = useState(() => Math.random().toString(36).slice(2));

  const shuffleCards = useCallback((items: TimelineCardDto[], seedSource: string) => {
    const seed = Array.from(seedSource).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const result = [...items];
    let currentSeed = seed;
    for (let i = result.length - 1; i > 0; i -= 1) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const j = Math.floor((currentSeed / 233280) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }, []);

  useEffect(() => {
    const baseCards = [...(puzzle?.cards ?? [])].sort((a, b) => a.order - b.order);
    if (previewMode) {
      setCards(baseCards);
    } else {
      const seedSource = guestKey ?? randomSeed ?? `${puzzle?.id ?? 'timeline'}-${baseCards.length}`;
      setCards(shuffleCards(baseCards, seedSource));
    }
    setResult('idle');
    setMessage(null);
  }, [guestKey, previewMode, puzzle, randomSeed, shuffleCards]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('mq_guest='))
      ?.split('=')[1];
    if (cookieValue) {
      setGuestKey(cookieValue);
    }
  }, []);

  const displayCards = useMemo(() => cards, [cards]);
  const readiness = useMemo(() => getTimelineReadiness(puzzle?.cards ?? []), [puzzle?.cards]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  if (!previewing && (!puzzle || !puzzle.enabled || readiness.status !== 'ready')) {
    return null;
  }

  const handleDragEnd = (event: any) => {
    if (previewing) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIndex = displayCards.findIndex((item) => item.id === active.id);
    const overIndex = displayCards.findIndex((item) => item.id === over.id);
    const nextCards = arrayMove(displayCards, currentIndex, overIndex).map((card, index) => ({
      ...card,
      order: index
    }));

    setCards(nextCards);
  };

  const handleSubmit = async () => {
    if (previewing || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/timeline/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, cardIds: displayCards.map((card) => card.id) })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.error ?? (isKorean ? '정답 확인에 실패했습니다.' : 'Unable to check timeline'));
        setResult('error');
        return;
      }

      const payload: { ok: boolean; success: boolean } = await response.json();
      if (payload.success) {
        setResult('success');
        setMessage(isKorean ? '정답입니다. 타임라인 순서를 모두 맞혔어요.' : 'Great job! Timeline solved.');
      } else {
        setResult('error');
        setMessage(isKorean ? '아쉽지만 아직 정답은 아니에요. 다시 맞춰 보세요.' : 'Not quite. Try again!');
      }
    } catch (err) {
      setResult('error');
      setMessage(isKorean ? '정답 확인에 실패했습니다.' : 'Unable to check timeline');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="mq-themed-muted text-sm leading-6">
        {isKorean ? '우리 이야기 속 순간을 올바른 순서로 맞춰 보세요.' : 'Drag the moments into the correct order.'}
      </p>
      {previewing && (
        <p
          className={`mt-2 text-xs ${readiness.status === 'ready' ? 'mq-themed-success' : 'mq-themed-warning'}`}
        >
          {readiness.status === 'ready'
            ? isKorean
              ? '미리보기: 공개할 준비가 되었습니다. 하객 참여 기능은 비활성화되어 있습니다.'
              : 'Preview: ready for public display. Guest interactions are disabled.'
            : isKorean
              ? '미리보기 / 아직 공개 준비 전: 유효한 카드 5~7장을 완성해 주세요.'
              : 'Preview / not ready: complete 5-7 valid cards before public display.'}
        </p>
      )}
      {displayCards.length > 0 && (
        <>
          <div className="mt-4 space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={displayCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
                {displayCards.map((card) => (
                  <SortableCard key={card.id} card={card} disabled={previewing} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={previewing || submitting}
            className="mq-timeline-submit mq-themed-control mt-4 rounded-md border px-4 py-2 text-sm font-semibold"
          >
            {submitting ? (isKorean ? '확인 중…' : 'Checking…') : isKorean ? '순서 확인하기' : 'Submit timeline'}
          </button>
        </>
      )}
      {message && <p className={`mt-2 text-sm ${result === 'success' ? 'mq-themed-success' : 'mq-themed-error'}`}>{message}</p>}
      {result === 'success' && !previewing && <MusicPanel invitationId={invitationId} slug={slug} />}
    </div>
  );
}
