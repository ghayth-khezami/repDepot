import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { categoryName: "Vêtements bébé", description: "Bodies, pyjamas, ensembles et accessoires." },
    { categoryName: "Jeux & éveil", description: "Jouets d’éveil, puzzles, peluches et apprentissage." },
    { categoryName: "Équipement", description: "Poussettes, sièges auto, lits, chaises hautes." },
    { categoryName: "Hygiène & soin", description: "Bain, couches, soins, biberons et stérilisation." },
    { categoryName: "Chambre & déco", description: "Veilleuses, linge, mobiles et organisation." },
  ];

  const createdCats = [];
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { categoryName: c.categoryName },
      update: { description: c.description },
      create: c,
    });
    createdCats.push(cat);
  }

  const pick = (name: string) => createdCats.find((c) => c.categoryName === name)!;

  // Génère beaucoup de produits pour tester pagination 10/10 + scroll append.
  const products: Array<{
    productName: string;
    description: string;
    PrixVente: number;
    PrixAchat: number;
    stockQuantity: number;
    isDepot: boolean;
    categoryId: string;
  }> = [];

  const vêtements = [
    "Body coton bio",
    "Pyjama velours",
    "Ensemble naissance",
    "Bonnet douceur",
    "Chaussons tricot",
    "Grenouillère hiver",
    "Gigoteuse 0-6 mois",
    "Lot de bavoirs",
    "Pantalon bébé",
    "Gilet chaud",
  ];
  const jeux = [
    "Peluche doudou",
    "Anneau de dentition",
    "Tapis d’éveil",
    "Livre tissu",
    "Cubes empilables",
    "Hochet musical",
    "Puzzle formes",
    "Balle sensorielle",
    "Boîte à formes",
    "Petit xylophone",
  ];
  const equip = [
    "Poussette compacte",
    "Siège auto groupe 0+",
    "Transat bébé",
    "Chaise haute évolutive",
    "Lit parapluie",
    "Porte-bébé ergonomique",
    "Trotteur bébé",
    "Barrière de sécurité",
    "Babyphone",
    "Thermomètre digital",
  ];
  const hygiene = [
    "Lot de couches",
    "Lingettes douceur",
    "Baignoire bébé",
    "Trousse de soin",
    "Biberon anti-colique",
    "Stérilisateur",
    "Chauffe-biberon",
    "Crème change",
    "Shampooing bébé",
    "Lait hydratant",
  ];
  const chambre = [
    "Veilleuse étoile",
    "Mobile musical",
    "Tour de lit",
    "Drap-housse",
    "Couverture polaire",
    "Organisateur lit",
    "Panier rangement",
    "Tapis chambre",
    "Ciel de lit",
    "Guirlande déco",
  ];

  function addBatch(names: string[], catId: string, base: number) {
    for (let i = 0; i < names.length; i++) {
      for (let v = 1; v <= 5; v++) {
        const price = base + i * 3 + v * 1.5;
        products.push({
          productName: `${names[i]} - Modèle ${v}`,
          description:
            "Qualité premium, doux pour la peau, idéal pour bébé. Livraison rapide et support 7/7.",
          PrixVente: Number(price.toFixed(2)),
          PrixAchat: Number((price * 0.65).toFixed(2)),
          stockQuantity: 50,
          isDepot: false,
          categoryId: catId,
        });
      }
    }
  }

  addBatch(vêtements, pick("Vêtements bébé").id, 24);
  addBatch(jeux, pick("Jeux & éveil").id, 18);
  addBatch(equip, pick("Équipement").id, 120);
  addBatch(hygiene, pick("Hygiène & soin").id, 12);
  addBatch(chambre, pick("Chambre & déco").id, 20);

  for (const p of products) {
    await prisma.product.create({ data: p }).catch(() => {});
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

