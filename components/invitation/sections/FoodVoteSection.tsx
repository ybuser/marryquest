import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InvitationDetails } from '@/types/invitation';
import type { FoodVoteOptionDto, FoodVoteResponseDto } from '@/types/foodvote';

interface FoodVoteSectionProps {
  slug: string;
  invitationStatus: InvitationDetails['status'];
  previewMode?: boolean;
  initialOptions?: FoodVoteOptionDto[];
}

export function FoodVoteSection({ slug, invitationStatus, previewMode, initialOptions = [] }: FoodVoteSectionProps) {
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
        throw new Error('메뉴 투표 정보를 불러오지 못했어요.');
      }
      const payload: FoodVoteResponseDto = await response.json();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '메뉴 투표 정보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [previewData, previewing, slug]);

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
        setError('이 기기에서는 이미 메뉴 투표를 완료했어요.');
        await load();
        return;
      }

      if (response.status === 429) {
        setError('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.');
        return;
      }

      if (!response.ok) {
        throw new Error('투표를 저장하지 못했어요.');
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '투표를 저장하지 못했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-600">메뉴 투표를 불러오는 중…</p>;

  if (data.options.length === 0) return <p className="text-sm text-slate-600">등록된 메뉴 옵션이 없어요.</p>;

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data.alreadyVoted && <p className="text-sm font-medium text-slate-600">이 기기에서는 이미 메뉴 투표를 완료했어요.</p>}

      {data.options.map((option) => {
        const selected = data.votedOptionId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={data.alreadyVoted || submitting || previewing}
            onClick={() => onVote(option.id)}
            className={`w-full rounded-lg border px-4 py-3 text-left shadow-sm transition ${
              selected ? 'border-slate-900 bg-slate-100' : 'border-slate-200 bg-white'
            } disabled:cursor-not-allowed disabled:opacity-80`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                {option.description && <p className="text-xs text-slate-600">{option.description}</p>}
              </div>
              <span className="text-sm font-semibold text-slate-700">{option.votes}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
