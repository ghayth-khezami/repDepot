import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface StepDef {
  label: string;
  hint?: string;
}

/**
 * Horizontal stepper. Completed steps are clickable; the current one is highlighted;
 * future steps are inert. Compact on phones (labels collapse to the active one).
 */
export function Stepper({
  steps,
  current,
  completed,
  onStepClick,
}: {
  steps: StepDef[];
  current: number;
  completed: (index: number) => boolean;
  onStepClick?: (index: number) => void;
}) {
  return (
    <nav aria-label="Étapes">
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((step, i) => {
          const done = completed(i) && i !== current;
          const active = i === current;
          const clickable = done && !!onStepClick;
          return (
            <li key={step.label} className={cn('flex min-w-0 items-center gap-2 sm:gap-3', i < steps.length - 1 && 'flex-1')}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'bd-focus group flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-full pr-2 text-left transition',
                  clickable && 'cursor-pointer hover:opacity-90',
                  !clickable && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums transition',
                    active && 'bg-grad-pink-strong text-white shadow-glow-pink',
                    done && 'bg-bd-success-bg text-bd-success',
                    !active && !done && 'border border-bd-line/15 bg-bd-surface text-bd-muted',
                  )}
                >
                  {done ? <Check size={18} strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                <span className={cn('min-w-0', active ? 'block' : 'hidden sm:block')}>
                  <span className={cn('block truncate text-sm font-extrabold', active ? 'text-bd-ink' : 'text-bd-muted')}>{step.label}</span>
                  {step.hint ? <span className="hidden truncate text-xs text-bd-muted lg:block">{step.hint}</span> : null}
                </span>
                {done ? <span className="sr-only">(terminée, revenir)</span> : null}
              </button>
              {i < steps.length - 1 ? (
                <span aria-hidden className={cn('h-0.5 flex-1 rounded-full', done || completed(i) ? 'bg-grad-pink' : 'bg-bd-line/15')} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
