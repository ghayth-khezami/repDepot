import { lazy, Suspense, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Info,
  Landmark,
  Mail,
  MapPin,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLazyCheckDeposantPhoneQuery, useSearchDeposantsQuery, type DeposantSummary } from '../../store/api/depotApi';
import { Button, Card, EmptyState, InfoNote, PhoneField, SegmentedControl, Skeleton, TextField } from '../../components/ui';
import { cn } from '../../lib/cn';
import { validateDeposant, type DepotDraft, type DeposantErrors, type DraftDispatch } from './draft';

const AddressMapSelector = lazy(() => import('../../components/AddressMapSelector'));

function formatPhone(p: string) {
  return p.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3');
}

function ExistingDeposantPicker({ selectedId, onPick }: { selectedId?: string; onPick: (d: DeposantSummary) => void }) {
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q.trim(), 250);
  const { data, isFetching } = useSearchDeposantsQuery(debounced);

  return (
    <div className="space-y-4">
      <TextField
        label="Rechercher un déposant"
        icon={Search}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nom, prénom ou téléphone…"
        autoFocus
        hint="Les déposants récents s'affichent par défaut."
      />
      <div aria-live="polite" aria-busy={isFetching}>
        {isFetching && !data ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : data?.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onPick(d)}
                  className={cn(
                    'bd-focus flex min-h-[64px] w-full items-center gap-3 rounded-2xl border bg-bd-surface p-3 text-left transition hover:border-bd-pink/40 hover:shadow-card',
                    selectedId === d.id ? 'border-bd-pink ring-4 ring-bd-pink/15' : 'border-bd-line/10',
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grad-violet-strong text-sm font-black text-white">
                    {d.firstName[0]}
                    {d.lastName[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold text-bd-ink">
                      {d.firstName} {d.lastName}
                    </span>
                    <span className="block text-xs font-bold text-bd-muted tabular-nums">
                      N° {d.number} · {formatPhone(d.phone)} · {d.productsCount} article{d.productsCount > 1 ? 's' : ''}
                    </span>
                  </span>
                  <ArrowRight size={18} className="text-bd-violet" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Users} title="Aucun déposant trouvé">
            Vérifiez l'orthographe ou créez un nouveau déposant.
          </EmptyState>
        )}
      </div>
    </div>
  );
}

