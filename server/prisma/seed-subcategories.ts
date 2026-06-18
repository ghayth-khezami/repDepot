import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUB_BY_CATEGORY: Record<string, Array<{ title: string; description: string }>> = {
  Vetements: [
    { title: "Bodies & pyjamas", description: "Bodies, grenouillères et pyjamas bébé." },
    { title: "Chaussures", description: "Chaussons et premières chaussures." },
    { title: "Ensembles", description: "Ensembles et tenues complètes." },
    { title: "Accessoires", description: "Bonnets, bavoirs et accessoires textile." },
  ],
  Poussettes: [
    { title: "Poussettes", description: "Poussettes cannes et tout-terrain." },
    { title: "Nacelles & landaus", description: "Coques, nacelles et systèmes modulaires." },
    { title: "Accessoires transport", description: "Housses, parasols et accessoires." },
  ],
  Jouets: [
    { title: "Éveil", description: "Tapis, arches et jouets sensoriels." },
    { title: "Éducatifs", description: "Jeux d'apprentissage et motricité." },
    { title: "Peluches", description: "Doudous et peluches douces." },
  ],
  "Equipement maman": [
    { title: "Tire-lait", description: "Tire-lait et accessoires d'allaitement." },
    { title: "Biberons", description: "Biberons, tétines et stérilisation." },
    { title: "Soins maman", description: "Coussins, ceintures et confort post-partum." },
  ],
};

async function main() {
  for (const [categoryName, subs] of Object.entries(SUB_BY_CATEGORY)) {
    const category = await prisma.category.findUnique({ where: { categoryName } });
    if (!category) {
      console.warn(`Catégorie introuvable: ${categoryName}`);
      continue;
    }
    for (const sub of subs) {
      const existing = await prisma.subCategory.findFirst({
        where: { categoryId: category.id, title: sub.title },
      });
      if (existing) continue;
      await prisma.subCategory.create({
        data: {
          title: sub.title,
          description: sub.description,
          categoryId: category.id,
        },
      });
    }
    console.log(`✓ ${categoryName}: ${subs.length} sous-catégories`);
  }

  // Assign subcategories to products without one (by category, round-robin)
  const products = await prisma.product.findMany({
    where: { subCategoryId: null },
    select: { id: true, categoryId: true },
  });
  const subsByCat = new Map<string, string[]>();
  const allSubs = await prisma.subCategory.findMany({ select: { id: true, categoryId: true } });
  for (const s of allSubs) {
    const list = subsByCat.get(s.categoryId) ?? [];
    list.push(s.id);
    subsByCat.set(s.categoryId, list);
  }
  const counters = new Map<string, number>();
  for (const p of products) {
    const ids = subsByCat.get(p.categoryId);
    if (!ids?.length) continue;
    const i = counters.get(p.categoryId) ?? 0;
    await prisma.product.update({
      where: { id: p.id },
      data: { subCategoryId: ids[i % ids.length] },
    });
    counters.set(p.categoryId, i + 1);
  }
  console.log(`✓ ${products.length} produits mis à jour avec une sous-catégorie`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
