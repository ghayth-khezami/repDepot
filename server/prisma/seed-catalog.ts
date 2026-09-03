import { PrismaClient } from "@prisma/client";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve, extname } from "path";

const prisma = new PrismaClient();

const ROOT = resolve(__dirname, "../..");
const MOCK_DIR = join(ROOT, "mock");
const UPLOADS_DIR = join(__dirname, "../uploads");

type ProductSeed = {
  productName: string;
  description: string;
  PrixVente: number;
  PrixAchat: number;
  stockQuantity: number;
  mockFile: string;
};

const CATEGORIES = [
  { categoryName: "Vêtements", description: "Vêtements et chaussures bébé, fille et garçon." },
  { categoryName: "Poussettes", description: "Poussettes, lits parapluie et équipement de transport bébé." },
  { categoryName: "Jouets", description: "Jouets d'éveil, éducatifs et peluches pour bébé." },
  {
    categoryName: "Équipement maman",
    description: "Tire-lait, accessoires allaitement et équipement maman.",
  },
] as const;

const POUSSettes_PHOTOS = [
  "615637676_122119281243009997_4643357490948787349_ndepot.jpg",
  "615683665_122119281249009997_8505744795926701503_n.jpg",
  "615819302_122119060125009997_4161721613360886563_n.jpg",
  "617683981_122119281279009997_1291049122615193454_n.jpg",
  "639492511_17871751473544187_6023435918688983555_n.jpg",
  "639498876_17871751464544187_6631056917761929704_n - Copy.jpg",
  "659046068_122126666985009997_2424759249400550027_n.jpg",
  "662125960_122126666991009997_4738779568182384739_n.jpg",
  "677141962_122128573581009997_9051400207690283795_n.jpg",
  "aaaaaaaaaaaaaaaaaaaaaaaaaa.jpg",
];