export default function DeposantStep({
  draft,
  dispatch,
  onNext,
}: {
  draft: DepotDraft;
  dispatch: DraftDispatch;
  onNext: () => void;
}) {
  const d = draft.deposant;
  const [errors, setErrors] = useState<DeposantErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [checkPhone, phoneCheck] = useLazyCheckDeposantPhoneQuery();

  useEffect(() => {
    if (/^\d{8}$/.test(d.phone)) void checkPhone(d.phone, true);
  }, [d.phone, checkPhone]);

  useEffect(() => {
    if (submitted) setErrors(validateDeposant(d));
  }, [d, submitted]);

  const duplicate = /^\d{8}$/.test(d.phone) && phoneCheck.data?.exists && phoneCheck.originalArgs === d.phone ? phoneCheck.data.deposant : null;

  const pickExisting = (dep: DeposantSummary) => {
    dispatch({ type: 'existing', deposant: dep });
    dispatch({ type: 'mode', mode: 'existing' });
    onNext();
  };

  const submit = () => {
    setSubmitted(true);
    const e = validateDeposant(d);
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    if (duplicate) return;
    dispatch({ type: 'existing', deposant: null });
    onNext();
  };

  return (
    <Card className="p-5 sm:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-bd-ink">Qui dépose ?</h2>
          <p className="text-sm text-bd-muted">Trois champs suffisent pour commencer.</p>
        </div>
        <SegmentedControl
          label="Type de déposant"
          value={draft.mode}
          onChange={(mode) => dispatch({ type: 'mode', mode })}
          options={[
            { value: 'new', label: 'Nouveau déposant', icon: UserPlus },
            { value: 'existing', label: 'Déposant existant', icon: UserCheck },
          ]}
          className="w-full sm:w-auto"
        />
      </div>

      {draft.mode === 'existing' ? (
        <ExistingDeposantPicker selectedId={draft.existing?.id} onPick={pickExisting} />
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Prénom"
              required
              autoComplete="given-name"
              value={d.firstName}
              onChange={(e) => dispatch({ type: 'deposant', patch: { firstName: e.target.value } })}
              error={errors.firstName}
              autoFocus
            />
            <TextField
              label="Nom"
              required
              autoComplete="family-name"
              value={d.lastName}
              onChange={(e) => dispatch({ type: 'deposant', patch: { lastName: e.target.value } })}
              error={errors.lastName}
            />
          </div>
          <PhoneField
            label="Téléphone"
            required
            value={d.phone}
            onChange={(phone) => dispatch({ type: 'deposant', patch: { phone } })}
            error={errors.phone}
            fieldClassName="sm:max-w-sm"
          />

          {duplicate ? (
            <InfoNote icon={AlertTriangle} tone="amber">
              <p>
                Ce numéro appartient déjà à <strong>{duplicate.firstName} {duplicate.lastName}</strong> (déposant n° {duplicate.number}).
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                icon={UserCheck}
                onClick={() =>
                  pickExisting({ ...duplicate, phone: d.phone, productsCount: 0, contractsCount: 0 })
                }
              >
                Utiliser ce déposant
              </Button>
            </InfoNote>
          ) : null}

          <div className="flex items-center gap-3 pt-1" role="separator" aria-label="Champs optionnels">
            <span className="h-px flex-1 bg-bd-line/15" />
            <span className="rounded-full bg-bd-lilac/70 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-bd-ink">Optionnel</span>
            <span className="h-px flex-1 bg-bd-line/15" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Email"
              type="email"
              icon={Mail}
              autoComplete="email"
              value={d.email}
              onChange={(e) => dispatch({ type: 'deposant', patch: { email: e.target.value } })}
              error={errors.email}
            />
            <TextField
              label="RIB"
              icon={Landmark}
              inputMode="numeric"
              autoComplete="off"
              placeholder="20 chiffres"
              value={d.rib}
              onChange={(e) => dispatch({ type: 'deposant', patch: { rib: e.target.value.replace(/[^\d\s]/g, '').slice(0, 26) } })}
              error={errors.rib}
              hint={d.rib ? `${d.rib.replace(/\s/g, '').length}/20 chiffres` : undefined}
              className="tabular-nums"
            />
          </div>
          <div>
            <TextField
              label="Adresse"
              icon={MapPin}
              autoComplete="street-address"
              value={d.address}
              onChange={(e) => dispatch({ type: 'deposant', patch: { address: e.target.value, lat: undefined, lng: undefined } })}
            />
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="bd-focus mt-2 inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2 text-sm font-extrabold text-bd-violet-strong hover:underline"
              aria-expanded={showMap}
            >
              <MapPin size={16} aria-hidden /> {showMap ? 'Masquer la carte' : 'Choisir sur la carte'}
            </button>
            {showMap ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-bd-line/10 bg-bd-surface p-3">
                <Suspense fallback={<Skeleton className="h-72" />}>
                  <AddressMapSelector
                    value={d.address}
                    onChange={(address, lat, lng) => dispatch({ type: 'deposant', patch: { address, lat, lng } })}
                    onPositionConfirm={(lat, lng) => {
                      dispatch({ type: 'deposant', patch: { lat, lng } });
                      setShowMap(false);
                    }}
                  />
                </Suspense>
              </div>
            ) : null}
          </div>

          <InfoNote icon={Info}>Pas de mot de passe : le déposant suit ses articles en scannant le QR de son contrat.</InfoNote>

          <div className="sticky bottom-24 z-10 -mx-1 flex justify-end md:static">
            <Button type="submit" size="lg" iconRight={ArrowRight} disabled={!!duplicate} className="w-full sm:w-auto">
              Continuer vers les articles
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
