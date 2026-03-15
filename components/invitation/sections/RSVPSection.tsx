import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

interface RSVPSectionProps {
  invitationId: string;
  invitationStatus?: string;
}

type AttendanceOption = 'yes' | 'no' | 'maybe';

export function RSVPSection({ invitationId, invitationStatus }: RSVPSectionProps) {
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
      setMessage('Thanks! Your RSVP has been recorded.');
    } else if (response.status === 429) {
      setMessage('This device can submit up to two RSVP responses for this invitation.');
    } else {
      setMessage('Unable to save RSVP. Please try again.');
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-800">
      <label className="block space-y-2">
        <span className="block text-xs uppercase tracking-wide text-slate-500">Name</span>
        <input
          type="text"
          value={attendeeName}
          onChange={(event) => setAttendeeName(event.target.value)}
          disabled={disabled || submitting}
          required
          maxLength={40}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm"
          placeholder="Your full name"
        />
      </label>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Attendance</span>
          <div className="grid grid-cols-3 gap-2">
            {(['yes', 'no', 'maybe'] as AttendanceOption[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAttendance(option)}
                disabled={disabled || submitting}
                className={`mq-rsvp-option flex-1 rounded-lg border px-3 py-2 capitalize shadow-sm transition ${
                  attendance === option ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>
        </label>

        <label className="space-y-2 sm:max-w-[14rem]">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Guests</span>
          <input
            type="number"
            min={0}
            max={10}
            value={guestsCount}
            onChange={(event) => setGuestsCount(Number(event.target.value))}
            disabled={disabled || submitting}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm"
          />
        </label>

        <label className="space-y-2 sm:max-w-[14rem]">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Kids</span>
          <input
            type="number"
            min={0}
            max={10}
            value={kidsCount}
            onChange={(event) => setKidsCount(Number(event.target.value))}
            disabled={disabled || submitting}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="block text-xs uppercase tracking-wide text-slate-500">Allergies / Notes</span>
        <textarea
          maxLength={120}
          value={allergiesText}
          onChange={(event) => setAllergiesText(event.target.value)}
          disabled={disabled || submitting}
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-sm"
          placeholder="Optional notes (max 120 characters)"
        />
      </label>

      <p className="text-xs leading-5 text-slate-600">
        This RSVP is only for planning the headcount, so guests do not need to provide final numbers yet.
      </p>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="submit"
          disabled={disabled || submitting}
          className="mq-rsvp-submit rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? 'Saving…' : 'Send RSVP'}
        </button>
        {disabled && (
          <span className="text-xs text-slate-500">RSVP opens when this invitation is published.</span>
        )}
        {message && <span className="text-xs text-slate-700">{message}</span>}
      </div>
    </form>
  );
}
