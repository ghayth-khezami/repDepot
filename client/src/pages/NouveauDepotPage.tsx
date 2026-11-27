import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Sparkles } from 'lucide-react';
import { useCreateCoClientMutation } from '../store/api/coClientApi';
import { useCreateDepotMutation, useGetDeposantOverviewQuery, useGetDepotQuery, type CreateDepotInput } from '../store/api/depotApi';
import { useToast } from '../context/ToastContext';
import { apiErrorCode, apiErrorMessage, apiErrorPayload } from '../lib/apiError';
import { fromMillimes, parseTndInput } from '../lib/money';
import { Button, Card, Skeleton, Stepper } from '../components/ui';
import { useDepotDraft, validateDeposant, type DepotDraft } from '../features/depot/draft';
import VoiceWizard, { type VoiceWizardResult } from '../features/depot/VoiceWizard';
import DeposantsList from '../features/depot/DeposantsList';
import DeposantStep from '../features/depot/DeposantStep';
import ArticlesStep from '../features/depot/ArticlesStep';
import ContractView from '../features/depot/ContractView';

const STEPS = [
  { label: 'Déposant', hint: 'Prénom, nom, téléphone' },
  { label: 'Articles', hint: 'Facultatif' },
  { label: 'Contrat', hint: 'PDF & QR de suivi' },
];

