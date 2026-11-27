import { memo, useId, useRef } from 'react';
import { ImagePlus, Loader2, Plus, Trash2, X, CalendarDays } from 'lucide-react';
import { useUploadMediaMutation } from '../../store/api/depotApi';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { compressImageForUpload } from '../../lib/compressImage';
import { uploadUrl } from '../../lib/apiBase';
import { cn } from '../../lib/cn';
import { useToast } from '../../context/ToastContext';
import { Button, Card, Money, Pill } from '../../components/ui';
import { FieldMic } from '../../components/Dictation';
import CategoryCombobox from './CategoryCombobox';
import { itemSplit, type DraftItem, type ItemErrors } from './draft';

import { COMMISSION_VALUES } from '../../lib/commission';

export const COMMISSION_PRESETS = COMMISSION_VALUES;

type Patch = Partial<DraftItem> | ((it: DraftItem) => Partial<DraftItem>);

export interface ArticlesEditorProps {
  items: DraftItem[];
  errors: Record<string, ItemErrors>;
  showErrors: boolean;
  defaultCommission: number;
  onPatch: (key: string, patch: Patch) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onCommissionAll: (pct: number) => void;
}

/* ───────────────────────────── Small parts ───────────────────────────── */

/** Mini split bar: pink = shop margin, green = déposant share. */
export function SplitBar({ shop, total, className }: { shop: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.min(100, (shop / total) * 100) : 0;
  return (
    <div aria-hidden className={cn('flex h-2 overflow-hidden rounded-full bg-bd-lilac', className)}>
      <div className="h-full bg-grad-pink transition-[width] duration-200" style={{ width: `${pct}%` }} />
      <div className="h-full flex-1 bg-grad-green opacity-80" style={{ display: total > 0 ? undefined : 'none' }} />
    </div>
  );
}

function PhotoTile({ item, onPatch, size = 'md' }: { item: DraftItem; onPatch: (p: Patch) => void; size?: 'md' | 'lg' }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload] = useUploadMediaMutation();
  const { showToast } = useToast();
  const box = size === 'lg' ? 'h-20 w-20' : 'h-14 w-14';
  const first = item.photos[0];

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 8 - item.photos.length);
    onPatch((it) => ({ uploading: it.uploading + list.length }));
    await Promise.all(
      list.map(async (file) => {
        try {
          const compressed = await compressImageForUpload(file);
          const { url } = await upload(compressed).unwrap();
          onPatch((it) => ({ photos: [...it.photos, url] }));
        } catch {
          showToast("Échec de l'envoi d'une photo", 'error');
        } finally {
          onPatch((it) => ({ uploading: Math.max(0, it.uploading - 1) }));
        }
      }),
    );
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn('relative shrink-0', box)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={first ? `Ajouter une photo (${item.photos.length} déjà)` : 'Ajouter une photo (optionnel)'}
        className={cn(
          'bd-focus flex h-full w-full items-center justify-center overflow-hidden rounded-2xl transition',
          first ? 'border border-bd-line/10' : 'border-2 border-dashed border-bd-violet/35 bg-bd-lilac/40 text-bd-violet hover:border-bd-pink hover:text-bd-pink-strong',
        )}
      >
        {first ? <img src={uploadUrl(first)} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={size === 'lg' ? 26 : 20} aria-hidden />}
        {item.uploading > 0 ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-bd-surface/70">
            <Loader2 size={20} className="animate-spin text-bd-pink-strong" aria-label="Envoi en cours" />
          </span>
        ) : null}
      </button>
      {item.photos.length > 1 ? (
        <span className="absolute -bottom-1 -left-1 rounded-full bg-grad-violet-strong px-1.5 text-[11px] font-black text-white ring-2 ring-bd-surface tabular-nums">
          {item.photos.length}
        </span>
      ) : null}
      {first ? (
        <button
          type="button"
          aria-label="Retirer la première photo"
          onClick={() => onPatch((it) => ({ photos: it.photos.slice(1) }))}
          className="bd-focus absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-bd-surface text-bd-ink shadow-card ring-1 ring-bd-line/15"
        >
          <X size={13} aria-hidden />
        </button>
      ) : null}
      <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => void onFiles(e.target.files)} />
    </div>
  );
}

