import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function createUser() {
  const email = process.argv[2] || "admin@bebe-depot.com";
  const password = process.argv[3] || "Admin@2024";
  const username = process.argv[4] || "admin";

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