export default function NouveauDepotPage() {
  const { draft, dispatch, clear } = useDepotDraft();
  const { showToast } = useToast();
  const [createDepot] = useCreateDepotMutation();
  const [createCoClient] = useCreateCoClientMutation();
  const [submitting, setSubmitting] = useState<'items' | 'skip' | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: contract, isLoading: contractLoading } = useGetDepotQuery(draft.contractId ?? '', { skip: !draft.contractId });

  // Prefill from a web demande (?prenom=&nom=&tel=) — starts a fresh draft.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const prenom = params.get('prenom');
    const tel = params.get('tel');
    if (prenom === null && tel === null) return;
    clear();
    dispatch({ type: 'mode', mode: 'new' });
    dispatch({
      type: 'deposant',
      patch: { firstName: prenom ?? '', lastName: params.get('nom') ?? '', phone: (tel ?? '').replace(/\D/g, '').slice(-8) },
    });
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?deposant=<id> (from "Nouveau dépôt pour …" in the suivi sheet) → preselect, go to articles.
  const presetId = params.get('deposant');
  const { data: preset } = useGetDeposantOverviewQuery(presetId ?? '', { skip: !presetId });
  useEffect(() => {
    if (!preset) return;
    clear();
    dispatch({
      type: 'hydrate',
      patch: {
        mode: 'existing',
        step: 1,
        existing: {
          id: preset.id,
          number: preset.number,
          firstName: preset.firstName,
          lastName: preset.lastName,
          phone: preset.phone,
          productsCount: preset.totals.total,
          contractsCount: preset.contracts.length,
        },
      },
    });
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const created = !!draft.contractId;
  const deposantReady =
    (draft.mode === 'existing' && !!draft.existing) ||
    (draft.mode === 'new' && Object.keys(validateDeposant(draft.deposant)).length === 0);

  const goTo = (step: 0 | 1 | 2) => {
    dispatch({ type: 'step', step });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * "Passer sans dépôt": no contract. A new déposant is just saved; an existing one is left as is.
   * Then back to the déposants list.
   */
  const skipWithoutDepot = async () => {
    if (draft.mode === 'existing' && draft.existing) {
      showToast(`Aucun dépôt créé pour ${draft.existing.firstName}`, 'info');
      restart();
      return;
    }
    const d = draft.deposant;
    setSubmitting('skip');
    try {
      await createCoClient({
        firstName: d.firstName.trim(),
        lastName: d.lastName.trim(),
        phoneNumber: d.phone,
        email: d.email.trim() || undefined,
        address: d.address.trim() || undefined,
        RIB: d.rib.replace(/\s/g, '') || undefined,
        gender: d.gender,
        lat: d.lat,
        lng: d.lng,
      } as never).unwrap();
      showToast(`Déposant ${d.firstName.trim()} ${d.lastName.trim()} ajouté (sans contrat)`, 'success');
      restart();
    } catch (e) {
      showToast(apiErrorMessage(e, "Impossible d'enregistrer le déposant"), 'error', 6000);
    } finally {
      setSubmitting(null);
    }
  };

  const currentDraft = draft;
  const submit = async (withItems: boolean, src: DepotDraft = currentDraft): Promise<boolean> => {
    // Articles step "Passer sans dépôt" (not the voice wizard, which passes its own draft).
    if (!withItems && src === currentDraft) {
      await skipWithoutDepot();
      return false;
    }
    const draft = src;
    const d = draft.deposant;
    const payload: CreateDepotInput = {
      durationMonths: draft.durationMonths,
      depositDate: draft.depositDate || undefined,
      internalNote: draft.internalNote.trim() || undefined,
      items: withItems
        ? draft.items.map((it) => ({
            name: it.name.trim(),
            price: fromMillimes(parseTndInput(it.price) ?? 0),
            commissionPercent: it.commission,
            depositDate: it.depositDate || undefined,
            categoryId: it.categoryId,
            subCategoryId: it.subCategoryId || undefined,
            subSubCategory1Id: it.subSubCategory1Id || undefined,
            photos: it.photos.length ? it.photos : undefined,
          }))
        : [],
      ...(draft.mode === 'existing' && draft.existing
        ? { deposantId: draft.existing.id }
        : {
            deposant: {
              firstName: d.firstName.trim(),
              lastName: d.lastName.trim(),
              phone: d.phone,
              email: d.email.trim() || undefined,
              address: d.address.trim() || undefined,
              lat: d.lat,
              lng: d.lng,
              rib: d.rib.replace(/\s/g, '') || undefined,
              gender: d.gender,
            },
          }),
    };
    setSubmitting(withItems ? 'items' : 'skip');
    try {
      const res = await createDepot(payload).unwrap();
      dispatch({ type: 'created', contractId: res.id });
      showToast(`Contrat ${res.contractNumber} créé`, 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (e) {
      if (apiErrorCode(e) === 'PHONE_EXISTS') {
        const existing = apiErrorPayload<{ deposant?: { firstName: string; lastName: string } }>(e)?.deposant;
        showToast(
          existing ? `Ce numéro appartient déjà à ${existing.firstName} ${existing.lastName}.` : apiErrorMessage(e),
          'warning',
          6000,
        );
        goTo(0);
      } else {
        showToast(apiErrorMessage(e, 'Création du dépôt impossible.'), 'error', 6000);
      }
      return false;
    } finally {
      setSubmitting(null);
    }
  };

  const fromWizard = (r: VoiceWizardResult, step: 0 | 1): DepotDraft => {
    const next: DepotDraft = {
      ...draft,
      step,
      mode: r.existing ? 'existing' : 'new',
      existing: r.existing,
      deposant: r.deposant,
      items: r.items.length ? r.items : draft.items,
      lastCategoryId: r.items[r.items.length - 1]?.categoryId || draft.lastCategoryId,
    };
    dispatch({ type: 'hydrate', patch: next });
    return next;
  };

  const wizardReview = (r: VoiceWizardResult) => {
    const ready = r.existing || Object.keys(validateDeposant(r.deposant)).length === 0;
    fromWizard(r, ready ? 1 : 0);
    setWizardOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const wizardGenerate = async (r: VoiceWizardResult) => {
    const next = fromWizard(r, 1);
    if (await submit(r.items.length > 0, { ...next, items: r.items })) setWizardOpen(false);
  };

  const restart = () => {
    clear();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const wizard = (
    <VoiceWizard
      open={wizardOpen}
      onClose={() => setWizardOpen(false)}
      defaultCommission={draft.defaultCommission}
      lastCategoryId={draft.lastCategoryId}
      onReview={wizardReview}
      onGenerate={(r) => void wizardGenerate(r)}
      generating={submitting !== null}
    />
  );

  // First screen of "Dépôt": the déposants list (mockup). Picking one goes to the articles.
  if (!created && draft.step === 0 && draft.mode === 'existing') {
    return (
      <>
        <DeposantsList
          onPick={(d) => {
            dispatch({ type: 'existing', deposant: d });
            goTo(1);
          }}
          onNew={() => dispatch({ type: 'mode', mode: 'new' })}
          onDictate={() => setWizardOpen(true)}
        />
        {wizard}
      </>
    );
  }

  return (
    <div className="bd-ui w-full space-y-5">
      <header className="-mt-[66px] flex flex-wrap items-end justify-between gap-3 pl-[54px] pr-[104px] md:mt-0 md:px-0">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={restart}
            aria-label="Retour aux déposants"
            title="Retour aux déposants"
            className="bd-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bd-line/10 bg-bd-surface text-bd-ink shadow-card active:scale-95"
          >
            <ArrowLeft size={20} aria-hidden />
          </button>
          <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bd-pink-strong">Dépôt-vente</p>
          <h1 className="truncate text-2xl font-black text-bd-ink sm:text-3xl">{created ? `Contrat ${contract?.contractNumber ?? ""}` : "Nouveau dépôt"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!created && (draft.deposant.firstName || draft.items.some((i) => i.name || i.price)) ? (
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={restart}>
              Recommencer
            </Button>
          ) : null}
          {!created && draft.step < 2 ? (
            <Button variant="violet" size="sm" icon={Sparkles} onClick={() => setWizardOpen(true)}>
              Dicter
            </Button>
          ) : null}
        </div>
      </header>

      <Card className="px-4 py-3 sm:px-6">
        <Stepper
          steps={STEPS}
          current={draft.step}
          completed={(i) => (i === 0 ? deposantReady && draft.step > 0 : i === 1 ? created : created)}
          onStepClick={created ? undefined : (i) => goTo(i as 0 | 1 | 2)}
        />
      </Card>


      {wizard}

      {draft.step === 0 ? (
        <DeposantStep draft={draft} dispatch={dispatch} onNext={() => goTo(1)} onSkip={() => void skipWithoutDepot()} skipping={submitting === 'skip'} />
      ) : draft.step === 1 ? (
        <ArticlesStep draft={draft} dispatch={dispatch} onBack={() => goTo(0)} onSubmit={submit} submitting={submitting} />
      ) : contractLoading || !contract ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
          <Skeleton className="h-[70vh]" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <ContractView contract={contract} justCreated onFinish={restart} />
      )}
    </div>
  );
}
