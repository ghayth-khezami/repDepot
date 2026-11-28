import * as jsPDF from "jspdf";
import * as QRCode from "qrcode";

/** EAN-13 left-hand odd parity encodings (L). */
const L: Record<string, string> = {
  "0": "0001101",
  "1": "0011001",
  "2": "0010011",
  "3": "0111101",
  "4": "0100011",
  "5": "0110001",
  "6": "0101111",
  "7": "0111011",
  "8": "0110111",
  "9": "0001011",
};

/** EAN-13 right-hand encodings (R). */
const R: Record<string, string> = {
  "0": "1110010",
  "1": "1100110",
  "2": "1101100",
  "3": "1000010",
  "4": "1011100",
  "5": "1001110",
  "6": "1010000",
  "7": "1000100",
  "8": "1001000",
  "9": "1110100",
};

/** G encodings for left-hand even parity. */
const G: Record<string, string> = {
  "0": "0100111",
  "1": "0110011",
  "2": "0011011",
  "3": "0100001",
  "4": "0011101",
  "5": "0111001",
  "6": "0000101",
  "7": "0010001",
  "8": "0001001",
  "9": "0010111",
};

const PARITY: Record<string, string> = {
  "0": "LLLLLL",
  "1": "LLGLGG",
  "2": "LLGGLG",
  "3": "LLGGGL",
  "4": "LGLLGG",
  "5": "LGGLLG",
  "6": "LGGGLL",
  "7": "LGLGLG",
  "8": "LGLGGL",
  "9": "LGGLGL",
};

export function computeEan13CheckDigit(digits12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = parseInt(digits12[i], 10);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

export function normalizeEan13(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits.length === 13) return digits;
  if (digits.length === 12) return digits + computeEan13CheckDigit(digits);
  return digits.padEnd(12, "0").slice(0, 12) + computeEan13CheckDigit(digits.padEnd(12, "0").slice(0, 12));
}

function encodeEan13(code: string): string {
  const ean = normalizeEan13(code);
  const first = ean[0];
  const parity = PARITY[first] ?? "LLLLLL";
  let bits = "101";

  for (let i = 1; i <= 6; i++) {
    const d = ean[i];
    const p = parity[i - 1];
    bits += p === "L" ? L[d] : G[d];
  }

  bits += "01010";

  for (let i = 7; i <= 12; i++) {
    bits += R[ean[i]];
  }

  bits += "101";
  return bits;
}

export function drawEan13(
  doc: jsPDF.jsPDF,
  code: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const ean = normalizeEan13(code);
  const bits = encodeEan13(ean);
  const moduleWidth = width / bits.length;

  doc.setFillColor(0, 0, 0);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") {
      doc.rect(x + i * moduleWidth, y, moduleWidth + 0.02, height, "F");
    }
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(ean, x + width / 2, y + height + 4, { align: "center" });
}

export interface LabelProduct {
  productName: string;
  PrixVente: number;
  barcode?: string | null;
}

const LABEL_W = 95;
const LABEL_H = 42;
const COLS = 2;
const MARGIN_X = 8;
const MARGIN_Y = 10;

