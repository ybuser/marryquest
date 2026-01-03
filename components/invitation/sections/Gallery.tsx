import Image from 'next/image';
import type { GalleryPhoto } from '@/types/invitation';
import { SectionCard } from './SectionCard';

interface GallerySectionProps {
  photos: GalleryPhoto[];
}

export function GallerySection({ photos }: GallerySectionProps) {
  if (!photos.length) {
    return (
      <SectionCard title="Gallery" eyebrow="Photos">
        <p className="opacity-80">Photos will appear here soon.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Gallery" eyebrow="Photos">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(var(--mq-gallery-columns), minmax(0, 1fr))`,
          gap: 'var(--mq-gallery-gap)'
        }}
      >
        {photos.map((photo) => (
          <div key={photo.id} className="group relative overflow-hidden rounded-2xl shadow-md" style={{ aspectRatio: 'var(--mq-gallery-aspect)' }}>
            <Image
              src={photo.url}
              alt={photo.caption ?? 'Gallery photo'}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
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
