import * as jsPDF from "jspdf";

type Ss3 = { title: string; description?: string | null };
type Ss2 = { title: string; description?: string | null; subSubCategories3: Ss3[] };
type Ss1 = { title: string; description?: string | null; subSubCategories2: Ss2[] };
type SubCat = { title: string; description?: string | null; subSubCategories1: Ss1[] };
type CategoryTree = {
  categoryName: string;
  description?: string | null;
  subCategories: SubCat[];
};

const LEVELS = [
  { tag: "CATÉGORIE", rgb: [124, 58, 237] as [number, number, number], indent: 14 },
  { tag: "SOUS-CAT.", rgb: [37, 99, 235] as [number, number, number], indent: 22 },
  { tag: "SS-CAT. 1", rgb: [13, 148, 136] as [number, number, number], indent: 30 },
  { tag: "SS-CAT. 2", rgb: [22, 163, 74] as [number, number, number], indent: 38 },
  { tag: "SS-CAT. 3", rgb: [217, 119, 6] as [number, number, number], indent: 46 },
] as const;

const PAGE_BOTTOM = 285;
const ROW_H = 9;

function ensureSpace(doc: jsPDF.jsPDF, y: number, need: number): number {
  if (y + need <= PAGE_BOTTOM) return y;
  doc.addPage();
  return 24;
}

function drawRow(
  doc: jsPDF.jsPDF,
  y: number,
  level: number,
  title: string,
  subtitle?: string | null,
): number {
  const cfg = LEVELS[level];
  const rowH = subtitle ? ROW_H + 4 : ROW_H;
  y = ensureSpace(doc, y, rowH + 4);

  const x = cfg.indent;
  const w = 196 - cfg.indent;

  doc.setFillColor(cfg.rgb[0], cfg.rgb[1], cfg.rgb[2]);
  doc.roundedRect(x, y, w, rowH, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(level === 0 ? 11 : 9);
  doc.text(` ${cfg.tag}  ${title}`, x + 2, y + (subtitle ? 5 : 6));

  if (subtitle?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(subtitle.trim().slice(0, 90), x + 2, y + 10);
  }

  doc.setTextColor(0, 0, 0);
  return y + rowH + 3;
}

export function buildCategoryHierarchyPdf(categories: CategoryTree[]): Buffer {
  const doc = new jsPDF.jsPDF();
  const lavender: [number, number, number] = [124, 58, 237];

  doc.setFillColor(lavender[0], lavender[1], lavender[2]);
  doc.rect(0, 0, 210, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BÉBÉ-DÉPÔT — Hiérarchie des catégories", 105, 12, { align: "center" });

  let y = 26;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} — ${categories.length} catégorie(s)`, 14, y);
  y += 10;

  doc.setFontSize(8);
  let legendX = 14;
  for (const lvl of LEVELS) {
    doc.setFillColor(lvl.rgb[0], lvl.rgb[1], lvl.rgb[2]);
    doc.roundedRect(legendX, y, 34, 6, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(lvl.tag, legendX + 2, y + 4.5);
    legendX += 37;
  }
  y += 14;
  doc.setTextColor(0, 0, 0);

  if (categories.length === 0) {
    doc.setFontSize(12);
    doc.text("Aucune catégorie enregistrée.", 14, y + 10);
    return Buffer.from(doc.output("arraybuffer"));
  }

  for (const cat of categories) {
    y = drawRow(doc, y, 0, cat.categoryName, cat.description);

    if (cat.subCategories.length === 0) {
      y = ensureSpace(doc, y, ROW_H);
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("— Aucune sous-catégorie", 24, y + 4);
      doc.setTextColor(0, 0, 0);
      y += 8;
      continue;
    }

    for (const sub of cat.subCategories) {
      y = drawRow(doc, y, 1, sub.title, sub.description);

      if (sub.subSubCategories1.length === 0) continue;

      for (const ss1 of sub.subSubCategories1) {
        y = drawRow(doc, y, 2, ss1.title, ss1.description);

        for (const ss2 of ss1.subSubCategories2) {
          y = drawRow(doc, y, 3, ss2.title, ss2.description);

          for (const ss3 of ss2.subSubCategories3) {
            y = drawRow(doc, y, 4, ss3.title, ss3.description);
          }
        }
      }
    }

    y = ensureSpace(doc, y, 6);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, 196, y);
    y += 8;
  }

  return Buffer.from(doc.output("arraybuffer"));
}
