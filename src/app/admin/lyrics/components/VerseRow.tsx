"use client";

import { usePlayer } from "@/app/songs/[slug]/components/PlayerContext";
import type { Verse, Token } from "@/lib/types/lesson";
import type { OverlapWarning } from "@/lib/admin/timing-overlap";
import { useState } from "react";
import { useAdminLyricsStore } from "@/lib/admin/lyrics-store";
import { aiFillVerse } from "../actions/ai-fill";
import type { VerseFillResponse } from "@/lib/admin/verse-fill-zod";
import type { SongMeta } from "./VerseEditor";

/**
 * Per-vocab lookup shape — populated from vocabulary_items rows loaded by page.tsx.
 * Note: The current Token type in lesson.ts does not carry vocab_item_id. This
 * interface is forward-compatible for when Plan 05/06 adds that field to the token
 * shape. The kanji_breakdown editor below is gated on vocab_item_id being present.
 */
interface VocabRowMap {
  [vocabId: string]: {
    id: string;
    dictionary_form: string;
    reading: string;
    kanji_breakdown: unknown;
  };
}

/**
 * Extended token with optional vocab_item_id — used for forward-compat with
 * the plan spec. The real Token type in lesson.ts does not have this field yet.
 */
type TokenWithVocab = Token & { vocab_item_id?: string | null };

interface Props {
  verse: Verse;
  vocabMap: VocabRowMap;
  warning: OverlapWarning | null;
  songMeta: SongMeta;
  onChange: (patch: Partial<Verse>) => void;
  onDelete: () => void;
}

const palette = {
  border: "#e5e7eb",
  bg: "#fff",
  warningBg: "#fef3c7",
  warningFg: "#92400e",
  warningBorder: "#fcd34d",
  link: "#6366f1",
  subdued: "#6b7280",
  body: "#374151",
  error: "#dc2626",
};

function localizableToString(
  val: string | Record<string, string> | undefined,
  locale: string
): string {
  if (!val) return "";
  if (typeof val === "string") return locale === "en" ? val : "";
  return val[locale] ?? "";
}

