import { buildMapLinks } from '@/lib/maps';
import { SectionCard } from './SectionCard';

interface MapButtonsProps {
  venueName: string;
  address: string;
}

const mapProviders = [
  { key: 'naver', label: 'Naver Map' },
  { key: 'kakao', label: 'Kakao Map' },
  { key: 'google', label: 'Google Maps' }
] as const;

export function MapButtons({ venueName, address }: MapButtonsProps) {
  const links = buildMapLinks(venueName, address);

  return (
    <SectionCard title="Find the Venue" eyebrow="Directions">
      <div className="grid gap-3 md:grid-cols-3">
        {mapProviders.map((provider) => (
          <a
            key={provider.key}
            href={links[provider.key]}
            target="_blank"
            rel="noreferrer"
            className="mq-map-link group relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-[var(--mq-fg)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span>{provider.label}</span>
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--mq-accent)]">Open</span>
            <span className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 transition group-hover:opacity-100" />
          </a>
        ))}
      </div>
    </SectionCard>
  );
}
