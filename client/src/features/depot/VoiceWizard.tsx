import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  ChevronsRight,
  FileSignature,
  Keyboard,
  Mic,
  PencilLine,
  Square,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useGetCategoryHierarchyQuery } from '../../store/api/categoryApi';
import { useLazyCheckDeposantPhoneQuery, type DeposantSummary } from '../../store/api/depotApi';
import { cn } from '../../lib/cn';
import { formatTnd, parseTndInput, splitCommission, toMillimes } from '../../lib/money';
import {
  DICTATION_ERROR_LABEL,
  matchOption,
  parseFrenchNumber,
  parseYesNo,
  speak,
  speechSupported,
  spokenDigits,
  spokenEmail,
  useDictation,
} from '../../lib/speech';
import { Waveform } from '../../components/Dictation';
import { Money } from '../../components/ui';
import { SplitBar, COMMISSION_PRESETS } from './ArticlesEditor';
import { emptyDeposant, newItem, validateDeposant, type DraftDeposant, type DraftItem } from './draft';

/* ───────────────────────────── Model ───────────────────────────── */

interface WizItem {
  name: string;
  categoryId: string;
  price: string;
  commission: number;
}

interface WizState {
  deposant: DraftDeposant;
  existing: DeposantSummary | null;
  extras: boolean | null;
  count: number | null;
  /** Set when the user answers "Non" to "On passe à l'article N ?" */
  stopAfter: number | null;
  items: WizItem[];
  answered: Set<string>;
}

export interface VoiceWizardResult {
  deposant: DraftDeposant;
  existing: DeposantSummary | null;
  items: DraftItem[];
}

type Kind = 'text' | 'phone' | 'email' | 'yesno' | 'count' | 'price' | 'percent' | 'category';

interface StepDef {
  id: string;
  section: string;
  prompt: string;
  hint: string;
  kind: Kind;
  optional?: boolean;
  item?: number;
}

type Parsed = { ok: true; apply: (s: WizState) => WizState; display: string } | { ok: false; error: string };

const blankItem = (commission: number, categoryId: string): WizItem => ({ name: '', categoryId, price: '', commission });

function buildSteps(s: WizState): StepDef[] {
  const steps: StepDef[] = [
    { id: 'firstName', section: 'Déposant', prompt: 'Quel est le prénom du déposant ?', hint: 'Dites simplement le prénom', kind: 'text' },
    { id: 'lastName', section: 'Déposant', prompt: 'Et son nom de famille ?', hint: 'Dites le nom', kind: 'text' },
    { id: 'phone', section: 'Déposant', prompt: 'Quel est son numéro de téléphone ?', hint: '8 chiffres, ex. « 55 863 578 »', kind: 'phone' },
  ];
  if (!s.existing) {
    steps.push({ id: 'extras', section: 'Déposant', prompt: "Ajouter l'email, l'adresse ou le RIB maintenant ?", hint: 'Répondez oui ou non', kind: 'yesno' });
    if (s.extras) {
      steps.push(
        { id: 'email', section: 'Déposant', prompt: 'Quelle est son adresse email ?', hint: '« salma arobase gmail point com »', kind: 'email', optional: true },
        { id: 'address', section: 'Déposant', prompt: 'Quelle est son adresse ?', hint: 'Rue, ville', kind: 'text', optional: true },
        { id: 'rib', section: 'Déposant', prompt: 'Quel est son RIB ?', hint: '20 chiffres', kind: 'phone', optional: true },
      );
    }
  }
  steps.push({ id: 'count', section: 'Articles', prompt: "Combien d'articles dépose-t-il aujourd'hui ?", hint: 'Dites un nombre, ou « aucun »', kind: 'count' });
  const n = s.stopAfter !== null ? s.stopAfter + 1 : (s.count ?? 0);
  for (let i = 0; i < n; i++) {
    const sec = `Article ${i + 1}${s.count ? ` sur ${s.count}` : ''}`;
    steps.push(
      { id: `name:${i}`, section: sec, prompt: i === 0 ? 'Quel est le premier article ?' : `Quel est l'article ${i + 1} ?`, hint: 'Ex. « Poussette Chicco grise »', kind: 'text', item: i },
      { id: `cat:${i}`, section: sec, prompt: 'Dans quelle catégorie ?', hint: i > 0 ? 'Touchez une catégorie, ou dites « pareil »' : 'Touchez ou dites la catégorie', kind: 'category', item: i },
      { id: `price:${i}`, section: sec, prompt: 'À quel prix le vendre ?', hint: 'Ex. « trois cent quatre-vingts dinars »', kind: 'price', item: i },
      { id: `com:${i}`, section: sec, prompt: 'Quelle commission ?', hint: '« comme d’habitude » = commission par défaut', kind: 'percent', item: i },
    );
    if (i < (s.count ?? 0) - 1 && (s.stopAfter === null || i < s.stopAfter)) {
      steps.push({ id: `next:${i}`, section: sec, prompt: `On passe à l'article ${i + 2} ?`, hint: 'Oui pour continuer, non pour terminer', kind: 'yesno', item: i });
    }
  }
  steps.push({ id: 'review', section: 'Récapitulatif', prompt: 'Tout est prêt !', hint: 'Vérifiez la fiche puis générez le contrat', kind: 'text' });
  return steps;
}

