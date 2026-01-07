import { useEffect, useMemo, useState } from 'react';
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
        setError(payload?.error ?? 'Unable to submit quiz right now.');
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
      setError('Unable to submit quiz right now.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!quiz?.enabled || questions.length === 0) {
    return <p className="text-sm text-[var(--mq-fg)]/80">Quiz is disabled for now.</p>;
  }

  if (invitationStatus !== 'published') {
    return <p className="text-sm text-[var(--mq-fg)]/80">Quiz will unlock once this invitation is published.</p>;
  }

  return (
    <form className="space-y-5" onSubmit={submitQuiz}>
      <div className="space-y-4">
        {questions.map((question, questionIndex) => (
          <div key={question.id ?? questionIndex} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-[var(--mq-fg)]">Question {questionIndex + 1}</p>
              {localBadge && <span className="text-xs font-medium text-emerald-100">Badge unlocked</span>}
            </div>
            <p className="mt-1 text-[var(--mq-fg)]/90">{question.prompt}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {question.options.map((option, optionIndex) => (
                <label
                  key={optionIndex}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    answers[questionIndex] === optionIndex
                      ? 'border-[var(--mq-fg)] bg-[var(--mq-fg)]/10 text-[var(--mq-fg)]'
                      : 'border-white/10 bg-white/5 text-[var(--mq-fg)]/80'
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
          className="w-full rounded-full bg-[var(--mq-fg)] px-4 py-2 text-sm font-semibold text-[var(--mq-bg)] transition hover:opacity-90 disabled:opacity-50"
        >
          {submitted ? 'Quiz submitted' : submitting ? 'Submitting…' : 'Submit answers'}
        </button>
        {result === 'success' && (
          <p className="text-sm text-emerald-100">
            Perfect score! A quizPerfect badge token is ready for your guestbook message.
          </p>
        )}
        {result === 'failure' && <p className="text-sm text-amber-200">Only a perfect score unlocks the badge.</p>}
        {error && <p className="text-sm text-amber-200">{error}</p>}
        {localBadge && !result && (
          <p className="text-xs text-emerald-100">Your badge token is ready for the guestbook for the next 10 minutes.</p>
        )}
      </div>
    </form>
  );
}
