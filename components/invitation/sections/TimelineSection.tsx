import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { InvitationDetails } from '@/types/invitation';
import type { TimelineCardDto, TimelinePuzzleDto } from '@/types/timeline';
import type { MusicResponseDto } from '@/types/music';

interface TimelineSectionProps {
  invitationId: string;
  slug: string;
  invitationStatus: InvitationDetails['status'];
  puzzle?: TimelinePuzzleDto | null;
  previewMode?: boolean;
}

interface SortableCardProps {
  card: TimelineCardDto;
}

function SortableCard({ card }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
      {...attributes}
      {...listeners}
    >
      <span className="cursor-grab text-slate-400">⋮⋮</span>
      <span>{card.text}</span>
    </div>
  );
}

function MusicPanel({ invitationId, slug }: { invitationId: string; slug: string }) {
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
        throw new Error('Unable to load music');
      }
      const payload: MusicResponseDto = await response.json();
      setMusicData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load music');
    } finally {
      setLoading(false);
    }
  }, [slug]);

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
        setError(payload?.error ?? 'Already used your vote');
        return;
      }
      if (!response.ok) {
        throw new Error('Unable to save vote');
      }
      await loadMusic();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save vote');
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
          artist: artist.trim() || null
        })
      });
      if (response.status === 409) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? 'Already used your vote');
        return;
      }
      if (!response.ok) {
        throw new Error('Unable to add track');
      }
      setTitle('');
      setArtist('');
      await loadMusic();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add track');
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyUsed = musicData?.alreadyUsed ?? false;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-slate-900">Music voting</p>
        {alreadyUsed && <span className="text-xs font-medium text-slate-500">Vote used</span>}
      </div>
      {loading && <p className="text-sm text-slate-500">Loading tracks…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && musicData && (
        <div className="space-y-3">
          {musicData.tracks.length === 0 && <p className="text-sm text-slate-600">No tracks yet. Add one below.</p>}
          {musicData.tracks.map((track) => (
            <div key={track.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{track.title}</p>
                {track.artist && <p className="text-xs text-slate-500">{track.artist}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">{track.voteCount}</span>
                <button
                  type="button"
                  onClick={() => handleVote(track.id)}
                  disabled={alreadyUsed || submitting}
                  className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Vote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Add a song</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            disabled={alreadyUsed || submitting}
          />
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist (optional)"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            disabled={alreadyUsed || submitting}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={alreadyUsed || submitting || !title.trim()}
          className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add &amp; Vote
        </button>
      </div>
    </div>
  );
}

export function TimelineSection({ invitationId, slug, invitationStatus, puzzle, previewMode }: TimelineSectionProps) {
  const previewing = previewMode && invitationStatus !== 'published';
  const [cards, setCards] = useState<TimelineCardDto[]>(() => puzzle?.cards ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setCards(puzzle?.cards ?? []);
    setResult('idle');
    setMessage(null);
  }, [puzzle]);

  const sortedCards = useMemo(() => [...cards].sort((a, b) => a.order - b.order), [cards]);
  const sensors = useSensors(useSensor(PointerSensor));

  if (!puzzle || !puzzle.enabled || sortedCards.length === 0) {
    return <p className="text-sm text-slate-600">Timeline puzzle is not available.</p>;
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIndex = sortedCards.findIndex((item) => item.id === active.id);
    const overIndex = sortedCards.findIndex((item) => item.id === over.id);
    const nextCards = arrayMove(sortedCards, currentIndex, overIndex).map((card, index) => ({
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
        body: JSON.stringify({ invitationId, cardIds: sortedCards.map((card) => card.id) })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.error ?? 'Unable to check timeline');
        setResult('error');
        return;
      }

      const payload: { ok: boolean; success: boolean } = await response.json();
      if (payload.success) {
        setResult('success');
        setMessage('Great job! Timeline solved.');
      } else {
        setResult('error');
        setMessage('Not quite. Try again!');
      }
    } catch (err) {
      setResult('error');
      setMessage('Unable to check timeline');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-slate-600">Drag the moments into the correct order.</p>
      {previewing && <p className="mt-2 text-xs text-slate-500">Preview mode: publish to play.</p>}
      <div className="mt-4 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
            {sortedCards.map((card) => (
              <SortableCard key={card.id} card={card} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={previewing || submitting}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Checking…' : 'Submit timeline'}
      </button>
      {message && (
        <p className={`mt-2 text-sm ${result === 'success' ? 'text-emerald-600' : 'text-slate-600'}`}>{message}</p>
      )}
      {result === 'success' && <MusicPanel invitationId={invitationId} slug={slug} />}
    </div>
  );
}
