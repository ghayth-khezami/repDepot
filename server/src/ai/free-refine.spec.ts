import { applyMatches, pickReplacement, postTidy, preTidy, type LtMatch } from "./free-refine";

const m = (offset: number, length: number, values: string[], issueType = "uncategorized"): LtMatch => ({
  offset,
  length,
  replacements: values.map((value) => ({ value })),
  rule: { id: "X", issueType },
});

describe("free description correction", () => {
  it("spelling: only adds missing accents, never replaces an unknown word (brands)", () => {
    expect(pickReplacement("tres", m(0, 4, ["très", "près"], "misspelling"))).toBe("très");
    expect(pickReplacement("chico", m(0, 5, ["chic", "chics"], "misspelling"))).toBeNull();
  });

  it("grammar: keeps the first word and takes the closest fix", () => {
    expect(pickReplacement("les roue", m(0, 8, ["la roue", "les roues"]))).toBe("les roues");
    expect(pickReplacement("sont neuve", m(0, 10, ["sont neufs", "sont neuves"]))).toBe("sont neuves");
    expect(pickReplacement("x", m(0, 1, ["y"], "style"))).toBeNull();
  });

  it("applies fixes from the end without breaking offsets", () => {
    const text = "tres bon etat";
    const out = applyMatches(text, [m(0, 4, ["très"], "misspelling"), m(9, 4, ["état"], "misspelling")]);
    expect(out).toEqual({ text: "très bon état", changes: 2 });
  });

  it("expands shop shorthand and tidies punctuation / capitals", () => {
    expect(preTidy("body  tbe avc  bonnet")).toBe("body très bon état avec bonnet");
    expect(postTidy("poussette , bon état.les roues neuves")).toBe("Poussette, bon état. Les roues neuves.");
  });
});
