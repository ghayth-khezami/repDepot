/**
 * Empties the database and keeps ONLY the admin account (default eya@bebedepot.tn).
 *
 *   node scripts/reset-db-keep-admin.js --yes                 # keeps shop settings + opening hours
 *   node scripts/reset-db-keep-admin.js --yes --all           # wipes settings + hours too
 *   node scripts/reset-db-keep-admin.js --yes --keep=other@x  # keep another admin email
 *
 * Deletes: déposants, contracts, products, photos, categories, clients, orders, notifications, likes,
 * newsletter, reviews, payment requests… Counters restart (déposant N° 1, refs D-1-01, DV-xxxx-0001).
 * Kept: the admin account and her phone notification subscription (+ shop settings / hours unless --all).
 * The quick unlock code (1801) lives in the backoffice app, it is not stored in the database.
 * Photos already uploaded to Cloudinary / server/uploads are NOT deleted by this script.
 */
const { PrismaClient } = require("@prisma/client");

const args = process.argv.slice(2);
const keepEmail = (args.find((a) => a.startsWith("--keep=")) || "--keep=eya@bebedepot.tn").slice(7).toLowerCase();
const wipeConfig = args.includes("--all");

async function main() {
  if (!args.includes("--yes")) {
    console.error("⚠️  This deletes ALL data except the user " + keepEmail + ".\n   Re-run with --yes to confirm.");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.findUnique({ where: { email: keepEmail } });
    if (!admin) throw new Error(`User ${keepEmail} not found — nothing deleted.`);

    // push_subscriptions: the admin's phone keeps receiving the order / payment reminders.
    const keep = new Set(["_prisma_migrations", "users", "push_subscriptions", ...(wipeConfig ? [] : ["site_settings", "store_hours"])]);
    const tables = (await prisma.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`))
      .map((r) => r.tablename)
      .filter((t) => !keep.has(t));

    await prisma.$transaction(async (tx) => {
      if (tables.length) await tx.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
      await tx.pushSubscription.deleteMany({ where: { userId: { not: admin.id } } });
      await tx.user.deleteMany({ where: { email: { not: keepEmail } } });
    });

    console.log(`✅ Database reset. Kept user: ${keepEmail}${wipeConfig ? "" : " (+ shop settings and opening hours)"}.`);
    console.log(`   Emptied ${tables.length} tables: ${tables.join(", ")}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
