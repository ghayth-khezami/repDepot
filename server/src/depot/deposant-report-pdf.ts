import * as jsPDF from "jspdf";
import { ARABIC, ARABIC_FONT, splitByScript, useArabicFont } from "./contract-pdf";
import { formatTnd } from "../common/utils/money";

export type ReportStage = "EN_VENTE" | "VENDU" | "PAYE" | "RETIRE";

export interface DeposantReportData {
  shop: { name: string; phone: string; address: string };
  generatedAt: Date;
  deposant: {
    number: number;
    fullName: string;
    phone: string;
    email: string | null;
    address: string | null;
    rib: string | null;
    since: Date;
  };
  totals: { total: number; onSale: number; sold: number; paid: number; removed: number; toPayMillimes: number; paidMillimes: number; stockValueMillimes: number };
  products: Array<{
    ref: string;
    name: string;
    category: string | null;
    contract: string | null;
    priceMillimes: number;
    commissionPercent: number | null;
    depositorMillimes: number;
    stage: ReportStage;
    depositedAt: Date;
    soldAt: Date | null;
    paidAt: Date | null;
    orderStatus: string | null;
    missing: string[];
  }>;
  contracts: Array<{ number: string | null; createdAt: Date; durationMonths: number; expiresAt: Date; signedAt: Date | null; items: number }>;
  history: Array<{ at: Date; text: string; kind: "contract" | "deposit" | "sold" | "paid" | "removed" | "notif" }>;
}

/* ── palette ── */
type RGB = [number, number, number];
const INK: RGB = [30, 27, 75];
const MUTED: RGB = [100, 98, 130];
const VIOLET: RGB = [109, 40, 217];
const PINK: RGB = [219, 39, 119];
const LINE: RGB = [226, 220, 245];
const SOFT: RGB = [247, 243, 255];
const STAGE: Record<ReportStage, { label: string; fill: RGB; text: RGB }> = {
  EN_VENTE: { label: "En vente", fill: [253, 236, 245], text: [190, 24, 93] },
  VENDU: { label: "Vendu · à payer", fill: [220, 252, 231], text: [21, 128, 61] },
  PAYE: { label: "Payé", fill: [237, 233, 254], text: [91, 33, 182] },
  RETIRE: { label: "Retiré", fill: [241, 241, 244], text: [90, 90, 100] },
};
const HISTORY_DOT: Record<DeposantReportData["history"][number]["kind"], RGB> = {
  contract: VIOLET,
  deposit: [236, 72, 153],
  sold: [22, 163, 74],
  paid: [124, 58, 237],
  removed: [120, 120, 130],
  notif: [234, 179, 8],
};

const W = 297;
const H = 210;
const M = 12;
const CW = W - M * 2;

const d = (x: Date | null | undefined) =>
  x ? x.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Tunis" }) : "—";
const money = (m: number) => formatTnd(m);
const amount = (m: number) => formatTnd(m).replace(" TND", "");

class Report {
  doc = new jsPDF.jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  y = M;
  constructor(private data: DeposantReportData) {}

  font(size: number, bold = false, color: RGB = INK) {
    this.doc.setFont("helvetica", bold ? "bold" : "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
  }

  /** Text that may contain Arabic: Latin part in Helvetica, Arabic part on its own line in Amiri. */
  mixed(text: string, x: number, y: number, maxW: number, size: number, color: RGB = INK): number {
    const { latin, arabic } = ARABIC.test(text) ? splitByScript(text) : { latin: text, arabic: "" };
    let lines = 0;
    if (latin) {
      this.font(size, false, color);
      const w = this.doc.splitTextToSize(latin, maxW) as string[];
      this.doc.text(w, x, y);
      lines += w.length;
    }
    if (arabic && useArabicFont(this.doc)) {
      this.doc.setFont(ARABIC_FONT, "normal");
      this.doc.setFontSize(size + 1);
      this.doc.setTextColor(...color);
      const w = this.doc.splitTextToSize(arabic, maxW) as string[];
      this.doc.text(w, x, y + lines * size * 0.45);
      lines += w.length;
    }
    return Math.max(1, lines);
  }

  ensure(h: number, onNewPage?: () => void) {
    if (this.y + h <= H - 14) return;
    this.doc.addPage();
    this.y = M + 4;
    onNewPage?.();
  }

  header() {
    const { doc } = this;
    // gradient-like band: two overlapping rects
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, W, 26, "F");
    doc.setFillColor(...PINK);
    doc.setGState(new (doc as any).GState({ opacity: 0.55 }));
    doc.triangle(W * 0.55, 0, W, 0, W, 26, "F");
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    this.font(17, true, [255, 255, 255]);
    doc.text("Fiche déposant", M, 12);
    this.font(9, false, [255, 255, 255]);
    doc.text(`${this.data.shop.name} — By Mme Khezami · ${this.data.shop.address} · Tél ${this.data.shop.phone}`, M, 19);
    doc.text(`Édité le ${d(this.data.generatedAt)}`, W - M, 12, { align: "right" });
    doc.text(`Déposant N° ${this.data.deposant.number}`, W - M, 19, { align: "right" });
    this.y = 34;
  }