const POUSSettes_PRODUCTS: Omit<ProductSeed, "mockFile">[] = [
  {
    productName: "Poussette Bébé Confort – neuf",
    description:
      "Poussette Bébé Confort compacte, état neuf avec protections encore en place. Idéale pour les déplacements urbains.",
    PrixVente: 189.99,
    PrixAchat: 120,
    stockQuantity: 3,
  },
  {
    productName: "Poussette très compacte",
    description:
      "Poussette ultra compacte, pliage rapide, panier de rangement spacieux. Parfaite pour la ville.",
    PrixVente: 149.99,
    PrixAchat: 95,
    stockQuantity: 4,
  },
  {
    productName: "Poussette Bébé Confort originale, très propre",
    description:
      "Poussette Bébé Confort originale, très propre et confortable pour bébé. Harnais 5 points, excellent état.",
    PrixVente: 129.99,
    PrixAchat: 80,
    stockQuantity: 2,
  },
  {
    productName: "Poussette Giordani à vendre",
    description:
      "Poussette Giordani compacte, tissu gris, très propre. Pliage facile, panier mesh inclus.",
    PrixVente: 99.99,
    PrixAchat: 65,
    stockQuantity: 2,
  },
  {
    productName: "Berceau cododo Maxi-Cosi – gris",
    description: "Berceau cododo réglable en hauteur, matelas inclus, coloris gris et bois.",
    PrixVente: 159.99,
    PrixAchat: 100,
    stockQuantity: 2,
  },
  {
    productName: "Berceau cododo bébé – bleu",
    description: "Berceau cododo élégant, tissu bleu clair, finition bois. État très propre.",
    PrixVente: 149.99,
    PrixAchat: 95,
    stockQuantity: 1,
  },
  {
    productName: "Lit parapluie Mots d'enfants – neuf",
    description: "Lit parapluie neuf cacheté, 0-3 ans, moins de 15 kg. Sac de transport inclus.",
    PrixVente: 79.99,
    PrixAchat: 50,
    stockQuantity: 5,
  },
  {
    productName: "Lit parapluie bleu marine",
    description: "Lit parapluie avec panneaux mesh, très propre. Pliage compact pour voyage.",
    PrixVente: 69.99,
    PrixAchat: 45,
    stockQuantity: 3,
  },
  {
    productName: "Poussette canne noire et beige",
    description: "Poussette canne légère, siège beige, châssis noir. Jouets suspendus inclus.",
    PrixVente: 89.99,
    PrixAchat: 55,
    stockQuantity: 2,
  },
  {
    productName: "Poussette 3 roues tout-terrain",
    description: "Poussette robuste, grandes roues, capote intégrée. Idéale promenades longues.",
    PrixVente: 199.99,
    PrixAchat: 130,
    stockQuantity: 1,
  },
  {
    productName: "Poussette double compacte",
    description: "Poussette double pour jumeaux, pliage compact, très bon état.",
    PrixVente: 249.99,
    PrixAchat: 160,
    stockQuantity: 1,
  },
  {
    productName: "Poussette jogging",
    description: "Poussette 3 roues pour jogging, suspension renforcée, frein pied.",
    PrixVente: 179.99,
    PrixAchat: 115,
    stockQuantity: 2,
  },
  {
    productName: "Poussette urbaine pliable",
    description: "Poussette légère une main, idéale transports en commun.",
    PrixVente: 119.99,
    PrixAchat: 75,
    stockQuantity: 4,
  },
  {
    productName: "Poussette avec nacelle",
    description: "Ensemble poussette + nacelle, nouveau-né à 15 kg. Harnais réversible.",
    PrixVente: 279.99,
    PrixAchat: 180,
    stockQuantity: 1,
  },
  {
    productName: "Poussette vintage rénovée",
    description: "Poussette style rétro, tissu neuf, châssis restauré. Pièce unique.",
    PrixVente: 159.99,
    PrixAchat: 90,
    stockQuantity: 1,
  },
  {
    productName: "Poussette travel system",
    description: "Travel system avec coque auto, adaptateurs inclus. Marque Bébé Confort.",
    PrixVente: 329.99,
    PrixAchat: 210,
    stockQuantity: 1,
  },
  {
    productName: "Poussette parapluie légère",
    description: "Poids plume, sac épaule, idéale vacances. Pliage parapluie en 3 secondes.",
    PrixVente: 59.99,
    PrixAchat: 35,
    stockQuantity: 6,
  },
  {
    productName: "Poussette tout terrain verte",
    description: "Poussette Bébé Confort vert émeraude, état neuf, pochette marque incluse.",
    PrixVente: 169.99,
    PrixAchat: 110,
    stockQuantity: 2,
  },
  {
    productName: "Poussette avec housse pluie",
    description: "Poussette compacte + housse pluie offerte. Très propre, peu servie.",
    PrixVente: 109.99,
    PrixAchat: 70,
    stockQuantity: 2,
  },
  {
    productName: "Poussette premium confort",
    description: "Suspension amortie, grand panier, capote XXL UV50+. Confort maximal bébé.",
    PrixVente: 219.99,
    PrixAchat: 140,
    stockQuantity: 2,
  },
];

const VETEMENTS_PHOTOS = [
  "vertement/1779278670037.png",
  "vertement/1779278675854.png",
  "vertement/1779278682751.png",
];

