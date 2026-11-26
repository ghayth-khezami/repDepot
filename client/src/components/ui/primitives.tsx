import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatTnd } from '../../lib/money';
import { FieldMic } from '../Dictation';

/* ─────────────────────────────── Tones ─────────────────────────────── */

export type Tone = 'pink' | 'violet' | 'amber' | 'purple' | 'rose' | 'green' | 'gray';

/** Decorative gradients (white icon on top, label sits next to the tile). */
export const toneGradient: Record<Tone, string> = {
  pink: 'bg-grad-pink shadow-glow-pink',
  rose: 'bg-grad-rose shadow-glow-pink',
  violet: 'bg-grad-violet shadow-glow-violet',
  purple: 'bg-grad-purple shadow-glow-violet',
  amber: 'bg-grad-amber shadow-[0_8px_24px_rgba(245,158,11,0.3)]',
  green: 'bg-grad-green shadow-[0_8px_24px_rgba(22,163,74,0.25)]',
  gray: 'bg-grad-gray',
};

/* ─────────────────────────────── Card ─────────────────────────────── */

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bd-card', className)} {...rest} />;
}

export function CardTitle({
  icon: Icon,
  tone = 'pink',
  title,
  subtitle,
  action,
}: {
  icon?: LucideIcon;
  tone?: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon ? <GradientIconTile icon={Icon} tone={tone} size="sm" /> : null}
        <div>
          <h2 className="text-lg font-extrabold leading-tight text-bd-ink">{title}</h2>
          {subtitle ? <p className="text-sm text-bd-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ─────────────────────────── Gradient icon tile ─────────────────────────── */

export function GradientIconTile({
  icon: Icon,
  tone = 'pink',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : size === 'md' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';
  const icon = size === 'lg' ? 26 : size === 'md' ? 22 : 18;
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center text-white', box, toneGradient[tone], className)}>
      <Icon size={icon} strokeWidth={2.2} />
    </span>
  );
}

/* ─────────────────────────────── Button ─────────────────────────────── */

export type ButtonVariant = 'primary' | 'violet' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-grad-pink-strong text-white shadow-glow-pink hover:brightness-110',
  violet: 'bg-grad-violet-strong text-white shadow-glow-violet hover:brightness-110',
  secondary: 'border border-bd-line/15 bg-bd-surface text-bd-ink hover:border-bd-pink/40 hover:bg-bd-blush/60',
  ghost: 'text-bd-ink hover:bg-bd-lilac/60',
  danger: 'bg-bd-danger-bg text-bd-danger hover:brightness-95',
  success: 'bg-bd-success-bg text-bd-success hover:brightness-95',
};
const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3.5 text-sm gap-1.5',
  md: 'min-h-[44px] px-5 text-[15px] gap-2',
  lg: 'min-h-[52px] px-6 text-base gap-2.5',
  icon: 'h-11 w-11 justify-center',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'bd-focus inline-flex select-none items-center justify-center rounded-full font-extrabold transition duration-200 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none',
    variantClass[variant],
    sizeClass[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading, children, className, disabled, type = 'button', ...rest },
  ref,
) {
  const iconSize = size === 'sm' ? 16 : 18;
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Loader2 size={iconSize} className="animate-spin" aria-hidden /> : Icon ? <Icon size={iconSize} aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={iconSize} aria-hidden /> : null}
    </button>
  );
});

/* ─────────────────────────── Segmented control ─────────────────────────── */

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: {
  options: Array<{ value: T; label: ReactNode; icon?: LucideIcon }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex flex-wrap gap-1 rounded-full border border-bd-line/10 bg-bd-surface p-1', className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'bd-focus inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full font-extrabold transition duration-200',
              size === 'sm' ? 'min-h-[36px] px-3 text-sm' : 'min-h-[44px] px-4 text-[15px]',
              active ? 'bg-grad-pink-strong text-white shadow-glow-pink' : 'text-bd-muted hover:text-bd-ink',
            )}
          >
            {Icon ? <Icon size={17} aria-hidden /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Single selectable pill (chips like "25 %", year filters). */
export function Pill({
  active,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'bd-focus inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-full px-4 text-sm font-extrabold tabular-nums transition duration-200 active:scale-[0.97]',
        active
          ? 'bg-grad-pink-strong text-white shadow-glow-pink'
          : 'border border-bd-line/15 bg-bd-surface text-bd-ink hover:border-bd-pink/40',
        className,
      )}
      {...rest}
    />
  );
}

/* ─────────────────────────────── Fields ─────────────────────────────── */

export function Field({
  label,
  required,
  hint,
  error,
  children,
  htmlFor,
  className,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-bd-ink">
        {label}
        {required ? <span className="ml-0.5 text-bd-pink-strong" aria-hidden>*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm font-bold text-bd-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-bd-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  icon?: LucideIcon;
  fieldClassName?: string;
  /** Mic at the end of the field (default on for text-like inputs). */
  dictation?: boolean;
};

const DICTATION_TYPES = ['text', 'search', 'email', 'tel', 'url', undefined];

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, icon: Icon, required, id, className, fieldClassName, dictation, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const innerRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
  const mic = (dictation ?? DICTATION_TYPES.includes(rest.type)) && !rest.disabled && !rest.readOnly;
  return (
    <Field label={label} required={required} hint={hint} error={error} htmlFor={inputId} className={fieldClassName}>
      <div className="relative" data-dictation="builtin">
        {Icon ? <Icon size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bd-muted" /> : null}
        <input
          ref={innerRef}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn('bd-input', Icon && 'pl-11', mic && 'pr-12', error && 'border-bd-danger focus:border-bd-danger focus:ring-bd-danger/15', className)}
          {...rest}
        />
        {mic ? <FieldMic inputRef={innerRef} label={typeof label === 'string' ? label : 'Dicter'} /> : null}
      </div>
    </Field>
  );
});

