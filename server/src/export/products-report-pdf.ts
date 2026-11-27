import * as jsPDF from "jspdf";
import { formatTnd } from "../common/utils/money";
import { ALERT_LABEL, type Alert, type ProductReportRow } from "./product-report";

type RGB = [number, number, number];
const INK: RGB = [30, 27, 75];
const MUTED: RGB = [100, 98, 130];
const VIOLET: RGB = [109, 40, 217];
const PINK: RGB = [219, 39, 119];
const LINE: RGB = [226, 220, 245];
/** Row backgrounds (light) + strong colour for the legend / left bar. */
export const ALERT_FILL: Record<Exclude<Alert, null>, { bg: RGB; bar: RGB }> = {
  green: { bg: [220, 252, 231], bar: [22, 163, 74] },
  yellow: { bg: [254, 249, 195], bar: [202, 138, 4] },
  red: { bg: [254, 226, 226], bar: [220, 38, 38] },
};

const W = 297;
const H = 210;
const M = 10;
const CW = W - M * 2;
const d = (x: Date | null) => (x ? x.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Africa/Tunis" }) : "—");
const amount = (m: number | null) => (m == null ? "—" : formatTnd(m).replace(" TND", ""));

/** "Liste des produits" PDF: summary tiles, colour legend, table with meaningful row colours. */
export function buildProductsReportPdf(rows: ProductReportRow[], opts: { shopName: string; title?: string }): Buffer {
  const doc = new jsPDF.jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const font = (size: number, bold = false, color: RGB = INK) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  // Header band
  doc.setFillColor(...VIOLET);
  doc.rect(0, 0, W, 22, "F");
  doc.setFillColor(...PINK);
  doc.setGState(new (doc as any).GState({ opacity: 0.55 }));
  doc.triangle(W * 0.6, 0, W, 0, W, 22, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  font(16, true, [255, 255, 255]);
  doc.text(opts.title ?? "Liste des produits", M, 11);
  font(8.5, false, [255, 255, 255]);
  doc.text(`${opts.shopName} — By Mme Khezami`, M, 17);
  doc.text(`Édité le ${new Date().toLocaleDateString("fr-FR", { timeZone: "Africa/Tunis" })} · ${rows.length} produit(s)`, W - M, 11, { align: "right" });

  // Summary tiles
  let y = 28;
  const count = (f: (r: ProductReportRow) => boolean) => rows.filter(f).length;
  const tiles: Array<{ label: string; value: string; sub: string; color: RGB }> = [
    { label: "En vente", value: String(count((r) => r.stage === "En vente")), sub: formatTnd(rows.filter((r) => r.stage === "En vente").reduce((t, r) => t + r.priceMillimes, 0)), color: PINK },
    { label: "Vendus — à payer", value: String(count((r) => r.alert === "yellow")), sub: `${formatTnd(rows.filter((r) => r.alert === "yellow").reduce((t, r) => t + (r.depositorMillimes ?? 0), 0))} aux déposants`, color: ALERT_FILL.yellow.bar },
    { label: "Terminés", value: String(count((r) => r.alert === "green")), sub: "payés / vendus", color: ALERT_FILL.green.bar },
    { label: "À surveiller", value: String(count((r) => r.alert === "red")), sub: "contrat bientôt fini, non vendu", color: ALERT_FILL.red.bar },
  ];
  const tw = (CW - 3 * 4) / 4;
  tiles.forEach((t, i) => {
    const x = M + i * (tw + 4);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, tw, 18, 2.5, 2.5, "FD");
    doc.setFillColor(...t.color);
    doc.roundedRect(x, y, 2, 18, 1, 1, "F");
    font(7.5, true, MUTED);
    doc.text(t.label.toUpperCase(), x + 5, y + 5.5);
    font(14, true, t.color);
    doc.text(t.value, x + 5, y + 12.5);
    font(7, false, MUTED);
    doc.text(t.sub, x + 5, y + 16.5);
  });
  y += 23;

  // Legend
  font(7.5, true, MUTED);
  doc.text("Couleurs :", M, y + 2.8);
  let lx = M + 16;
  (Object.keys(ALERT_LABEL) as Array<Exclude<Alert, null>>).forEach((k) => {
    doc.setFillColor(...ALERT_FILL[k].bg);
    doc.setDrawColor(...ALERT_FILL[k].bar);
    doc.roundedRect(lx, y, 5, 4, 1, 1, "FD");
    font(7.5, false, INK);
    doc.text(ALERT_LABEL[k], lx + 6.5, y + 3);
    lx += doc.getTextWidth(ALERT_LABEL[k]) + 14;
  });
  y += 8;

  // Table
  const cols: Array<{ title: string; w: number; align?: "left" | "right" | "center"; get: (r: ProductReportRow) => string }> = [
    { title: "Réf.", w: 17, get: (r) => r.ref },
    { title: "Produit", w: 44, get: (r) => r.name },
    { title: "Catégorie", w: 24, get: (r) => r.category || "—" },
    { title: "Type", w: 12, get: (r) => r.type },
    { title: "Déposant / contrat", w: 34, get: (r) => (r.deposant ? `${r.deposant}${r.contract ? ` · ${r.contract}` : ""}` : "Stock boutique") },
    { title: "Prix", w: 16, align: "right", get: (r) => amount(r.priceMillimes) },
    { title: "Com.", w: 10, align: "right", get: (r) => (r.commission != null ? `${r.commission}%` : "—") },
    { title: "Part dép.", w: 16, align: "right", get: (r) => amount(r.depositorMillimes) },
    { title: "Statut", w: 22, get: (r) => r.stage },
    { title: "Vendu", w: 11, align: "center", get: (r) => r.sold },
    { title: "Payé", w: 10, align: "center", get: (r) => r.paid },
    { title: "Livré", w: 10, align: "center", get: (r) => r.delivered },
    { title: "En ligne", w: 13, align: "center", get: (r) => r.online },
    { title: "Fin contrat", w: 16, align: "center", get: (r) => d(r.contractEnd) },
    { title: "Vendu le", w: 15, align: "center", get: (r) => d(r.soldAt) },
  ];
  const scale = CW / cols.reduce((t, c) => t + c.w, 0);
  const widths = cols.map((c) => c.w * scale);
  const header = () => {
    doc.setFillColor(...INK);
    doc.roundedRect(M, y, CW, 7, 1.3, 1.3, "F");
    font(7.2, true, [255, 255, 255]);
    let x = M;
    cols.forEach((c, i) => {
      const tx = c.align === "right" ? x + widths[i] - 1.6 : c.align === "center" ? x + widths[i] / 2 : x + 1.6;
      doc.text(c.title, tx, y + 4.7, { align: c.align ?? "left" });
      x += widths[i];
    });
    y += 7;
  };
  header();
  rows.forEach((r, ri) => {
    font(7.2);
    const cells = cols.map((c, i) => doc.splitTextToSize(c.get(r), widths[i] - 3.2) as string[]);
    const lines = Math.min(2, Math.max(1, ...cells.map((c) => c.length)));
    const rh = 3.3 * lines + 3;
    if (y + rh > H - 12) {
      doc.addPage();
      y = M + 2;
      header();
    }
    if (r.alert) {
      doc.setFillColor(...ALERT_FILL[r.alert].bg);
      doc.rect(M, y, CW, rh, "F");
      doc.setFillColor(...ALERT_FILL[r.alert].bar);
      doc.rect(M, y, 1.2, rh, "F");
    } else if (ri % 2) {
      doc.setFillColor(248, 246, 253);
      doc.rect(M, y, CW, rh, "F");
    }
    let x = M;
    cols.forEach((c, i) => {
      const bold = c.title === "Statut" || c.title === "Vendu";
      const color: RGB =
        c.title === "Vendu" || c.title === "Payé" || c.title === "Livré" || c.title === "En ligne"
          ? c.get(r) === "Oui"
            ? [21, 128, 61]
            : c.get(r) === "Non"
              ? [185, 28, 28]
              : MUTED
          : INK;
      font(7.2, bold, color);
      const tx = c.align === "right" ? x + widths[i] - 1.6 : c.align === "center" ? x + widths[i] / 2 : x + 1.6;
      doc.text(cells[i].slice(0, 2), tx, y + 4, { align: c.align ?? "left" });
      x += widths[i];
    });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.15);
    doc.line(M, y + rh, M + CW, y + rh);
    y += rh;
  });
  if (!rows.length) {
    font(9, false, MUTED);
    doc.text("Aucun produit.", M, y + 6);
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(7, false, MUTED);
    doc.text(`${opts.shopName} · Liste des produits`, M, H - 5);
    doc.text(`Page ${i} / ${pages}`, W - M, H - 5, { align: "right" });
  }
  return Buffer.from(doc.output("arraybuffer"));
}