function CategorySelect({ value, onChange, error, id }: { value: string; onChange: (v: string) => void; error?: string; id: string }) {
  return <CategoryCombobox id={id} value={value} onChange={onChange} error={error} />;
}

function NameInput({ value, onChange, error, id, label, placeholder }: { value: string; onChange: (v: string) => void; error?: string; id: string; label: string; placeholder: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative" data-dictation="builtin">
      <input
        ref={ref}
        id={id}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={cn('bd-input pr-12', error && 'border-bd-danger')}
      />
      <FieldMic inputRef={ref} label={label} />
    </div>
  );
}

function PriceInput({ value, onChange, error, id, label }: { value: string; onChange: (v: string) => void; error?: string; id: string; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative" data-dictation="builtin">
      <input
        ref={ref}
        id={id}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.000"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        aria-invalid={error ? true : undefined}
        className={cn('bd-input pr-[5.5rem] text-right tabular-nums', error && 'border-bd-danger')}
      />
      <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 text-sm font-extrabold text-bd-muted">TND</span>
      <FieldMic inputRef={ref} label={label ?? 'Prix'} />
    </div>
  );
}

function CommissionInput({ value, onChange, id, error, label }: { value: number; onChange: (v: number) => void; id: string; error?: string; label?: string }) {
  // Fixed values only (5 … 50 %). A legacy value stays visible until changed.
  const values = (COMMISSION_PRESETS as readonly number[]).includes(value) ? COMMISSION_PRESETS : [value, ...COMMISSION_PRESETS];
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-invalid={error ? true : undefined}
      data-dictation="off"
      className={cn('bd-input pr-8 text-right font-extrabold tabular-nums', error && 'border-bd-danger')}
    >
      {values.map((c) => (
        <option key={c} value={c}>
          {c} %
        </option>
      ))}
    </select>
  );
}

function SplitFigures({ item, compact }: { item: DraftItem; compact?: boolean }) {
  const s = itemSplit(item);
  return (
    <div className={cn('min-w-0', compact ? 'space-y-1' : 'space-y-1.5')}>
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-bd-muted">Votre marge</span>
        <Money millimes={s.shopMillimes} className="font-extrabold text-bd-pink-strong" />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-bd-muted">Part déposant</span>
        <Money millimes={s.depositorMillimes} className="font-extrabold text-bd-success" />
      </div>
      <SplitBar shop={s.shopMillimes} total={s.priceMillimes} />
    </div>
  );
}

/* ───────────────────────────── Row / Card ───────────────────────────── */

interface RowProps {
  item: DraftItem;
  index: number;
  errors?: ItemErrors;
  canRemove: boolean;
  onPatch: (key: string, patch: Patch) => void;
  onRemove: (key: string) => void;
}

function DepositDateInput({ id, value, onChange, compact }: { id: string; value?: string; onChange: (v: string) => void; compact?: boolean }) {
  return (
    <label htmlFor={id} className={compact ? 'mt-1.5 flex items-center gap-1.5 text-[11px] font-extrabold text-bd-muted' : 'block'}>
      {compact ? <CalendarDays size={13} aria-hidden /> : <span className="mb-1 block text-xs font-extrabold text-bd-ink">Date de dépôt</span>}
      <input
        id={id}
        type="date"
        data-dictation="off"
        value={value ?? ''}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Date de dépôt de l'article"
        title="Date de dépôt (vide = date du contrat)"
        className={compact ? 'min-h-[30px] rounded-lg border border-bd-line/15 bg-bd-surface px-2 text-[12px] font-bold text-bd-ink' : 'bd-input'}
      />
    </label>
  );
}

