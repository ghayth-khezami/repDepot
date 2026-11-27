import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, UserRound, X } from 'lucide-react';
import { useCreateClientMutation, useGetClientsFeedInfiniteQuery } from '../../store/api/clientApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../lib/apiError';
import { cn } from '../../lib/cn';
import { InfiniteSentinel } from '../../components/ui';
import type { Client, PaginatedResponse } from '../../types';

/**
 * Client of an order: search existing clients (page by page) or type a new name → "Créer « … »"
 * asks only the phone (8 digits) and creates the client on the spot.
 */
export default function ClientCombobox({
  value,
  onChange,
  address,
  disabled,
}: {
  value: string;
  onChange: (id: string, client?: Client) => void;
  /** Used as the new client's address (the delivery address). */
  address?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [phone, setPhone] = useState('');
  const search = useDebouncedValue(q.trim());
  const feed = useGetClientsFeedInfiniteQuery({ search: search || undefined }, { skip: !open && !value });
  const [createClient, { isLoading }] = useCreateClientMutation();
  const { showToast } = useToast();
  const box = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => ((feed.data?.pages ?? []) as PaginatedResponse<Client>[]).flatMap((p) => p.data), [feed.data]);
  const current = picked?.id === value ? picked : rows.find((c) => c.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (c: Client) => {
    setPicked(c);
    onChange(c.id, c);
    setOpen(false);
    setQ('');
    setCreating(false);
  };

  const create = async () => {
    const [firstName, ...rest] = q.trim().split(/\s+/);
    if (!firstName) return;
    if (!/^\d{8}$/.test(phone)) {
      showToast('Le téléphone doit contenir 8 chiffres', 'warning');
      return;
    }
    try {
      const c = await createClient({
        firstName,
        lastName: rest.join(' ') || '-',
        phoneNumber: phone,
        email: `client.${phone}@bebedepot.local`,
        address: address?.trim() || 'Non renseignée',
      } as never).unwrap();
      showToast(`Client ${q.trim()} créé`, 'success');
      pick(c);
      setPhone('');
    } catch (e) {
      showToast(apiErrorMessage(e, 'Création du client impossible'), 'error', 6000);
    }
  };

  return (
    <div ref={box} className="bd-ui relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="bd-input flex items-center gap-2 text-left disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <UserRound size={18} className="shrink-0 text-bd-violet" aria-hidden />
        <span className={cn('min-w-0 flex-1 truncate', !current && 'text-bd-muted')}>
          {current ? `${current.firstName} ${current.lastName}` : 'Choisir ou créer un client…'}
        </span>
        {current && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Effacer"
            onClick={(e) => {
              e.stopPropagation();
              setPicked(null);
              onChange('');
            }}
            className="rounded-full p-1 text-bd-muted hover:bg-bd-bg"
          >
            <X size={14} aria-hidden />
          </span>
        ) : null}
        <ChevronDown size={16} className={cn('shrink-0 text-bd-muted transition', open && 'rotate-180')} aria-hidden />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-[1100] mt-2 overflow-hidden rounded-2xl border border-bd-line/10 bg-bd-surface shadow-[0_18px_50px_rgba(30,27,75,0.2)]">
          <div className="border-b border-bd-line/10 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCreating(false);
              }}
              placeholder="Nom ou téléphone…"
              className="bd-input"
              data-dictation="off"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto overscroll-contain p-1">
            {q.trim() ? (
              <li>
                {creating ? (
                  <div className="space-y-2 rounded-xl bg-bd-blush/50 p-2">
                    <p className="text-sm font-extrabold text-bd-ink">Nouveau client : {q.trim()}</p>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        inputMode="numeric"
                        placeholder="Téléphone (8 chiffres)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="bd-input min-w-0 flex-1 tabular-nums"
                        data-dictation="off"
                      />
                      <button type="button" disabled={isLoading} onClick={() => void create()} className="bd-focus shrink-0 rounded-2xl bg-grad-pink-strong px-4 text-sm font-extrabold text-white disabled:opacity-60">
                        {isLoading ? '…' : 'Créer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setCreating(true)} className="bd-focus flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-left font-extrabold text-bd-pink-strong hover:bg-bd-blush/60">
                    <Plus size={16} aria-hidden /> Créer « {q.trim()} »
                  </button>
                )}
              </li>
            ) : null}
            {rows.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.id === value}
                  onClick={() => pick(c)}
                  className={cn('bd-focus flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3 text-left', c.id === value ? 'bg-bd-lilac text-bd-violet-strong' : 'hover:bg-bd-bg')}
                >
                  <span className="truncate font-extrabold">
                    {c.firstName} {c.lastName}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-bd-muted tabular-nums">{c.phoneNumber}</span>
                </button>
              </li>
            ))}
            {feed.isLoading ? <li className="p-3 text-center text-sm font-bold text-bd-muted">Chargement…</li> : null}
            {!feed.isLoading && !rows.length && !q.trim() ? <li className="p-3 text-center text-sm font-bold text-bd-muted">Aucun client — tapez un nom pour le créer.</li> : null}
            <li className="list-none">
              <InfiniteSentinel onReach={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()} disabled={!feed.hasNextPage} loading={feed.isFetchingNextPage} />
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