const VETEMENTS_PRODUCTS: Omit<ProductSeed, "mockFile">[] = [
  {
    productName: "Baskets Levi's fille – pointure 32",
    description: "Baskets Levi's roses, mesh respirant, scratch. Pointure 32, état neuf avec étiquette.",
    PrixVente: 45.99,
    PrixAchat: 28,
    stockQuantity: 2,
  },
  {
    productName: "Baskets Levi's garçon – pointure 33",
    description: "Baskets Levi's bleu marine, accents vert citron. Pointure 33, très bon état.",
    PrixVente: 42.99,
    PrixAchat: 26,
    stockQuantity: 2,
  },
  {
    productName: "Baskets Levi's unisexe – pointure 35",
    description: "Baskets Levi's blanches et gris, scratch, pointure 35. État neuf.",
    PrixVente: 48.99,
    PrixAchat: 30,
    stockQuantity: 1,
  },
  {
    productName: "Baskets fille rose pailletées",
    description: "Chaussures fille roses à scratch, semelle blanche confortable.",
    PrixVente: 29.99,
    PrixAchat: 18,
    stockQuantity: 4,
  },
  {
    productName: "Baskets garçon sport bleu",
    description: "Chaussures garçon bleu marine, semelle antidérapante, idéal école.",
    PrixVente: 34.99,
    PrixAchat: 22,
    stockQuantity: 3,
  },
  {
    productName: "Sandales fille été",
    description: "Sandales ouvertes fille, brides réglables, coloris pastel.",
    PrixVente: 24.99,
    PrixAchat: 15,
    stockQuantity: 5,
  },
  {
    productName: "Sandales garçon été",
    description: "Sandales garçon robustes, scratch, parfaites pour la plage.",
    PrixVente: 24.99,
    PrixAchat: 15,
    stockQuantity: 4,
  },
  {
    productName: "Bottines fille cuir synthétique",
    description: "Bottines fille beige, doublure chaude, pointures 28 à 32.",
    PrixVente: 39.99,
    PrixAchat: 25,
    stockQuantity: 2,
  },
  {
    productName: "Bottines garçon marron",
    description: "Bottines garçon marron, semelle caoutchouc, fermeture zip.",
    PrixVente: 39.99,
    PrixAchat: 25,
    stockQuantity: 2,
  },
  {
    productName: "Chaussons bébé fille",
    description: "Chaussons antidérapants fille, motif cœurs, 0-12 mois.",
    PrixVente: 12.99,
    PrixAchat: 7,
    stockQuantity: 8,
  },
  {
    productName: "Chaussons bébé garçon",
    description: "Chaussons antidérapants garçon, motif voitures, 0-12 mois.",
    PrixVente: 12.99,
    PrixAchat: 7,
    stockQuantity: 8,
  },
  {
    productName: "Body coton bio fille",
    description: "Lot 3 bodies fille coton bio, manches courtes, 3-6 mois.",
    PrixVente: 22.99,
    PrixAchat: 14,
    stockQuantity: 6,
  },
  {
    productName: "Body coton bio garçon",
    description: "Lot 3 bodies garçon coton bio, imprimé animaux, 6-9 mois.",
    PrixVente: 22.99,
    PrixAchat: 14,
    stockQuantity: 6,
  },
  {
    productName: "Pyjama velours fille",
    description: "Pyjama 2 pièces fille velours doux, motif étoiles, 12-18 mois.",
    PrixVente: 26.99,
    PrixAchat: 16,
    stockQuantity: 4,
  },
  {
    productName: "Pyjama velours garçon",
    description: "Pyjama 2 pièces garçon velours, motif dinosaures, 18-24 mois.",
    PrixVente: 26.99,
    PrixAchat: 16,
    stockQuantity: 4,
  },
  {
    productName: "Ensemble naissance fille",
    description: "Ensemble naissance fille : body + bonnet + chaussons, coton doux.",
    PrixVente: 32.99,
    PrixAchat: 20,
    stockQuantity: 3,
  },
  {
    productName: "Ensemble naissance garçon",
    description: "Ensemble naissance garçon : body + bonnet + moufles, bleu ciel.",
    PrixVente: 32.99,
    PrixAchat: 20,
    stockQuantity: 3,
  },
  {
    productName: "Robe été fille",
    description: "Robe légère fille fleurie, 2-3 ans, coton imprimé.",
    PrixVente: 19.99,
    PrixAchat: 12,
    stockQuantity: 5,
  },
  {
    productName: "Short + t-shirt garçon",
    description: "Ensemble short et t-shirt garçon, coton, 3-4 ans.",
    PrixVente: 18.99,
    PrixAchat: 11,
    stockQuantity: 5,
  },
  {
    productName: "Manteau hiver fille",
    description: "Manteau chaud fille capuche, doublure polaire, 4-5 ans.",
    PrixVente: 54.99,
    PrixAchat: 35,
    stockQuantity: 2,
  },
];

const MAMAN_PHOTOS = [
  "vertement/g/1779278689371.png",
  "vertement/g/1779278695631.png",
];

