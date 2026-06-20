import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AGE_RANGES = [
  "Naissance",
  "1-2 ans",
  "2-4 ans",
  "4-6 ans",
  "6-8 ans",
  "8-10 ans",
  "10-12 ans",
] as const;

const CLOTHING_BOY = [
  "Body",
  "Pyjama",
  "Pantalon",
  "Short",
  "Pull",
  "Manteau",
  "Ensemble",
  "Chaussures",
  "Accessoires",
] as const;

const CLOTHING_GIRL = [
  "Body",
  "Pyjama",
  "Pantalon",
  "Robe",
  "Jupe",
  "Pull",
  "Manteau",
  "Ensemble",
  "Chaussures",
  "Accessoires",
] as const;

type Ss2Node = { title: string; ss3?: string[] };
type Ss1Node = { title: string; ss2: Ss2Node[] };
type SubNode = { title: string; description?: string; ss1: Ss1Node[] };
type CategoryNode = {
  categoryName: string;
  description: string;
  subCategories: SubNode[];
};

function clothingGender(gender: "Garçon" | "Fille", types: readonly string[]): SubNode {
  return {
    title: gender,
    description: `Vêtements ${gender.toLowerCase()} par tranche d'âge`,
    ss1: AGE_RANGES.map((age) => ({
      title: age,
      ss2: types.map((t) => ({ title: t })),
    })),
  };
}

