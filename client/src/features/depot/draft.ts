import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { parseTndInput, splitCommission } from '../../lib/money';
import { isAllowedCommission } from '../../lib/commission';
import type { DeposantSummary } from '../../store/api/depotApi';

/** One form store for the whole stepper: going back never loses data (and survives a refresh). */

export interface DraftItem {
  key: string;
  name: string;
  price: string; // raw input, parsed to millimes on demand
  commission: number;
  categoryId: string;
  subCategoryId?: string;
  subSubCategory1Id?: string;
  photos: string[];
  uploading: number;
  /** YYYY-MM-DD; empty = contract date. */
  depositDate?: string;
}

export interface DraftDeposant {
  firstName: string;
  lastName: string;
  phone: string; // 8 digits
  email: string;
  address: string;
  lat?: number;
  lng?: number;
  rib: string;
  /** F = femme, M = homme (illustration on cards and on the dépôts map). */
  gender?: 'F' | 'M';
}

export interface DepotDraft {
  step: 0 | 1 | 2;
  mode: 'new' | 'existing';
  deposant: DraftDeposant;
  existing: DeposantSummary | null;
  items: DraftItem[];
  defaultCommission: number;
  lastCategoryId: string;
  durationMonths: 1 | 3 | 6;
  /** YYYY-MM-DD; empty = today. The contract and its duration start on this date. */
  depositDate: string;
  internalNote: string;
  contractId: string | null;
}

const STORAGE_KEY = 'bd-depot-draft-v1';

export const emptyDeposant: DraftDeposant = { firstName: '', lastName: '', phone: '', email: '', address: '', rib: '' };

export function newItem(commission: number, categoryId: string): DraftItem {
  return {
    key: Math.random().toString(36).slice(2, 10),
    name: '',
    price: '',
    commission,
    categoryId,
    photos: [],
    uploading: 0,
  };
}

const initialDraft = (): DepotDraft => ({
  step: 0,
  mode: 'existing',
  deposant: emptyDeposant,
  existing: null,
  items: [newItem(25, '')],
  defaultCommission: 25,
  lastCategoryId: '',
  durationMonths: 3,
  depositDate: '',
  internalNote: '',
  contractId: null,
});

type Action =
  | { type: 'step'; step: DepotDraft['step'] }
  | { type: 'mode'; mode: DepotDraft['mode'] }
  | { type: 'deposant'; patch: Partial<DraftDeposant> }
  | { type: 'existing'; deposant: DeposantSummary | null }
  | { type: 'item'; key: string; patch: Partial<DraftItem> | ((it: DraftItem) => Partial<DraftItem>) }
  | { type: 'addItem' }
  | { type: 'removeItem'; key: string }
  | { type: 'commissionAll'; commission: number }
  | { type: 'duration'; months: DepotDraft['durationMonths'] }
  | { type: 'note'; note: string }
  | { type: 'created'; contractId: string }
  | { type: 'hydrate'; patch: Partial<DepotDraft> }
  | { type: 'reset' };

function reducer(state: DepotDraft, action: Action): DepotDraft {
  switch (action.type) {
    case 'step':
      return { ...state, step: action.step };
    case 'mode':
      return { ...state, mode: action.mode };
    case 'deposant':
      return { ...state, deposant: { ...state.deposant, ...action.patch } };
    case 'existing':
      return { ...state, existing: action.deposant };
    case 'item': {
      let lastCategoryId = state.lastCategoryId;
      const items = state.items.map((it) => {
        if (it.key !== action.key) return it;
        const patch = typeof action.patch === 'function' ? action.patch(it) : action.patch;
        if (patch.categoryId) lastCategoryId = patch.categoryId;
        return { ...it, ...patch };
      });
      return { ...state, items, lastCategoryId };
    }
    case 'addItem':
      return { ...state, items: [...state.items, newItem(state.defaultCommission, state.lastCategoryId)] };
    case 'removeItem': {
      const items = state.items.filter((it) => it.key !== action.key);
      return { ...state, items };
    }
    case 'commissionAll':
      return {
        ...state,
        defaultCommission: action.commission,
        items: state.items.map((it) => ({ ...it, commission: action.commission })),
      };
    case 'duration':
      return { ...state, durationMonths: action.months };
    case 'note':
      return { ...state, internalNote: action.note };
    case 'created':
      return { ...state, contractId: action.contractId, step: 2 };
    case 'hydrate':
      return { ...state, ...action.patch };
    case 'reset':
      return initialDraft();
    default:
      return state;
  }
}

function load(): DepotDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialDraft();
    const parsed = JSON.parse(raw) as DepotDraft;
    // Uploads in flight can't survive a reload.
    return { ...initialDraft(), ...parsed, items: (parsed.items ?? []).map((it) => ({ ...it, uploading: 0 })) };
  } catch {
    return initialDraft();
  }
}

export function useDepotDraft() {
  const [draft, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable (private mode) — the in-memory store still works */
    }
  }, [draft]);
  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    dispatch({ type: 'reset' });
  }, []);
  return { draft, dispatch, clear };
}

export type DraftDispatch = ReturnType<typeof useDepotDraft>['dispatch'];

/* ─────────────────────────── Validation & totals ─────────────────────────── */

export interface DeposantErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  email?: string;
  rib?: string;
}

export function validateDeposant(d: DraftDeposant): DeposantErrors {
  const e: DeposantErrors = {};
  if (!d.firstName.trim()) e.firstName = 'Le prénom est obligatoire.';
  if (!d.lastName.trim()) e.lastName = 'Le nom est obligatoire.';
  if (!/^\d{8}$/.test(d.phone)) e.phone = 'Le téléphone doit contenir 8 chiffres.';
  if (d.address.trim().length < 3) e.address = "L'adresse est obligatoire.";
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Email invalide.';
  const rib = d.rib.replace(/\s/g, '');
  if (rib && !/^\d{20}$/.test(rib)) e.rib = 'Le RIB doit contenir 20 chiffres.';
  return e;
}

export interface ItemErrors {
  name?: string;
  price?: string;
  commission?: string;
  categoryId?: string;
}

export function validateItem(it: DraftItem): ItemErrors {
  const e: ItemErrors = {};
  if (!it.name.trim()) e.name = 'Nom requis';
  const p = parseTndInput(it.price);
  if (p === null || p <= 0) e.price = 'Prix > 0 (3 déc. max)';
  if (!isAllowedCommission(it.commission)) e.commission = '5 à 50 % (valeurs fixes)';
  if (!it.categoryId) e.categoryId = 'Catégorie requise';
  return e;
}

export function itemSplit(it: DraftItem) {
  return splitCommission(parseTndInput(it.price) ?? 0, it.commission);
}

export function useItemTotals(items: DraftItem[]) {
  return useMemo(
    () =>
      items.reduce(
        (t, it) => {
          const s = itemSplit(it);
          return {
            count: t.count + 1,
            priceMillimes: t.priceMillimes + s.priceMillimes,
            shopMillimes: t.shopMillimes + s.shopMillimes,
            depositorMillimes: t.depositorMillimes + s.depositorMillimes,
          };
        },
        { count: 0, priceMillimes: 0, shopMillimes: 0, depositorMillimes: 0 },
      ),
    [items],
  );
}
