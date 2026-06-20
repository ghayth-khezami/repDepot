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

/** Light pastel tints per level — tree style, not heavy blocks. */
const LEVELS = [
  { label: "Catégorie", rgb: [237, 233, 254] as [number, number, number], text: [91, 33, 182] as [number, number, number], indent: 14 },
  { label: "Sous-cat.", rgb: [219, 234, 254] as [number, number, number], text: [29, 78, 216] as [number, number, number], indent: 22 },
  { label: "SS-cat. 1", rgb: [204, 251, 241] as [number, number, number], text: [15, 118, 110] as [number, number, number], indent: 30 },
  { label: "SS-cat. 2", rgb: [220, 252, 231] as [number, number, number], text: [21, 128, 61] as [number, number, number], indent: 38 },
  { label: "SS-cat. 3", rgb: [254, 243, 199] as [number, number, number], text: [180, 83, 9] as [number, number, number], indent: 46 },
] as const;

const PAGE_BOTTOM = 285;
const ROW_H = 7;
const LINE_COLOR: [number, number, number] = [200, 200, 200];

function ensureSpace(doc: jsPDF.jsPDF, y: number, need: number): number {
  if (y + need <= PAGE_BOTTOM) return y;
  doc.addPage();
  return 24;
}

function drawTreeNode(
  doc: jsPDF.jsPDF,
  y: number,
  level: number,
  title: string,
  subtitle: string | null | undefined,
  isLast: boolean,
  ancestorsLast: boolean[],
): number {
  const cfg = LEVELS[level];
  const rowH = subtitle?.trim() ? ROW_H + 3 : ROW_H;
  y = ensureSpace(doc, y, rowH + 2);

  const xBase = 14;
  let x = xBase;

  doc.setDrawColor(LINE_COLOR[0], LINE_COLOR[1], LINE_COLOR[2]);
  doc.setLineWidth(0.2);

  for (let i = 0; i < level; i++) {
    const branchX = xBase + 4 + i * 8;
    if (!ancestorsLast[i]) {
      doc.line(branchX, y - 2, branchX, y + rowH);
    }
    x = branchX + 4;
  }

  if (level > 0) {
    const branchX = xBase + 4 + (level - 1) * 8;
    doc.line(branchX, y + rowH / 2 - 1, branchX + 4, y + rowH / 2 - 1);
    if (!isLast) {
      doc.line(branchX, y + rowH / 2 - 1, branchX, y + rowH + 2);
    }
  }

  const nodeX = cfg.indent;
  const nodeW = 196 - nodeX;

  doc.setFillColor(cfg.rgb[0], cfg.rgb[1], cfg.rgb[2]);
  doc.setDrawColor(cfg.text[0], cfg.text[1], cfg.text[2]);
  doc.setLineWidth(0.15);
  doc.roundedRect(nodeX, y, nodeW, rowH, 1.5, 1.5, "FD");

  doc.setTextColor(cfg.text[0], cfg.text[1], cfg.text[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(level === 0 ? 10 : 8.5);
  doc.text(title, nodeX + 3, y + (subtitle?.trim() ? 4.5 : 5));

  if (subtitle?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle.trim().slice(0, 85), nodeX + 3, y + 8.5);
  }

  doc.setTextColor(0, 0, 0);
  return y + rowH + 2;
}

function walkSs3(
  doc: jsPDF.jsPDF,
  y: number,
  items: Ss3[],
  ancestorsLast: boolean[],
): number {
  items.forEach((item, i) => {
    const isLast = i === items.length - 1;
    y = drawTreeNode(doc, y, 4, item.title, item.description, isLast, [...ancestorsLast, isLast]);
  });
  return y;
}

function walkSs2(
  doc: jsPDF.jsPDF,
  y: number,
  items: Ss2[],
  ancestorsLast: boolean[],
): number {
  items.forEach((item, i) => {
    const isLast = i === items.length - 1;
    y = drawTreeNode(doc, y, 3, item.title, item.description, isLast, ancestorsLast);
    if (item.subSubCategories3.length > 0) {
      y = walkSs3(doc, y, item.subSubCategories3, [...ancestorsLast, isLast]);
    }
  });
  return y;
}

function walkSs1(
  doc: jsPDF.jsPDF,
  y: number,
  items: Ss1[],
  ancestorsLast: boolean[],
): number {
  items.forEach((item, i) => {
    const isLast = i === items.length - 1;
    y = drawTreeNode(doc, y, 2, item.title, item.description, isLast, ancestorsLast);
    if (item.subSubCategories2.length > 0) {
      y = walkSs2(doc, y, item.subSubCategories2, [...ancestorsLast, isLast]);
    }
  });
  return y;
}

function walkSubCategories(
  doc: jsPDF.jsPDF,
  y: number,
  items: SubCat[],
  ancestorsLast: boolean[],
): number {
  items.forEach((sub, i) => {
    const isLast = i === items.length - 1;
    y = drawTreeNode(doc, y, 1, sub.title, sub.description, isLast, ancestorsLast);
    if (sub.subSubCategories1.length > 0) {
      y = walkSs1(doc, y, sub.subSubCategories1, [...ancestorsLast, isLast]);
    }
  });
  return y;
}

export function buildCategoryHierarchyPdf(categories: CategoryTree[]): Buffer {
  const doc = new jsPDF.jsPDF();

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 20, "F");
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 20, 196, 20);

  doc.setTextColor(55, 65, 81);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Hiérarchie des catégories", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`BÉBÉ-DÉPÔT · ${new Date().toLocaleDateString("fr-FR")} · ${categories.length} catégorie(s)`, 14, 17);

  let y = 28;

  if (categories.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text("Aucune catégorie enregistrée.", 14, y + 6);
    return Buffer.from(doc.output("arraybuffer"));
  }

  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    const catIsLast = ci === categories.length - 1;
    y = drawTreeNode(doc, y, 0, cat.categoryName, cat.description, catIsLast, []);

    if (cat.subCategories.length === 0) {
      y = ensureSpace(doc, y, 6);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text("(aucune sous-catégorie)", 24, y + 3);
      doc.setTextColor(0, 0, 0);
      y += 8;
    } else {
      y = walkSubCategories(doc, y, cat.subCategories, [catIsLast]);
    }

    if (ci < categories.length - 1) {
      y = ensureSpace(doc, y, 8);
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(14, y, 196, y);
      y += 6;
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
