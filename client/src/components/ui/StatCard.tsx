import { useId, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Card, GradientIconTile, type Tone } from './primitives';

const sparkStroke: Record<Tone, [string, string]> = {
  pink: ['#EC4899', '#F472B6'],
  rose: ['#F43F5E', '#EC4899'],
  violet: ['#7C3AED', '#A78BFA'],
  purple: ['#9333EA', '#C084FC'],
  amber: ['#F59E0B', '#FBBF24'],
  green: ['#16A34A', '#4ADE80'],
  gray: ['#9CA3AF', '#D1D5DB'],
};

/** Faint gradient sparkline, decorative (bottom-right corner of stat cards). */
export function Sparkline({ data, tone = 'pink', className }: { data?: number[]; tone?: Tone; className?: string }) {
  const id = useId().replace(/:/g, '');
  const points = data && data.length > 1 ? data : [2, 3, 2.5, 4, 3.5, 5, 6];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const w = 120;
  const h = 48;
  const coords = points.map((v, i) => [(i / (points.length - 1)) * w, h - 4 - ((v - min) / span) * (h - 10)] as const);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [c1, c2] = sparkStroke[tone];
  return (
    <svg aria-hidden viewBox={`0 0 ${w} ${h}`} className={cn('pointer-events-none', className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`s-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
        <linearGradient id={`f-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={c2} stopOpacity="0.28" />
          <stop offset="1" stopColor={c2} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#f-${id})`} />
      <path d={line} fill="none" stroke={`url(#s-${id})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({
  icon,
  tone,
  label,
  value,
  delta,
  deltaLabel = 'vs hier',
  spark,
  loading,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: ReactNode;
  /** Percentage change; null/undefined hides the line. */
  delta?: number | null;
  deltaLabel?: string;
  spark?: number[];
  loading?: boolean;
}) {
  const up = (delta ?? 0) >= 0;
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="relative z-10 flex items-center gap-4">
        <GradientIconTile icon={icon} tone={tone} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-bd-ink">{label}</p>
          {loading ? (
            <div className="mt-1 h-8 w-32 animate-pulse rounded-xl bg-bd-lilac" />
          ) : (
            <p className="truncate text-[26px] font-extrabold leading-tight text-bd-ink tabular-nums sm:text-[28px]">{value}</p>
          )}
          {delta !== undefined && delta !== null && !loading ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-bold">
              <span className={cn('inline-flex items-center gap-0.5 tabular-nums', up ? 'text-bd-success' : 'text-bd-danger')}>
                <DeltaIcon size={14} aria-hidden />
                {up ? '+' : ''}
                {delta.toFixed(0)}%
              </span>
              <span className="text-bd-muted">{deltaLabel}</span>
            </p>
          ) : null}
        </div>
      </div>
      <Sparkline data={spark} tone={tone} className="absolute bottom-0 right-0 h-14 w-32 opacity-60" />
    </Card>
  );
}