const MAMAN_PRODUCTS: Omit<ProductSeed, "mockFile">[] = [
  {
    productName: "Tire-lait portable Dr. Isla EB26",
    description:
      "Tire-lait électrique mains libres, 4 modes, 12 niveaux, sans BPA. Téterelles 19 mm et 24 mm incluses.",
    PrixVente: 89.99,
    PrixAchat: 55,
    stockQuantity: 4,
  },
  {
    productName: "Tire-lait double Dr. Isla – neuf",
    description: "Tire-lait portable double, affichage digital, bruit ≤40 dB, capacité 180 ml.",
    PrixVente: 129.99,
    PrixAchat: 80,
    stockQuantity: 2,
  },
  {
    productName: "Coussin d'allaitement",
    description: "Coussin d'allaitement ergonomique, housse lavable, soutien dos et bébé.",
    PrixVente: 34.99,
    PrixAchat: 22,
    stockQuantity: 5,
  },
  {
    productName: "Coussinet jetables x60",
    description: "Coussinets d'allaitement jetables, ultra absorbants, boîte de 60.",
    PrixVente: 12.99,
    PrixAchat: 7,
    stockQuantity: 10,
  },
  {
    productName: "Crème lanoline maman",
    description: "Crème lanoline pure pour crevasses, sans rinçage, 40 ml.",
    PrixVente: 14.99,
    PrixAchat: 9,
    stockQuantity: 8,
  },
  {
    productName: "Sac à langer maman",
    description: "Sac à langer spacieux, nombreuses poches, bandoulière réglable.",
    PrixVente: 49.99,
    PrixAchat: 32,
    stockQuantity: 3,
  },
  {
    productName: "Biberon anti-colique 260 ml",
    description: "Biberon col large, tétine débit moyen, valve anti-colique.",
    PrixVente: 11.99,
    PrixAchat: 7,
    stockQuantity: 12,
  },
  {
    productName: "Stérilisateur micro-ondes",
    description: "Stérilisateur compact micro-ondes, 4 biberons, 5 minutes.",
    PrixVente: 24.99,
    PrixAchat: 16,
    stockQuantity: 4,
  },
  {
    productName: "Chauffe-biberon portable",
    description: "Chauffe-biberon de voyage, chauffe en 3 min, adaptateur voiture.",
    PrixVente: 39.99,
    PrixAchat: 25,
    stockQuantity: 3,
  },
  {
    productName: "Tire-lait manuel silicone",
    description: "Tire-lait manuel doux silicone, léger, idéal début allaitement.",
    PrixVente: 19.99,
    PrixAchat: 12,
    stockQuantity: 6,
  },
  {
    productName: "Coque conservation lait",
    description: "Lot 6 coques réfrigération lait maternel, compatible tire-lait.",
    PrixVente: 9.99,
    PrixAchat: 6,
    stockQuantity: 10,
  },
  {
    productName: "Sacs conservation lait x25",
    description: "Sacs stérilisables conservation lait, 200 ml, lot de 25.",
    PrixVente: 14.99,
    PrixAchat: 9,
    stockQuantity: 8,
  },
  {
    productName: "Brassière allaitement",
    description: "Brassière d'allaitement coton, ouverture clip, plusieurs coloris.",
    PrixVente: 22.99,
    PrixAchat: 14,
    stockQuantity: 6,
  },
  {
    productName: "Protège-épaules bébé",
    description: "Protège-épaules lavable pour rots, tissu éponge doux.",
    PrixVente: 8.99,
    PrixAchat: 5,
    stockQuantity: 12,
  },
  {
    productName: "Kit tire-lait complet",
    description: "Tire-lait + sac transport + 4 biberons + 10 sachets conservation.",
    PrixVente: 149.99,
    PrixAchat: 95,
    stockQuantity: 2,
  },
  {
    productName: "Massage post-partum huile",
    description: "Huile massage ventre post-partum, 100% naturelle, 100 ml.",
    PrixVente: 18.99,
    PrixAchat: 11,
    stockQuantity: 5,
  },
  {
    productName: "Ceinture post-partum",
    description: "Ceinture de soutien ventre réglable, confortable, taille unique.",
    PrixVente: 29.99,
    PrixAchat: 18,
    stockQuantity: 4,
  },
  {
    productName: "Thermomètre biberon",
    description: "Thermomètre digital biberon, lecture rapide, sans BPA.",
    PrixVente: 9.99,
    PrixAchat: 6,
    stockQuantity: 8,
  },
  {
    productName: "Tétines tire-lait x2",
    description: "Téterelles de rechange 24 mm, lot de 2, silicone alimentaire.",
    PrixVente: 12.99,
    PrixAchat: 8,
    stockQuantity: 10,
  },
  {
    productName: "Organisateur tire-lait",
    description: "Support rangement tire-lait et accessoires, compact, antibactérien.",
    PrixVente: 16.99,
    PrixAchat: 10,
    stockQuantity: 5,
  },
];

