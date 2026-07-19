import { useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { SectionCard } from './SectionCard';

interface AccountsSectionProps {
  groomName: string;
  brideName: string;
  accountGroom?: string | null;
  accountBride?: string | null;
}

export function AccountsSection({ groomName, brideName, accountGroom, accountBride }: AccountsSectionProps) {
  const { isKorean } = useLanguage();
  const [revealed, setRevealed] = useState(false);
  const hasAccounts = Boolean(accountGroom || accountBride);

  return (
    <SectionCard
      title={isKorean ? '마음 전하실 곳' : 'Gift Accounts'}
      eyebrow={isKorean ? '계좌 안내' : 'Private'}
      actions={
        hasAccounts ? (
          <button
            type="button"
            onClick={() => setRevealed((prev) => !prev)}
            className="mq-toggle-btn mq-themed-control rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {revealed ? (isKorean ? '숨기기' : 'Hide') : isKorean ? '보기' : 'Show'}
          </button>
        ) : null
      }
    >
      {!hasAccounts && <p className="opacity-80">{isKorean ? '계좌 정보가 아직 등록되지 않았습니다.' : 'Account details are not provided yet.'}</p>}

      {hasAccounts && !revealed && (
        <p className="text-sm opacity-80">
          {isKorean ? '개인정보 보호를 위해 계좌 정보는 기본적으로 가려져 있습니다. 필요할 때만 보기 버튼을 눌러 확인해 주세요.' : 'For privacy, bank details are hidden. Tap "Show" to reveal when you need them.'}
        </p>
      )}

      {hasAccounts && revealed && (
        <div className="grid gap-4 md:grid-cols-2">
          {accountGroom && (
            <div className="mq-themed-surface-elevated rounded-2xl border p-4">
              <p className="mq-themed-muted text-xs uppercase tracking-[0.2em]" style={{ letterSpacing: 'var(--mq-letter-spacing)' }}>
                {groomName}
              </p>
              <p className="mt-2 break-words text-sm font-semibold" style={{ fontFamily: 'var(--mq-heading-font)' }}>
                {accountGroom}
              </p>
            </div>
          )}
          {accountBride && (
            <div className="mq-themed-surface-elevated rounded-2xl border p-4">
              <p className="mq-themed-muted text-xs uppercase tracking-[0.2em]" style={{ letterSpacing: 'var(--mq-letter-spacing)' }}>
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