/** Tunisian phone: fixed +216 prefix, 8 digits, formatted "55 863 578". */
export const PhoneField = forwardRef<
  HTMLInputElement,
  Omit<TextFieldProps, 'onChange' | 'value'> & { value: string; onChange: (digits: string) => void }
>(function PhoneField({ label, hint, error, required, id, value, onChange, fieldClassName, dictation = true, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const innerRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
  const display = value.replace(/^(\d{2})(\d{0,3})(\d{0,3}).*$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
  return (
    <Field label={label} required={required} hint={hint} error={error} htmlFor={inputId} className={fieldClassName}>
      <div className="relative" data-dictation="builtin">
      <div className={cn('flex min-h-[44px] items-stretch overflow-hidden rounded-2xl border bg-bd-surface transition focus-within:ring-4', error ? 'border-bd-danger focus-within:ring-bd-danger/15' : 'border-bd-line/15 focus-within:border-bd-pink focus-within:ring-bd-pink/15')}>
        <span className="flex items-center border-r border-bd-line/10 bg-bd-lilac/50 px-3 text-[15px] font-extrabold text-bd-ink tabular-nums">+216</span>
        <input
          ref={innerRef}
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          aria-invalid={error ? true : undefined}
          value={display}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="55 863 578"
          className={cn('bd-input min-h-0 flex-1 rounded-none border-0 tabular-nums focus:ring-0', dictation && 'pr-12')}
          {...rest}
        />
      </div>
        {dictation ? <FieldMic inputRef={innerRef} label={typeof label === 'string' ? label : 'Téléphone'} /> : null}
      </div>
    </Field>
  );
});

/* ─────────────────────────── Money & status ─────────────────────────── */

export function Money({ millimes, className, unit = true }: { millimes: number; className?: string; unit?: boolean }) {
  return <span className={cn('bd-money tabular-nums', className)}>{formatTnd(millimes, unit)}</span>;
}

export type ProductStatusValue = 'EN_VENTE' | 'VENDU' | 'RETIRE';
export type PayoutStatusValue = 'A_PERCEVOIR' | 'PAYE';

export const productStatusMeta: Record<ProductStatusValue, { label: string; chip: string; dot: string }> = {
  EN_VENTE: { label: 'En vente', chip: 'bg-bd-blush text-bd-pink-strong', dot: 'bg-bd-pink' },
  VENDU: { label: 'Vendu', chip: 'bg-bd-success-bg text-bd-success', dot: 'bg-bd-success' },
  RETIRE: { label: 'Retiré', chip: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200', dot: 'bg-gray-400' },
};

/** En vente = pink · Vendu = green · Retiré = gray · Payé = violet */
export function StatusChip({ status, payout, className }: { status: ProductStatusValue; payout?: PayoutStatusValue | null; className?: string }) {
  if (status === 'VENDU' && payout === 'PAYE') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-extrabold text-bd-violet-strong dark:bg-violet-500/20', className)}>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-bd-violet" />
        Payé
      </span>
    );
  }
  const meta = productStatusMeta[status] ?? productStatusMeta.EN_VENTE;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold', meta.chip, className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

/* ─────────────────────────── Feedback bits ─────────────────────────── */

export function InfoNote({ icon: Icon, children, tone = 'violet', className }: { icon?: LucideIcon; children: ReactNode; tone?: 'violet' | 'amber' | 'danger' | 'success'; className?: string }) {
  const tones = {
    violet: 'bg-bd-lilac/60 text-bd-ink',
    amber: 'bg-amber-50 text-bd-amber-ink dark:bg-amber-500/10',
    danger: 'bg-bd-danger-bg text-bd-danger',
    success: 'bg-bd-success-bg text-bd-success',
  } as const;
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-bold', tones[tone], className)}>
      {Icon ? <Icon size={18} className="mt-0.5 shrink-0" aria-hidden /> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-2xl bg-bd-lilac/70', className)} />;
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <GradientIconTile icon={Icon} tone="violet" size="lg" />
      <p className="text-base font-extrabold text-bd-ink">{title}</p>
      {children ? <p className="max-w-sm text-sm text-bd-muted">{children}</p> : null}
      {action}
    </div>
  );
}

/* ─────────────────────────── Decoration ─────────────────────────── */

/** Large blurred blobs behind content (decorative only). */
export function Blobs({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#E9DDFB] opacity-70 blur-3xl dark:opacity-20" />
      <div className="absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-[#FCE7F3] opacity-80 blur-3xl dark:opacity-15" />
      <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-[#E9DDFB] opacity-60 blur-3xl dark:opacity-15" />
    </div>
  );
}

const ILLUSTRATION_FALLBACK: Record<string, string> = {
  wave: '👋',
  bag: '🛍️',
  box: '📦',
  teddy: '🧸',
  chart: '📈',
};

/**
 * Optional 3D-style decor from /public/illustrations/{name}.png.
 * Missing file → soft emoji placeholder. Never blocks layout (fixed box), always alt="".
 */
export function Illustration({ name, className }: { name: keyof typeof ILLUSTRATION_FALLBACK; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center', className)}>
      {failed ? (
        <span className="text-[2.2em] leading-none">{ILLUSTRATION_FALLBACK[name]}</span>
      ) : (
        <img src={`/illustrations/${name}.png`} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain" />
      )}
    </span>
  );
}