const CATEGORY_TREE: CategoryNode[] = [
  {
    categoryName: "Vêtements",
    description: "Vêtements bébé, fille et garçon par âge et type.",
    subCategories: [
      clothingGender("Garçon", CLOTHING_BOY),
      clothingGender("Fille", CLOTHING_GIRL),
    ],
  },
  {
    categoryName: "Jouets",
    description: "Jouets d'éveil, éducatifs, peluches et jeux.",
    subCategories: [
      {
        title: "Éveil",
        description: "Tapis, hochets, mobiles et jouets sensoriels.",
        ss1: [
          {
            title: "0-6 mois",
            ss2: [
              { title: "Tapis d'éveil" },
              { title: "Hochet" },
              { title: "Mobile musical" },
              { title: "Anneau de dentition" },
              { title: "Balle sensorielle" },
            ],
          },
          {
            title: "6-12 mois",
            ss2: [
              { title: "Cube d'activités" },
              { title: "Livre tissu" },
              { title: "Arche de jeu" },
              { title: "Hochet musical" },
            ],
          },
          {
            title: "1-2 ans",
            ss2: [
              { title: "Boîte à formes" },
              { title: "Balle de préhension" },
              { title: "Centre d'activités" },
            ],
          },
        ],
      },
      {
        title: "Éducatifs",
        description: "Apprentissage, motricité et jeux de construction.",
        ss1: [
          {
            title: "1-2 ans",
            ss2: [
              { title: "Puzzle formes" },
              { title: "Cubes empilables" },
              { title: "Jeu de construction" },
            ],
          },
          {
            title: "2-4 ans",
            ss2: [
              { title: "Puzzle bois" },
              { title: "Jeu de tri" },
              { title: "Tableau magnétique" },
            ],
          },
          {
            title: "4-6 ans",
            ss2: [
              { title: "Jeu de société enfant" },
              { title: "Kit créatif" },
              { title: "Jeu de mémoire" },
            ],
          },
        ],
      },
      {
        title: "Peluches",
        description: "Doudous et peluches douces.",
        ss1: [
          {
            title: "0-12 mois",
            ss2: [{ title: "Doudou" }, { title: "Peluche petite" }, { title: "Marionnette" }],
          },
          {
            title: "1-3 ans",
            ss2: [{ title: "Peluche grande" }, { title: "Peluche interactive" }],
          },
        ],
      },
      {
        title: "Plein air",
        description: "Jeux d'extérieur et porteurs.",
        ss1: [
          {
            title: "1-2 ans",
            ss2: [{ title: "Porteur" }, { title: "Trotteur" }, { title: "Bac à sable" }],
          },
          {
            title: "2-4 ans",
            ss2: [{ title: "Tricycle" }, { title: "Draisienne" }, { title: "Toboggan" }],
          },
        ],
      },
    ],
  },
  {
    categoryName: "Équipement maman",
    description: "Valise maternité, allaitement et confort maman.",
    subCategories: [
      {
        title: "Valise maternité maman",
        description: "Essentiels maman pour la maternité.",
        ss1: [
          {
            title: "Allaitement",
            ss2: [
              { title: "Soutien-gorge d'allaitement" },
              { title: "Top d'allaitement" },
              { title: "Coussins d'allaitement" },
              { title: "Coussinets & coquille d'allaitement" },
              { title: "Bouts de seins" },
              { title: "Tire-lait" },
            ],
          },
          {
            title: "Confort & soins",
            ss2: [
              { title: "Ceinture de maintien" },
              { title: "Soins mamelons sensibles" },
              { title: "Culottes jetables" },
              { title: "Brassière post-partum" },
              { title: "Ceinture post-partum" },
            ],
          },
        ],
      },
      {
        title: "Valise maternité bébé",
        description: "Essentiels bébé pour la maternité.",
        ss1: [
          {
            title: "Naissance",
            ss2: [
              { title: "Bodies" },
              { title: "Dors-bien" },
              { title: "Brassières" },
              { title: "Bonnets" },
              { title: "Moufles" },
            ],
          },
          {
            title: "Sortie maternité",
            ss2: [
              { title: "Chaussettes & chaussons" },
              { title: "Valise bébé & accessoires" },
              { title: "Couverture" },
              { title: "Gigoteuse" },
            ],
          },
        ],
      },
      {
        title: "Allaitement & biberons",
        description: "Tire-lait, biberons et conservation.",
        ss1: [
          {
            title: "Tire-lait",
            ss2: [
              { title: "Tire-lait électrique" },
              { title: "Tire-lait manuel" },
              { title: "Accessoires tire-lait" },
            ],
          },
          {
            title: "Biberons",
            ss2: [
              { title: "Biberon anti-colique" },
              { title: "Tétines" },
              { title: "Stérilisateur" },
              { title: "Chauffe-biberon" },
            ],
          },
          {
            title: "Conservation lait",
            ss2: [
              { title: "Sacs conservation" },
              { title: "Coques réfrigération" },
              { title: "Organisateur" },
            ],
          },
        ],
      },
      {
        title: "Sac à langer",
        description: "Sacs et accessoires de transport.",
        ss1: [
          {
            title: "Sacs",
            ss2: [
              { title: "Sac à langer classique" },
              { title: "Sac à dos à langer" },
              { title: "Organisateur poussette" },
            ],
          },
        ],
      },
    ],
  },
  {
    categoryName: "Poussettes",
    description: "Poussettes, lits parapluie et transport bébé.",
    subCategories: [
      {
        title: "Poussettes cannes",
        description: "Poussettes légères et compactes.",
        ss1: [
          {
            title: "Voyage",
            ss2: [
              { title: "Poussette parapluie" },
              { title: "Poussette ultra compacte" },
              { title: "Poussette canne" },
            ],
          },
          {
            title: "Urbain",
            ss2: [
              { title: "Poussette ville" },
              { title: "Poussette légère" },
            ],
          },
        ],
      },
      {
        title: "Poussettes tout-terrain",
        description: "Grandes roues et confort longue promenade.",
        ss1: [
          {
            title: "3 roues",
            ss2: [
              { title: "Poussette jogging" },
              { title: "Poussette tout-terrain" },
            ],
          },
          {
            title: "Modulable",
            ss2: [
              { title: "Travel system" },
              { title: "Poussette + nacelle" },
              { title: "Poussette double" },
            ],
          },
        ],
      },
      {
        title: "Lits parapluie",
        description: "Lits de voyage pliables.",
        ss1: [
          {
            title: "0-3 ans",
            ss2: [
              { title: "Lit parapluie standard" },
              { title: "Lit parapluie avec matelas" },
              { title: "Berceau cododo" },
            ],
          },
        ],
      },
      {
        title: "Accessoires",
        description: "Housses, capotes et pièces poussette.",
        ss1: [
          {
            title: "Protection",
            ss2: [
              { title: "Housse pluie" },
              { title: "Capote UV" },
              { title: "Moustiquaire" },
            ],
          },
        ],
      },
    ],
  },
  {
    categoryName: "Hygiène & soin",
    description: "Bain, couches, soins et toilette bébé.",
    subCategories: [
      {
        title: "Couches & change",
        ss1: [
          {
            title: "0-6 mois",
            ss2: [{ title: "Couches" }, { title: "Lingettes" }, { title: "Crème change" }],
          },
          {
            title: "6-18 mois",
            ss2: [{ title: "Couches" }, { title: "Couches culottes" }, { title: "Lingettes" }],
          },
        ],
      },
      {
        title: "Bain",
        ss1: [
          {
            title: "0-12 mois",
            ss2: [
              { title: "Baignoire" },
              { title: "Transat de bain" },
              { title: "Serviette capuche" },
              { title: "Shampooing bébé" },
            ],
          },
        ],
      },
      {
        title: "Soins",
        ss1: [
          {
            title: "Tous âges",
            ss2: [
              { title: "Trousse de soin" },
              { title: "Thermomètre" },
              { title: "Coupe-ongles bébé" },
              { title: "Lait hydratant" },
            ],
          },
        ],
      },
    ],
  },
  {
    categoryName: "Chambre & déco",
    description: "Literie, veilleuses et décoration chambre bébé.",
    subCategories: [
      {
        title: "Literie",
        ss1: [
          {
            title: "Lit bébé",
            ss2: [
              { title: "Drap-housse" },
              { title: "Couverture" },
              { title: "Gigoteuse" },
              { title: "Tour de lit" },
            ],
          },
        ],
      },
      {
        title: "Déco & veilleuse",
        ss1: [
          {
            title: "Chambre",
            ss2: [
              { title: "Veilleuse" },
              { title: "Mobile musical" },
              { title: "Guirlande déco" },
              { title: "Ciel de lit" },
            ],
          },
        ],
      },
      {
        title: "Rangement",
        ss1: [
          {
            title: "Organisation",
            ss2: [
              { title: "Panier rangement" },
              { title: "Commode" },
              { title: "Organisateur lit" },
            ],
          },
        ],
      },
    ],
  },
];