const JOUETS_PHOTOS = [
  "New folder/81yQjQ8KufL._AC_SX569_.jpg",
  "New folder/dde49045-e5c3-4481-9338-4cc3a27605c4.jpg",
  "New folder/images (1).jpg",
  "New folder/jouetenfant2-636810070403216198.jpg",
];

const JOUETS_PRODUCTS: Omit<ProductSeed, "mockFile">[] = [
  {
    productName: "Boîte à formes sensorielle élastiques",
    description:
      "Jouet d'éveil avec bandes élastiques colorées et 10 formes texturées. Développe motricité fine.",
    PrixVente: 32.99,
    PrixAchat: 20,
    stockQuantity: 5,
  },
  {
    productName: "Lot hochets et anneaux dentition",
    description: "Assortiment hochets, peluches et anneaux de dentition pour bébé 0-12 mois.",
    PrixVente: 28.99,
    PrixAchat: 18,
    stockQuantity: 4,
  },
  {
    productName: "Ferme parlante Chicco",
    description:
      "Ferme interactive Chicco : animaux, chiffres 1-10, mode musical. Jouet éducatif bilingue.",
    PrixVente: 45.99,
    PrixAchat: 28,
    stockQuantity: 3,
  },
  {
    productName: "Ferme Chicco avec tracteur",
    description: "Ma ferme parlante Chicco, fermier sur tracteur, apprentissage des animaux.",
    PrixVente: 49.99,
    PrixAchat: 32,
    stockQuantity: 2,
  },
  {
    productName: "Hochet panda avec miroir",
    description: "Hochet peluche panda noir et blanc, miroir sécurisé, textures variées.",
    PrixVente: 14.99,
    PrixAchat: 9,
    stockQuantity: 6,
  },
  {
    productName: "Hochet grenouille peluche",
    description: "Hochet grenouille vert et rouge, facile à attraper, sons doux.",
    PrixVente: 12.99,
    PrixAchat: 8,
    stockQuantity: 6,
  },
  {
    productName: "Tapis d'éveil archipel",
    description: "Tapis d'éveil avec arches colorées, miroir et hochets suspendus.",
    PrixVente: 39.99,
    PrixAchat: 25,
    stockQuantity: 3,
  },
  {
    productName: "Cube d'activités Toucan",
    description: "Cube sensoriel tissu Toucan, textures et bruits crinkle.",
    PrixVente: 18.99,
    PrixAchat: 12,
    stockQuantity: 5,
  },
  {
    productName: "Balle sensorielle verte",
    description: "Balle transparente avec billes colorées, stimule la vue et l'ouïe.",
    PrixVente: 9.99,
    PrixAchat: 6,
    stockQuantity: 10,
  },
  {
    productName: "Livre tissu premiers mots",
    description: "Livre en tissu lavable, pages crinkle, images contrastées.",
    PrixVente: 15.99,
    PrixAchat: 10,
    stockQuantity: 7,
  },
  {
    productName: "Cubes empilables souples",
    description: "6 cubes souples à empiler, chiffres et animaux, PVC-free.",
    PrixVente: 16.99,
    PrixAchat: 11,
    stockQuantity: 6,
  },
  {
    productName: "Xylophone bébé bois",
    description: "Xylophone 5 notes bois, maillet arrondi, sans BPA.",
    PrixVente: 19.99,
    PrixAchat: 12,
    stockQuantity: 4,
  },
  {
    productName: "Peluche doudou lapin",
    description: "Doudou lapin gris ultra doux, 30 cm, lavable machine 30°.",
    PrixVente: 22.99,
    PrixAchat: 14,
    stockQuantity: 5,
  },
  {
    productName: "Mobile musical nuages",
    description: "Mobile musical à accrocher, mélodies douces, personnages nuages.",
    PrixVente: 34.99,
    PrixAchat: 22,
    stockQuantity: 3,
  },
  {
    productName: "Anneau de dentition feuille",
    description: "Anneau dentition forme feuille, silicone alimentaire, réfrigérable.",
    PrixVente: 8.99,
    PrixAchat: 5,
    stockQuantity: 12,
  },
  {
    productName: "Balle de préhension tubes",
    description: "Balle tubes entrelacés multicolores, développe la préhension.",
    PrixVente: 11.99,
    PrixAchat: 7,
    stockQuantity: 8,
  },
  {
    productName: "Puzzle formes bois",
    description: "Puzzle 5 formes en bois, poignées adaptées aux petites mains.",
    PrixVente: 17.99,
    PrixAchat: 11,
    stockQuantity: 5,
  },
  {
    productName: "Hochet canard jaune",
    description: "Hochet canard peluche jaune, bruit doux, 0-18 mois.",
    PrixVente: 10.99,
    PrixAchat: 7,
    stockQuantity: 9,
  },
  {
    productName: "Centre d'activités arc-en-ciel",
    description: "Centre d'activités avec siège rotatif, jouets suspendus, 4-12 mois.",
    PrixVente: 59.99,
    PrixAchat: 38,
    stockQuantity: 2,
  },
  {
    productName: "Jeu de construction souple",
    description: "20 pièces souples à emboîter, couleurs vives, sans phtalates.",
    PrixVente: 24.99,
    PrixAchat: 15,
    stockQuantity: 4,
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function copyMockToUploads(mockRelative: string, destBaseName: string): string | null {
  const src = join(MOCK_DIR, mockRelative);
  if (!existsSync(src)) {
    console.warn(`  ! Photo locale absente, produit créé sans photo: ${mockRelative}`);
    return null;
  }
  const ext = extname(mockRelative) || ".jpg";
  const destName = `${destBaseName}${ext}`;
  const destPath = join(UPLOADS_DIR, destName);
  copyFileSync(src, destPath);
  return `/uploads/${destName}`;
}

function attachMockFiles(
  products: Omit<ProductSeed, "mockFile">[],
  photos: string[],
): ProductSeed[] {
  return products.map((p, i) => ({
    ...p,
    mockFile: photos[i % photos.length],
  }));
}

async function seedCategory(
  categoryName: string,
  products: ProductSeed[],
) {
  const category = await prisma.category.upsert({
    where: { categoryName },
    update: {},
    create: CATEGORIES.find((c) => c.categoryName === categoryName)!,
  });

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const slug = slugify(`${categoryName}-${p.productName}-${i + 1}`);
    const photoDoc = copyMockToUploads(p.mockFile, `catalog-${slug}`);

    const existing = await prisma.product.findFirst({
      where: { categoryId: category.id, productName: p.productName },
      select: { id: true },
    });
    if (existing) {
      console.log(`  = ${p.productName} (déjà présent)`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        productName: p.productName,
        description: p.description,
        PrixVente: p.PrixVente,
        PrixAchat: p.PrixAchat,
        isDepot: false,
        isDispo: true,
        surcharge: 0,
        gain: Number((p.PrixVente - p.PrixAchat).toFixed(2)),
        categoryId: category.id,
        ...(photoDoc ? { photos: { create: [{ photoDoc }] } } : {}),
      },
    });
    console.log(`  + ${product.productName}`);
  }
}

