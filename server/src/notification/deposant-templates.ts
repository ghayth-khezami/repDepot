/**
 * Messages sent to déposants. Variables: {prenom}, {produit}, {ref}, {prix}, {KHEZAMI_PHONE}.
 * The shop phone comes from the KHEZAMI_PHONE env var.
 */
export type DeposantEvent = "VENDU" | "PAYE";

export const DEPOSANT_TEMPLATES: Record<DeposantEvent, { title: string; subject: string; body: string }> = {
  VENDU: {
    title: "🎉 Votre article est vendu !",
    subject: "🎉 Votre article {produit} est vendu — BebeDepot",
    body:
      "Bonjour {prenom} 👋 Bonne nouvelle 🎉 Votre article « {produit} » (réf. {ref}) vient d'être vendu à {prix} TND ! " +
      "📞 Appelez Madame Khezami au {KHEZAMI_PHONE} pour organiser votre paiement 💰 Merci de votre confiance 💜 BebeDepot",
  },
  PAYE: {
    title: "💰 Votre paiement est prêt",
    subject: "💰 Paiement prêt pour {produit} — BebeDepot",
    body:
      "Bonjour {prenom} 👋 Le paiement de votre article « {produit} » (réf. {ref}) est prêt ✅💰 " +
      "📞 Contactez Madame Khezami au {KHEZAMI_PHONE} pour le récupérer. À très bientôt 💜 BebeDepot",
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
