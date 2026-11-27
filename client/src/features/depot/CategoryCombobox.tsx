import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react';
import { useCreateCategoryMutation, useGetCategoryHierarchyQuery } from '../../store/api/categoryApi';
import { useCreateSubCategoryMutation } from '../../store/api/subCategoryApi';
import { useCreateSubSubCategory1Mutation } from '../../store/api/subSubCategoryApi';
import { apiErrorMessage, apiErrorPayload } from '../../lib/apiError';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/cn';

const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

type Level = 'category' | 'sub' | 'subsub';
const NOUN: Record<Level, string> = { category: 'Catégorie', sub: 'Sous-catégorie', subsub: 'Sous-sous-catégorie' };

/**
 * Searchable picker for a category, a sous-catégorie (of `parentId`) or a sous-sous-catégorie (of the
 * sous-catégorie `parentId`). No match → "+ Créer « xyz »" creates it and selects it.
 * Duplicate categories (case / accents) are refused by the API, which returns the existing one — selected.
 */
export default function CategoryCombobox({
  value,
  onChange,
  error,
  id,
  level = 'category',
  parentId,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
  id?: string;
  level?: Level;
  parentId?: string;
  placeholder?: string;
}) {
  const autoId = useId();
  const listId = `${autoId}-list`;
  const { data: tree, isLoading } = useGetCategoryHierarchyQuery();
  const [createCat, { isLoading: creatingCat }] = useCreateCategoryMutation();
  const [createSub, { isLoading: creatingSub }] = useCreateSubCategoryMutation();
  const [createSubSub, { isLoading: creatingSubSub }] = useCreateSubSubCategory1Mutation();
  const creating = creatingCat || creatingSub || creatingSubSub;
  const disabled = level !== 'category' && !parentId;
  // Same { id, categoryName } shape for the three levels.
  const data = useMemo(() => {
    if (level === 'category') return (tree ?? []).map((c) => ({ id: c.id, categoryName: c.categoryName }));
    if (level === 'sub') return (tree?.find((c) => c.id === parentId)?.subCategories ?? []).map((sc) => ({ id: sc.id, categoryName: sc.title }));
    const sc = (tree ?? []).flatMap((c) => c.subCategories ?? []).find((x) => x.id === parentId);
    return (sc?.subSubCategories1 ?? []).map((ss) => ({ id: ss.id, categoryName: ss.title }));
  }, [tree, level, parentId]);
  const create = async (name: string): Promise<{ id: string; categoryName: string }> => {
    if (level === 'category') {
      const c = await createCat({ data: { categoryName: name } }).unwrap();
      return { id: c.id, categoryName: c.categoryName };
    }
    if (level === 'sub') {
      const c = await createSub({ title: name, categoryId: parentId! }).unwrap();
      return { id: c.id, categoryName: c.title };
    }
    const c = await createSubSub({ title: name, subCategoryId: parentId! }).unwrap();
    return { id: c.id, categoryName: c.title };
  };
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
      const c = await create(o.label);
      onChange(c.id);
      showToast(`${NOUN[level]} « ${c.categoryName} » créée`, 'success');
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
        disabled={disabled}
        placeholder={isLoading ? 'Chargement…' : disabled ? (level === 'sub' ? "Choisissez d'abord la catégorie" : "Choisissez d'abord la sous-catégorie") : (placeholder ?? `${NOUN[level]}…`)}
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
        className={cn('bd-input pr-9 disabled:opacity-60', error && 'border-bd-danger')}
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
            <li className="px-3 py-3 text-sm font-bold text-bd-muted">Tapez un nom pour créer une {NOUN[level].toLowerCase()}.</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
