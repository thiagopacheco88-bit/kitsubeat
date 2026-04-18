"use client";
import { useState } from "react";
import Link from "next/link";

interface Props {
  vocabItemId: string;
  initialCount: number;
}

export default function SeenInExpander({ vocabItemId, initialCount }: Props) {
  const [open, setOpen] = useState(false);
  const [songs, setSongs] = useState<
    Array<{ slug: string; title: string; anime: string }> | null
  >(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!open && !songs) {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/exercises/vocab-mastery/${vocabItemId}`
        );
        if (res.ok) {
          const data = await res.json();
          setSongs(data.seenInSongs ?? []);
        }
      } catch (err) {
        console.error("[SeenInExpander] fetch failed", err);
        setSongs([]);
      } finally {
        setLoading(false);
      }
    }
    setOpen((v) => !v);
  };

  if (initialCount === 0) return null;

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={toggle}
        className="text-gray-400 hover:text-white"
        aria-expanded={open}
      >
        {initialCount === 1 ? "Seen in 1 song" : `Seen in ${initialCount} songs`}{" "}
        {open ? "-" : "+"}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 pl-3">
          {loading && <li className="text-gray-500">Loading...</li>}
          {songs?.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/songs/${s.slug}`}
                className="text-gray-300 hover:text-white"
              >
                {s.title}
              </Link>
              <span className="ml-2 text-gray-500">{s.anime}</span>
            </li>
          ))}
          {songs && songs.length === 0 && (
            <li className="text-gray-500">No other songs yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
