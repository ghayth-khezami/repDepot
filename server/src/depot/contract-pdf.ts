import * as jsPDF from "jspdf";
import * as QRCode from "qrcode";
import * as fs from "fs";
import { join } from "path";
import { formatTnd } from "../common/utils/money";

export { DEFAULT_CONTRACT_TERMS } from "./contract-terms";

export interface ContractPdfData {
  shop: { name: string; address: string; phone: string };
  contractNumber: string;
  createdAt: Date;
  durationMonths: number;
  expiresAt: Date;
  deposant: {
    fullName: string;
    phone: string;
    address?: string | null;
    email?: string | null;
    rib?: string | null;
  };
  items: Array<{
    ref: string;
    name: string;
    priceMillimes: number;
    commissionPercent: number;
    shopMillimes: number;
    depositorMillimes: number;
  }>;
  totals: { priceMillimes: number; shopMillimes: number; depositorMillimes: number };
  terms: string;
  trackingUrl: string;
}

const INK: [number, number, number] = [30, 27, 75];
const MUTED: [number, number, number] = [90, 88, 120];
const LINE: [number, number, number] = [60, 60, 60];
const PAGE_W = 210;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Columns mirror the paper template: Réf. | Désignation article | PV public | Commission | Net déposant */
const COLS = [
  { title: "Réf.", w: 20, align: "center" as const },
  { title: "Désignation article", w: 72, align: "left" as const },
  { title: "PV public", w: 26, align: "right" as const },
  { title: "Commission", w: 28, align: "right" as const },
  { title: "Net déposant", w: CONTENT_W - 20 - 72 - 26 - 28, align: "right" as const },
];
const ROW_H = 7;
const MIN_ROWS = 10;

function frDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Tunis" });
}

function amount(m: number): string {
  return formatTnd(m).replace(" TND", "");
}

function shortLink(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

function loadLogo(): string | null {
  for (const p of [join(process.cwd(), "depot.jpg"), join(process.cwd(), "src", "depot.jpg")]) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p).toString("base64");
    } catch {
      /* decorative only */
    }
  }
  return null;
}

export const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
export const ARABIC_FONT = "Amiri";
let arabicFontB64: string | null | undefined;

/** Helvetica has no Arabic glyphs (that is what produced the "þ\"þè…" garbage): embed Amiri when needed. */
export function useArabicFont(doc: jsPDF.jsPDF): boolean {
  if (arabicFontB64 === undefined) {
    arabicFontB64 = null;
    for (const p of [
      join(process.cwd(), "assets", "fonts", "Amiri-Regular.ttf"),
      join(__dirname, "..", "..", "assets", "fonts", "Amiri-Regular.ttf"),
      join(__dirname, "..", "..", "..", "assets", "fonts", "Amiri-Regular.ttf"),
    ]) {
      if (fs.existsSync(p)) {
        arabicFontB64 = fs.readFileSync(p).toString("base64");
        break;
      }
    }
    if (!arabicFontB64) console.warn("[contract-pdf] assets/fonts/Amiri-Regular.ttf introuvable : le texte arabe sera omis du PDF.");
  }
  if (!arabicFontB64) return false;
  if (!doc.getFontList()[ARABIC_FONT]) {
    doc.addFileToVFS("Amiri-Regular.ttf", arabicFontB64);
    doc.addFont("Amiri-Regular.ttf", ARABIC_FONT, "normal");
  }
  return true;
}

/**
 * Splits "X 20, Ariana Al Ulya, أريانة العليا, Ariana" into a Latin line and an Arabic line.
 * Mixing both scripts on one PDF line scrambles the word order, so each script gets its own line.
 */
export function splitByScript(value: string): { latin: string; arabic: string } {
  const parts = value.split(/\s*[,،]\s*/).map((p) => p.trim()).filter(Boolean);
  return {
    latin: parts.filter((p) => !ARABIC.test(p)).join(", "),
    arabic: parts.filter((p) => ARABIC.test(p)).join("، "),
  };
}

function drawWatermark(doc: jsPDF.jsPDF, logo: string | null) {
  if (!logo) return;
  const anyDoc = doc as any;
  try {
    anyDoc.setGState(new anyDoc.GState({ opacity: 0.07 }));
    doc.addImage(logo, "JPEG", PAGE_W / 2 - 45, 110, 90, 90);
    anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
  } catch {
    /* GState unsupported → skip watermark */
  }
}

function drawHeader(doc: jsPDF.jsPDF, data: ContractPdfData): number {
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(`${data.shop.name} — By Mme Khezami`.toUpperCase(), PAGE_W / 2, 20, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(`${data.shop.address} | Tél: ${data.shop.phone}`, PAGE_W / 2, 26, { align: "center" });
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 30, PAGE_W - MARGIN, 30);
  return 30;
}

function drawTableHeader(doc: jsPDF.jsPDF, y: number): number {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  let x = MARGIN;
  for (const col of COLS) {
    doc.rect(x, y, col.w, 9);
    doc.text(col.title, x + col.w / 2, y + 5.8, { align: "center" });
    x += col.w;
  }
  return y + 9;
}

function drawRow(doc: jsPDF.jsPDF, y: number, cells: string[], bold = false) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  let x = MARGIN;
  COLS.forEach((col, i) => {
    doc.rect(x, y, col.w, ROW_H);
    const text = cells[i] ?? "";
    if (text) {
      const maxW = col.w - 3;
      const fitted = doc.splitTextToSize(text, maxW)[0] as string;
      const tx = col.align === "left" ? x + 1.5 : col.align === "right" ? x + col.w - 1.5 : x + col.w / 2;
      doc.text(fitted, tx, y + 4.8, { align: col.align });
    }
    x += col.w;
  });
}

