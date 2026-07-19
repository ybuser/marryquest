import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { InvitationDetails } from '@/types/invitation';
import type { QuizDto } from '@/types/quiz';

interface QuizSectionProps {
  quiz: QuizDto | null;
  invitationId: string;
  invitationStatus: InvitationDetails['status'];
  onBadgeEarned?: (token: string | null) => void;
  badgeToken?: string | null;
}

export function QuizSection({ quiz, invitationId, invitationStatus, onBadgeEarned, badgeToken }: QuizSectionProps) {
  const { isKorean } = useLanguage();
  const questions = useMemo(() => quiz?.questions ?? [], [quiz]);
  const [answers, setAnswers] = useState<number[]>(questions.map(() => -1));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<'success' | 'failure' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localBadge, setLocalBadge] = useState<string | null>(badgeToken ?? null);

  useEffect(() => {
    setAnswers(questions.map(() => -1));
    setSubmitted(false);
    setResult(null);
    setError(null);
  }, [quiz?.id, quiz?.enabled, questions]);

  useEffect(() => {
    if (badgeToken) {
      setLocalBadge(badgeToken);
    }
  }, [badgeToken]);

  const allAnswered = useMemo(() => answers.every((answer) => answer >= 0), [answers]);

  async function submitQuiz(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quiz?.enabled || !questions.length) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, answers })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? (isKorean ? '퀴즈 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.' : 'Unable to submit quiz right now.'));
        setSubmitting(false);
        return;
      }

      const payload = await response.json();
      setSubmitted(true);
      if (payload.success) {
        setResult('success');
        if (payload.badgeToken) {
          setLocalBadge(payload.badgeToken);
          onBadgeEarned?.(payload.badgeToken);
        }
      } else {
        setResult('failure');
      }
    } catch (err) {
      console.error(err);
      setError(isKorean ? '퀴즈 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.' : 'Unable to submit quiz right now.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!quiz?.enabled || questions.length === 0) {
    return <p className="mq-themed-muted text-sm">{isKorean ? '퀴즈가 아직 열리지 않았습니다.' : 'Quiz is disabled for now.'}</p>;
  }

  if (invitationStatus !== 'published') {
    return <p className="mq-themed-muted text-sm">{isKorean ? '청첩장이 공개되면 퀴즈에 참여할 수 있습니다.' : 'Quiz will unlock once this invitation is published.'}</p>;
  }

  return (
    <form className="space-y-5" onSubmit={submitQuiz}>
      <div className="space-y-4">
        {questions.map((question, questionIndex) => (
          <div
            key={question.id ?? questionIndex}
            data-preview-id={`quiz-question-${questionIndex}`}
            className="mq-themed-surface rounded-2xl border p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-[var(--mq-surface-fg)]">{isKorean ? `${questionIndex + 1}번 문제` : `Question ${questionIndex + 1}`}</p>
              {localBadge && <span className="mq-themed-success text-xs font-medium">{isKorean ? '배지 획득 가능' : 'Badge unlocked'}</span>}
            </div>
            <p className="mt-1 text-[var(--mq-surface-fg)]">{question.prompt}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => (
                <label
                  key={optionIndex}
                  className={`mq-themed-focus-ring flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    answers[questionIndex] === optionIndex
                      ? 'mq-themed-surface-elevated ring-2 ring-[var(--mq-accent)]'
                      : 'mq-themed-surface'
                  } ${submitted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    name={`quiz-${questionIndex}`}
                    value={optionIndex}
                    checked={answers[questionIndex] === optionIndex}
                    onChange={() =>
                      setAnswers((prev) => prev.map((answer, index) => (index === questionIndex ? optionIndex : answer)))
                    }
                    disabled={submitted}
                    className="h-4 w-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={submitting || submitted || !allAnswered}
          className="mq-themed-control w-full rounded-full border px-4 py-2 text-sm font-semibold transition"
        >
          {submitted ? (isKorean ? '제출 완료' : 'Quiz submitted') : submitting ? (isKorean ? '제출 중…' : 'Submitting…') : isKorean ? '정답 제출하기' : 'Submit answers'}
        </button>
        {result === 'success' && (
          <p className="mq-themed-success text-sm">
            {isKorean
              ? '전부 정답입니다. 방명록에 사용할 특별 배지가 준비되었습니다.'
              : 'Perfect score! A quizPerfect badge token is ready for your guestbook message.'}
          </p>
        )}
        {result === 'failure' && <p className="mq-themed-warning text-sm">{isKorean ? '전부 맞혀야 배지를 받을 수 있습니다.' : 'Only a perfect score unlocks the badge.'}</p>}
        {error && <p className="mq-themed-error text-sm">{error}</p>}
        {localBadge && !result && (
          <p className="mq-themed-success text-xs">
            {isKorean ? '방명록에서 사용할 배지가 10분 동안 유지됩니다.' : 'Your badge token is ready for the guestbook for the next 10 minutes.'}
          </p>
        )}
      </div>
    </form>
  );
}
