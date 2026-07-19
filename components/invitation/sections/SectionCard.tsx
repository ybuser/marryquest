import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, eyebrow, actions, children, className }: SectionCardProps) {
  return (
    <div
      className={cn(
        'mq-section-card',
        'mq-themed-surface',
        'relative overflow-hidden rounded-3xl border shadow-[0_25px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl',
        'transition duration-300',
        className
      )}
      style={{ padding: 'var(--mq-card-padding)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" aria-hidden />
      <div className="relative space-y-4 text-[var(--mq-surface-fg)]">
        {(title || eyebrow || actions) && (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {eyebrow && (
                <p
                  className="uppercase tracking-[0.3em] text-xs"
                  style={{ letterSpacing: 'var(--mq-letter-spacing)' }}
                >
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2
                  className="font-semibold"
                  style={{
                    fontSize: 'var(--mq-h2)',
                    fontFamily: 'var(--mq-heading-font)',
                    fontWeight: 'var(--mq-heading-weight)'
                  }}
                >
                  {title}
                </h2>
              )}
            </div>
            {actions}
          </div>
        )}
        <div className="text-base leading-relaxed" style={{ fontSize: 'var(--mq-body)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
