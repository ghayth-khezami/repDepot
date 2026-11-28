import * as jsPDF from "jspdf";
import * as QRCode from "qrcode";
import { ARABIC, ARABIC_FONT, useArabicFont } from "../depot/contract-pdf";
import { buildQrCardsPdf, clampLines, drawQrVector, fitLine, formatTnd, QrCardProduct } from "./barcode-label.util";

/**
 * Labels for a thermal label printer (TSC TE200 & co, 203 dpi, roll of adhesive labels):
 * ONE label per PDF page, the page being exactly the label size → print at « Taille réelle »
 * with the driver's paper set to the same size, and every label lands on its sticker.
 *
 * Layout (black only — thermal printers print one colour):
 *   [ QR ]  BÉBÉ-DÉPÔT
 *   [    ]  Product name (bold, ≤ 2 lines)
 *   [    ]  description (as many lines as fit)
 *   [    ]  150,00 TND
 *   [    ]  D-12-03
 */

export const LABEL_MIN_MM = { w: 25, h: 15 } as const;
export const LABEL_MAX_MM = { w: 108, h: 160 } as const; // TE200: 108 mm print width

/** "a4" = the old A4 sheet of 12 cards; "50x30" = a 50 × 30 mm label roll. */
export type LabelFormat = { kind: "a4" } | { kind: "roll"; w: number; h: number };

export function parseLabelFormat(raw?: string | null): LabelFormat {
  const m = (raw ?? "").trim().toLowerCase().match(/^(\d{2,3}(?:\.\d)?)x(\d{2,3}(?:\.\d)?)$/);
  if (!m) return { kind: "a4" };
  const w = Math.min(LABEL_MAX_MM.w, Math.max(LABEL_MIN_MM.w, Number(m[1])));
  const h = Math.min(LABEL_MAX_MM.h, Math.max(LABEL_MIN_MM.h, Number(m[2])));
  return { kind: "roll", w, h };
}

const PT = 0.3528; // 1 pt in mm
const DOT_MM = 25.4 / 203; // one TSC TE200 print dot
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function setNameFont(doc: any, text: string, bold: boolean) {
  if (ARABIC.test(text) && useArabicFont(doc)) doc.setFont(ARABIC_FONT, "normal");
  else doc.setFont("helvetica", bold ? "bold" : "normal");
}

function drawLabel(doc: any, p: QrCardProduct, w: number, h: number) {
  const pad = clamp(h * 0.07, 1.5, 3);
  const payload = (p.ref || p.id).trim();
  // QR modules = a whole number of printer dots (203 dpi): sharp squares, reliable scans.
  const modules = QRCode.create(payload, { errorCorrectionLevel: "M" }).modules.size;
  const maxQr = Math.min(h - 2 * pad, w * 0.46);
  const dots = Math.max(1, Math.floor(maxQr / modules / DOT_MM));
  const qr = modules * dots * DOT_MM;
  const qy = (h - qr) / 2;
  drawQrVector(doc, payload, pad + (maxQr - qr) / 2, qy, qr, [0, 0, 0]);

  const tx = pad + maxQr + clamp(w * 0.04, 1.5, 3);
  const tw = w - tx - pad;
  doc.setTextColor(0, 0, 0);

  const nameSize = clamp(h * 0.3, 6.5, 14);
  const descSize = nameSize * 0.72;
  const priceSize = clamp(nameSize * 1.3, 8, 18);
  const refSize = clamp(nameSize * 0.62, 5, 8);
  const lh = (pt: number) => pt * PT * 1.18;

  // Top: shop name (only when there is room for it)
  let y = pad;
  if (h >= 24) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(refSize);
    y += refSize * PT;
    doc.text(fitLine(doc, "BÉBÉ-DÉPÔT", tw), tx, y);
    y += 0.9;
  }

  // Bottom: price, then the ref under it
  let bottom = h - pad;
  const ref = (p.ref ?? "").trim();
  if (ref) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(refSize);
    doc.text(fitLine(doc, ref, tw), tx, bottom);
    bottom -= lh(refSize) + 0.2;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(priceSize);
  let priceText = formatTnd(p.PrixVente);
  if (doc.getTextWidth(priceText) > tw) priceText = priceText.replace(" TND", " DT");
  while (doc.getTextWidth(priceText) > tw && doc.getFontSize() > 6) doc.setFontSize(doc.getFontSize() - 0.5);
  doc.text(priceText, tx, bottom);
  const priceTop = bottom - doc.getFontSize() * PT - 0.8;

  // Name (≤ 2 lines), then as much description as fits above the price
  setNameFont(doc, p.productName, true);
  doc.setFontSize(nameSize);
  const nameRoom = Math.max(1, Math.min(2, Math.floor((priceTop - y) / lh(nameSize))));
  const nameLines = clampLines(doc, p.productName, tw, nameRoom);
  nameLines.forEach((line) => {
    y += nameSize * PT;
    doc.text(line, tx, y);
    y += lh(nameSize) - nameSize * PT;
  });

  const desc = (p.description ?? "").trim();
  if (desc) {
    setNameFont(doc, desc, false);
    doc.setFontSize(descSize);
    const room = Math.floor((priceTop - y - 0.4) / lh(descSize));
    if (room > 0) {
      y += 0.4;
      clampLines(doc, desc, tw, Math.min(room, 4)).forEach((line) => {
        y += descSize * PT;
        doc.text(line, tx, y);
        y += lh(descSize) - descSize * PT;
      });
    }
  }
}

/** One label per page, page = label size. */
export function buildLabelRollPdf(products: QrCardProduct[], w: number, h: number): Buffer {
  const doc: any = new jsPDF.jsPDF({ unit: "mm", format: [w, h], orientation: w >= h ? "landscape" : "portrait" });
  doc.setProperties({ title: `Étiquettes ${w}×${h} mm — Bébé-Dépôt` });
  if (!products.length) {
    doc.setFontSize(8);
    doc.text("Aucun produit", w / 2, h / 2, { align: "center" });
  }
  products.forEach((p, i) => {
    if (i > 0) doc.addPage([w, h], w >= h ? "landscape" : "portrait");
    drawLabel(doc, p, w, h);
  });
  return Buffer.from(doc.output("arraybuffer"));
}

/** A4 sheet of cards, or a label roll, depending on `format` ("a4" | "50x30"…). */
export function buildProductLabels(products: QrCardProduct[], format?: string | null): Promise<Buffer> {
  const f = parseLabelFormat(format);
  return f.kind === "roll" ? Promise.resolve(buildLabelRollPdf(products, f.w, f.h)) : buildQrCardsPdf(products);
}