  section(title: string, subtitle?: string) {
    this.ensure(16);
    const { doc } = this;
    doc.setFillColor(...PINK);
    doc.roundedRect(M, this.y - 4, 1.6, 6, 0.8, 0.8, "F");
    this.font(12, true);
    doc.text(title, M + 4, this.y + 0.6);
    const titleW = doc.getTextWidth(title);
    if (subtitle) {
      this.font(8.5, false, MUTED);
      doc.text(subtitle, M + 4 + titleW + 4, this.y + 0.6);
    }
    this.y += 6;
  }

  identityAndKpis() {
    const { doc, data } = this;
    const dep = data.deposant;
    const leftW = 108;
    const top = this.y;
    doc.setFillColor(...SOFT);
    doc.setDrawColor(...LINE);
    doc.roundedRect(M, top, leftW, 52, 3, 3, "FD");
    this.font(15, true);
    doc.text(dep.fullName, M + 5, top + 9);
    this.font(8.5, false, MUTED);
    doc.text(`Déposant depuis le ${d(dep.since)}`, M + 5, top + 14.5);
    let y = top + 22;
    const row = (label: string, value: string | null, warn = false) => {
      this.font(8.5, true, MUTED);
      doc.text(label, M + 5, y);
      if (!value) {
        this.font(8.5, true, [217, 119, 6]);
        doc.text(warn ? "Non renseigné" : "—", M + 26, y);
        y += 5.5;
        return;
      }
      const lines = this.mixed(value, M + 26, y, leftW - 31, 8.5);
      y += 4.4 * lines + 1.1;
    };
    row("Téléphone", `+216 ${dep.phone.replace(/(\d{2})(\d{3})(\d{3})/, "$1 $2 $3")}`);
    row("Email", dep.email, true);
    row("Adresse", dep.address, true);
    row("RIB", dep.rib, true);

    // KPI tiles
    const t = data.totals;
    const tiles: Array<{ label: string; value: string; sub: string; color: RGB }> = [
      { label: "Articles", value: String(t.total), sub: `${t.onSale} en vente · ${t.removed} retiré(s)`, color: VIOLET },
      { label: "Valeur en stock", value: money(t.stockValueMillimes), sub: "prix de vente des articles en vente", color: PINK },
      { label: "À payer au déposant", value: money(t.toPayMillimes), sub: `${t.sold} article(s) vendu(s) non payé(s)`, color: [22, 163, 74] },
      { label: "Déjà versé", value: money(t.paidMillimes), sub: `${t.paid} article(s) payé(s)`, color: [124, 58, 237] },
    ];
    const x0 = M + leftW + 6;
    const tw = (CW - leftW - 6 - 6) / 2;
    tiles.forEach((tile, i) => {
      const x = x0 + (i % 2) * (tw + 6);
      const ty = top + Math.floor(i / 2) * 27;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...LINE);
      doc.roundedRect(x, ty, tw, 23, 3, 3, "FD");
      doc.setFillColor(...tile.color);
      doc.roundedRect(x, ty, 2.2, 23, 1.1, 1.1, "F");
      this.font(8, true, MUTED);
      doc.text(tile.label.toUpperCase(), x + 6, ty + 6.5);
      this.font(15, true, tile.color);
      doc.text(tile.value, x + 6, ty + 14.5);
      this.font(7.5, false, MUTED);
      doc.text(tile.sub, x + 6, ty + 19.5);
    });
    this.y = top + 58;
  }

  completeness() {
    const { doc, data } = this;
    const incomplete = data.products.filter((p) => p.missing.length);
    this.section("Complétude des fiches articles");
    const pct = data.products.length ? Math.round(((data.products.length - incomplete.length) / data.products.length) * 100) : 100;
    // progress bar
    doc.setFillColor(...LINE);
    doc.roundedRect(M, this.y, 90, 3.2, 1.6, 1.6, "F");
    doc.setFillColor(...(pct === 100 ? ([22, 163, 74] as RGB) : pct >= 60 ? ([234, 179, 8] as RGB) : ([220, 38, 38] as RGB)));
    doc.roundedRect(M, this.y, Math.max(3, 0.9 * pct), 3.2, 1.6, 1.6, "F");
    this.font(9, true);
    doc.text(`${pct} % des fiches complètes`, M + 95, this.y + 2.8);
    this.font(8.5, false, MUTED);
    const counts: Record<string, number> = {};
    incomplete.forEach((p) => p.missing.forEach((m) => (counts[m] = (counts[m] ?? 0) + 1)));
    const summary = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} manquante(s) : ${n}`)
      .join("   ·   ");
    doc.text(incomplete.length ? summary : "Toutes les fiches sont complètes", M + 150, this.y + 2.8);
    this.y += 10;
  }

  table<T>(
    cols: Array<{ title: string; w: number; align?: "left" | "right" | "center"; get: (r: T) => string; color?: (r: T) => RGB | null; chip?: (r: T) => { fill: RGB; text: RGB } | null }>,
    rows: T[],
    rowFill?: (r: T) => RGB | null,
  ) {
    const { doc } = this;
    const scale = CW / cols.reduce((t, c) => t + c.w, 0);
    const widths = cols.map((c) => c.w * scale);
    const headerH = 7.5;
    const drawHeader = () => {
      doc.setFillColor(...INK);
      doc.roundedRect(M, this.y, CW, headerH, 1.5, 1.5, "F");
      this.font(7.8, true, [255, 255, 255]);
      let x = M;
      cols.forEach((c, i) => {
        const tx = c.align === "right" ? x + widths[i] - 2 : c.align === "center" ? x + widths[i] / 2 : x + 2;
        doc.text(c.title, tx, this.y + 5, { align: c.align ?? "left" });
        x += widths[i];
      });
      this.y += headerH;
    };
    this.ensure(headerH + 8);
    drawHeader();
    rows.forEach((r, ri) => {
      this.font(7.8);
      const cells = cols.map((c, i) => doc.splitTextToSize(c.get(r) || "", widths[i] - 4) as string[]);
      const lines = Math.max(1, ...cells.map((c) => c.length));
      const rh = 3.6 * lines + 3.4;
      this.ensure(rh, drawHeader);
      const fill = rowFill?.(r) ?? (ri % 2 ? SOFT : null);
      if (fill) {
        doc.setFillColor(...fill);
        doc.rect(M, this.y, CW, rh, "F");
      }
      let x = M;
      cols.forEach((c, i) => {
        const chip = c.chip?.(r);
        if (chip) {
          this.font(7.2, true, chip.text);
          const label = cells[i][0] ?? "";
          const tw = doc.getTextWidth(label) + 4;
          doc.setFillColor(...chip.fill);
          doc.roundedRect(x + 1.5, this.y + 1.2, Math.min(tw, widths[i] - 3), 4.6, 2.3, 2.3, "F");
          doc.text(label, x + 3.5, this.y + 4.4);
        } else {
          const col = c.color?.(r);
          this.font(7.8, false, col ?? INK);
          const tx = c.align === "right" ? x + widths[i] - 2 : c.align === "center" ? x + widths[i] / 2 : x + 2;
          doc.text(cells[i], tx, this.y + 4.4, { align: c.align ?? "left" });
        }
        x += widths[i];
      });
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(M, this.y + rh, M + CW, this.y + rh);
      this.y += rh;
    });
    this.y += 6;
  }

  products() {
    this.section("Articles", `${this.data.products.length} article(s)`);
    if (!this.data.products.length) {
      this.font(9, false, MUTED);
      this.doc.text("Aucun article déposé pour le moment.", M, this.y + 2);
      this.y += 10;
      return;
    }
    this.table(
      [
        { title: "Réf.", w: 17, get: (p) => p.ref },
        { title: "Article", w: 42, get: (p) => p.name },
        { title: "Catégorie", w: 26, get: (p) => p.category ?? "—", color: (p) => (p.category ? null : [217, 119, 6]) },
        { title: "Contrat", w: 22, get: (p) => p.contract ?? "—" },
        { title: "Prix (TND)", w: 18, align: "right", get: (p) => amount(p.priceMillimes) },
        { title: "Com.", w: 10, align: "right", get: (p) => (p.commissionPercent != null ? `${p.commissionPercent}%` : "—") },
        { title: "Part déposant", w: 20, align: "right", get: (p) => amount(p.depositorMillimes), color: () => [21, 128, 61] },
        { title: "Statut", w: 24, get: (p) => STAGE[p.stage].label, chip: (p) => STAGE[p.stage] },
        { title: "Déposé", w: 18, get: (p) => d(p.depositedAt) },
        { title: "Vendu", w: 18, get: (p) => d(p.soldAt) },
        { title: "Payé", w: 18, get: (p) => d(p.paidAt) },
        { title: "Infos manquantes", w: 38, get: (p) => (p.missing.length ? p.missing.join(", ") : "Complète"), color: (p) => (p.missing.length ? [217, 119, 6] : [21, 128, 61]) },
      ],
      this.data.products,
    );
  }

  contracts() {
    this.section("Contrats de dépôt", `${this.data.contracts.length} contrat(s)`);
    if (!this.data.contracts.length) {
      this.font(9, false, MUTED);
      this.doc.text("Aucun contrat (déposant enregistré sans dépôt).", M, this.y + 2);
      this.y += 10;
      return;
    }
    const now = Date.now();
    this.table(
      [
        { title: "N° contrat", w: 30, get: (c) => c.number ?? "—" },
        { title: "Date du dépôt", w: 26, get: (c) => d(c.createdAt) },
        { title: "Durée", w: 18, get: (c) => `${c.durationMonths} mois` },
        { title: "Fin du contrat", w: 26, get: (c) => d(c.expiresAt), color: (c) => (c.expiresAt.getTime() < now ? [220, 38, 38] : null) },
        { title: "Signé", w: 24, get: (c) => (c.signedAt ? `Oui · ${d(c.signedAt)}` : "Non"), color: (c) => (c.signedAt ? [21, 128, 61] : [217, 119, 6]) },
        { title: "Articles", w: 16, align: "right", get: (c) => String(c.items) },
        { title: "État", w: 30, get: (c) => (c.expiresAt.getTime() < now ? "Terminé" : "En cours") },
      ],
      this.data.contracts,
    );
  }

  history() {
    const { doc } = this;
    this.section("Historique", "du plus récent au plus ancien");
    const items = [...this.data.history].sort((a, b) => b.at.getTime() - a.at.getTime());
    if (!items.length) {
      this.font(9, false, MUTED);
      doc.text("Aucun événement.", M, this.y + 2);
      this.y += 8;
      return;
    }
    const colW = (CW - 8) / 2;
    // Two columns timeline
    let col = 0;
    let colStartY = this.y;
    let yCol = [this.y, this.y];
    for (const ev of items) {
      this.font(8.2);
      const lines = doc.splitTextToSize(ev.text, colW - 30) as string[];
      const h = 3.7 * lines.length + 2.6;
      if (yCol[col] + h > H - 14 && col === 0) col = 1; // first column full → second column
      if (yCol[col] + h > H - 14) {
        doc.addPage();
        this.y = M + 4;
        colStartY = this.y;
        yCol = [this.y, this.y];
        col = 0;
      }
      const cx = M + col * (colW + 8);
      const cy = yCol[col];
      doc.setFillColor(...HISTORY_DOT[ev.kind]);
      doc.circle(cx + 1.6, cy + 1.3, 1.3, "F");
      this.font(7.6, true, MUTED);
      doc.text(d(ev.at), cx + 5, cy + 2.2);
      this.font(8.2);
      doc.text(lines, cx + 25, cy + 2.2);
      yCol[col] = cy + h;
    }
    this.y = Math.max(...yCol, colStartY) + 4;
  }

  footer() {
    const { doc } = this;
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...LINE);
      doc.line(M, H - 9, W - M, H - 9);
      this.font(7, false, MUTED);
      doc.text(`${this.data.deposant.fullName} — N° ${this.data.deposant.number} · Document interne, confidentiel`, M, H - 5);
      doc.text(`Page ${i} / ${pages}`, W - M, H - 5, { align: "right" });
    }
  }

  build(): Buffer {
    this.header();
    this.identityAndKpis();
    this.completeness();
    this.products();
    this.contracts();
    this.history();
    this.footer();
    return Buffer.from(this.doc.output("arraybuffer"));
  }
}

export function buildDeposantReportPdf(data: DeposantReportData): Buffer {
  return new Report(data).build();
}
