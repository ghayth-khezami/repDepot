import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  MessageCircle,
  Plus,
  Printer,
  Tags,
} from 'lucide-react';
import type { DepotContract } from '../../store/api/depotApi';
import { DEFAULT_CONTRACT_TERMS, useGetSiteSettingsAdminQuery } from '../../store/api/siteSettingsApi';
import { ApiFileError, downloadAuthed, fetchAuthedBlob, printAuthedPdf } from '../../lib/download';
import { useToast } from '../../context/ToastContext';
import { Button, Card, InfoNote, Money, StatusChip, buttonClass, GradientIconTile } from '../../components/ui';
import { cn } from '../../lib/cn';
import stampUrl from '../../assets/stamp.png';
import LabelPrintSheet from '../products/LabelPrintSheet';

const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtPhone = (p: string) => p.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1 $2 $3');

function useAuthedObjectUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    let objectUrl: string | null = null;
    fetchAuthedBlob(path)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (alive) setUrl(objectUrl);
      })
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  return url;
}

/** WhatsApp to the déposant: greeting + tracking link only (the contract PDF is attached on phones). */
export function whatsappMessage(c: DepotContract) {
  const civ = c.deposant.gender === 'F' ? 'Madame' : c.deposant.gender === 'M' ? 'Monsieur' : 'Madame, Monsieur';
  return `Salut ${civ} ${c.deposant.lastName} 👋\nVous pouvez suivre vos articles ici : ${c.trackingUrl}`;
}

export function whatsappLink(c: DepotContract) {
  return `https://wa.me/216${c.deposant.phone}?text=${encodeURIComponent(whatsappMessage(c))}`;
}

