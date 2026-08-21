import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CategoryNode = { name: string; children?: CategoryNode[] };

type Parent = {
  categoryId?: string;
  subCategoryId?: string;
  subSubCategory1Id?: string;
  subSubCategory2Id?: string;
};

const CATEGORY_TREE: CategoryNode[] = [
  { name: "Maman", children: [{ name: "Pantalons de grossesse" }, { name: "Grossesse et accessoires", children: [{ name: "Coussins de grossesse" }, { name: "Accessoires de grossesse" }] }] },
  { name: "Éveil et jeux", children: [{ name: "Parcs" }, { name: "Transats et balancelles électriques" }, { name: "Tapis d'éveil" }, { name: "Jouets", children: [{ name: "Jouets d'éveil" }, { name: "Trotteurs" }, { name: "Jeux éducatifs" }, { name: "Jeux pour enfants" }, { name: "Peluches" }] }] },
  { name: "Puériculture", children: [{ name: "Sortie et promenade", children: [{ name: "Poussettes" }, { name: "Nacelles" }, { name: "Porte-bébés" }] }, { name: "Bain et soins", children: [{ name: "Table à langer et matelas à langer" }, { name: "Pots et réducteurs de toilettes" }, { name: "Baignoires et thermomètres" }, { name: "Hygiène", children: [{ name: "Trousses de bain" }, { name: "Parfums et coffrets" }] }] }, { name: "Repas", children: [{ name: "Chaises hautes et réducteurs" }, { name: "Biberons et tétines" }, { name: "Chauffe-biberons" }, { name: "Robots" }, { name: "Accessoires repas" }, { name: "Tire-lait et accessoires d'allaitement" }, { name: "Stérilisateurs" }] }] },
  { name: "Chambre bébé", children: [{ name: "Landau" }, { name: "Lit" }, { name: "Bureau" }, { name: "Armoire" }, { name: "Sécurité" }] },
  { name: "Vêtements", children: [{ name: "Par âge", children: [{ name: "0-3 mois", children: [{ name: "Sortie de clinique" }, { name: "Bodies" }, { name: "Tenues et ensembles" }, { name: "Pyjamas" }, { name: "Pulls" }, { name: "Chemises" }, { name: "Pantalons et shorts" }, { name: "Maillots et accessoires de plage" }, { name: "Gilets, vestes et manteaux" }] }, { name: "3-6 mois" }, { name: "6-9 mois" }, { name: "9-12 mois" }, { name: "12-24 mois" }, { name: "24-36 mois" }] }] },
  { name: "Accessoires", children: [{ name: "Gigoteuses" }, { name: "Bonnet, chaussons et gants" }, { name: "T-shirts et chemises" }, { name: "Pantalons et shorts" }, { name: "Maillots et accessoires" }, { name: "Gilets, vestes et manteaux" }] },
  { name: "Chambre enfant", children: [{ name: "Accessoires chambre" }, { name: "Chaises", children: [{ name: "Chaise garçon" }, { name: "Chaise fille" }] }] },
];

async function seedCategory(node: CategoryNode, parent: Parent = {}, depth = 0): Promise<number> {
  let id: string;
  if (depth === 0) {
    id = (await prisma.category.upsert({ where: { categoryName: node.name }, update: {}, create: { categoryName: node.name } })).id;
  } else if (depth === 1) {
    id = (await prisma.subCategory.findFirst({ where: { categoryId: parent.categoryId, title: node.name } }))?.id ?? (await prisma.subCategory.create({ data: { title: node.name, categoryId: parent.categoryId! } })).id;
  } else if (depth === 2) {
    id = (await prisma.subSubCategory1.findFirst({ where: { subCategoryId: parent.subCategoryId, title: node.name } }))?.id ?? (await prisma.subSubCategory1.create({ data: { title: node.name, subCategoryId: parent.subCategoryId! } })).id;
  } else if (depth === 3) {
    id = (await prisma.subSubCategory2.findFirst({ where: { subSubCategory1Id: parent.subSubCategory1Id, title: node.name } }))?.id ?? (await prisma.subSubCategory2.create({ data: { title: node.name, subSubCategory1Id: parent.subSubCategory1Id! } })).id;
  } else if (depth === 4) {
    id = (await prisma.subSubCategory3.findFirst({ where: { subSubCategory2Id: parent.subSubCategory2Id, title: node.name } }))?.id ?? (await prisma.subSubCategory3.create({ data: { title: node.name, subSubCategory2Id: parent.subSubCategory2Id! } })).id;
  } else {
    throw new Error(`Profondeur de catégorie non supportée pour « ${node.name} »`);
  }

  let count = 1;
  for (const child of node.children ?? []) {
    const nextParent = depth === 0 ? { categoryId: id } : depth === 1 ? { subCategoryId: id } : depth === 2 ? { subSubCategory1Id: id } : { subSubCategory2Id: id };
    count += await seedCategory(child, nextParent, depth + 1);
  }
  return count;
}

async function main() {
  const count = (await Promise.all(CATEGORY_TREE.map((category) => seedCategory(category)))).reduce((sum, value) => sum + value, 0);
  console.log(`Hiérarchie Bébé Dépôt synchronisée : ${count} nœuds traités.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
