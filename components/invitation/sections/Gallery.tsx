import Image from 'next/image';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { GalleryPhoto } from '@/types/invitation';
import { SectionCard } from './SectionCard';

interface GallerySectionProps {
  photos: GalleryPhoto[];
}

export function GallerySection({ photos }: GallerySectionProps) {
  const { isKorean } = useLanguage();

  if (!photos.length) {
    return (
      <SectionCard title={isKorean ? '갤러리' : 'Gallery'} eyebrow={isKorean ? '웨딩 사진' : 'Photos'}>
        <p className="opacity-80">{isKorean ? '사진이 등록되면 이곳에 보여집니다.' : 'Photos will appear here soon.'}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={isKorean ? '갤러리' : 'Gallery'} eyebrow={isKorean ? '웨딩 사진' : 'Photos'}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(var(--mq-gallery-columns), minmax(0, 1fr))`,
          gap: 'var(--mq-gallery-gap)'
        }}
      >
        {photos.map((photo) => (
          <div key={photo.id} className="mq-gallery-tile group relative overflow-hidden rounded-2xl shadow-md" style={{ aspectRatio: 'var(--mq-gallery-aspect)' }}>
            <Image
              src={photo.url}
              alt={photo.caption ?? (isKorean ? '웨딩 사진' : 'Gallery photo')}
              fill
              sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-3 py-2 text-xs text-white">
                {photo.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
