import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';

export type WalkthroughPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  selector?: string;
  placement?: WalkthroughPlacement;
  onEnter?: () => void;
}

interface GuidedWalkthroughProps {
  open: boolean;
  title: string;
  subtitle?: string;
  steps: WalkthroughStep[];
  onClose: () => void;
  onComplete?: () => void;
}

interface TargetBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function GuidedWalkthrough({ open, title, subtitle, steps, onClose, onComplete }: GuidedWalkthroughProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);

  const activeStep = steps[stepIndex] ?? null;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  const updateTargetBox = useCallback((shouldScroll = false) => {
    if (!open || !activeStep?.selector) {
      setTargetBox(null);
      return;
    }

    const target = document.querySelector(activeStep.selector) as HTMLElement | null;
    if (!target) {
      setTargetBox(null);
      return;
    }

    if (shouldScroll) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    const rect = target.getBoundingClientRect();
    setTargetBox({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    });
  }, [activeStep?.selector, open]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !activeStep) return;

    activeStep.onEnter?.();

    const timeout = window.setTimeout(() => {
      updateTargetBox(true);
    }, 90);

    const handleChange = () => updateTargetBox(false);
    window.addEventListener('resize', handleChange);
    window.addEventListener('scroll', handleChange, true);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('scroll', handleChange, true);
    };
  }, [activeStep, open, updateTargetBox]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowRight') {
        setStepIndex((prev) => clamp(prev + 1, 0, Math.max(steps.length - 1, 0)));
      }
      if (event.key === 'ArrowLeft') {
        setStepIndex((prev) => clamp(prev - 1, 0, Math.max(steps.length - 1, 0)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open, steps.length]);

  const panelStyle = useMemo(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 720;
    const panelWidth = Math.min(380, viewportWidth - 24);
    const mobile = viewportWidth < 768;
    const placement = activeStep?.placement ?? 'auto';

    if (mobile) {
      const panelHeight = Math.min(420, viewportHeight - 28);
      return {
        width: viewportWidth - 24,
        left: 12,
        top: Math.max(12, viewportHeight - panelHeight - 12),
        maxHeight: panelHeight
      };
    }

    if (!targetBox || placement === 'center') {
      return {
        width: panelWidth,
        left: clamp((viewportWidth - panelWidth) / 2, 12, viewportWidth - panelWidth - 12),
        top: clamp(viewportHeight / 2 - 130, 16, viewportHeight - 280)
      };
    }

    const gap = 14;
    const targetMidX = targetBox.left + targetBox.width / 2;
    const targetMidY = targetBox.top + targetBox.height / 2;

    let resolvedPlacement: WalkthroughPlacement = placement;
    if (placement === 'auto') {
      const bottom = targetBox.top + targetBox.height;
      const right = targetBox.left + targetBox.width;
      if (bottom + 280 < viewportHeight) {
        resolvedPlacement = 'bottom';
      } else if (targetBox.top > 300) {
        resolvedPlacement = 'top';
      } else if (right + panelWidth + gap < viewportWidth) {
        resolvedPlacement = 'right';
      } else if (targetBox.left - panelWidth - gap > 0) {
        resolvedPlacement = 'left';
      } else {
        resolvedPlacement = 'center';
      }
    }

    if (resolvedPlacement === 'center') {
      return {
        width: panelWidth,
        left: clamp((viewportWidth - panelWidth) / 2, 12, viewportWidth - panelWidth - 12),
        top: clamp(viewportHeight / 2 - 130, 16, viewportHeight - 280)
      };
    }

    if (resolvedPlacement === 'top') {
      return {
        width: panelWidth,
        left: clamp(targetMidX - panelWidth / 2, 12, viewportWidth - panelWidth - 12),
        top: clamp(targetBox.top - 250, 12, viewportHeight - 280)
      };
    }

    if (resolvedPlacement === 'left') {
      return {
        width: panelWidth,
        left: clamp(targetBox.left - panelWidth - gap, 12, viewportWidth - panelWidth - 12),
        top: clamp(targetMidY - 120, 12, viewportHeight - 280)
      };
    }

    if (resolvedPlacement === 'right') {
      const right = targetBox.left + targetBox.width;
      return {
        width: panelWidth,
        left: clamp(right + gap, 12, viewportWidth - panelWidth - 12),
        top: clamp(targetMidY - 120, 12, viewportHeight - 280)
      };
    }

    const bottom = targetBox.top + targetBox.height;
    return {
      width: panelWidth,
      left: clamp(targetMidX - panelWidth / 2, 12, viewportWidth - panelWidth - 12),
      top: clamp(bottom + gap, 12, viewportHeight - 280)
    };
  }, [activeStep?.placement, targetBox]);

  if (!open || !activeStep) return null;

  return (
    <div className="fixed inset-0 z-[120]" aria-live="polite">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]" />

      {targetBox && (
        <div
          className="pointer-events-none fixed rounded-2xl border border-cyan-200/90 bg-cyan-300/10 shadow-[0_0_0_5px_rgba(34,211,238,0.22)]"
          style={{
            top: targetBox.top - 7,
            left: targetBox.left - 7,
            width: targetBox.width + 14,
            height: targetBox.height + 14
          }}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} step ${stepIndex + 1}`}
        className="fixed overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xl"
        style={panelStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Walkthrough</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close walkthrough"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
            Step {stepIndex + 1} of {totalSteps}
          </div>
          <p className="text-base font-semibold text-slate-900">{activeStep.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeStep.description}</p>
          {activeStep.selector && !targetBox && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              This target is currently hidden in the UI. Continue to the next step.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStepIndex((prev) => clamp(prev - 1, 0, Math.max(steps.length - 1, 0)))}
              disabled={stepIndex === 0}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => clamp(prev + 1, 0, Math.max(steps.length - 1, 0)))}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onComplete?.();
                  onClose();
                }}
                className="inline-flex h-9 items-center justify-center rounded-full bg-cyan-600 px-3.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
