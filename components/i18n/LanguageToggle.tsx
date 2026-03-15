import { cn } from '@/lib/utils';
import { useLanguage, type AppLanguage } from './LanguageProvider';

interface LanguageToggleProps {
  className?: string;
  variant?: 'light' | 'dark' | 'glass';
}

const options: { value: AppLanguage; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' }
];

export function LanguageToggle({ className, variant = 'light' }: LanguageToggleProps) {
  const { language, setLanguage, isKorean } = useLanguage();

  const frameClass =
    variant === 'dark'
      ? 'border-white/15 bg-white/10 text-white/80'
      : variant === 'glass'
        ? 'border-white/15 bg-white/10 text-[var(--mq-fg)]/80 backdrop-blur'
        : 'border-slate-200 bg-white text-slate-700';

  const activeClass =
    variant === 'dark'
      ? 'bg-white text-slate-900 shadow-sm'
      : variant === 'glass'
        ? 'bg-[var(--mq-fg)] text-[var(--mq-bg)] shadow-sm'
        : 'bg-slate-900 text-white shadow-sm';

  const idleClass = variant === 'light' ? 'text-slate-500 hover:text-slate-700' : 'opacity-80 hover:opacity-100';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border p-1 text-xs font-semibold',
        frameClass,
        className
      )}
      role="group"
      aria-label={isKorean ? '언어 전환' : 'Language switcher'}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLanguage(option.value)}
          className={cn(
            'rounded-full px-3 py-1.5 transition',
            language === option.value ? activeClass : idleClass
          )}
          aria-pressed={language === option.value}
          aria-label={option.value === 'ko' ? '한국어로 보기' : 'Switch to English'}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
