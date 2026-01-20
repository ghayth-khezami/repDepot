import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../.env") });

// Allow DATABASE_URL to be passed as environment variable or command line argument
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ Error: DATABASE_URL environment variable is required!");
  console.error("   Please add DATABASE_URL to your .env file:");
  console.error("   DATABASE_URL=postgresql://user:password@host:port/database");
  console.error("   Or set it as an environment variable:");
  console.error("   $env:DATABASE_URL='your-connection-string'");
  process.exit(1);
}

const prisma = new PrismaClient();

async function createUser() {
  const email = process.argv[2] || "admin@bebe-depot.com";
  const password = process.argv[3] || "Admin@2024";
  const username = process.argv[4] || undefined;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`❌ User ${email} already exists!`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    });

    console.log("✅ User created successfully!");
    console.log("📧 Email:", user.email);
    console.log("👤 Username:", user.username);
    console.log("🔑 Password:", password);
    console.log("🆔 ID:", user.id);
  } catch (error) {
    console.error("❌ Error creating user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