const DesktopRow = memo(function DesktopRow({ item, index, errors, canRemove, onPatch, onRemove }: RowProps) {
  const id = useId();
  const patch = (p: Patch) => onPatch(item.key, p);
  return (
    <li className="grid grid-cols-[56px_minmax(0,1.6fr)_minmax(0,1fr)_130px_96px_minmax(170px,1fr)_44px] items-start gap-3 rounded-2xl px-2 py-3 transition hover:bg-bd-bg">
      <PhotoTile item={item} onPatch={patch} />
      <div>
        <NameInput id={`${id}-name`} label={`Nom de l'article ${index + 1}`} placeholder="Ex. Poussette Chicco" value={item.name} onChange={(name) => patch({ name })} error={errors?.name} />
        {errors?.name ? <p className="mt-1 text-xs font-bold text-bd-danger">{errors.name}</p> : null}
        <DepositDateInput id={`${id}-date`} value={item.depositDate} onChange={(depositDate) => patch({ depositDate })} compact />
      </div>
      <div>
        <label htmlFor={`${id}-cat`} className="sr-only">Catégorie de l'article {index + 1}</label>
        <CategorySelect id={`${id}-cat`} value={item.categoryId} onChange={(categoryId) => patch({ categoryId })} error={errors?.categoryId} />
        {errors?.categoryId ? <p className="mt-1 text-xs font-bold text-bd-danger">{errors.categoryId}</p> : null}
      </div>
      <div>
        <PriceInput id={`${id}-price`} label={`Prix de l'article ${index + 1}`} value={item.price} onChange={(price) => patch({ price })} error={errors?.price} />
        {errors?.price ? <p className="mt-1 text-xs font-bold text-bd-danger">{errors.price}</p> : null}
      </div>
      <CommissionInput id={`${id}-com`} label={`Commission de l'article ${index + 1}`} value={item.commission} onChange={(commission) => patch({ commission })} error={errors?.commission} />
      <SplitFigures item={item} compact />
      <button
        type="button"
        disabled={!canRemove}
        onClick={() => onRemove(item.key)}
        aria-label={`Supprimer l'article ${index + 1}`}
        className="bd-focus flex h-11 w-11 items-center justify-center rounded-full text-bd-muted transition hover:bg-bd-danger-bg hover:text-bd-danger disabled:opacity-30"
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </li>
  );
});

const MobileCard = memo(function MobileCard({ item, index, errors, canRemove, onPatch, onRemove }: RowProps) {
  const id = useId();
  const patch = (p: Patch) => onPatch(item.key, p);
  return (
    <li className="rounded-3xl border border-bd-line/10 bg-bd-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <PhotoTile item={item} onPatch={patch} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-bd-muted">Article {index + 1}</span>
            <button
              type="button"
              disabled={!canRemove}
              onClick={() => onRemove(item.key)}
              aria-label={`Supprimer l'article ${index + 1}`}
              className="bd-focus -mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-bd-muted hover:bg-bd-danger-bg hover:text-bd-danger disabled:opacity-30"
            >
              <Trash2 size={18} aria-hidden />
            </button>
          </div>
          <NameInput id={`${id}-name`} label={`Nom de l'article ${index + 1}`} placeholder="Nom de l'article" value={item.name} onChange={(name) => patch({ name })} error={errors?.name} />
          {errors?.name ? <p className="text-xs font-bold text-bd-danger">{errors.name}</p> : null}
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor={`${id}-cat`} className="mb-1 block text-xs font-extrabold text-bd-ink">Catégorie</label>
        <CategorySelect id={`${id}-cat`} value={item.categoryId} onChange={(categoryId) => patch({ categoryId })} error={errors?.categoryId} />
        {errors?.categoryId ? <p className="mt-1 text-xs font-bold text-bd-danger">{errors.categoryId}</p> : null}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_104px] gap-3">
        <div>
          <label htmlFor={`${id}-price`} className="mb-1 block text-xs font-extrabold text-bd-ink">Prix de vente</label>
          <PriceInput id={`${id}-price`} value={item.price} onChange={(price) => patch({ price })} error={errors?.price} />
          {errors?.price ? <p className="mt-1 text-xs font-bold text-bd-danger">{errors.price}</p> : null}
        </div>
        <div>
          <label htmlFor={`${id}-com`} className="mb-1 block text-xs font-extrabold text-bd-ink">Commission</label>
          <CommissionInput id={`${id}-com`} value={item.commission} onChange={(commission) => patch({ commission })} error={errors?.commission} />
        </div>
      </div>
      <div className="mt-3">
        <DepositDateInput id={`${id}-date`} value={item.depositDate} onChange={(depositDate) => patch({ depositDate })} />
      </div>
      <div className="mt-3 rounded-2xl bg-bd-bg p-3">
        <SplitFigures item={item} />
      </div>
    </li>
  );
});

