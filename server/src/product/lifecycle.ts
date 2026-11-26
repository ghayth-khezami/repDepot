import { BadRequestException } from "@nestjs/common";
import { PayoutStatus, ProductStatus } from "@prisma/client";

/** What the shop owner sees: one status per article. PAYE = VENDU + payoutStatus PAYE in the DB. */
export type ProductStage = "EN_VENTE" | "VENDU" | "PAYE" | "RETIRE";
export const STAGES: ProductStage[] = ["EN_VENTE", "VENDU", "PAYE", "RETIRE"];

const LABEL: Record<ProductStage, string> = { EN_VENTE: "En vente", VENDU: "Vendu", PAYE: "Payé", RETIRE: "Retiré" };

export function stageOf(p: { status: ProductStatus; payoutStatus: PayoutStatus | null }): ProductStage {
  if (p.status === ProductStatus.VENDU) return p.payoutStatus === PayoutStatus.PAYE ? "PAYE" : "VENDU";
  if (p.status === ProductStatus.RETIRE) return "RETIRE";
  return "EN_VENTE";
}

/**
 * Allowed: EN_VENTE → VENDU → PAYE, EN_VENTE ↔ RETIRE, and "reset" of any stage back to EN_VENTE
 * (the UI asks for confirmation). Anything else is a 400 with a readable message.
 */
export function assertTransition(from: ProductStage, to: ProductStage, isDepot: boolean) {
  if (from === to) return;
  if (to === "PAYE" && !isDepot) {
    throw new BadRequestException("Seuls les articles en dépôt peuvent être marqués « Payé » (pas les achats boutique).");
  }
  const ok =
    (from === "EN_VENTE" && to === "VENDU") ||
    (from === "VENDU" && to === "PAYE") ||
    (from === "EN_VENTE" && to === "RETIRE") ||
    to === "EN_VENTE";
  if (!ok) {
    throw new BadRequestException(
      `Changement impossible : « ${LABEL[from]} » → « ${LABEL[to]} ». Étapes possibles : En vente → Vendu → Payé (ou remise en vente).`,
    );
  }
}

/** DB fields for a stage. Keeps isDispo / soldAt / paidAt / payoutStatus / notification markers consistent. */
export function stageData(
  to: ProductStage,
  isDepot: boolean,
  existing: { soldAt: Date | null; paidAt: Date | null },
  now = new Date(),
) {
  switch (to) {
    case "VENDU":
      return {
        status: ProductStatus.VENDU,
        isDispo: false,
        soldAt: existing.soldAt ?? now,
        payoutStatus: isDepot ? PayoutStatus.A_PERCEVOIR : null,
        paidAt: null,
        paidNotifiedAt: null,
      };
    case "PAYE":
      return { status: ProductStatus.VENDU, isDispo: false, soldAt: existing.soldAt ?? now, payoutStatus: PayoutStatus.PAYE, paidAt: existing.paidAt ?? now };
    case "RETIRE":
      return { status: ProductStatus.RETIRE, isDispo: false, soldAt: null, payoutStatus: null, paidAt: null, soldNotifiedAt: null, paidNotifiedAt: null };
    default:
      return { status: ProductStatus.EN_VENTE, isDispo: true, soldAt: null, payoutStatus: null, paidAt: null, soldNotifiedAt: null, paidNotifiedAt: null };
  }
}
