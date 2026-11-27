import { lazy, Suspense, useEffect, useState } from 'react';
import { GenderPicker } from '../../components/PersonIllustration';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Info,
  SkipForward,
  Landmark,
  Mail,
  MapPin,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLazyCheckDeposantPhoneQuery, type DeposantSummary } from '../../store/api/depotApi';
import { Button, Card, InfoNote, PhoneField, SegmentedControl, Skeleton, TextField } from '../../components/ui';
import { validateDeposant, type DepotDraft, type DeposantErrors, type DraftDispatch } from './draft';
import DeposantsList from './DeposantsList';

const AddressMapSelector = lazy(() => import('../../components/AddressMapSelector'));

export default function DeposantStep({
  draft,
  dispatch,
  onNext,
  onSkip,
  skipping,
}: {
  draft: DepotDraft;
  dispatch: DraftDispatch;
  onNext: () => void;
  /** "Passer sans dépôt": save the déposant only, back to the list. */
  onSkip?: () => void;
  skipping?: boolean;
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
          <p className="text-sm text-bd-muted">
            {draft.mode === 'existing' ? 'Choisissez un déposant, ou créez-en un nouveau.' : 'Trois champs suffisent pour commencer.'}
          </p>
        </div>
        <SegmentedControl
          label="Type de déposant"
          value={draft.mode}
          onChange={(mode) => dispatch({ type: 'mode', mode })}
          options={[
            { value: 'existing', label: 'Déposants', icon: Users },
            { value: 'new', label: 'Nouveau', icon: UserPlus },
          ]}
          className="w-full sm:w-auto"
        />
      </div>

      {draft.mode === 'existing' ? (
        <DeposantsList onPick={pickExisting} onNew={() => dispatch({ type: 'mode', mode: 'new' })} onDictate={() => undefined} />
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
          <div>
            <p className="mb-2 text-sm font-extrabold text-bd-ink">Illustration</p>
            <GenderPicker value={d.gender} onChange={(gender) => dispatch({ type: 'deposant', patch: { gender } })} />
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

          <TextField
            label="Date de dépôt"
            type="date"
            icon={CalendarDays}
            value={draft.depositDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => dispatch({ type: 'hydrate', patch: { depositDate: e.target.value } })}
            hint="Le contrat et sa durée commencent à cette date. Vide = aujourd'hui."
            fieldClassName="sm:max-w-xs"
            dictation={false}
          />

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

          <div className="sticky bottom-24 z-10 -mx-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:static">
            {onSkip ? (
              <Button
                variant="secondary"
                size="lg"
                icon={SkipForward}
                loading={skipping}
                disabled={!!duplicate || skipping}
                className="w-full sm:w-auto"
                onClick={() => {
                  setSubmitted(true);
                  const e = validateDeposant(d);
                  setErrors(e);
                  if (Object.keys(e).length) return;
                  onSkip();
                }}
              >
                Passer sans dépôt
              </Button>
            ) : null}
            <Button type="submit" size="lg" iconRight={ArrowRight} disabled={!!duplicate} className="w-full sm:w-auto">
              Continuer vers les articles
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
