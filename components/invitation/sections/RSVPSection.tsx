import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';

interface RSVPSectionProps {
  invitationId: string;
  invitationStatus?: string;
}

type AttendanceOption = 'yes' | 'no' | 'maybe';

export function RSVPSection({ invitationId, invitationStatus }: RSVPSectionProps) {
  const { isKorean } = useLanguage();
  const [attendance, setAttendance] = useState<AttendanceOption>('yes');
  const [attendeeName, setAttendeeName] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const [kidsCount, setKidsCount] = useState(0);
  const [allergiesText, setAllergiesText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const disabled = useMemo(() => invitationStatus !== 'published', [invitationStatus]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    setSubmitting(true);
    setMessage(null);

    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitationId,
        attendeeName: attendeeName.trim(),
        attendance,
        guestsCount,
        kidsCount,
        allergiesText: allergiesText.trim() || undefined
      })
    });

    if (response.ok) {
      setMessage(isKorean ? '참석 여부가 정상적으로 전달되었습니다.' : 'Thanks! Your RSVP has been recorded.');
    } else if (response.status === 429) {
      setMessage(
        isKorean
          ? '이 기기에서는 이 청첩장에 대해 최대 2번까지 참석 여부를 전달할 수 있습니다.'
          : 'This device can submit up to two RSVP responses for this invitation.'
      );
    } else {
      setMessage(isKorean ? '참석 여부를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' : 'Unable to save RSVP. Please try again.');
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm text-[var(--mq-surface-fg)]">
      <label className="block space-y-2">
        <span className="mq-themed-muted block text-xs uppercase tracking-wide">{isKorean ? '성함' : 'Name'}</span>
        <input
          type="text"
          value={attendeeName}
          onChange={(event) => setAttendeeName(event.target.value)}
          disabled={disabled || submitting}
          required
          maxLength={40}
          className="mq-themed-field w-full rounded-lg border px-3 py-2 shadow-sm"
          placeholder={isKorean ? '성함을 입력해 주세요' : 'Your full name'}
        />
      </label>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="mq-themed-muted block text-xs uppercase tracking-wide">{isKorean ? '참석 여부' : 'Attendance'}</span>
          <div className="grid grid-cols-3 gap-2">
            {(['yes', 'no', 'maybe'] as AttendanceOption[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAttendance(option)}
                disabled={disabled || submitting}
                className={`mq-rsvp-option mq-themed-focus-ring flex-1 rounded-lg border px-3 py-2 capitalize shadow-sm transition ${
                  attendance === option ? 'mq-themed-control' : 'mq-themed-surface'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {isKorean ? (option === 'yes' ? '참석' : option === 'no' ? '불참' : '미정') : option}
              </button>
            ))}
          </div>
        </label>

        <label className="space-y-2 sm:max-w-[14rem]">
          <span className="mq-themed-muted block text-xs uppercase tracking-wide">{isKorean ? '동반 인원' : 'Guests'}</span>
          <input
            type="number"
            min={0}
            max={10}
            value={guestsCount}
            onChange={(event) => setGuestsCount(Number(event.target.value))}
            disabled={disabled || submitting}
            className="mq-themed-field w-full rounded-lg border px-3 py-2 shadow-sm"
          />
        </label>

        <label className="space-y-2 sm:max-w-[14rem]">
          <span className="mq-themed-muted block text-xs uppercase tracking-wide">{isKorean ? '아동 인원' : 'Kids'}</span>
          <input
            type="number"
            min={0}
            max={10}
            value={kidsCount}
            onChange={(event) => setKidsCount(Number(event.target.value))}
            disabled={disabled || submitting}
            className="mq-themed-field w-full rounded-lg border px-3 py-2 shadow-sm"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="mq-themed-muted block text-xs uppercase tracking-wide">{isKorean ? '알레르기 / 전달사항' : 'Allergies / Notes'}</span>
        <textarea
          maxLength={120}
          value={allergiesText}
          onChange={(event) => setAllergiesText(event.target.value)}
          disabled={disabled || submitting}
          rows={3}
          className="mq-themed-field w-full rounded-lg border px-3 py-2 shadow-sm"
          placeholder={isKorean ? '전달할 내용이 있으면 적어 주세요 (최대 120자)' : 'Optional notes (max 120 characters)'}
        />
      </label>

      <p className="mq-themed-muted text-xs leading-5">
        {isKorean
          ? '예식 준비를 위한 대략적인 인원 파악용이라 최종 인원과 조금 달라도 괜찮습니다.'
          : 'This RSVP is only for planning the headcount, so guests do not need to provide final numbers yet.'}
      </p>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="submit"
          disabled={disabled || submitting}
          className="mq-rsvp-submit mq-themed-control rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm"
        >
          {submitting ? (isKorean ? '저장 중…' : 'Saving…') : isKorean ? '참석 여부 전달하기' : 'Send RSVP'}
        </button>
        {disabled && (
          <span className="mq-themed-status text-xs">
            {isKorean ? '청첩장이 공개되면 참석 여부 입력이 열립니다.' : 'RSVP opens when this invitation is published.'}
          </span>
        )}
        {message && <span className="mq-themed-status text-xs">{message}</span>}
      </div>
    </form>
  );
}