export default function VerseRow({
  verse,
  vocabMap,
  warning,
  songMeta,
  onChange,
  onDelete,
}: Props) {
  const player = usePlayer();
  const [expandedTokenIdx, setExpandedTokenIdx] = useState<number | null>(null);
  const [kanjiSavingId, setKanjiSavingId] = useState<string | null>(null);
  const [kanjiSaveError, setKanjiSaveError] = useState<string | null>(null);

  // AI fill state (D-08: inline blocking spinner per verse)
  const songVersionId = useAdminLyricsStore((s) => s.songVersionId);
  const baseVersionId = useAdminLyricsStore((s) => s.baseVersionId);
  const allDraftVerses = useAdminLyricsStore((s) => s.verses);
  const dirtyVerseNumbers = useAdminLyricsStore((s) => s.dirtyVerseNumbers);
  const isDirty = dirtyVerseNumbers.includes(verse.verse_number);

  const [aiFillState, setAiFillState] = useState<"idle" | "loading" | "result" | "error">("idle");
  const [aiSuggestion, setAiSuggestion] = useState<VerseFillResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Per SPEC #7: per-language translation editing — collect available locales
  const translationLocales = Object.keys(verse.translations ?? { en: "" });
  if (translationLocales.length === 0) translationLocales.push("en");

  function handleTokenChange(idx: number, patch: Partial<Token>) {
    const next = [...verse.tokens];
    next[idx] = { ...next[idx], ...patch };
    onChange({ tokens: next });
  }

  function handleTranslationChange(locale: string, value: string) {
    onChange({ translations: { ...verse.translations, [locale]: value } });
  }

  function handleMeaningChange(
    field: "literal_meaning" | "cultural_context",
    locale: string,
    value: string
  ) {
    const current = verse[field];
    let next: string | Record<string, string>;
    if (typeof current === "object" && current !== null) {
      next = { ...current, [locale]: value };
    } else {
      next = {
        [locale]: value,
        ...(typeof current === "string" && current ? { en: current } : {}),
      };
    }
    onChange({ [field]: next } as Partial<Verse>);
  }

  async function handleKanjiBreakdownSave(
    vocabId: string,
    breakdown: unknown,
    affectedSongCount: number
  ) {
    // SPEC #9 + ISSUE-02: writes vocabulary_items.kanji_breakdown via the
    // saveKanjiBreakdown server action (created in Plan 05 Task 4). Cross-song
    // propagation is intentional and surfaced to admin via the "affects N other songs" hint.
    if (affectedSongCount > 0) {
      const ok = window.confirm(
        `This kanji_breakdown edit will be reflected in ${affectedSongCount} other song(s) ` +
          `that share this vocabulary item. Save anyway?`
      );
      if (!ok) return;
    }
    setKanjiSavingId(vocabId);
    setKanjiSaveError(null);
    try {
      const { saveKanjiBreakdown } = await import(
        "../actions/save-kanji-breakdown"
      );
      await saveKanjiBreakdown({ vocabId, breakdown });
    } catch (err) {
      setKanjiSaveError(err instanceof Error ? err.message : "save failed");
    } finally {
      setKanjiSavingId(null);
    }
  }

  async function handleAiFill() {
    if (!songVersionId || !baseVersionId) return;
    setAiFillState("loading");
    setAiError(null);
    try {
      const fieldsToFill: import("@/lib/admin/verse-fill-prompt").FillableField[] = [];
      fieldsToFill.push("translations", "literal_meaning", "cultural_context");
      if (verse.tokens.some((t) => !t.romaji)) fieldsToFill.push("tokens");

      const result = await aiFillVerse({
        songVersionId,
        songTitle: songMeta.title,
        songArtist: songMeta.artist,
        songAnime: songMeta.anime,
        baseVersionId,
        verseNumber: verse.verse_number,
        draftVerses: allDraftVerses,
        fieldsToFill,
      });
      if (result.ok) {
        setAiSuggestion(result.verse);
        setAiFillState("result");
      } else {
        setAiError(result.error);
        setAiFillState("error");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "unknown");
      setAiFillState("error");
    }
  }

  function acceptSuggestion() {
    if (!aiSuggestion) return;
    const patch: Partial<Verse> = {};
    if (aiSuggestion.translations) patch.translations = { ...verse.translations, ...aiSuggestion.translations };
    if (aiSuggestion.literal_meaning !== undefined) patch.literal_meaning = aiSuggestion.literal_meaning;
    if (aiSuggestion.cultural_context !== undefined) patch.cultural_context = aiSuggestion.cultural_context;
    if (aiSuggestion.tokens) patch.tokens = aiSuggestion.tokens as unknown as Verse["tokens"];
    onChange(patch);
    setAiFillState("idle");
    setAiSuggestion(null);
  }

  function rejectSuggestion() {
    setAiFillState("idle");
    setAiSuggestion(null);
  }

  return (
    <div
      data-testid={`verse-row-${verse.verse_number}`}
      style={{
        border: `1px solid ${warning ? palette.warningBorder : palette.border}`,
        background: warning ? palette.warningBg : palette.bg,
        borderRadius: "6px",
        padding: "12px",
        marginBottom: "0px",
      }}
    >
      {/* Header row: seek button, verse number, timing fields, delete button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <button
          type="button"
          onClick={() => player.seekTo(verse.start_time_ms)}
          data-testid={`seek-${verse.verse_number}`}
          aria-label={`Seek to verse ${verse.verse_number}`}
          style={{
            padding: "2px 8px",
            border: "1px solid " + palette.border,
            borderRadius: "4px",
            background: "#fff",
            cursor: "pointer",
            color: palette.link,
          }}
        >
          &#9654;
        </button>
        <span
          style={{ fontSize: "12px", color: palette.subdued, fontWeight: 600 }}
        >
          verse {verse.verse_number}
        </span>

        {/* SPEC #12: timing fields — ms inputs, overlap warning is non-blocking */}
        <input
          type="number"
          defaultValue={verse.start_time_ms}
          onBlur={(e) => onChange({ start_time_ms: Number(e.target.value) })}
          aria-label={`start_time_ms for verse ${verse.verse_number}`}
          data-testid={`start-${verse.verse_number}`}
          style={{
            width: "90px",
            padding: "2px 6px",
            border: "1px solid " + palette.border,
            borderRadius: "4px",
            fontSize: "12px",
          }}
        />
        <span style={{ color: palette.subdued, fontSize: "11px" }}>
          &rarr;
        </span>
        <input
          type="number"
          defaultValue={verse.end_time_ms}
          onBlur={(e) => onChange({ end_time_ms: Number(e.target.value) })}
          aria-label={`end_time_ms for verse ${verse.verse_number}`}
          data-testid={`end-${verse.verse_number}`}
          style={{
            width: "90px",
            padding: "2px 6px",
            border: "1px solid " + palette.border,
            borderRadius: "4px",
            fontSize: "12px",
          }}
        />
        <span style={{ color: palette.subdued, fontSize: "11px" }}>ms</span>

        <div style={{ flex: 1 }} />
        {/* SPEC #10 + D-08: AI fill button — enabled only when verse is dirty */}
        <button
          type="button"
          disabled={!isDirty || aiFillState === "loading" || !songVersionId || !baseVersionId}
          onClick={() => void handleAiFill()}
          data-testid={`ai-fill-${verse.verse_number}`}
          aria-label={`AI fill remaining fields for verse ${verse.verse_number}`}
          style={{
            padding: "4px 10px",
            fontSize: "12px",
            border: "1px solid #6366f1",
            borderRadius: "4px",
            background: aiFillState === "loading" ? "#f3f4f6" : "#fff",
            color: "#6366f1",
            cursor: !isDirty || aiFillState === "loading" ? "not-allowed" : "pointer",
            opacity: !isDirty || aiFillState === "loading" ? 0.5 : 1,
          }}
        >
          {aiFillState === "loading" ? "AI filling..." : "AI fill"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          data-testid={`delete-${verse.verse_number}`}
          aria-label={`Delete verse ${verse.verse_number}`}
          style={{
            padding: "2px 8px",
            border: "1px solid " + palette.border,
            borderRadius: "4px",
            background: "#fff",
            cursor: "pointer",
            color: palette.error,
            fontSize: "12px",
          }}
        >
          Delete
        </button>
      </div>

      {/* Overlap/timing warning — non-blocking per SPEC #12 */}
      {warning && (
        <p
          style={{
            margin: "0 0 8px 0",
            fontSize: "11px",
            color: palette.warningFg,
          }}
        >
          Warning ({warning.kind}): {warning.detail} — does not block publish
        </p>
      )}

      {/* Tokens row — per SPEC #5/#6: editable reading + romaji per token */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {(verse.tokens ?? []).map((token, idx) => {
          const extToken = token as TokenWithVocab;
          const vocab = extToken.vocab_item_id
            ? vocabMap[extToken.vocab_item_id]
            : null;
          const hasKanji = /[一-鿿]/.test(token.surface);
          return (
            <div
              key={`tok-${idx}`}
              data-testid={`token-${verse.verse_number}-${idx}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "4px",
                border: "1px dashed " + palette.border,
                borderRadius: "4px",
              }}
            >
              {/* SPEC #5: editable reading (furigana) */}
              <input
                defaultValue={token.reading}
                onBlur={(e) => handleTokenChange(idx, { reading: e.target.value })}
                aria-label={`reading for token ${idx} of verse ${verse.verse_number}`}
                data-testid={`reading-${verse.verse_number}-${idx}`}
                style={{
                  width: "60px",
                  fontSize: "10px",
                  border: "none",
                  textAlign: "center",
                  color: palette.subdued,
                }}
              />
              <span style={{ fontSize: "16px", color: palette.body }}>
                {token.surface}
              </span>
              {/* SPEC #6: editable romaji */}
              <input
                defaultValue={token.romaji}
                onBlur={(e) => handleTokenChange(idx, { romaji: e.target.value })}
                aria-label={`romaji for token ${idx} of verse ${verse.verse_number}`}
                data-testid={`romaji-${verse.verse_number}-${idx}`}
                style={{
                  width: "60px",
                  fontSize: "10px",
                  border: "none",
                  textAlign: "center",
                  color: palette.subdued,
                }}
              />
              {/* SPEC #9: kanji breakdown toggle — requires vocab_item_id on token */}
              {hasKanji && vocab && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTokenIdx(expandedTokenIdx === idx ? null : idx)
                  }
                  data-testid={`kanji-toggle-${verse.verse_number}-${idx}`}
                  style={{
                    marginTop: "2px",
                    fontSize: "10px",
                    color: palette.link,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  漢字
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Per-language translations — SPEC #7 */}
      {translationLocales.map((locale) => (
        <div key={`tr-${locale}`} style={{ marginBottom: "6px" }}>
          <label
            style={{
              fontSize: "10px",
              color: palette.subdued,
              display: "block",
              marginBottom: "2px",
            }}
          >
            translation ({locale})
          </label>
          <input
            defaultValue={verse.translations?.[locale] ?? ""}
            onBlur={(e) => handleTranslationChange(locale, e.target.value)}
            aria-label={`translation ${locale} for verse ${verse.verse_number}`}
            data-testid={`translation-${verse.verse_number}-${locale}`}
            style={{
              width: "100%",
              padding: "4px 6px",
              border: "1px solid " + palette.border,
              borderRadius: "4px",
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
        </div>
      ))}

      {/* Verse meaning — SPEC #8 */}
      <div style={{ marginBottom: "6px" }}>
        <label
          style={{
            fontSize: "10px",
            color: palette.subdued,
            display: "block",
            marginBottom: "2px",
          }}
        >
          literal meaning (en)
        </label>
        <textarea
          defaultValue={localizableToString(verse.literal_meaning as string | Record<string, string>, "en")}
          onBlur={(e) => handleMeaningChange("literal_meaning", "en", e.target.value)}
          aria-label={`literal_meaning en for verse ${verse.verse_number}`}
          data-testid={`literal-${verse.verse_number}-en`}
          rows={2}
          style={{
            width: "100%",
            padding: "4px 6px",
            border: "1px solid " + palette.border,
            borderRadius: "4px",
            fontSize: "12px",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ marginBottom: "6px" }}>
        <label
          style={{
            fontSize: "10px",
            color: palette.subdued,
            display: "block",
            marginBottom: "2px",
          }}
        >
          cultural context (en)
        </label>
        <textarea
          defaultValue={localizableToString(verse.cultural_context as string | Record<string, string> | undefined, "en")}
          onBlur={(e) =>
            handleMeaningChange("cultural_context", "en", e.target.value)
          }
          aria-label={`cultural_context en for verse ${verse.verse_number}`}
          data-testid={`cultural-${verse.verse_number}-en`}
          rows={2}
          style={{
            width: "100%",
            padding: "4px 6px",
            border: "1px solid " + palette.border,
            borderRadius: "4px",
            fontSize: "12px",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Kanji breakdown editor (expanded token only) — SPEC #9 + ISSUE-02 writable form */}
      {/* SPEC #10 D-08: AI suggestion preview with accept/reject */}
      {aiFillState === "result" && aiSuggestion && (
        <div data-testid={`ai-suggestion-${verse.verse_number}`} style={{ marginTop: "8px", padding: "8px", border: "1px solid #6366f1", borderRadius: "4px", background: "#eef2ff" }}>
          <p style={{ fontSize: "11px", color: "#1e40af", margin: "0 0 4px 0" }}>
            AI suggestion (snapshot already saved for gap analysis):
          </p>
          <pre style={{ fontSize: "10px", margin: 0, maxHeight: "200px", overflow: "auto" }}>
            {JSON.stringify(aiSuggestion, null, 2)}
          </pre>
          <div style={{ marginTop: "6px", display: "flex", gap: "6px" }}>
            <button type="button" onClick={acceptSuggestion} data-testid={`ai-accept-${verse.verse_number}`} style={{ padding: "2px 8px", fontSize: "11px", color: "#fff", background: "#6366f1", border: "none", borderRadius: "4px", cursor: "pointer" }}>Accept</button>
            <button type="button" onClick={rejectSuggestion} data-testid={`ai-reject-${verse.verse_number}`} style={{ padding: "2px 8px", fontSize: "11px", color: "#6b7280", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "4px", cursor: "pointer" }}>Reject</button>
          </div>
        </div>
      )}

      {aiFillState === "error" && (
        <p data-testid={`ai-error-${verse.verse_number}`} style={{ marginTop: "8px", fontSize: "11px", color: "#dc2626" }}>
          AI fill failed: {aiError}
        </p>
      )}

      {expandedTokenIdx !== null &&
        (() => {
          const extToken = verse.tokens[expandedTokenIdx] as TokenWithVocab;
          const vocabId = extToken?.vocab_item_id;
          if (!vocabId) return null;
          const vocab = vocabMap[vocabId];
          if (!vocab) return null;

          // KanjiBreakdown shape: { characters: KanjiCharEntry[], compound_note? }
          // OR legacy array format. Normalize to internal shape.
          const kb = (vocab.kanji_breakdown ?? null) as
            | null
            | {
                characters?: Array<{
                  char?: string;
                  character?: string;
                  meaning?: string;
                  on_yomi?: string;
                  kun_yomi?: string;
                  radical_hint?: string;
                }>;
                compound_note?: string;
              }
            | Array<{
                char?: string;
                character?: string;
                meaning?: string;
                on_yomi?: string;
                kun_yomi?: string;
                radical_hint?: string;
              }>;

          const characters = Array.isArray(kb) ? kb : (kb?.characters ?? []);
          const compoundNote = !Array.isArray(kb)
            ? (kb?.compound_note ?? "")
            : "";

          async function saveAll(
            updatedChars: typeof characters,
            updatedNote: string
          ) {
            await handleKanjiBreakdownSave(
              vocabId!,
              Array.isArray(kb)
                ? updatedChars
                : { characters: updatedChars, compound_note: updatedNote },
              // Server action computes real affected count; pass 0 as hint
              0
            );
          }

          return (
            <div
              data-testid={`kanji-breakdown-${verse.verse_number}-${expandedTokenIdx}`}
              style={{
                marginTop: "8px",
                padding: "8px",
                border: "1px solid " + palette.border,
                background: "#f9fafb",
                borderRadius: "4px",
              }}
            >
              <p
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "10px",
                  color: palette.subdued,
                }}
              >
                kanji breakdown for {verse.tokens[expandedTokenIdx].surface}
                {" — edits propagate to "}
                <strong>all songs</strong> sharing this vocab.
                {kanjiSavingId === vocabId ? (
                  <span
                    style={{ marginLeft: "6px", color: palette.warningFg }}
                  >
                    saving...
                  </span>
                ) : null}
              </p>
              {kanjiSaveError && (
                <p
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "10px",
                    color: palette.error,
                  }}
                >
                  save failed: {kanjiSaveError}
                </p>
              )}
              {characters.length === 0 ? (
                <p
                  style={{ margin: 0, fontSize: "11px", color: palette.subdued }}
                >
                  No characters in breakdown yet.
                </p>
              ) : (
                characters.map((ch, i) => (
                  <div
                    key={`kb-${vocabId}-${i}`}
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "16px",
                        color: palette.body,
                        minWidth: "20px",
                      }}
                    >
                      {ch.char ?? ch.character}
                    </span>
                    <input
                      defaultValue={typeof ch.meaning === "string" ? ch.meaning : (ch.meaning?.["en"] ?? "")}
                      placeholder="meaning"
                      aria-label={`meaning for ${ch.char ?? ch.character}`}
                      data-testid={`kb-meaning-${vocabId}-${i}`}
                      onBlur={(e) => {
                        const next = [...characters];
                        next[i] = { ...next[i], meaning: e.target.value };
                        void saveAll(next, compoundNote);
                      }}
                      style={{
                        flex: 1,
                        padding: "2px 4px",
                        border: "1px solid " + palette.border,
                        borderRadius: "3px",
                        fontSize: "11px",
                      }}
                    />
                    <input
                      defaultValue={ch.on_yomi ?? ""}
                      placeholder="on_yomi"
                      aria-label={`on_yomi for ${ch.char ?? ch.character}`}
                      data-testid={`kb-onyomi-${vocabId}-${i}`}
                      onBlur={(e) => {
                        const next = [...characters];
                        next[i] = { ...next[i], on_yomi: e.target.value };
                        void saveAll(next, compoundNote);
                      }}
                      style={{
                        width: "80px",
                        padding: "2px 4px",
                        border: "1px solid " + palette.border,
                        borderRadius: "3px",
                        fontSize: "11px",
                      }}
                    />
                    <input
                      defaultValue={ch.kun_yomi ?? ""}
                      placeholder="kun_yomi"
                      aria-label={`kun_yomi for ${ch.char ?? ch.character}`}
                      data-testid={`kb-kunyomi-${vocabId}-${i}`}
                      onBlur={(e) => {
                        const next = [...characters];
                        next[i] = { ...next[i], kun_yomi: e.target.value };
                        void saveAll(next, compoundNote);
                      }}
                      style={{
                        width: "80px",
                        padding: "2px 4px",
                        border: "1px solid " + palette.border,
                        borderRadius: "3px",
                        fontSize: "11px",
                      }}
                    />
                    <input
                      defaultValue={typeof ch.radical_hint === "string" ? ch.radical_hint : (ch.radical_hint?.["en"] ?? "")}
                      placeholder="radical_hint"
                      aria-label={`radical_hint for ${ch.char ?? ch.character}`}
                      data-testid={`kb-radical-${vocabId}-${i}`}
                      onBlur={(e) => {
                        const next = [...characters];
                        next[i] = { ...next[i], radical_hint: e.target.value };
                        void saveAll(next, compoundNote);
                      }}
                      style={{
                        flex: 1,
                        padding: "2px 4px",
                        border: "1px solid " + palette.border,
                        borderRadius: "3px",
                        fontSize: "11px",
                      }}
                    />
                  </div>
                ))
              )}
              {!Array.isArray(kb) && (
                <div style={{ marginTop: "6px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10px",
                      color: palette.subdued,
                      marginBottom: "2px",
                    }}
                  >
                    compound_note
                  </label>
                  <textarea
                    defaultValue={compoundNote}
                    placeholder="compound_note (multi-kanji word context)"
                    aria-label={`compound_note for ${verse.tokens[expandedTokenIdx].surface}`}
                    data-testid={`kb-compound-${vocabId}`}
                    rows={2}
                    onBlur={(e) => void saveAll(characters, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "4px 6px",
                      border: "1px solid " + palette.border,
                      borderRadius: "3px",
                      fontSize: "11px",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
