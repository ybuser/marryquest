import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { InvitationDetails } from '@/types/invitation';
import type { FoodVoteOptionDto, FoodVoteResponseDto } from '@/types/foodvote';

interface FoodVoteSectionProps {
  slug: string;
  invitationStatus: InvitationDetails['status'];
  previewMode?: boolean;
  initialOptions?: FoodVoteOptionDto[];
}

export function FoodVoteSection({ slug, invitationStatus, previewMode, initialOptions = [] }: FoodVoteSectionProps) {
  const { isKorean } = useLanguage();
  const previewing = previewMode && invitationStatus !== 'published';
  const [loading, setLoading] = useState(!previewing);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<FoodVoteResponseDto>({ options: [], alreadyVoted: false });

  const previewData = useMemo<FoodVoteResponseDto>(
    () => ({
      options: [...initialOptions]
        .sort((a, b) => a.order - b.order)
        .filter((option) => option.isActive)
        .map((option) => ({
          id: option.id,
          label: option.label,
          description: option.description,
          order: option.order,
          votes: 0
        })),
      alreadyVoted: false
    }),
    [initialOptions]
  );

  const load = useCallback(async () => {
    if (previewing) {
      setData(previewData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/food-vote?slug=${encodeURIComponent(slug)}`);
      if (!response.ok) {
        throw new Error(isKorean ? '메뉴 투표 정보를 불러오지 못했습니다.' : 'Unable to load the menu vote right now.');
      }
      const payload: FoodVoteResponseDto = await response.json();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : isKorean ? '메뉴 투표 정보를 불러오지 못했습니다.' : 'Unable to load the menu vote right now.');
    } finally {
      setLoading(false);
    }
  }, [isKorean, previewData, previewing, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const onVote = async (optionId: string) => {
    if (previewing || submitting || data.alreadyVoted) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/food-vote/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, optionId })
      });

      if (response.status === 409) {
        setError(isKorean ? '이 기기에서는 이미 메뉴 투표를 완료했습니다.' : 'This device has already submitted a menu vote.');
        await load();
        return;
      }

      if (response.status === 429) {
        setError(isKorean ? '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' : 'Too many requests. Please wait a moment and try again.');
        return;
      }

      if (!response.ok) {
        throw new Error(isKorean ? '투표를 저장하지 못했습니다.' : 'Unable to save your vote.');
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : isKorean ? '투표를 저장하지 못했습니다.' : 'Unable to save your vote.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="mq-themed-status text-sm">{isKorean ? '메뉴 투표를 불러오는 중…' : 'Loading menu vote…'}</p>;

  if (data.options.length === 0) {
    return <p className="mq-themed-muted text-sm">{isKorean ? '등록된 메뉴 옵션이 아직 없습니다.' : 'No menu options are available yet.'}</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="mq-themed-error text-sm">{error}</p>}
      {data.alreadyVoted && (
        <p className="mq-themed-status text-sm font-medium">
          {isKorean ? '이 기기에서는 이미 메뉴 투표를 완료했습니다.' : 'This device has already submitted a menu vote.'}
        </p>
      )}

      {data.options.map((option) => {
        const selected = data.votedOptionId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={data.alreadyVoted || submitting || previewing}
            onClick={() => onVote(option.id)}
            className={`mq-food-option mq-themed-focus-ring mq-themed-surface w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
              selected ? 'ring-2 ring-[var(--mq-accent)]' : ''
            } disabled:cursor-not-allowed disabled:opacity-80`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--mq-surface-fg)]">{option.label}</p>
                {option.description && <p className="mq-themed-muted text-xs">{option.description}</p>}
              </div>
              <span className="mq-themed-surface-elevated inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold">
                {isKorean ? `${option.votes}표` : `${option.votes} vote${option.votes === 1 ? '' : 's'}`}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
