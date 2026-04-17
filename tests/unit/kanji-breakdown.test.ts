import { describe, it, expect } from "vitest";
import { KanjiBreakdownSchema, VocabEnrichmentSchema } from "../../scripts/types/enrich";
import { localize, type Localizable } from "../../src/lib/types/lesson";

describe("KanjiBreakdownSchema", () => {
  const validChar = {
    char: "鉄",
    meaning: { en: "iron", "pt-BR": "ferro", es: "hierro" },
    on_yomi: "テツ",
    kun_yomi: "",
    jlpt_level: "N3",
    radical_hint: { en: "metal + arrow", "pt-BR": "metal + flecha", es: "metal + flecha" },
  };

  it("accepts a minimal valid breakdown (single kanji)", () => {
    const parsed = KanjiBreakdownSchema.safeParse({ characters: [validChar] });
    expect(parsed.success).toBe(true);
  });

  it("accepts a multi-kanji breakdown with compound_note", () => {
    const parsed = KanjiBreakdownSchema.safeParse({
      characters: [validChar, { ...validChar, char: "道", meaning: { en: "way", "pt-BR": "caminho", es: "camino" } }],
      compound_note: { en: "iron + way = railway", "pt-BR": "ferro + caminho = ferrovia", es: "hierro + camino = ferrocarril" },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a char longer than one code point", () => {
    const parsed = KanjiBreakdownSchema.safeParse({
      characters: [{ ...validChar, char: "鉄道" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects missing language in meaning", () => {
    const parsed = KanjiBreakdownSchema.safeParse({
      characters: [{ ...validChar, meaning: { en: "iron" } }],
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts empty kun_yomi but not non-string", () => {
    expect(KanjiBreakdownSchema.safeParse({ characters: [{ ...validChar, kun_yomi: "" }] }).success).toBe(true);
    expect(KanjiBreakdownSchema.safeParse({ characters: [{ ...validChar, kun_yomi: null }] }).success).toBe(false);
  });
});

describe("VocabEnrichmentSchema", () => {
  it("accepts kanji_breakdown: null for kana-only words", () => {
    const parsed = VocabEnrichmentSchema.safeParse({
      mnemonic: { en: "a", "pt-BR": "b", es: "c" },
      kanji_breakdown: null,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("localize() on mnemonic", () => {
  const mnemonic: Localizable = {
    en: "Picture a KING on a GOLDEN throne",
    "pt-BR": "Imagine um REI em um trono DOURADO",
    es: "Imagina un REY en un trono DORADO",
  };

  it("returns the requested language", () => {
    expect(localize(mnemonic, "pt-BR")).toMatch(/REI/);
    expect(localize(mnemonic, "es")).toMatch(/REY/);
    expect(localize(mnemonic, "en")).toMatch(/KING/);
  });

  it("falls back to en for unknown lang", () => {
    expect(localize(mnemonic, "de")).toMatch(/KING/);
  });
});
