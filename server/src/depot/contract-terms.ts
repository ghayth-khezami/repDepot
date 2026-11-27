/**
 * Contract terms are a template shared by the PDF and the backoffice preview.
 * Placeholders: {commission} (e.g. "15 %"), {duree} (months), {dureeReduction} (months before the -50 %).
 * Older texts saved in Paramètres with hard-coded numbers ("commission de 25 %", "dépassé 3 mois") are
 * rewritten too, so the contract always reflects the commission and duration actually chosen.
 */
export const DEFAULT_CONTRACT_TERMS = [
  "Une commission de {commission} du prix de vente réalisé sera reversée au dépositaire par le déposant.",
  "Les articles ayant dépassé {duree} mois de dépôt seront retournés au déposant et ne seront plus maintenus en dépôt.",
  "Les articles d'une valeur supérieure à 50 TND verront leur prix réduit de 50 % après {dureeReduction} mois de dépôt, et seront retournés au déposant à l'issue de {duree} mois.",
].join("\n");

export function commissionLabel(percents: number[]): string {
  const values = [...new Set(percents.filter((p) => Number.isFinite(p) && p > 0))].sort((a, b) => a - b);
  if (!values.length) return "25 %";
  if (values.length === 1) return `${values[0]} %`;
  return `${values[0]} à ${values[values.length - 1]} % (selon l'article, voir la fiche de dépôt)`;
}

export function resolveContractTerms(raw: string | null | undefined, opts: { commissions: number[]; durationMonths: number }): string {
  const duree = Math.max(1, Math.round(opts.durationMonths || 3));
  const reduction = Math.max(1, duree - 1);
  const commission = commissionLabel(opts.commissions);
  const text = raw?.trim() || DEFAULT_CONTRACT_TERMS;
  return text
    .replace(/\{commission\}/g, commission)
    .replace(/\{dureeReduction\}/g, String(reduction))
    .replace(/\{duree\}/g, String(duree))
    .replace(/commission de \d+(?:[.,]\d+)?\s*%/gi, `commission de ${commission}`)
    .replace(/(dépassé|depasse|dépasse)\s+\d+\s+mois/gi, (_m, verb: string) => `${verb} ${duree} mois`)
    .replace(/après \d+ mois de dépôt/gi, `après ${reduction} mois de dépôt`)
    .replace(/à l'issue de \d+ mois/gi, `à l'issue de ${duree} mois`);
}
