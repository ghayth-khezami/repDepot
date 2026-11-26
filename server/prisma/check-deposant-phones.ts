/**
 * Pre-flight for migration 20261126120000_unified_depot_flow.
 * Lists déposants whose phone numbers collide once normalized to 8 digits.
 * Prints ids + names only (never the phone itself) so the output is safe to share.
 *
 *   pnpm ts-node prisma/check-deposant-phones.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length > 8 && (digits.startsWith("216") || digits.startsWith("00216"))) {
    return digits.slice(-8);
  }
  return digits;
}

async function main() {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; firstName: string; lastName: string; phoneNumber: string }>
  >`SELECT id, "firstName", "lastName", "phoneNumber" FROM "co_clients"`;

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = normalize(row.phoneNumber ?? "");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const dupes = [...groups.values()].filter((g) => g.length > 1);
  const invalid = rows.filter((r) => normalize(r.phoneNumber ?? "").length !== 8);

  if (!dupes.length) console.log("✔ Aucun téléphone en double.");
  dupes.forEach((group, i) => {
    console.log(`✖ Doublon #${i + 1}:`);
    group.forEach((r) => console.log(`   - ${r.id}  ${r.firstName} ${r.lastName}`));
  });
  if (invalid.length) {
    console.log(`⚠ ${invalid.length} déposant(s) sans numéro à 8 chiffres (à corriger après migration):`);
    invalid.forEach((r) => console.log(`   - ${r.id}  ${r.firstName} ${r.lastName}`));
  }
  process.exitCode = dupes.length ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
