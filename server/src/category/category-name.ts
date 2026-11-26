/** "Poussettes ", "poussettes", "POUSSÉTTES" → same key. */
export function categoryKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
