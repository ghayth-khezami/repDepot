import { PrismaService } from "../prisma/prisma.service";
import { addMonths, productSplit } from "../depot/depot.service";
import { Prisma } from "@prisma/client";

/**
 * One product line for exports (Excel / PDF / CSV), with a colour that means something:
 *  - green  = finished: dépôt paid to the déposant, or achat sold
 *  - yellow = dépôt sold but the déposant is not paid yet
 *  - red    = still for sale while its contract ends within 14 days (or is over)
 *  - null   = on sale, nothing urgent
 */
export type Alert = "green" | "yellow" | "red" | null;

export interface ProductReportRow {
  ref: string;
  name: string;
  category: string;
  type: "Dépôt" | "Achat";
  stage: string;
  sold: "Oui" | "Non";
  paid: "Oui" | "Non" | "—";
  delivered: "Oui" | "Non" | "—";
  online: "Oui" | "Non";
  priceMillimes: number;
  purchaseMillimes: number | null;
  commission: number | null;
  shopMillimes: number | null;
  depositorMillimes: number | null;
  deposant: string;
  contract: string;
  contractEnd: Date | null;
  createdAt: Date;
  soldAt: Date | null;
  paidAt: Date | null;
  alert: Alert;
  alertLabel: string;
}

export const ALERT_LABEL: Record<Exclude<Alert, null>, string> = {
  green: "Terminé (payé / vendu)",
  yellow: "Vendu — déposant à payer",
  red: "Contrat bientôt fini — non vendu",
};

const SOON_MS = 14 * 86_400_000;

export async function loadProductReport(prisma: PrismaService, where: Prisma.ProductWhereInput = {}): Promise<ProductReportRow[]> {
  const rows = await prisma.product.findMany({
    where,
    orderBy: [{ isDepot: "desc" }, { ref: "asc" }],
    include: {
      category: { select: { categoryName: true } },
      coClient: { select: { firstName: true, lastName: true, number: true } },
      depositRequest: { select: { contractNumber: true, createdAt: true, durationMonths: true } },
      commandDetails: { select: { command: { select: { status: true } } } },
    },
  });
  const now = Date.now();
  return rows.map((p) => {
    const split = productSplit(p);
    const sold = p.status === "VENDU";
    const paid = p.isDepot ? (sold && p.payoutStatus === "PAYE" ? "Oui" : "Non") : "—";
    const orders = p.commandDetails.map((d) => d.command.status);
    const delivered = orders.length ? (orders.some((s) => s === "DELIVERED" || s === "GOT_PROFIT") ? "Oui" : "Non") : "—";
    const end = p.depositRequest ? addMonths(p.depositRequest.createdAt, p.depositRequest.durationMonths ?? 3) : null;
    const stage =
      p.status === "VENDU" ? (p.isDepot ? (p.payoutStatus === "PAYE" ? "Payé" : "Vendu — à payer") : "Vendu") : p.status === "RETIRE" ? "Retiré" : "En vente";

    let alert: Alert = null;
    if (sold && (!p.isDepot || p.payoutStatus === "PAYE")) alert = "green";
    else if (sold && p.isDepot) alert = "yellow";
    else if (p.status === "EN_VENTE" && end && end.getTime() - now <= SOON_MS) alert = "red";

    return {
      ref: p.ref,
      name: p.productName,
      category: p.category?.categoryName ?? "",
      type: p.isDepot ? "Dépôt" : "Achat",
      stage,
      sold: sold ? "Oui" : "Non",
      paid,
      delivered,
      online: p.isPublished ? "Oui" : "Non",
      priceMillimes: split.priceMillimes,
      purchaseMillimes: p.isDepot || p.PrixAchat == null ? null : Math.round(p.PrixAchat * 1000),
      commission: p.isDepot ? p.depotPercentage : null,
      shopMillimes: p.isDepot ? split.shopMillimes : null,
      depositorMillimes: p.isDepot ? split.depositorMillimes : null,
      deposant: p.coClient ? `N°${p.coClient.number} · ${p.coClient.firstName} ${p.coClient.lastName}` : "",
      contract: p.depositRequest?.contractNumber ?? "",
      contractEnd: end,
      createdAt: p.createdAt,
      soldAt: p.soldAt,
      paidAt: paid === "Oui" ? p.paidAt : null,
      alert,
      alertLabel: alert ? ALERT_LABEL[alert] : "",
    };
  });
}