/* ───────────────────────────── Public pieces ───────────────────────────── */

export function CommissionChips({ value, onChange }: { value: number; onChange: (pct: number) => void }) {
  return (
    <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="Commission pour tous les articles">
      <span className="mr-1 shrink-0 text-sm font-extrabold text-bd-ink">Commission</span>
      {COMMISSION_PRESETS.map((p) => (
        <Pill key={p} active={value === p} onClick={() => onChange(p)} className="shrink-0">
          {p} %
        </Pill>
      ))}
    </div>
  );
}

export function SummaryCard({
  totals,
  className,
  children,
}: {
  totals: { count: number; priceMillimes: number; shopMillimes: number; depositorMillimes: number };
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className={cn('p-5', className)} aria-live="polite">
      <p className="mb-3 text-sm font-extrabold text-bd-ink">Récapitulatif</p>
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-bd-muted">Articles</dt>
          <dd className="font-extrabold tabular-nums text-bd-ink">{totals.count}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-bd-muted">Valeur de vente</dt>
          <dd><Money millimes={totals.priceMillimes} className="font-extrabold text-bd-ink" /></dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-bd-muted">Votre marge</dt>
          <dd><Money millimes={totals.shopMillimes} className="font-extrabold text-bd-pink-strong" /></dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-bd-muted">Part déposant</dt>
          <dd><Money millimes={totals.depositorMillimes} className="text-lg font-black text-bd-success" /></dd>
        </div>
      </dl>
      <SplitBar shop={totals.shopMillimes} total={totals.priceMillimes} className="mt-4 h-2.5" />
      {children}
    </Card>
  );
}

export default function ArticlesEditor({ items, errors, showErrors, defaultCommission, onPatch, onAdd, onRemove, onCommissionAll }: ArticlesEditorProps) {
  const desktop = useMediaQuery('(min-width: 1024px)');
  const Row = desktop ? DesktopRow : MobileCard;
  return (
    <div className="space-y-4">
      <CommissionChips value={defaultCommission} onChange={onCommissionAll} />
      {desktop ? (
        <div
          aria-hidden
          className="grid grid-cols-[56px_minmax(0,1.6fr)_minmax(0,1fr)_130px_96px_minmax(170px,1fr)_44px] gap-3 border-b border-bd-line/10 px-2 pb-2 text-xs font-extrabold uppercase tracking-wider text-bd-muted"
        >
          <span>Photo</span>
          <span>Article</span>
          <span>Catégorie</span>
          <span className="text-right">Prix</span>
          <span className="text-right">Com.</span>
          <span>Répartition</span>
          <span />
        </div>
      ) : null}
      <ul className={desktop ? 'divide-y divide-bd-line/5' : 'space-y-3'}>
        {items.map((it, i) => (
          <Row
            key={it.key}
            item={it}
            index={i}
            errors={showErrors ? errors[it.key] : undefined}
            canRemove={items.length > 1}
            onPatch={onPatch}
            onRemove={onRemove}
          />
        ))}
      </ul>
      <Button variant="secondary" icon={Plus} onClick={onAdd} className="w-full border-dashed sm:w-auto">
        Ajouter un article
      </Button>
    </div>
  );
}
