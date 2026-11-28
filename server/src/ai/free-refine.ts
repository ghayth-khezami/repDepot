/**
 * Free description correction (no API key): the public LanguageTool service + local tidy-up.
 *
 * LanguageTool's first suggestion is not always the right one, so we choose carefully:
 *  - spelling ("misspelling"): ONLY when the fix just adds missing accents (tres → très, etat → état).
 *    Unknown words are left alone, otherwise brand names get "corrected" (Chicco → chic);
 *  - grammar / agreement: the suggestion closest to what was written, keeping its first word
 *    (« les roue » → « les roues », not « la roue »);
 *  - style suggestions are ignored.
 */

const LT_URL = "https://api.languagetool.org/v2/check";

export interface LtMatch {
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  rule: { id: string; issueType?: string; category?: { id?: string } };
}

const ARABIC = /[؀-ۿ]/;

/** Shop shorthand typed on the phone → full words (whole words only, any case). */
const SHORTHAND: Array<[RegExp, string]> = [
  [/\bttbe\b/gi, "très très bon état"],
  [/\btbe\b/gi, "très bon état"],
  [/\bavc\b/gi, "avec"],
  [/\bpr\b/gi, "pour"],
  [/\bds\b/gi, "dans"],
  [/\btjrs\b/gi, "toujours"],
  [/\bjms\b/gi, "jamais"],
  [/\bqlq\b/gi, "quelques"],
  [/\bqq\b/gi, "quelques"],
  [/\bstp\b/gi, "s'il vous plaît"],
];

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function distance(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** The replacement to apply for one LanguageTool match, or null to leave the text as it is. */
export function pickReplacement(original: string, m: LtMatch): string | null {
  const options = m.replacements.slice(0, 6).map((r) => r.value).filter((v) => v !== original);
  if (!options.length) return null;
  const type = m.rule.issueType ?? "";
  if (type === "style" || type === "locale-violation" || type === "register") return null;

  if (type === "misspelling") {
    // Accents / case only: never replace an unknown word (brand, first name…) by another word.
    return options.find((o) => plain(o) === plain(original) && o !== original) ?? null;
  }

  const firstWord = original.trim().split(/\s+/)[0];
  const multiWord = /\s/.test(original.trim());
  const ranked = options
    .map((o) => ({ o, d: distance(original.toLowerCase(), o.toLowerCase()), keeps: !multiWord || o.trim().split(/\s+/)[0] === firstWord }))
    .sort((x, y) => Number(y.keeps) - Number(x.keeps) || x.d - y.d);
  const best = ranked[0];
  // A big rewrite of a short piece is more likely a wrong guess than a fix.
  if (best.d > Math.max(3, Math.ceil(original.length * 0.6))) return null;
  return best.o;
}

/** Applies the chosen fixes (from the end, so offsets stay valid; overlapping matches skipped). */
export function applyMatches(text: string, matches: LtMatch[]) {
  let out = text;
  let changes = 0;
  let limit = Infinity;
  for (const m of [...matches].sort((a, b) => b.offset - a.offset)) {
    if (m.offset + m.length > limit) continue;
    const original = text.slice(m.offset, m.offset + m.length);
    const rep = pickReplacement(original, m);
    if (rep === null) continue;
    out = out.slice(0, m.offset) + rep + out.slice(m.offset + m.length);
    limit = m.offset;
    changes += 1;
  }
  return { text: out, changes };
}

/** Before the check: spaces, shorthand. */
export function preTidy(text: string) {
  let t = text.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
  for (const [re, full] of SHORTHAND) t = t.replace(re, full);
  return t;
}

/** After the check: capital at the start of each sentence, final full stop, clean punctuation spaces. */
export function postTidy(text: string) {
  let t = text
    .replace(/\s+([,.])/g, "$1")
    .replace(/([,.])(?=[^\s\d.,!?…)»])/g, "$1 ")
    .replace(/ {2,}/g, " ")
    .trim();
  t = t.replace(/(^|[.!?…]\s+|\n)(\p{Ll})/gu, (_m, p: string, c: string) => p + c.toUpperCase());
  if (/[\p{L}\p{N})]$/u.test(t)) t += ".";
  return t;
}

/** Free correction. Throws if LanguageTool cannot be reached (the caller shows a friendly message). */
export async function freeRefine(raw: string): Promise<{ text: string; changes: number }> {
  const before = preTidy(raw);
  const language = ARABIC.test(before) ? "ar" : "fr";
  const res = await fetch(LT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ text: before, language }).toString(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`LanguageTool ${res.status}`);
  const data = (await res.json()) as { matches?: LtMatch[] };
  const fixed = applyMatches(before, data.matches ?? []);
  const text = language === "fr" ? postTidy(fixed.text) : fixed.text.trim();
  return { text, changes: fixed.changes + (text !== fixed.text ? 1 : 0) + (before !== raw.trim() ? 1 : 0) };
}
