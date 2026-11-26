import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react';
import { useCreateCategoryMutation, useGetCategoryHierarchyQuery } from '../../store/api/categoryApi';
import { apiErrorMessage, apiErrorPayload } from '../../lib/apiError';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/cn';

const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Searchable category picker. No match → "+ Créer « xyz »" creates it (POST /categories) and selects it.
 * Duplicates (case / accents) are refused by the API, which returns the existing one — we select that.
 */
export default function CategoryCombobox({ value, onChange, error, id }: { value: string; onChange: (id: string) => void; error?: string; id?: string }) {
  const autoId = useId();
  const listId = `${autoId}-list`;
  const { data, isLoading } = useGetCategoryHierarchyQuery();
  const [create, { isLoading: creating }] = useCreateCategoryMutation();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const current = data?.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const matches = useMemo(() => {
    const k = key(q);
    return (data ?? []).filter((c) => !k || key(c.categoryName).includes(k)).slice(0, 30);
  }, [data, q]);
  const exact = (data ?? []).some((c) => key(c.categoryName) === key(q));
  const canCreate = q.trim().length > 1 && !exact;
  const options = [...matches.map((c) => ({ type: 'pick' as const, id: c.id, label: c.categoryName })), ...(canCreate ? [{ type: 'create' as const, id: '__create', label: q.trim() }] : [])];

  const choose = async (o: (typeof options)[number]) => {
    if (o.type === 'pick') {
      onChange(o.id);
      setOpen(false);
      setQ('');
      return;
    }
    try {
      const c = await create({ data: { categoryName: o.label } }).unwrap();
      onChange(c.id);
      showToast(`Catégorie « ${c.categoryName} » créée`, 'success');
    } catch (e) {
      const existing = apiErrorPayload<{ existing?: { id: string; categoryName: string } }>(e)?.existing;
      if (existing) {
        onChange(existing.id);
        showToast(`« ${existing.categoryName} » existe déjà — sélectionnée`, 'info');
      } else showToast(apiErrorMessage(e, 'Création impossible'), 'error');
    }
    setOpen(false);
    setQ('');
  };

  return (
    <div ref={wrap} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={error ? true : undefined}
        data-dictation="off"
        value={open ? q : (current?.categoryName ?? '')}
        placeholder={isLoading ? 'Chargement…' : 'Catégorie…'}
        onFocus={() => {
          setOpen(true);
          setQ('');
          setActive(0);
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, options.length - 1)));
          else if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
          else if (e.key === 'Enter' && open && options[active]) (e.preventDefault(), void choose(options[active]));
          else if (e.key === 'Escape') setOpen(false);
        }}
        className={cn('bd-input pr-9', error && 'border-bd-danger')}
      />
      {creating ? (
        <Loader2 size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-bd-muted" aria-hidden />
      ) : (
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-bd-muted" aria-hidden />
      )}
      {open ? (
        <ul id={listId} role="listbox" className="bd-anim-pop absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-bd-line/10 bg-bd-surface p-1.5 shadow-2xl">
          {options.length ? (
            options.map((o, i) => (
              <li key={o.id} role="option" aria-selected={o.type === 'pick' && o.id === value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void choose(o)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold',
                    i === active ? 'bg-bd-lilac/70' : '',
                    o.type === 'create' ? 'text-bd-pink-strong' : 'text-bd-ink',
                  )}
                >
                  {o.type === 'create' ? <Plus size={16} aria-hidden /> : o.id === value ? <Check size={16} className="text-bd-violet" aria-hidden /> : <span className="w-4" />}
                  {o.type === 'create' ? `Créer « ${o.label} »` : o.label}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-3 text-sm font-bold text-bd-muted">Tapez un nom pour créer une catégorie.</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
