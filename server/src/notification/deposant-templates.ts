/**
 * Messages sent to déposants. Variables: {prenom}, {produit}, {ref}, {prix}, {KHEZAMI_PHONE}.
 * The shop phone comes from the KHEZAMI_PHONE env var.
 */
export type DeposantEvent = "VENDU" | "PAYE";

/**
 * VENDU = the article is sold → the déposant CHOOSES the day he comes for the money (« Demande de
 *         paiement » in his tracking app, at least 2 days ahead) — he must not come straight away.
 * PAYE  = the money has been handed over → confirmation only, nothing left to do.
 */
export const DEPOSANT_TEMPLATES: Record<DeposantEvent, { title: string; subject: string; body: string }> = {
  VENDU: {
    title: "🎉 Article vendu ! Choisissez votre jour de paiement",
    subject: "🎉 « {produit} » est vendu — choisissez le jour pour récupérer votre paiement",
    body:
      "Bonjour {prenom} 👋 Bonne nouvelle 🎉 Votre article « {produit} » (réf. {ref}) vient d'être vendu ! " +
      "💰 Votre part : {prix} TND. " +
      "📅 Ouvrez votre espace de suivi et touchez « Demande de paiement » pour choisir le jour où vous passerez la récupérer. " +
      "Une question ? Madame Khezami : {KHEZAMI_PHONE}. Merci de votre confiance 💜",
  },
  PAYE: {
    title: "✅ Paiement reçu",
    subject: "✅ Paiement de « {produit} » effectué",
    body:
      "Bonjour {prenom} 👋 Le paiement de votre article « {produit} » (réf. {ref}) vous a bien été remis ✅ " +
      "({prix} TND). Merci pour votre confiance et à très bientôt 💜 Une question ? Madame Khezami : {KHEZAMI_PHONE}.",
  },
};

export interface TemplateVars {
  prenom: string;
  produit: string;
  ref: string;
  prix: string;
}

export function renderTemplate(text: string, vars: TemplateVars, phone = process.env.KHEZAMI_PHONE?.trim() || "") {
  const all: Record<string, string> = { ...vars, KHEZAMI_PHONE: phone || "la boutique" };
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in all ? all[k] : m));
}

export function renderDeposantMessage(event: DeposantEvent, vars: TemplateVars, phone?: string) {
  const t = DEPOSANT_TEMPLATES[event];
  return { title: renderTemplate(t.title, vars, phone), subject: renderTemplate(t.subject, vars, phone), body: renderTemplate(t.body, vars, phone) };
}
