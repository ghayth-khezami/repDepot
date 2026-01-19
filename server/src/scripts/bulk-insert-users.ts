import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

const users = [
  {
    email: 'admin@bebe-depot.com',
    password: 'Admin@2024',
    username: 'admin',
  },
  {
    email: 'user@bebe-depot.com',
    password: 'User@2024',
    username: 'user',
  },
];

async function bulkInsertUsers() {
  try {
    for (const user of users) {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          username: user.username,
        },
      });

      console.log(`User ${user.email} created successfully`);
    }

    console.log('Bulk insert completed!');
  } catch (error) {
    console.error('Error during bulk insert:', error);
  } finally {
    await prisma.$disconnect();
  }
}

bulkInsertUsers();
