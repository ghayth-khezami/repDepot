import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Loader2, MoreHorizontal, Search, Sparkles, X, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { FieldMic } from '../Dictation';

/* ───────────────────────── PageHeader ───────────────────────── */

/**
 * Eyebrow + H1 (22px/800) + compact actions (✦ Dicter, ⋯). On mobile it sits on the same row as the
 * fixed violet menu button of the sidebar.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  onDictate,
  onMore,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  onDictate?: () => void;
  onMore?: () => void;
  actions?: ReactNode;
}) {
  return (
    <header className="-mt-[66px] mb-4 flex min-h-[48px] items-center gap-2 pl-[54px] pr-[104px] md:mt-0 md:px-0">
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-bd-pink-strong">{eyebrow}</p> : null}
        <h1 className="truncate text-[22px] font-extrabold leading-tight text-bd-ink">{title}</h1>
        {subtitle ? <p className="truncate text-xs font-semibold text-bd-muted">{subtitle}</p> : null}
      </div>
      {actions}
      {onDictate ? (
        <button
          type="button"
          onClick={onDictate}
          className="bd-focus inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl bg-grad-violet-strong px-3.5 text-sm font-extrabold text-white shadow-glow-violet active:scale-95"
        >
          <Sparkles size={16} aria-hidden /> Dicter
        </button>
      ) : null}
      {onMore ? (
        <button
          type="button"
          onClick={onMore}
          aria-label="Plus d'actions"
          className="bd-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bd-line/10 bg-bd-surface text-bd-ink shadow-card active:scale-95"
        >
          <MoreHorizontal size={20} aria-hidden />
        </button>
      ) : null}
    </header>
  );
}

/* ───────────────────────── SearchBar ───────────────────────── */

export function SearchBar({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className={cn('relative block', className)} data-dictation="builtin">
      <span className="sr-only">{placeholder}</span>
      <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bd-muted" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bd-input min-h-[48px] rounded-2xl border-bd-line/10 bg-bd-surface pl-11 pr-12 shadow-card"
      />
      <FieldMic inputRef={ref} label="Rechercher" />
    </label>
  );
}

/* ───────────────────────── SegmentedFilter ───────────────────────── */

