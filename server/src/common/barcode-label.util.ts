import * as jsPDF from "jspdf";

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

function formatTnd(value: number): string {
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
