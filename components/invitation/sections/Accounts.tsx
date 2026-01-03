import { useState } from 'react';
import { SectionCard } from './SectionCard';

interface AccountsSectionProps {
  groomName: string;
  brideName: string;
  accountGroom?: string | null;
  accountBride?: string | null;
}

export function AccountsSection({ groomName, brideName, accountGroom, accountBride }: AccountsSectionProps) {
  const [revealed, setRevealed] = useState(false);
  const hasAccounts = Boolean(accountGroom || accountBride);

  return (
    <SectionCard
      title="Gift Accounts"
      eyebrow="Private"
      actions={
        hasAccounts ? (
          <button
            type="button"
            onClick={() => setRevealed((prev) => !prev)}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-[var(--mq-fg)] transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        ) : null
      }
    >
      {!hasAccounts && <p className="opacity-80">Account details are not provided yet.</p>}

      {hasAccounts && !revealed && (
        <p className="text-sm opacity-80">
          For privacy, bank details are hidden. Tap “Show” to reveal when you need them.
        </p>
      )}

      {hasAccounts && revealed && (
        <div className="grid gap-4 md:grid-cols-2">
          {accountGroom && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70" style={{ letterSpacing: 'var(--mq-letter-spacing)' }}>
                {groomName}
              </p>
              <p className="mt-2 break-words text-sm font-semibold" style={{ fontFamily: 'var(--mq-heading-font)' }}>
                {accountGroom}
              </p>
            </div>
          )}
          {accountBride && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70" style={{ letterSpacing: 'var(--mq-letter-spacing)' }}>
                {brideName}
              </p>
              <p className="mt-2 break-words text-sm font-semibold" style={{ fontFamily: 'var(--mq-heading-font)' }}>
                {accountBride}
              </p>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