function setItem(s: WizState, i: number, patch: Partial<WizItem>, defaults: { commission: number; categoryId: string }): WizState {
  const items = [...s.items];
  while (items.length <= i) items.push(blankItem(defaults.commission, items[items.length - 1]?.categoryId || defaults.categoryId));
  items[i] = { ...items[i], ...patch };
  return { ...s, items };
}

const cap = (t: string) => t.trim().charAt(0).toUpperCase() + t.trim().slice(1);

/* ───────────────────────────── Component ───────────────────────────── */

export default function VoiceWizard({
  open,
  onClose,
  defaultCommission,
  lastCategoryId,
  initialDeposant,
  onReview,
  onGenerate,
  generating,
}: {
  open: boolean;
  onClose: () => void;
  defaultCommission: number;
  lastCategoryId: string;
  initialDeposant?: DraftDeposant;
  onReview: (r: VoiceWizardResult) => void;
  onGenerate: (r: VoiceWizardResult) => void;
  generating?: boolean;
}) {
  const defaults = useMemo(() => ({ commission: defaultCommission, categoryId: lastCategoryId }), [defaultCommission, lastCategoryId]);
  const { data: categories } = useGetCategoryHierarchyQuery(undefined, { skip: !open });
  const catOptions = useMemo(() => (categories ?? []).map((c) => ({ id: c.id, label: c.categoryName })), [categories]);
  const catName = useCallback((id: string) => catOptions.find((c) => c.id === id)?.label ?? '', [catOptions]);
  const [checkPhone] = useLazyCheckDeposantPhoneQuery();

  const fresh = useCallback(
    (): WizState => ({
      deposant: initialDeposant ?? emptyDeposant,
      existing: null,
      extras: null,
      count: null,
      stopAfter: null,
      items: [],
      answered: new Set(),
    }),
    [initialDeposant],
  );
  const [state, setState] = useState<WizState>(fresh);
  const [cursor, setCursor] = useState('firstName');
  const [mode, setMode] = useState<'voice' | 'keyboard'>(() => (speechSupported() ? 'voice' : 'keyboard'));
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('bd-wizard-muted') === '1';
    } catch {
      return false;
    }
  });
  const [phase, setPhase] = useState<'speaking' | 'listening' | 'idle' | 'confirmed'>('idle');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [typed, setTyped] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const retries = useRef(0);
  const advanceTimer = useRef<number>();
  const cancelSpeech = useRef<() => void>(() => {});
  const stateRef = useRef(state);
  stateRef.current = state;

  const steps = useMemo(() => buildSteps(state), [state]);
  const stepIndex = Math.max(0, steps.findIndex((s) => s.id === cursor));
  const step = steps[stepIndex] ?? steps[0];
  const isReview = step.id === 'review';

  // Reset when (re)opened.
  useEffect(() => {
    if (!open) return;
    setState(fresh());
    setCursor('firstName');
    setFeedback(null);
    setTyped('');
    retries.current = 0;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, fresh]);

  /* ── answer handling ── */

  const parse = useCallback(
    (raw: string, st: StepDef, s: WizState): Parsed => {
      const t = raw.trim();
      if (!t) return { ok: false, error: "Je n'ai rien entendu." };
      const i = st.item ?? 0;
      switch (st.id.split(':')[0]) {
        case 'firstName':
          return { ok: true, display: cap(t), apply: (x) => ({ ...x, deposant: { ...x.deposant, firstName: cap(t) } }) };
        case 'lastName':
          return { ok: true, display: cap(t), apply: (x) => ({ ...x, deposant: { ...x.deposant, lastName: cap(t) } }) };
        case 'phone': {
          const d = spokenDigits(t).slice(-8);
          if (d.length !== 8) return { ok: false, error: `J'ai compris « ${t} » : il faut 8 chiffres.` };
          return { ok: true, display: d.replace(/^(\d{2})(\d{3})(\d{3})$/, '+216 $1 $2 $3'), apply: (x) => ({ ...x, deposant: { ...x.deposant, phone: d } }) };
        }
        case 'rib': {
          const d = t.replace(/\D/g, '') || spokenDigits(t);
          if (d.length !== 20) return { ok: false, error: `Le RIB doit faire 20 chiffres (${d.length} compris).` };
          return { ok: true, display: d, apply: (x) => ({ ...x, deposant: { ...x.deposant, rib: d } }) };
        }
        case 'email': {
          const e = spokenEmail(t);
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: `« ${e} » n'est pas un email valide.` };
          return { ok: true, display: e, apply: (x) => ({ ...x, deposant: { ...x.deposant, email: e } }) };
        }
        case 'address':
          return { ok: true, display: cap(t), apply: (x) => ({ ...x, deposant: { ...x.deposant, address: cap(t) } }) };
        case 'extras': {
          const yn = parseYesNo(t);
          if (!yn) return { ok: false, error: 'Répondez par oui ou par non.' };
          return { ok: true, display: yn === 'yes' ? 'Oui' : 'Non', apply: (x) => ({ ...x, extras: yn === 'yes' }) };
        }
        case 'count': {
          if (/aucun|rien|zéro|zero|pas d'article/i.test(t)) return { ok: true, display: '0 article', apply: (x) => ({ ...x, count: 0, stopAfter: null }) };
          const n = parseFrenchNumber(t);
          if (n === null || n < 1 || n > 60 || !Number.isInteger(n)) return { ok: false, error: `Je n'ai pas compris le nombre (« ${t} »).` };
          return { ok: true, display: `${n} article${n > 1 ? 's' : ''}`, apply: (x) => ({ ...x, count: n, stopAfter: null }) };
        }
        case 'next': {
          const yn = parseYesNo(t);
          if (!yn) return { ok: false, error: 'Oui pour continuer, non pour terminer.' };
          return {
            ok: true,
            display: yn === 'yes' ? `Article ${i + 2} →` : 'Liste terminée',
            apply: (x) => ({ ...x, stopAfter: yn === 'yes' ? (x.stopAfter === i ? null : x.stopAfter) : i }),
          };
        }
        case 'name':
          return { ok: true, display: cap(t), apply: (x) => setItem(x, i, { name: cap(t) }, defaults) };
        case 'cat': {
          if (/pareil|même|meme|idem|comme avant|la même/i.test(t)) {
            const prev = s.items[i - 1]?.categoryId || defaults.categoryId;
            if (prev) return { ok: true, display: catName(prev), apply: (x) => setItem(x, i, { categoryId: prev }, defaults) };
          }
          const m = matchOption(t, catOptions);
          if (!m) return { ok: false, error: `Catégorie « ${t} » introuvable — touchez-en une.` };
          return { ok: true, display: m.label, apply: (x) => setItem(x, i, { categoryId: m.id }, defaults) };
        }
        case 'price': {
          const n = parseFrenchNumber(t);
          if (n === null || n <= 0) return { ok: false, error: `Prix non compris (« ${t} »).` };
          const mil = toMillimes(n);
          return { ok: true, display: formatTnd(mil), apply: (x) => setItem(x, i, { price: String(n) }, defaults) };
        }
        case 'com': {
          if (/habitude|habituel|défaut|defaut|pareil|normal|standard|même|meme/i.test(t)) {
            const c = defaults.commission;
            return { ok: true, display: `${c} % (par défaut)`, apply: (x) => setItem(x, i, { commission: c }, defaults) };
          }
          const n = parseFrenchNumber(t);
          if (n === null || n < 0 || n > 100) return { ok: false, error: 'Entre 0 et 100 %.' };
          return { ok: true, display: `${n} %`, apply: (x) => setItem(x, i, { commission: n }, defaults) };
        }
        default:
          return { ok: false, error: '' };
      }
    },
    [catName, catOptions, defaults],
  );

  const goNext = useCallback((s: WizState, fromId: string) => {
    const list = buildSteps(s);
    const from = list.findIndex((x) => x.id === fromId);
    // First unanswered step after the current one, else the first unanswered at all, else review.
    const after = list.slice(from + 1).find((x) => !s.answered.has(x.id) && x.id !== 'review');
    const any = list.find((x) => !s.answered.has(x.id) && x.id !== 'review');
    setCursor((after ?? any ?? list[list.length - 1]).id);
    setFeedback(null);
    setTyped('');
    retries.current = 0;
  }, []);

  const commit = useCallback(
    async (raw: string) => {
      const st = steps[stepIndex];
      if (!st || st.id === 'review') return;
      const res = parse(raw, st, stateRef.current);
      if ('error' in res) {
        setFeedback({ ok: false, text: res.error });
        setPhase('idle');
        return false;
      }
      let next = res.apply(stateRef.current);
      next = { ...next, answered: new Set(next.answered).add(st.id) };
      let display = res.display;
      // Known phone → reuse the existing déposant.
      if (st.id === 'phone') {
        try {
          const r = await checkPhone(next.deposant.phone, true).unwrap();
          if (r.exists) {
            next = { ...next, existing: { ...r.deposant, phone: next.deposant.phone, productsCount: 0, contractsCount: 0 } };
            display = `${display} · déposant N° ${r.deposant.number} (${r.deposant.firstName} ${r.deposant.lastName})`;
          } else next = { ...next, existing: null };
        } catch {
          /* offline: keep going */
        }
      }
      setState(next);
      setFeedback({ ok: true, text: display });
      setPhase('confirmed');
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => goNext(next, st.id), 850);
      return true;
    },
    [checkPhone, goNext, parse, stepIndex, steps],
  );

  const skip = useCallback(() => {
    cancelSpeech.current();
    const st = steps[stepIndex];
    if (!st || st.id === 'review') return;
    let next: WizState = { ...stateRef.current, answered: new Set(stateRef.current.answered).add(st.id) };
    if (st.id === 'extras') next = { ...next, extras: false };
    if (st.id === 'count') next = { ...next, count: next.count ?? 0 };
    if (st.id.startsWith('next:')) next = { ...next, stopAfter: st.item ?? 0 };
    setState(next);
    goNext(next, st.id);
  }, [goNext, stepIndex, steps]);

  /* ── voice loop ── */

  const dict = useDictation({
    continuous: false,
    onEnd: (text) => {
      if (!text) {
        setPhase('idle');
        return;
      }
      void commit(text).then((ok) => {
        if (ok === false && retries.current < 1 && mode === 'voice') {
          retries.current += 1;
          window.setTimeout(() => {
            setPhase('listening');
            dict.start();
          }, 1400);
        }
      });
    },
  });

  const listen = useCallback(() => {
    cancelSpeech.current();
    setFeedback(null);
    if (dict.start()) setPhase('listening');
    else setPhase('idle');
  }, [dict]);

  // Ask each new question: speak it, then listen.
  useEffect(() => {
    if (!open) return;
    window.clearTimeout(advanceTimer.current);
    dict.abort();
    if (isReview) {
      setPhase('idle');
      cancelSpeech.current = muted ? () => {} : speak('Tout est prêt. Vérifiez la fiche, puis générez le contrat.');
      return;
    }
    if (mode !== 'voice') {
      setPhase('idle');
      return;
    }
    if (muted) {
      const t = window.setTimeout(listen, 350);
      return () => window.clearTimeout(t);
    }
    setPhase('speaking');
    cancelSpeech.current = speak(step.prompt, () => listen());
    return () => cancelSpeech.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cursor, mode]);

  useEffect(
    () => () => {
      window.clearTimeout(advanceTimer.current);
      cancelSpeech.current();
    },
    [],
  );

  useEffect(() => {
    if (dict.error && dict.error !== 'no-speech') {
      setFeedback({ ok: false, text: DICTATION_ERROR_LABEL[dict.error] });
      if (dict.error === 'unsupported' || dict.error === 'denied') setMode('keyboard');
    }
  }, [dict.error]);

  const close = () => {
    dict.abort();
    cancelSpeech.current();
    window.clearTimeout(advanceTimer.current);
    onClose();
  };

  const toggleMute = () => {
    setMuted((m) => {
      try {
        localStorage.setItem('bd-wizard-muted', m ? '0' : '1');
      } catch {
        /* ignore */
      }
      if (!m) cancelSpeech.current();
      return !m;
    });
  };

  /* ── result ── */

  const result = (): VoiceWizardResult => {
    const n = state.stopAfter !== null ? state.stopAfter + 1 : (state.count ?? 0);
    const items = state.items.slice(0, n).map((it) => ({ ...newItem(it.commission, it.categoryId), name: it.name, price: it.price }));
    return { deposant: state.deposant, existing: state.existing, items };
  };
  const r = isReview ? result() : null;
  const deposantOk = !!state.existing || Object.keys(validateDeposant(state.deposant)).length === 0;
  const itemsOk = (r?.items ?? []).every((it) => it.name.trim() && it.categoryId && (parseTndInput(it.price) ?? 0) > 0);
  const canGenerate = isReview && deposantOk && itemsOk;

  /* ── live sheet data ── */
  const itemCount = state.stopAfter !== null ? state.stopAfter + 1 : (state.count ?? 0);
  const liveItems = state.items.slice(0, Math.max(itemCount, state.items.length)).filter((it) => it.name || it.price);
  const totals = liveItems.reduce(
    (t, it) => {
      const sp = splitCommission(parseTndInput(it.price) ?? 0, it.commission);
      return { price: t.price + sp.priceMillimes, shop: t.shop + sp.shopMillimes, dep: t.dep + sp.depositorMillimes };
    },
    { price: 0, shop: 0, dep: 0 },
  );
  const who = state.existing
    ? `${state.existing.firstName} ${state.existing.lastName}`
    : `${state.deposant.firstName} ${state.deposant.lastName}`.trim();

  if (!open) return null;

  const listening = phase === 'listening' && dict.listening;
  const orbClass = cn('bd-orb', listening && 'is-listening', phase === 'speaking' && 'is-speaking', (phase === 'confirmed' || isReview) && 'is-done');
  const progress = ((isReview ? steps.length : stepIndex) / steps.length) * 100;

  const yesNo = step.kind === 'yesno';
  const chips =
    step.kind === 'category'
      ? catOptions.map((c) => ({ key: c.id, label: c.label, value: c.label, active: state.items[step.item ?? 0]?.categoryId === c.id }))
      : step.kind === 'percent'
        ? COMMISSION_PRESETS.map((p) => ({ key: String(p), label: `${p} %${p === defaultCommission ? ' ★' : ''}`, value: String(p), active: false }))
        : step.kind === 'count'
          ? [1, 2, 3, 4, 5, 6, 8, 10].map((n) => ({ key: String(n), label: String(n), value: String(n), active: state.count === n }))
          : [];

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Assistant IA de dépôt" className="bd-ui fixed inset-0 z-[80] flex justify-center bg-bd-ink/40 backdrop-blur-sm md:items-center md:p-6">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-bd-bg md:h-[min(860px,94dvh)] md:max-w-md md:rounded-[32px] md:shadow-2xl">
        {/* Decorative glow */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(192,132,252,0.35),transparent)]" />

        {/* Header */}
        <header className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" onClick={close} aria-label="Fermer l'assistant" className="bd-focus flex h-11 w-11 items-center justify-center rounded-2xl bg-bd-surface text-bd-ink shadow-card active:scale-95">
            <X size={20} aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight text-bd-ink">Assistant IA</p>
            <p className="truncate text-xs font-bold text-bd-muted">{step.section}</p>
          </div>
          <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Activer la voix' : 'Couper la voix'} className="bd-focus flex h-10 w-10 items-center justify-center rounded-full text-bd-violet hover:bg-bd-lilac/60">
            {muted ? <VolumeX size={19} aria-hidden /> : <Volume2 size={19} aria-hidden />}
          </button>
          <span className="rounded-full bg-bd-surface px-3 py-1.5 text-sm font-black text-bd-violet-strong shadow-card tabular-nums">
            {Math.min(stepIndex + 1, steps.length)} / {steps.length}
          </span>
        </header>
        <div className="relative z-10 mx-4 h-1.5 overflow-hidden rounded-full bg-bd-lilac">
          <div className="h-full rounded-full bg-grad-pink transition-[width] duration-500 ease-out" style={{ width: `${Math.max(3, progress)}%` }} />
        </div>

        {/* Stage */}
        <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pb-4 pt-6 text-center">
          <div className={orbClass} aria-hidden>
            <span className="bd-orb-ring" />
            <span className="bd-orb-ring" />
            <span className="bd-orb-ring" />
            <span className="bd-orb-halo" />
            <span className="bd-orb-core" />
            {phase === 'confirmed' || isReview ? (
              <Check size={54} strokeWidth={3} className="bd-anim-check absolute inset-0 m-auto text-white drop-shadow" />
            ) : null}
          </div>

          <div key={step.id} className="bd-anim-slide-in mt-6 w-full">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-bd-violet">{step.section}</p>
            <h2 className="mt-2 text-balance text-2xl font-black leading-tight text-bd-ink sm:text-[26px]">{step.prompt}</h2>
            <p className="mt-2 text-sm font-semibold text-bd-muted">{step.hint}</p>
          </div>

          {/* Live transcript / interpretation */}
          <div className="mt-5 flex min-h-[52px] w-full items-center justify-center" aria-live="polite">
            {listening ? (
              <div className="bd-anim-pop flex max-w-full items-center gap-3 rounded-2xl bg-bd-surface px-4 py-3 shadow-card">
                <Waveform />
                <span className="truncate text-base font-bold text-bd-ink">
                  {dict.live || <span className="text-bd-muted">Je vous écoute…</span>}
                  <span className="bd-caret" aria-hidden />
                </span>
              </div>
            ) : feedback ? (
              <div
                className={cn(
                  'max-w-full rounded-2xl px-4 py-3 text-base font-extrabold',
                  feedback.ok ? 'bd-anim-pop bg-bd-success-bg text-bd-success' : 'bd-anim-shake bg-bd-danger-bg text-bd-danger',
                )}
              >
                {feedback.ok ? <Check size={18} className="mr-1.5 inline -translate-y-px" aria-hidden /> : null}
                {feedback.text}
              </div>
            ) : null}
          </div>

          {/* Quick answers */}
          {!isReview && yesNo ? (
            <div className="bd-anim-fade-up mt-2 grid w-full grid-cols-2 gap-3">
              <button type="button" onClick={() => void commit('oui')} className="bd-focus min-h-[60px] rounded-2xl bg-grad-pink-strong text-lg font-black text-white shadow-glow-pink active:scale-95">
                Oui
              </button>
              <button type="button" onClick={() => void commit('non')} className="bd-focus min-h-[60px] rounded-2xl border-2 border-bd-line/15 bg-bd-surface text-lg font-black text-bd-ink active:scale-95">
                Non
              </button>
            </div>
          ) : null}
          {!isReview && chips.length ? (
            <div className="bd-anim-fade-up mt-2 flex max-h-36 w-full flex-wrap justify-center gap-2 overflow-y-auto p-1">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => void commit(c.value)}
                  className={cn(
                    'bd-focus min-h-[40px] rounded-full px-4 text-sm font-extrabold transition active:scale-95',
                    c.active ? 'bg-grad-pink-strong text-white shadow-glow-pink' : 'border border-bd-line/15 bg-bd-surface text-bd-ink',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ) : null}

          {isReview ? (
            <div className="bd-anim-fade-up mt-2 w-full space-y-3">
              {!deposantOk || !itemsOk ? (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-bd-amber-ink dark:bg-amber-500/10">
                  Il manque des informations — touchez une ligne de la fiche pour corriger, ou passez en mode édition.
                </p>
              ) : null}
              <button
                type="button"
                disabled={!canGenerate || generating}
                onClick={() => onGenerate(result())}
                className="bd-focus flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-grad-pink-strong text-base font-black text-white shadow-glow-pink active:scale-[0.98] disabled:opacity-50"
              >
                <FileSignature size={20} aria-hidden /> {generating ? 'Génération…' : 'Générer le contrat'}
              </button>
              <button
                type="button"
                onClick={() => onReview(result())}
                className="bd-focus flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-bd-line/15 bg-bd-surface text-sm font-extrabold text-bd-ink active:scale-[0.98]"
              >
                <PencilLine size={18} aria-hidden /> Vérifier et modifier dans le formulaire
              </button>
            </div>
          ) : null}
        </main>

        {/* Controls */}
        {!isReview ? (
          <div className="relative z-10 px-6 pb-3">
            {mode === 'keyboard' ? (
              <form
                className="bd-anim-pop mb-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (typed.trim()) void commit(typed);
                }}
              >
                <input
                  autoFocus
                  data-dictation="off"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  inputMode={step.kind === 'phone' || step.kind === 'count' ? 'numeric' : step.kind === 'price' || step.kind === 'percent' ? 'decimal' : step.kind === 'email' ? 'email' : 'text'}
                  placeholder="Votre réponse…"
                  aria-label={step.prompt}
                  className="bd-input flex-1"
                />
                <button type="submit" aria-label="Valider" className="bd-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grad-violet-strong text-white">
                  <Check size={20} aria-hidden />
                </button>
              </form>
            ) : null}
            <div className="flex items-center justify-center gap-6">
              <button type="button" onClick={skip} className="bd-focus flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl bg-bd-surface text-[11px] font-extrabold text-bd-ink shadow-card active:scale-95">
                <ChevronsRight size={18} aria-hidden /> Passer
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mode !== 'voice') setMode('voice');
                  if (dict.listening) dict.stop();
                  else listen();
                }}
                aria-label={dict.listening ? "Arrêter l'écoute" : 'Parler'}
                className={cn(
                  'bd-focus relative isolate flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#6D28D9,#DB2777)] text-white shadow-[0_14px_40px_rgba(190,24,93,0.4)] transition active:scale-95',
                  dict.listening && 'bd-stop-btn',
                )}
              >
                {dict.listening ? <Square size={24} fill="currentColor" aria-hidden /> : <Mic size={30} aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => {
                  dict.abort();
                  cancelSpeech.current();
                  setPhase('idle');
                  setMode((m) => (m === 'keyboard' ? 'voice' : 'keyboard'));
                }}
                aria-pressed={mode === 'keyboard'}
                className={cn(
                  'bd-focus flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-extrabold shadow-card active:scale-95',
                  mode === 'keyboard' ? 'bg-grad-violet-strong text-white' : 'bg-bd-surface text-bd-ink',
                )}
              >
                <Keyboard size={18} aria-hidden /> Clavier
              </button>
            </div>
          </div>
        ) : null}

        {/* Fiche en cours */}
        <section
          aria-label="Fiche en cours"
          className={cn(
            'relative z-10 rounded-t-[28px] border-t border-bd-line/10 bg-bd-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(76,29,149,0.12)] transition-[max-height] duration-500 ease-out',
            sheetOpen || isReview ? 'max-h-[55dvh]' : 'max-h-[180px]',
          )}
        >
          <button type="button" onClick={() => setSheetOpen((v) => !v)} aria-expanded={sheetOpen} className="bd-focus mx-auto mb-1 flex w-full flex-col items-center rounded-xl">
            <span aria-hidden className="h-1.5 w-10 rounded-full bg-bd-lilac" />
          </button>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-black text-bd-ink">Fiche en cours</p>
            <button type="button" onClick={() => setSheetOpen((v) => !v)} className="flex items-center gap-1 text-xs font-bold text-bd-muted">
              Touchez une ligne pour corriger <ChevronDown size={14} className={cn('transition', (sheetOpen || isReview) && 'rotate-180')} aria-hidden />
            </button>
          </div>
          <div className="max-h-[calc(55dvh-70px)] space-y-2 overflow-y-auto pb-1">
            <button
              type="button"
              onClick={() => setCursor('firstName')}
              className="bd-focus flex w-full items-center gap-3 rounded-2xl bg-bd-bg px-3 py-2.5 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grad-violet-strong text-sm font-black text-white">
                {state.existing ? <UserCheck size={18} aria-hidden /> : who ? who.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold text-bd-ink">{who || 'Nouveau déposant'}</span>
                <span className="block truncate text-xs font-bold text-bd-muted tabular-nums">
                  {state.existing ? `Déposant existant N° ${state.existing.number} · ` : ''}
                  {state.deposant.phone ? state.deposant.phone.replace(/^(\d{2})(\d{3})(\d{3})$/, '+216 $1 $2 $3') : 'Téléphone à venir'}
                  {state.deposant.email ? ` · ${state.deposant.email}` : ''}
                </span>
              </span>
            </button>
            {liveItems.map((it, i) => {
              const sp = splitCommission(parseTndInput(it.price) ?? 0, it.commission);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCursor(`name:${i}`)}
                  className="bd-anim-fade-up bd-focus block w-full rounded-2xl bg-bd-bg px-3 py-2.5 text-left"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-extrabold text-bd-ink">
                      <span className="mr-1.5 text-bd-muted tabular-nums">{i + 1}.</span>
                      {it.name || '…'}
                    </span>
                    <Money millimes={sp.priceMillimes} className="shrink-0 text-sm font-black text-bd-ink" />
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] font-bold text-bd-muted">
                    <span className="truncate">{catName(it.categoryId) || 'Catégorie ?'} · {it.commission} %</span>
                    <span className="shrink-0 tabular-nums">
                      <span className="text-bd-pink-strong">{formatTnd(sp.shopMillimes, false)}</span> / <span className="text-bd-success">{formatTnd(sp.depositorMillimes, false)}</span>
                    </span>
                  </span>
                  <SplitBar shop={sp.shopMillimes} total={sp.priceMillimes} className="mt-1.5 h-1.5" />
                </button>
              );
            })}
            {liveItems.length ? (
              <div className="bd-anim-fade-up rounded-2xl bg-grad-brand px-4 py-3 text-white">
                <div className="flex items-center justify-between text-sm font-extrabold">
                  <span>{liveItems.length} article{liveItems.length > 1 ? 's' : ''}</span>
                  <span className="tabular-nums">{formatTnd(totals.price)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-bold text-white/85">
                  <span>Marge {formatTnd(totals.shop)}</span>
                  <span>Déposant {formatTnd(totals.dep)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
