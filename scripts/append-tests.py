"""Append remaining song lesson Playwright tests to the spec file."""

TESTS = [
    {
        "slug": "unravel-tokyo-ghoul-japanese-lesson",
        "const": "UNRAVEL",
        "heading": "Unravel",
        "faq": [
            "What does unravel mean in the context of Tokyo Ghoul?",
            "Is Unravel hard to understand in Japanese?",
            "Who is TK and who sings Unravel?",
        ],
        "content": ["TK", "Tokyo Ghoul", "kowarekake", "shiroi", "Kaneki", "Ling Tosite Sigure"],
        "content_label": "TK, Tokyo Ghoul, kowarekake, shiroi, Kaneki",
    },
    {
        "slug": "blue-bird-naruto-japanese-lesson",
        "const": "BLUEBIRD",
        "heading": "Blue Bird",
        "faq": [
            "What does Blue Bird mean in Japanese?",
            "Is Blue Bird from Naruto hard to understand in Japanese?",
            "Who sings Blue Bird from Naruto Shippuden?",
        ],
        "content": ["Ikimono", "Naruto", "todoku", "Sasuke", "aoi"],
        "content_label": "Ikimono-gakari, Naruto, todoku, Sasuke, aoi tori",
    },
    {
        "slug": "we-are-one-piece-japanese-lesson",
        "const": "WEARE",
        "heading": "We Are",
        "faq": [
            "What does We Are mean in Japanese?",
            "Is We Are from One Piece hard to understand in Japanese?",
            "Who sings We Are from One Piece?",
        ],
        "content": ["Hiroshi Kitadani", "One Piece", "nakama", "jiyuu", "Luffy"],
        "content_label": "Hiroshi Kitadani, One Piece, nakama, jiyuu, Luffy",
    },
    {
        "slug": "silhouette-naruto-japanese-lesson",
        "const": "SILHOUETTE",
        "heading": "Silhouette",
        "faq": [
            "What does silhouette mean in Japanese?",
            "Is Silhouette from Naruto Shippuden hard to understand in Japanese?",
            "Who sings Silhouette from Naruto Shippuden?",
        ],
        "content": ["KANA-BOON", "Naruto", "kage", "oikakeru", "Sasuke"],
        "content_label": "KANA-BOON, Naruto, kage, oikakeru, Sasuke",
    },
    {
        "slug": "again-fullmetal-alchemist-japanese-lesson",
        "const": "AGAIN",
        "heading": "Again",
        "faq": [
            "What does Again mean in the context of Fullmetal Alchemist Brotherhood?",
            "Is Again by YUI hard to understand in Japanese?",
            "Who sings Again from Fullmetal Alchemist Brotherhood?",
        ],
        "content": ["YUI", "Fullmetal Alchemist", "Brotherhood", "mata", "kioku", "Edward"],
        "content_label": "YUI, FMA Brotherhood, mata, kioku, Edward, Al",
    },
    {
        "slug": "cha-la-head-cha-la-dragon-ball-japanese-lesson",
        "const": "CHALA",
        "heading": "Cha-La",
        "faq": [
            "What does Cha-La Head-Cha-La mean in Japanese?",
            "Is Cha-La Head-Cha-La from Dragon Ball Z hard to understand in Japanese?",
            "Who sings Cha-La Head-Cha-La?",
        ],
        "content": ["Kageyama", "Dragon Ball", "kirakira", "genki", "onomatopoeia", "Goku"],
        "content_label": "Kageyama, Dragon Ball Z, kirakira, genki, onomatopoeia",
    },
    {
        "slug": "crossing-field-sword-art-online-japanese-lesson",
        "const": "CROSSING",
        "heading": "Crossing Field",
        "faq": [
            "What does Crossing Field mean in Japanese?",
            "Is Crossing Field from SAO hard to understand in Japanese?",
            "Who sings Crossing Field from Sword Art Online?",
        ],
        "content": ["LiSA", "Sword Art Online", "deai", "shunkan", "Kirito", "Asuna"],
        "content_label": "LiSA, SAO, deai, shunkan, Kirito, Asuna",
    },
    {
        "slug": "homura-demon-slayer-japanese-lesson",
        "const": "HOMURA",
        "heading": "Homura",
        "faq": [
            "What does Homura mean in Japanese?",
            "Is Homura from Demon Slayer hard to understand in Japanese?",
            "Who sings Homura and what does the title mean?",
        ],
        "content": ["LiSA", "Rengoku", "Mugen Train", "tamashii", "Demon Slayer", "Tanjiro"],
        "content_label": "LiSA, Rengoku, Mugen Train, tamashii, Demon Slayer",
    },
    {
        "slug": "zankoku-na-tenshi-no-thesis-japanese-lesson",
        "const": "ZANKOKU",
        "heading": "Zankoku",
        "faq": [
            "What does Zankoku na Tenshi no Thesis mean in Japanese?",
            "Is Cruel Angel's Thesis hard to understand in Japanese?",
            "Who sings Cruel Angel's Thesis?",
        ],
        "content": ["Yoko Takahashi", "Evangelion", "seishun", "tenshi", "Shinji", "zankoku"],
        "content_label": "Yoko Takahashi, Evangelion, seishun, tenshi, Shinji, Rei",
    },
]


