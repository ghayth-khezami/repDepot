/**
 * Admin product search also matches the déposant: first/last name (every word), phone digits, or N°.
 * Never used for the public storefront (déposant identities stay private).
 */
export function deposantSearchClauses(raw: string): any[] {
  const search = raw.trim();
  if (!search) return [];
  const clauses: any[] = [];
  const words = search.split(/\s+/).filter((w) => w.length > 1 && !/^\d+$/.test(w));
  if (words.length) {
    clauses.push({
      coClient: {
        AND: words.map((w) => ({
          OR: [
            { firstName: { contains: w, mode: "insensitive" as const } },
            { lastName: { contains: w, mode: "insensitive" as const } },
          ],
        })),
      },
    });
  }
  const digits = search.replace(/\D/g, "");
  if (digits.length >= 3) clauses.push({ coClient: { phoneNumber: { contains: digits } } });
  if (/^(n°|no|n)?\s*\d{1,6}$/i.test(search)) clauses.push({ coClient: { number: Number(digits) } });
  return clauses;
}