/** A4-like contract preview — mirrors the server PDF layout (same data, same order). */
function ContractPaper({ c, qrUrl, terms }: { c: DepotContract; qrUrl: string | null; terms: string }) {
  const optional = [
    ['Adresse', c.deposant.address],
    ['Email', c.deposant.email],
    ['RIB', c.deposant.rib],
  ].filter(([, v]) => !!v) as Array<[string, string]>;
  const shortLink = c.trackingUrl.replace(/^https?:\/\//, '');

  return (
    <article
      aria-label={`Aperçu du contrat ${c.contractNumber}`}
      className="bd-paper mx-auto w-full max-w-[820px] rounded-2xl bg-white p-5 text-[13px] text-[#1E1B4B] shadow-[0_20px_60px_rgba(76,29,149,0.14)] ring-1 ring-black/5 sm:p-10 lg:min-h-[1100px]"
    >
      <header className="border-b-2 border-[#1E1B4B] pb-3 text-center">
        <p className="text-lg font-black tracking-wide sm:text-xl">BÉBÉ-DÉPÔT — BY MME KHEZAMI</p>
        <p className="text-xs text-[#5A5878]">Route Campus universitaire Manouba | Tél: 55 863 578</p>
      </header>
      <div className="mt-4 text-center">
        <h3 className="text-base font-black">CONTRAT DE DÉPÔT-VENTE</h3>
        <p className="text-xs font-bold text-[#5A5878] tabular-nums">N° {c.contractNumber} · {frDate(c.createdAt)}</p>
      </div>

      <section className="mt-5 flex flex-col-reverse gap-5 sm:flex-row sm:items-start sm:justify-between">
        <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="font-black">Le dépositaire :</dt>
          <dd>Bébé-Dépôt — By Mme Khezami</dd>
          <dt className="col-span-2 mt-1 font-black">Le déposant :</dt>
          <dt className="font-bold">Nom / Prénom :</dt>
          <dd>{c.deposant.lastName} {c.deposant.firstName}</dd>
          <dt className="font-bold">Tél :</dt>
          <dd className="tabular-nums">+216 {fmtPhone(c.deposant.phone)}</dd>
          {optional.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-bold">{k} :</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
          <dt className="font-bold">Durée :</dt>
          <dd>{c.durationMonths} mois — jusqu'au {frDate(c.expiresAt)}</dd>
        </dl>
        <figure className="mx-auto flex w-[150px] shrink-0 flex-col items-center text-center sm:mx-0">
          {qrUrl ? (
            <img src={qrUrl} alt={`QR code de suivi : ${shortLink}`} className="h-[132px] w-[132px]" />
          ) : (
            <div className="h-[132px] w-[132px] animate-pulse rounded-lg bg-[#E9DDFB]" />
          )}
          <figcaption className="mt-1">
            <span className="block text-[11px] font-black">Scannez pour suivre vos articles</span>
            <span className="block break-all text-[10px] text-[#5A5878]">{shortLink}</span>
          </figcaption>
        </figure>
      </section>

      <h4 className="mt-6 border-t-2 border-[#1E1B4B] pt-4 text-center text-sm font-black">FICHE DE DÉPÔT</h4>
      {/* Table on ≥ sm, stacked rows on phones */}
      <table className="mt-3 hidden w-full border-collapse text-[12px] sm:table">
        <thead>
          <tr className="[&>th]:border [&>th]:border-[#3C3C3C] [&>th]:px-2 [&>th]:py-2 [&>th]:font-black">
            <th className="w-20">Réf.</th>
            <th className="text-left">Article</th>
            <th className="w-24">Déposé le</th>
            <th className="text-right">Prix</th>
            <th className="text-right">Com. %</th>
            <th className="text-right">Part déposant</th>
          </tr>
        </thead>
        <tbody className="tabular-nums [&_td]:border [&_td]:border-[#3C3C3C] [&_td]:px-2 [&_td]:py-1.5">
          {c.items.map((it) => (
            <tr key={it.id}>
              <td className="text-center font-bold">{it.ref}</td>
              <td>{it.name}</td>
              <td className="text-center">{frDate(it.depositedAt ?? c.createdAt)}</td>
              <td className="text-right"><Money millimes={it.priceMillimes} unit={false} /></td>
              <td className="text-right">{it.commissionPercent}%</td>
              <td className="text-right"><Money millimes={it.depositorMillimes} unit={false} /></td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 6 - c.items.length) }, (_, i) => (
            <tr key={`blank-${i}`} aria-hidden>
              <td>&nbsp;</td><td /><td /><td /><td /><td />
            </tr>
          ))}
          <tr className="font-black">
            <td />
            <td>Total — {c.items.length} article{c.items.length > 1 ? 's' : ''}</td>
            <td />
            <td className="text-right"><Money millimes={c.totals.priceMillimes} unit={false} /></td>
            <td className="text-right"><Money millimes={c.totals.shopMillimes} unit={false} /></td>
            <td className="text-right"><Money millimes={c.totals.depositorMillimes} unit={false} /></td>
          </tr>
        </tbody>
      </table>
      <ul className="mt-3 divide-y divide-black/10 rounded-xl border border-black/15 sm:hidden">
        {c.items.length ? (
          c.items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[#5A5878]">{it.ref}</p>
                <p className="font-bold">{it.name}</p>
                <p className="text-[11px] text-[#5A5878] tabular-nums"><Money millimes={it.priceMillimes} /> · {it.commissionPercent}% · déposé le {frDate(it.depositedAt ?? c.createdAt)}</p>
              </div>
              <Money millimes={it.depositorMillimes} className="font-black" />
            </li>
          ))
        ) : (
          <li className="p-3 text-center text-[#5A5878]">Aucun article pour l'instant</li>
        )}
        <li className="flex justify-between p-3 font-black">
          <span>Total part déposant</span>
          <Money millimes={c.totals.depositorMillimes} />
        </li>
      </ul>

      <section className="mt-5">
        <p className="text-[12px] font-black">Termes du dépôt :</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11.5px] leading-snug">
          {terms.split(/\r?\n/).map((t) => t.trim()).filter(Boolean).map((t) => (
            <li key={t}>{t.replace(/^[•\-]\s*/, '')}</li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-[12px]">Fait à Manouba, le {frDate(c.createdAt)}</p>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:gap-10">
        {[
          ['Le dépositaire', '(Signature + cachet)'],
          ['Le déposant', '(Signature précédée de « lu et approuvé »)'],
        ].map(([t, s], i) => (
          <div key={t}>
            <p className="text-[12px] font-black">{t}</p>
            <p className="text-[10px] text-[#5A5878]">{s}</p>
            <div className="mt-1.5 flex h-20 items-center justify-center rounded-sm border border-[#3C3C3C]">
              {i === 0 ? <img src={stampUrl} alt="Cachet et signature Bébé Dépôt" className="max-h-[72px] w-auto max-w-[90%] object-contain" /> : null}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function ContractView({ contract: c, justCreated, onFinish }: { contract: DepotContract; justCreated?: boolean; onFinish?: () => void }) {
  const { showToast } = useToast();
  const qrUrl = useAuthedObjectUrl(`/depots/${c.id}/qr.svg`);
  const { data: settings } = useGetSiteSettingsAdminQuery();
  const [busy, setBusy] = useState<'print' | 'pdf' | 'labels' | 'share' | null>(null);
  const [labels, setLabels] = useState(false);
  const [refProblems, setRefProblems] = useState<Array<{ id: string; productName: string }> | null>(null);
  const terms = c.terms || settings?.contractTerms?.trim() || DEFAULT_CONTRACT_TERMS;

  const run = async (key: 'print' | 'pdf' | 'labels', fn: () => Promise<void>) => {
    setBusy(key);
    setRefProblems(null);
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiFileError && e.status === 409) {
        const products = (e.body as any)?.message?.products ?? (e.body as any)?.products;
        setRefProblems(Array.isArray(products) ? products : []);
      } else {
        showToast((e as Error).message || 'Action impossible', 'error');
      }
    } finally {
      setBusy(null);
    }
  };

  /** Phone: native share sheet → WhatsApp with the PDF attached + message. Elsewhere: wa.me with the message. */
  const sendWhatsapp = async () => {
    const text = whatsappMessage(c);
    setBusy('share');
    try {
      const blob = await fetchAuthedBlob(`/depots/${c.id}/contract.pdf`);
      const file = new File([blob], `contrat-${c.contractNumber}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // share sheet closed
    } finally {
      setBusy(null);
    }
    window.open(whatsappLink(c), '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(c.trackingUrl);
      showToast('Lien de suivi copié', 'success');
    } catch {
      showToast(c.trackingUrl, 'info', 8000);
    }
  };

  return (
    <div className="space-y-4">
      {justCreated ? (
        <Card className="flex items-center gap-4 border-bd-success/20 bg-bd-success-bg/60 p-4 sm:p-5" role="status">
          <GradientIconTile icon={CheckCircle2} tone="green" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-bd-ink">Contrat {c.contractNumber} créé</p>
            <p className="text-sm font-bold text-bd-success">
              {c.items.length ? `${c.items.length} article${c.items.length > 1 ? 's' : ''} mis en vente` : 'Sans article pour le moment'} · visibles dans Produits
            </p>
          </div>
          {onFinish ? (
            <Button variant="primary" icon={CheckCircle2} className="hidden shrink-0 sm:inline-flex" onClick={onFinish}>
              Terminer
            </Button>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className="order-2 overflow-x-hidden rounded-3xl bg-bd-lilac/40 p-2 sm:p-6 xl:order-1">
          <ContractPaper c={c} qrUrl={qrUrl} terms={terms} />
        </div>

        <aside className="order-1 space-y-3 xl:sticky xl:top-6 xl:order-2" aria-label="Actions du contrat">
          {refProblems ? (
            <InfoNote icon={AlertTriangle} tone="danger">
              <p>Aucun contrat généré : références manquantes ou en double pour :</p>
              <ul className="mt-1 list-disc pl-5">
                {refProblems.length ? refProblems.map((p) => <li key={p.id}>{p.productName}</li>) : <li>articles inconnus</li>}
              </ul>
              <Link to={`/products?contrat=${c.id}`} className="mt-1 inline-block underline">Corriger dans Produits</Link>
            </InfoNote>
          ) : null}
          <Card className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 xl:grid-cols-1">
            <Button variant="primary" icon={Printer} loading={busy === 'print'} disabled={!!busy} onClick={() => run('print', () => printAuthedPdf(`/depots/${c.id}/contract.pdf?inline=1`))}>
              Imprimer
            </Button>
            <Button variant="violet" icon={Download} loading={busy === 'pdf'} disabled={!!busy} onClick={() => run('pdf', () => downloadAuthed(`/depots/${c.id}/contract.pdf`, `contrat-${c.contractNumber}.pdf`))}>
              Télécharger PDF
            </Button>
            <Button variant="success" icon={MessageCircle} loading={busy === 'share'} disabled={!!busy} onClick={() => void sendWhatsapp()}>
              WhatsApp
            </Button>
            <Button
              variant="secondary"
              icon={Tags}
              loading={busy === 'labels'}
              disabled={!!busy || !c.items.length}
              title={c.items.length ? undefined : 'Aucun article sur ce contrat'}
              onClick={() => setLabels(true)}
            >
              Étiquettes QR
            </Button>
            <LabelPrintSheet
              open={labels}
              onClose={() => setLabels(false)}
              path={`/depots/${c.id}/labels.pdf`}
              filename={`etiquettes-${c.contractNumber}`}
              subtitle={`${c.items.length} article${c.items.length > 1 ? 's' : ''} · contrat ${c.contractNumber}`}
            />
          </Card>

          <Card className="space-y-2 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-bd-muted">Lien de suivi</p>
            <button type="button" onClick={copyLink} className="bd-focus flex min-h-[44px] w-full items-center gap-2 rounded-2xl bg-bd-bg px-3 text-left text-sm font-bold text-bd-ink">
              <span className="min-w-0 flex-1 truncate">{c.trackingUrl.replace(/^https?:\/\//, '')}</span>
              <Copy size={16} className="shrink-0 text-bd-violet" aria-hidden />
              <span className="sr-only">Copier</span>
            </button>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to={`/depots/${c.id}/articles`} className={buttonClass('secondary', 'sm')}>
                <Plus size={16} aria-hidden /> Ajouter des articles
              </Link>
            </div>
          </Card>

          {c.items.length ? (
            <Card className="p-4">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-bd-muted">Statut des articles</p>
              <ul className="space-y-1.5">
                {c.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-bold text-bd-ink"><span className="text-bd-muted">{it.ref}</span> · {it.name}</span>
                    <StatusChip status={it.status} payout={it.payoutStatus} />
                  </li>
                ))}
              </ul>
              <Link to={`/products?contrat=${c.id}`} className={cn(buttonClass('ghost', 'sm'), 'mt-2 w-full')}>
                Gérer dans Produits
              </Link>
            </Card>
          ) : null}

          {onFinish ? (
            <Button variant="primary" size="lg" icon={CheckCircle2} className="w-full" onClick={onFinish}>
              Terminer · retour aux déposants
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
