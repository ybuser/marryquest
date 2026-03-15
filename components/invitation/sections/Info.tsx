import { format } from 'date-fns';
import { useLanguage, getDateLocale } from '@/components/i18n/LanguageProvider';
import { SectionCard } from './SectionCard';

interface InfoSectionProps {
  dateTime: string;
  venueName: string;
  address: string;
}

export function InfoSection({ dateTime, venueName, address }: InfoSectionProps) {
  const { language, isKorean } = useLanguage();
  const date = new Date(dateTime);

  return (
    <SectionCard title={isKorean ? '예식 안내' : 'Ceremony Details'} eyebrow={isKorean ? '일정' : 'Schedule'} className="bg-[rgba(255,255,255,0.12)]">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] opacity-70" style={{ letterSpacing: 'var(--mq-letter-spacing)' }}>
            {isKorean ? '예식 일시' : 'Date & Time'}
          </p>
          <p className="text-lg font-medium" style={{ fontFamily: 'var(--mq-heading-font)' }}>
            {format(date, 'PPPP', { locale: getDateLocale(language) })}
          </p>
          <p className="text-sm opacity-80">{format(date, 'p', { locale: getDateLocale(language) })}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] opacity-70" style={{ letterSpacing: 'var(--mq-letter-spacing)' }}>
            {isKorean ? '예식 장소' : 'Venue'}
          </p>
          <p className="text-lg font-medium" style={{ fontFamily: 'var(--mq-heading-font)' }}>
            {venueName}
          </p>
          <p className="text-sm opacity-80">{address}</p>
        </div>
      </div>
    </SectionCard>
  );
}
