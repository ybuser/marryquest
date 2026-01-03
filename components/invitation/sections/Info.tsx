import { format } from 'date-fns';
import { SectionCard } from './SectionCard';

interface InfoSectionProps {
  dateTime: string;
  venueName: string;
  address: string;
}

export function InfoSection({ dateTime, venueName, address }: InfoSectionProps) {
  const date = new Date(dateTime);

  return (
    <SectionCard title="Ceremony Details" eyebrow="Schedule" className="bg-[rgba(255,255,255,0.12)]">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] opacity-70" style={{ letterSpacing: 'var(--mq-letter-spacing)' }}>
            Date &amp; Time
          </p>
          <p className="text-lg font-medium" style={{ fontFamily: 'var(--mq-heading-font)' }}>
            {format(date, 'PPPP')}
          </p>
          <p className="text-sm opacity-80">{format(date, 'p')}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] opacity-70" style={{ letterSpacing: 'var(--mq-letter-spacing)' }}>
            Venue
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
