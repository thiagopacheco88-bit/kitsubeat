"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateVocabImage } from "../actions";

interface UnsplashResult {
  id: string;
  thumb: string;
  regular: string;
  alt: string;
  credit: string;
}

interface Props {
  vocabItemId: string;
  currentUrl: string | null;
  surface: string;
  meaning: string;
  onClose: () => void;
  onSaved: (newUrl: string | null) => void;
}

export default function ImagePicker({
  vocabItemId,
  currentUrl,
  surface,
  meaning,
  onClose,
  onSaved,
}: Props) {
  const [query, setQuery] = useState(meaning);
  const [results, setResults] = useState<UnsplashResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(currentUrl ?? "");
  const [selected, setSelected] = useState<string | null>(currentUrl);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (meaning) doSearch(meaning);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/admin/exercises/unsplash?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json() as { results: UnsplashResult[] };
      setResults(data.results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function selectPhoto(url: string) {
    setSelected(url);
    setUrlInput(url);
  }

  function handleSave() {
    const finalUrl = urlInput.trim() || null;
    setSaveError(null);
    if (finalUrl && !finalUrl.startsWith("https://")) {
      setSaveError("URL must start with https://");
      return;
    }
    startTransition(async () => {
      try {
        await updateVocabImage(vocabItemId, finalUrl);
        onSaved(finalUrl);
        onClose();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function handleClear() {
    setSelected(null);
    setUrlInput("");
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: "16px",
  };

  const modalStyle: React.CSSProperties = {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-2xl)",
    padding: "24px",
    width: "100%",
    maxWidth: "720px",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-dim)" }}>
              Change Image
            </p>
            <h2 style={{ marginTop: "2px", fontSize: "18px", fontWeight: 700, color: "var(--color-text)" }}>
              {surface} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>— {meaning}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "4px 8px", fontSize: "18px", color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Current image preview */}
        {currentUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src={currentUrl}
              alt={meaning}
              style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}
            />
            <div>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Current image</p>
              <button type="button" onClick={handleClear} style={{ fontSize: "12px", color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "2px" }}>
                Clear image
              </button>
            </div>
          </div>
        )}

        {/* Unsplash search */}
        <div>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "8px" }}>
            Search Unsplash
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
              placeholder="Search..."
              style={{
                flex: 1,
                padding: "8px 10px",
                fontSize: "13px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-card-2)",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => doSearch(query)}
              disabled={searching}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-card-2)",
                color: "var(--color-text)",
                cursor: searching ? "not-allowed" : "pointer",
                opacity: searching ? 0.6 : 1,
              }}
            >
              {searching ? "..." : "Search"}
            </button>
          </div>
          {searchError && (
            <p style={{ marginTop: "6px", fontSize: "12px", color: "#ef4444" }}>{searchError}</p>
          )}
        </div>

        {/* Results grid */}
        {results.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectPhoto(r.regular)}
                title={r.alt || r.credit}
                style={{
                  padding: 0,
                  border: `2px solid ${selected === r.regular ? "var(--color-accent)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  cursor: "pointer",
                  aspectRatio: "1",
                  background: "none",
                  position: "relative",
                }}
              >
                <img
                  src={r.thumb}
                  alt={r.alt}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {selected === r.regular && (
                  <div style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    color: "#fff",
                  }}>
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {results.length === 0 && !searching && !searchError && (
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center" }}>
            Search to browse Unsplash photos
          </p>
        )}

        {/* Manual URL input */}
        <div>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "6px" }}>
            Or paste a URL directly
          </p>
          <input
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setSelected(null); }}
            placeholder="https://images.unsplash.com/..."
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: "12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-card-2)",
              color: "var(--color-text)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Preview of URL input */}
        {urlInput && !selected && (
          <img
            src={urlInput}
            alt="preview"
            onError={(e) => (e.currentTarget.style.display = "none")}
            style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}
          />
        )}

        {saveError && (
          <p style={{ fontSize: "12px", color: "#ef4444" }}>{saveError}</p>
        )}

        {/* Footer actions */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            style={{
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "Saving…" : "Save Image"}
          </button>
        </div>
      </div>
    </div>
  );
}
