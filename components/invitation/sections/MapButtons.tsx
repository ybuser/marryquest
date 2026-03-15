import { buildMapLinks } from '@/lib/maps';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { SectionCard } from './SectionCard';

interface MapButtonsProps {
  venueName: string;
  address: string;
}

export function MapButtons({ venueName, address }: MapButtonsProps) {
  const { isKorean } = useLanguage();
  const links = buildMapLinks(venueName, address);
  const mapProviders: { key: keyof typeof links; label: string }[] = isKorean
    ? [
        { key: 'naver', label: '네이버 지도' },
        { key: 'kakao', label: '카카오맵' },
        { key: 'google', label: '구글 지도' }
      ]
    : [
        { key: 'naver', label: 'Naver Map' },
        { key: 'kakao', label: 'Kakao Map' },
        { key: 'google', label: 'Google Maps' }
      ];

  return (
    <SectionCard title={isKorean ? '오시는 길' : 'Find the Venue'} eyebrow={isKorean ? '지도 안내' : 'Directions'}>
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
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--mq-accent)]">{isKorean ? '열기' : 'Open'}</span>
            <span className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 transition group-hover:opacity-100" />
          </a>
        ))}
      </div>
    </SectionCard>
  );
}