import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import { Illustration } from './ui';

export type DateRangeKey = 'today' | '7d' | 'month' | 'year' | 'all';

export const DATE_RANGE_LABEL: Record<DateRangeKey, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  month: 'Ce mois',
  year: 'Cette année',
  all: 'Tout',
};

export const DATE_RANGE_DELTA_LABEL: Record<DateRangeKey, string> = {
  today: 'vs hier',
  '7d': 'vs 7 j préc.',
  month: 'vs mois préc.',
  year: 'vs an préc.',
  all: '',
};

/** Current and previous comparable period (ISO strings) for stats queries. */
export function rangeFor(key: DateRangeKey, now = new Date()) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;
  switch (key) {
    case 'today':
      start = startOfDay(now);
      prevStart = new Date(start.getTime() - 86_400_000);
      prevEnd = new Date(start.getTime() - 1);
      break;
    case '7d':
      start = new Date(startOfDay(now).getTime() - 6 * 86_400_000);
      prevStart = new Date(start.getTime() - 7 * 86_400_000);
      prevEnd = new Date(start.getTime() - 1);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(start.getTime() - 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(start.getTime() - 1);
      break;
    default:
      return { current: {}, previous: null };
  }
  return {
    current: { startDate: start.toISOString(), endDate: now.toISOString() },
    previous: { startDate: prevStart.toISOString(), endDate: prevEnd.toISOString() },
  };
}

function DateRangePill({ value, onChange }: { value: DateRangeKey; onChange: (v: DateRangeKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="bd-focus flex min-h-[44px] items-center gap-2 rounded-full border border-bd-line/10 bg-bd-surface px-4 text-sm font-extrabold text-bd-ink shadow-card transition hover:border-bd-pink/40"
      >
        <CalendarDays size={18} className="text-bd-violet" aria-hidden />
        {DATE_RANGE_LABEL[value]}
        <ChevronDown size={16} className={cn('transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <ul role="listbox" aria-label="Période" className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-bd-line/10 bg-bd-surface p-1.5 shadow-card">
          {(Object.keys(DATE_RANGE_LABEL) as DateRangeKey[]).map((k) => (
            <li key={k}>
              <button
                type="button"
                role="option"
                aria-selected={k === value}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                className={cn(
                  'flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 text-left text-sm font-bold transition',
                  k === value ? 'bg-bd-blush text-bd-pink-strong' : 'text-bd-ink hover:bg-bd-lilac/60',
                )}
              >
                {DATE_RANGE_LABEL[k]}
                {k === value ? <Check size={16} aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** "Bonjour !" header: greeting, optional date filter, avatar (the bell lives in the layout, top-right). */
export default function AppHeader({
  title = 'Bonjour !',
  subtitle = 'Voici un aperçu de votre activité',
  range,
  onRangeChange,
  extra,
}: {
  title?: string;
  subtitle?: ReactNode;
  range?: DateRangeKey;
  onRangeChange?: (v: DateRangeKey) => void;
  extra?: ReactNode;
}) {
  const { user } = useAuth();
  const initials = (user?.username || user?.email || 'A')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bd-surface shadow-card">
          <Illustration name="wave" className="h-10 w-10 text-[18px]" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-black text-bd-ink sm:text-4xl">{title}</h1>
          <p className="text-sm font-semibold text-bd-muted sm:text-base">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {extra}
        {range && onRangeChange ? <DateRangePill value={range} onChange={onRangeChange} /> : null}
        <span aria-hidden className="hidden h-8 w-px bg-bd-line/15 sm:block" />
        <span
          title={user?.username || user?.email}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-grad-violet-strong text-sm font-black text-white ring-4 ring-bd-surface shadow-card"
        >
          {initials}
        </span>
      </div>
    </header>
  );
}