export function SegmentedFilter<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  label: string;
}) {
  return (
    // Many options on a phone: the row scrolls sideways instead of overflowing the screen.
    <div role="tablist" aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-bd-lilac/50 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'bd-focus flex min-h-[40px] min-w-fit flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-extrabold transition',
              active ? 'bg-bd-surface text-bd-ink shadow-card' : 'text-bd-muted',
            )}
          >
            <span className="truncate">{o.label}</span>
            {o.count !== undefined ? <span className={cn('text-xs tabular-nums', active ? 'text-bd-violet-strong' : 'text-bd-muted')}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── FilterChips ───────────────────────── */

export function FilterChips({ children }: { children: ReactNode }) {
  return <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">{children}</div>;
}

export function FilterChip({ label, active, onClick, icon: Icon, onClear }: { label: string; active?: boolean; onClick: () => void; icon?: LucideIcon; onClear?: () => void }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full border text-sm font-extrabold', active ? 'border-bd-violet bg-bd-lilac text-bd-violet-strong' : 'border-bd-line/15 bg-bd-surface text-bd-ink')}>
      <button type="button" onClick={onClick} className="bd-focus inline-flex min-h-[40px] items-center gap-1.5 rounded-full pl-3.5 pr-2.5">
        {Icon ? <Icon size={15} aria-hidden /> : null}
        <span className="max-w-[150px] truncate">{label}</span>
        {!active || !onClear ? <ChevronDown size={14} aria-hidden /> : null}
      </button>
      {active && onClear ? (
        <button type="button" onClick={onClear} aria-label={`Retirer le filtre ${label}`} className="bd-focus -ml-1 mr-1 flex h-7 w-7 items-center justify-center rounded-full hover:bg-bd-surface">
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

/* ───────────────────────── ListRow ───────────────────────── */

/** Compact row (64–90px): thumbnail, two text lines, trailing slot, chevron. */
export function ListRow({
  thumb,
  title,
  subtitle,
  meta,
  trailing,
  onClick,
  selected,
  className,
}: {
  thumb?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  return (
    <li className={cn('bd-anim-fade-up flex min-h-[64px] items-center gap-3 rounded-2xl border bg-bd-surface p-2.5 shadow-card', selected ? 'border-bd-violet ring-2 ring-bd-violet/20' : 'border-bd-line/10', className)}>
      {/* div[role=button] (not <button>) so rows can hold their own controls, e.g. a status chip */}
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn('bd-focus flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left', onClick && 'cursor-pointer')}
      >
        {thumb ? <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bd-lilac/60 text-bd-violet">{thumb}</span> : null}
        <span className="min-w-0 flex-1">
          {meta ? <span className="block truncate text-[11px] font-extrabold uppercase tracking-wide text-bd-muted">{meta}</span> : null}
          <span className="block truncate text-[15px] font-extrabold text-bd-ink">{title}</span>
          {subtitle ? <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-bd-muted">{subtitle}</span> : null}
        </span>
      </div>
      {trailing}
      {onClick && !trailing ? <ChevronRight size={18} className="shrink-0 text-bd-muted" aria-hidden /> : null}
    </li>
  );
}

/* ───────────────────────── Fab ───────────────────────── */

/** The one primary action of a screen (magenta), above the mobile tab bar. */
export function Fab({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bd-focus fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-grad-pink-strong px-5 text-[15px] font-extrabold text-white shadow-[0_12px_30px_rgba(190,24,93,0.4)] transition active:scale-95 md:bottom-8 md:right-8"
    >
      <Icon size={20} aria-hidden /> {label}
    </button>
  );
}

/* ───────────────────────── BottomSheet ───────────────────────── */

export function BottomSheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="bd-ui fixed inset-0 z-[85] flex items-end justify-center bg-bd-ink/40 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn('bd-sheet-in max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] bg-bd-surface px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl sm:rounded-[28px]', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
      >
        <span aria-hidden className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-bd-lilac" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-bd-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="bd-focus flex h-10 w-10 items-center justify-center rounded-full bg-bd-bg text-bd-ink">
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-bd-muted">{title}</p>
      {children}
    </section>
  );
}

export function SheetAction({
  icon: Icon,
  label,
  hint,
  onClick,
  tone = 'pink',
  loading,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
  tone?: 'pink' | 'violet' | 'green' | 'danger';
  loading?: boolean;
}) {
  const tile = { pink: 'bg-grad-pink-strong', violet: 'bg-grad-violet-strong', green: 'bg-grad-green', danger: 'bg-bd-danger-bg text-bd-danger' }[tone];
  return (
    <button type="button" onClick={onClick} disabled={loading} className="bd-focus flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-2 text-left transition hover:bg-bd-bg active:scale-[0.99] disabled:opacity-60">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', tile)}>
        {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Icon size={18} aria-hidden />}
      </span>
      <span className="min-w-0">
        <span className={cn('block text-[15px] font-extrabold', tone === 'danger' ? 'text-bd-danger' : 'text-bd-ink')}>{label}</span>
        {hint ? <span className="block text-xs font-semibold text-bd-muted">{hint}</span> : null}
      </span>
    </button>
  );
}

export function SheetTile({ icon: Icon, label, onClick, loading, tone = 'violet' }: { icon: LucideIcon; label: string; onClick: () => void; loading?: boolean; tone?: 'violet' | 'green' | 'pink' }) {
  const color = { violet: 'text-bd-violet', green: 'text-bd-success', pink: 'text-bd-pink-strong' }[tone];
  return (
    <button type="button" onClick={onClick} disabled={loading} className="bd-focus flex min-h-[76px] flex-col items-start justify-between gap-2 rounded-2xl border border-bd-line/10 bg-bd-surface p-3 text-left shadow-card active:scale-[0.98] disabled:opacity-60">
      {loading ? <Loader2 size={20} className={cn('animate-spin', color)} aria-hidden /> : <Icon size={20} className={color} aria-hidden />}
      <span className="text-sm font-extrabold text-bd-ink">{label}</span>
    </button>
  );
}

/* ───────────────────────── StickyActionBar ───────────────────────── */

export function StickyActionBar({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-bd-line/10 bg-bd-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">{children}</div>;
}

/* ───────────────────────── Infinite scroll ───────────────────────── */

/** Calls onReach when it scrolls into view (load the next page). */
export function InfiniteSentinel({ onReach, disabled, loading }: { onReach: () => void; disabled?: boolean; loading?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onReach);
  cb.current = onReach;
  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && cb.current(), { rootMargin: '400px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [disabled]);
  return (
    <div ref={ref} className="flex min-h-[48px] items-center justify-center" aria-live="polite">
      {loading ? (
        <span className="inline-flex items-center gap-2 text-sm font-bold text-bd-muted">
          <Loader2 size={16} className="animate-spin" aria-hidden /> Chargement…
        </span>
      ) : null}
    </div>
  );
}

/* ───────────────────────── OtpInput ───────────────────────── */

/**
 * One real <input maxLength=n> receives all typing (phone keyboard, paste, SMS autofill);
 * the n boxes are only a visual layer. Calls onComplete when the last digit is typed.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  status = 'idle',
  autoFocus = true,
  label = 'Code',
  size = 'md',
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  status?: 'idle' | 'error' | 'ok';
  autoFocus?: boolean;
  label?: string;
  /** lg = big boxes (quick-unlock code, easy to hit with a thumb). */
  size?: 'md' | 'lg';
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div className={cn('relative mx-auto w-fit', status === 'error' && 'bd-anim-shake')} onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        data-dictation="off"
        aria-label={label}
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        disabled={status === 'ok'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, length);
          onChange(v);
          if (v.length === length) onComplete?.(v);
        }}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div aria-hidden className={cn('flex', size === 'lg' ? 'gap-3 sm:gap-4' : 'gap-2 sm:gap-3')}>
        {Array.from({ length }, (_, i) => {
          const ch = value[i];
          const isCaret = focused && i === Math.min(value.length, length - 1);
          return (
            <span
              key={i}
              className={cn(
                size === 'lg'
                  ? 'flex h-[76px] w-[62px] items-center justify-center rounded-[22px] border-[3px] bg-bd-surface text-5xl font-black text-bd-ink shadow-card transition duration-150 sm:h-20 sm:w-16'
                  : 'flex h-14 w-11 items-center justify-center rounded-2xl border-2 bg-bd-surface text-2xl font-black text-bd-ink shadow-card transition duration-150 sm:h-16 sm:w-12',
                status === 'error' ? 'border-bd-danger text-bd-danger' : status === 'ok' ? 'border-bd-success' : isCaret ? 'border-bd-pink ring-4 ring-bd-pink/15' : ch ? 'border-bd-violet' : 'border-bd-line/15',
              )}
            >
              {ch ? '•' : isCaret ? <span className="bd-caret" /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