export async function buildContractPdf(data: ContractPdfData): Promise<Buffer> {
  const doc = new jsPDF.jsPDF({ unit: "mm", format: "a4" });
  const logo = loadLogo();
  drawWatermark(doc, logo);
  let y = drawHeader(doc, data);

  // Title + identity
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("CONTRAT DE DÉPÔT-VENTE", PAGE_W / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(`N° ${data.contractNumber}  ·  ${frDate(data.createdAt)}`, PAGE_W / 2, y + 13, { align: "center" });
  y += 21;

  // Parties (left) + global QR (right)
  const qrSize = 34; // ≥ 30 mm, error-correction M
  const qrX = PAGE_W - MARGIN - qrSize;
  const qrY = y - 3;
  const qr = await QRCode.toDataURL(data.trackingUrl, { errorCorrectionLevel: "M", margin: 1, width: 600 });
  doc.addImage(qr, "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.text("Scannez pour suivre vos articles", qrX + qrSize / 2, qrY + qrSize + 3.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.setFontSize(6.5);
  // Domain/path on one line, token on the next: readable and typeable by hand.
  const short = shortLink(data.trackingUrl);
  const cut = short.lastIndexOf("/") + 1;
  doc.text([short.slice(0, cut), short.slice(cut)], qrX + qrSize / 2, qrY + qrSize + 7, { align: "center" });

  const labelX = MARGIN;
  const valueX = MARGIN + 30;
  const leftW = qrX - valueX - 6;
  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(label, labelX, y);
    const { latin, arabic } = ARABIC.test(value) ? splitByScript(value) : { latin: value, arabic: "" };
    let used = 0;
    if (latin) {
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(latin, leftW) as string[];
      doc.text(wrapped, valueX, y);
      used += wrapped.length;
    }
    if (arabic && useArabicFont(doc)) {
      doc.setFont(ARABIC_FONT, "normal");
      doc.setFontSize(10);
      const wrapped = doc.splitTextToSize(arabic, leftW) as string[];
      doc.text(wrapped, valueX, y + 5.5 * used);
      used += wrapped.length;
      doc.setFontSize(9);
    }
    y += 5.5 * Math.max(1, used);
  };
  line("Le dépositaire :", `${data.shop.name} — By Mme Khezami`);
  y += 1.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Le déposant :", labelX, y);
  y += 6;
  line("Nom / Prénom :", data.deposant.fullName);
  line("Tél :", `+216 ${data.deposant.phone.replace(/(\d{2})(\d{3})(\d{3})/, "$1 $2 $3")}`);
  if (data.deposant.address) line("Adresse :", data.deposant.address);
  if (data.deposant.email) line("Email :", data.deposant.email);
  if (data.deposant.rib) line("RIB :", data.deposant.rib);
  line("Durée :", `${data.durationMonths} mois — jusqu'au ${frDate(data.expiresAt)}`);

  y = Math.max(y + 2, qrY + qrSize + 12);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("FICHE DE DÉPÔT", PAGE_W / 2, y, { align: "center" });
  y += 4;
  y = drawTableHeader(doc, y);

  const rows = data.items.map((it) => [
    it.ref,
    it.name,
    amount(it.priceMillimes),
    `${amount(it.shopMillimes)} (${it.commissionPercent}%)`,
    amount(it.depositorMillimes),
  ]);
  const blankRows = Math.max(0, MIN_ROWS - rows.length);
  const allRows = [...rows, ...Array.from({ length: blankRows }, () => ["", "", "", "", ""])];

  for (const r of allRows) {
    if (y + ROW_H > 262) {
      doc.addPage();
      drawWatermark(doc, logo);
      y = drawHeader(doc, data) + 8;
      y = drawTableHeader(doc, y);
    }
    drawRow(doc, y, r);
    y += ROW_H;
  }
  drawRow(
    doc,
    y,
    [
      "",
      `Total — ${data.items.length} article${data.items.length > 1 ? "s" : ""}`,
      amount(data.totals.priceMillimes),
      amount(data.totals.shopMillimes),
      amount(data.totals.depositorMillimes),
    ],
    true,
  );
  y += ROW_H + 6;

  // Terms + signatures need ~75 mm
  if (y > 297 - 80) {
    doc.addPage();
    drawWatermark(doc, logo);
    y = drawHeader(doc, data) + 10;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text("Termes du dépôt :", MARGIN, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  for (const term of data.terms.split(/\r?\n/).map((t) => t.trim()).filter(Boolean)) {
    const wrapped = doc.splitTextToSize(`• ${term.replace(/^[•\-]\s*/, "")}`, CONTENT_W) as string[];
    doc.text(wrapped, MARGIN, y);
    y += 3.8 * wrapped.length + 0.6;
  }

  y += 10;
  doc.setFontSize(9);
  doc.text(`Fait à Manouba, le ${frDate(data.createdAt)}`, MARGIN, y);
  y += 9;
  const boxW = 80;
  const rightX = PAGE_W - MARGIN - boxW;
  doc.setFont("helvetica", "bold");
  doc.text("Le dépositaire", MARGIN, y);
  doc.text("Le déposant", rightX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("(Signature + cachet)", MARGIN, y + 4);
  doc.text("(Signature précédée de « lu et approuvé »)", rightX, y + 4);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y + 7, boxW, 24);
  doc.rect(rightX, y + 7, boxW, 24);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${data.contractNumber} — page ${i}/${pages}`, PAGE_W / 2, 290, { align: "center" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
