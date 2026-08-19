import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.argv[2] || "eya@bebedepot.tn";
  const password = process.argv[3] || "Timo12345@";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
    },
    update: {
      password: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
    },
  });

  console.log("Admin user ready:");
  console.log(JSON.stringify(user, null, 2));
  console.log("Password:", password);
}

seedAdmin()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