export function formatTnd(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} TND`;
}

function truncateName(name: string, max = 32): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function drawSingleLabel(
  doc: jsPDF.jsPDF,
  product: LabelProduct,
  x: number,
  y: number,
): void {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.rect(x, y, LABEL_W, LABEL_H);

  const barcode = product.barcode?.trim() || "2000000000000";
  const barX = x + 8;
  const barY = y + 6;
  const barW = LABEL_W - 16;
  const barH = 14;

  drawEan13(doc, barcode, barX, barY, barW, barH);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(truncateName(product.productName), x + LABEL_W / 2, y + 28, {
    align: "center",
    maxWidth: LABEL_W - 6,
  });

  doc.setFontSize(11);
  doc.setTextColor(128, 90, 213);
  doc.text(formatTnd(product.PrixVente), x + LABEL_W / 2, y + 36, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

export function buildProductLabelsPdf(products: LabelProduct[]): Buffer {
  const doc = new jsPDF.jsPDF({ unit: "mm", format: "a4" });

  if (products.length === 0) {
    doc.setFontSize(14);
    doc.text("Aucun produit avec code-barres", 14, 20);
    return Buffer.from(doc.output("arraybuffer"));
  }

  products.forEach((product, index) => {
    if (index > 0 && index % (COLS * 7) === 0) {
      doc.addPage();
    }
    const pageIndex = index % (COLS * 7);
    const col = pageIndex % COLS;
    const row = Math.floor(pageIndex / COLS);
    const x = MARGIN_X + col * (LABEL_W + 4);
    const y = MARGIN_Y + row * (LABEL_H + 3);
    drawSingleLabel(doc, product, x, y);
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export function buildSingleProductLabelPdf(product: LabelProduct): Buffer {
  const doc = new jsPDF.jsPDF({ unit: "mm", format: "a4" });
  drawSingleLabel(doc, product, (210 - LABEL_W) / 2, 40);
  return Buffer.from(doc.output("arraybuffer"));
}

export async function buildProductQrPdf(
  products: Array<{ id: string; productName: string; PrixVente: number; ref?: string | null }>,
): Promise<Buffer> {
  const doc = new jsPDF.jsPDF({ unit: "mm", format: "a4" });
  const cellWidth = 60;
  const cellHeight = 72;
  const columns = 3;
  const rows = 3;
  const marginX = 15;
  const marginY = 18;

  doc.setFontSize(16);
  doc.text("BÉBÉ-DÉPÔT — QR produits", 105, 10, { align: "center" });

  for (let index = 0; index < products.length; index += 1) {
    if (index > 0 && index % (columns * rows) === 0) doc.addPage();
    const position = index % (columns * rows);
    const x = marginX + (position % columns) * cellWidth;
    const y = marginY + Math.floor(position / columns) * cellHeight;
    const dataUrl = await QRCode.toDataURL(products[index].id, { margin: 1, width: 320 });
    doc.addImage(dataUrl, "PNG", x + 8, y, 44, 44, undefined, "FAST");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(truncateName(products[index].productName, 24), x + cellWidth / 2, y + 51, { align: "center", maxWidth: cellWidth - 4 });
    doc.setFont("helvetica", "normal");
    doc.text(formatTnd(products[index].PrixVente), x + cellWidth / 2, y + 59, { align: "center" });
    const ref = products[index].ref?.trim();
    if (ref) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(ref, x + cellWidth / 2, y + 66, { align: "center" });
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}


export interface QrCardProduct {
  id: string;
  ref?: string | null;
  productName: string;
  description?: string | null;
  PrixVente: number;
}

/** Fits text on ONE line (ellipsis) at the current font size. */
export function fitLine(doc: any, text: string, maxWidth: number) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (doc.getTextWidth(clean) <= maxWidth) return clean;
  let lo = 0;
  let hi = clean.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.getTextWidth(clean.slice(0, mid) + "…") <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return clean.slice(0, lo).trimEnd() + "…";
}

/** At most `maxLines` lines; the last one gets an ellipsis if text remains. */
export function clampLines(doc: any, text: string, maxWidth: number, maxLines: number): string[] {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const lines: string[] = doc.splitTextToSize(clean, maxWidth);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fitLine(doc, lines.slice(maxLines - 1).join(" "), maxWidth);
  if (!kept[maxLines - 1].endsWith("…")) kept[maxLines - 1] = fitLine(doc, kept[maxLines - 1] + " …", maxWidth);
  return kept;
}

/** QR drawn as vector squares: no PNG encoding (≈100× faster than addImage) and razor-sharp in print. */
export function drawQrVector(doc: any, payload: string, x: number, y: number, size: number, rgb: [number, number, number] = [30, 22, 48]) {
  const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = size / n;
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) {
        c++;
        continue;
      }
      let run = 1;
      while (c + run < n && qr.modules.get(r, c + run)) run++;
      // slight overlap: no hairline gaps between neighbouring modules once rasterised
      doc.rect(x + c * cell, y + r * cell, run * cell + 0.04, cell + 0.04, "F");
      c += run;
    }
  }
}

export const QR_CARD_GRID = { columns: 3, rows: 4, margin: 10 } as const;

/**
 * A4 sheet of equal-size QR cards (3 columns × 4 rows), dashed cut lines.
 * Each card: QR (product ref, or id) → name (1 line) → description (max 2 lines) → price (bold).
 * Card size never depends on content.
 */
export async function buildQrCardsPdf(products: QrCardProduct[]): Promise<Buffer> {
  const doc: any = new jsPDF.jsPDF({ unit: "mm", format: "a4" });
  const { columns, rows, margin } = QR_CARD_GRID;
  const pageW = 210;
  const pageH = 297;
  const cardW = (pageW - margin * 2) / columns;
  const cardH = (pageH - margin * 2) / rows;
  const perPage = columns * rows;
  const pad = 4;
  const qr = 36;

  for (let i = 0; i < products.length; i++) {
    const pos = i % perPage;
    if (i > 0 && pos === 0) doc.addPage();
    if (pos === 0) {
      // dashed cut grid for the whole page
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.setDrawColor(190, 180, 205);
      doc.setLineWidth(0.2);
      for (let c = 0; c <= columns; c++) doc.line(margin + c * cardW, margin, margin + c * cardW, margin + rows * cardH);
      for (let r = 0; r <= rows; r++) doc.line(margin, margin + r * cardH, margin + columns * cardW, margin + r * cardH);
      doc.setLineDashPattern([], 0);
    }
    const p = products[i];
    const x = margin + (pos % columns) * cardW;
    const y = margin + Math.floor(pos / columns) * cardH;
    const inner = cardW - pad * 2;
    const payload = (p.ref || p.id).trim();

    drawQrVector(doc, payload, x + (cardW - qr) / 2, y + pad, qr);

    let ty = y + pad + qr + 5;
    doc.setTextColor(30, 22, 48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(fitLine(doc, p.productName, inner), x + cardW / 2, ty, { align: "center" });

    ty += 4.6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(107, 100, 120);
    clampLines(doc, p.description ?? "", inner, 2).forEach((line, li) => doc.text(line, x + cardW / 2, ty + li * 3.4, { align: "center" }));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(194, 24, 91);
    doc.text(formatTnd(p.PrixVente), x + cardW / 2, y + cardH - pad - 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 100, 120);
    if (p.ref) doc.text(p.ref, x + cardW / 2, y + cardH - pad + 0.5, { align: "center" });
  }
  if (!products.length) {
    doc.setFontSize(12);
    doc.text("Aucun produit pour ces filtres.", pageW / 2, 40, { align: "center" });
  }
  return Buffer.from(doc.output("arraybuffer"));
}
