import { format } from 'date-fns';

interface HeroSectionProps {
  groomName: string;
  brideName: string;
  dateTime: string;
  venueName: string;
}

export function HeroSection({ groomName, brideName, dateTime, venueName }: HeroSectionProps) {
  const displayDate = format(new Date(dateTime), 'PPP');

  return (
    <section className="mq-hero-card relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[var(--mq-muted)]/50 via-[var(--mq-muted)]/30 to-transparent p-10 shadow-[0_30px_80px_rgba(15,23,42,0.35)] text-center text-[var(--mq-fg)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_40%)]" aria-hidden />
      <div className="relative space-y-4">
        <p
          className="uppercase tracking-[0.4em] text-xs text-[var(--mq-accent)]"
          style={{ letterSpacing: 'var(--mq-letter-spacing)' }}
        >
          You are invited
        </p>
        <h1
          className="font-semibold"
          style={{
            fontSize: 'var(--mq-h1)',
            fontFamily: 'var(--mq-heading-font)',
            fontWeight: 'var(--mq-heading-weight)' 
          }}
        >
          {groomName} &amp; {brideName}
        </h1>
        <p className="text-lg opacity-90" style={{ fontSize: 'calc(var(--mq-body) + 0.1rem)' }}>
          {displayDate} · {venueName}
        </p>
      </div>
    </section>
  );
}