async function main() {
  console.log("📦 Seed catalogue BÉBÉ-DÉPÔT (4 catégories × 20 produits)\n");

  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const targetCategories = CATEGORIES.map((c) => c.categoryName);
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { categoryName: c.categoryName },
      update: { description: c.description },
      create: c,
    });
  }

  console.log("\n🛒 Poussettes (20 produits)");
  await seedCategory(
    "Poussettes",
    attachMockFiles(POUSSettes_PRODUCTS, POUSSettes_PHOTOS),
  );

  console.log("\n👕 Vêtements (20 produits)");
  await seedCategory(
    "Vêtements",
    attachMockFiles(VETEMENTS_PRODUCTS, VETEMENTS_PHOTOS),
  );

  console.log("\n🤱 Équipement maman (20 produits)");
  await seedCategory(
    "Équipement maman",
    attachMockFiles(MAMAN_PRODUCTS, MAMAN_PHOTOS),
  );

  console.log("\n🧸 Jouets (20 produits)");
  await seedCategory("Jouets", attachMockFiles(JOUETS_PRODUCTS, JOUETS_PHOTOS));

  const counts = await prisma.category.findMany({
    where: { categoryName: { in: [...targetCategories] } },
    include: { _count: { select: { products: true } } },
  });

  console.log("\n✅ Terminé — récapitulatif :");
  for (const c of counts) {
    console.log(`   ${c.categoryName}: ${c._count.products} produits`);
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