async function seedCategoryTree() {
  let catCount = 0;
  let subCount = 0;
  let ss1Count = 0;
  let ss2Count = 0;
  let ss3Count = 0;

  for (const cat of CATEGORY_TREE) {
    const category = await prisma.category.create({
      data: {
        categoryName: cat.categoryName,
        description: cat.description,
      },
    });
    catCount++;

    for (const sub of cat.subCategories) {
      const subCategory = await prisma.subCategory.create({
        data: {
          title: sub.title,
          description: sub.description,
          categoryId: category.id,
        },
      });
      subCount++;

      for (const ss1 of sub.ss1) {
        const subSub1 = await prisma.subSubCategory1.create({
          data: {
            title: ss1.title,
            subCategoryId: subCategory.id,
          },
        });
        ss1Count++;

        for (const ss2 of ss1.ss2) {
          const subSub2 = await prisma.subSubCategory2.create({
            data: {
              title: ss2.title,
              subSubCategory1Id: subSub1.id,
            },
          });
          ss2Count++;

          for (const ss3Title of ss2.ss3 ?? []) {
            await prisma.subSubCategory3.create({
              data: {
                title: ss3Title,
                subSubCategory2Id: subSub2.id,
              },
            });
            ss3Count++;
          }
        }
      }
    }

    console.log(`✓ ${cat.categoryName}`);
  }

  console.log("\n📊 Hiérarchie créée :");
  console.log(`   Catégories: ${catCount}`);
  console.log(`   Sous-catégories: ${subCount}`);
  console.log(`   SS-cat. 1: ${ss1Count}`);
  console.log(`   SS-cat. 2: ${ss2Count}`);
  console.log(`   SS-cat. 3: ${ss3Count}`);
}

async function seedSampleProducts() {
  const vetements = await prisma.category.findUnique({
    where: { categoryName: "Vêtements" },
    include: {
      subCategories: {
        where: { title: "Garçon" },
        include: {
          subSubCategories1: {
            where: { title: "1-2 ans" },
            include: {
              subSubCategories2: {
                where: { title: "Pantalon" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const leaf = vetements?.subCategories[0]?.subSubCategories1[0]?.subSubCategories2[0];
  if (leaf) {
    const catId = vetements!.id;
    const subId = vetements!.subCategories[0].id;
    const ss1Id = vetements!.subCategories[0].subSubCategories1[0].id;
    await prisma.product.create({
      data: {
        productName: "Pantalon garçon 1-2 ans — exemple",
        description: "Pantalon confortable coton, taille 1-2 ans.",
        PrixVente: 19.99,
        PrixAchat: 12,
        stockQuantity: 5,
        isDepot: false,
        isDispo: true,
        categoryId: catId,
        subCategoryId: subId,
        subSubCategory1Id: ss1Id,
        subSubCategory2Id: leaf.id,
      },
    });
    console.log("✓ Produit exemple créé (Pantalon garçon 1-2 ans)");
  }
}

async function main() {
  const existing = await prisma.category.count();
  if (existing > 0) {
    console.log(`⏭️  ${existing} catégorie(s) déjà présentes — seed ignoré.`);
    console.log("   (Supprimez les catégories ou réappliquez la migration reset pour re-seeder.)");
    return;
  }

  console.log("🌳 Seed hiérarchie catégories BÉBÉ-DÉPÔT\n");
  await seedCategoryTree();
  await seedSampleProducts();
  console.log("\n✅ Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
