import { PrismaClient, UserRole } from "@prisma/client";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const roleArg = (process.argv[3] || "").trim().toUpperCase();

  if (!email) {
    console.error("Usage: pnpm ts-node src/scripts/set-user-role.ts <email> <ADMIN|DEPOSER|CLIENT>");
    process.exit(1);
  }

  const role: UserRole =
    roleArg === "ADMIN"
      ? UserRole.ADMIN
      : roleArg === "DEPOSER"
        ? UserRole.DEPOSER
        : UserRole.CLIENT;

  const updated = await prisma.user.update({
    where: { email },
    data: { role },
    select: { id: true, email: true, username: true, role: true },
  });

  console.log("✅ Updated role:", updated);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