def make_block(t):
    slug = t["slug"]
    c = t["const"]
    heading = t["heading"]
    faq_lines = "\n".join(f'    expect(articleText).toContain("{q}");' for q in t["faq"])
    content_lines = "\n".join(f'    expect(articleText).toContain("{term}");' for term in t["content"])
    label = t["content_label"]

    return f"""
// ---------------------------------------------------------------------------
// {heading} article
// ---------------------------------------------------------------------------

const {c}_SLUG = "{slug}";
const {c}_URL = `/journal/${{{c}_SLUG}}`;

test.describe("Journal article - {slug}", () => {{
  test.describe.configure({{ timeout: 90_000 }});

  test.beforeAll(async ({{ browser }}) => {{
    const page = await browser.newPage();
    await page.goto({c}_URL, {{ waitUntil: "domcontentloaded", timeout: 80_000 }});
    await page.close();
  }});

  test("loads without 500 error, shows heading, and hero image is visible", async ({{ page }}) => {{
    const response = await page.goto({c}_URL);
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", {{ level: 1 }})).toContainText("{heading}", {{ timeout: 10_000 }});
    const hero = page.locator(".relative img").first();
    await expect(hero).toBeVisible();
    const heroLoaded = await hero.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
    expect(heroLoaded, "Hero cover image failed to load").toBe(true);
  }});

  test("vocab table renders as HTML table, not raw markdown pipes", async ({{ page }}) => {{
    await page.goto({c}_URL);
    const table = page.locator("article table").first();
    await expect(table).toBeVisible({{ timeout: 10_000 }});
    const firstCell = table.locator("td").first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toContainText("|");
    const bodyText = await page.locator("article").innerText();
    expect(bodyText).not.toMatch(/\\|[-]+\\|/);
  }});

  test("article body images are visible and load successfully", async ({{ page }}) => {{
    await page.goto({c}_URL);
    await page.locator("article").waitFor({{ timeout: 10_000 }});
    const images = page.locator("article img");
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i++) {{
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
      await expect(img).toBeVisible();
      const loaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
      expect(loaded, `Image ${{i}} failed to load`).toBe(true);
    }}
  }});

  test("FAQ section renders with expected questions", async ({{ page }}) => {{
    await page.goto({c}_URL);
    const articleText = await page.locator("article").innerText({{ timeout: 10_000 }});
{faq_lines}
  }});

  test("content sections render - {label}", async ({{ page }}) => {{
    await page.goto({c}_URL);
    await page.locator("article").waitFor({{ timeout: 10_000 }});
    const articleText = await page.locator("article").innerText();
{content_lines}
  }});

  test("JSON-LD structured data is present in page head", async ({{ page }}) => {{
    await page.goto({c}_URL);
    const allLdBlocks = page.locator('script[type="application/ld+json"]');
    const blockCount = await allLdBlocks.count();
    expect(blockCount).toBeGreaterThanOrEqual(2);
    let faqData: Record<string, unknown> | null = null;
    for (let i = 0; i < blockCount; i++) {{
      const text = await allLdBlocks.nth(i).innerText();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (parsed["@type"] === "FAQPage") faqData = parsed;
    }}
    expect(faqData).not.toBeNull();
    expect((faqData as {{ mainEntity: unknown[] }}).mainEntity.length).toBeGreaterThanOrEqual(5);
  }});
}});
"""


with open("tests/e2e/journal-article.spec.ts", "a", encoding="utf-8") as f:
    for t in TESTS:
        f.write(make_block(t))

print(f"Appended {len(TESTS)} test blocks.")
