/**
 * Foundations - Phase 14.2 SPEC §Req 5 + AC #11.
 *
 * Server-component wrapper composing 2 home-variant KanaCheckpointNode islands
 * (hiragana + katakana). No auth gate — kana progress is local-state (zustand)
 * per 14.1 D-03; both auth and unauth visitors see this section.
 *
 * Reuses the 14.1 KanaCheckpointNode mastery-threshold logic via the size='home'
 * variant (CONTEXT D-08) — single source of truth between /path and / for
 * what counts as "mastered."
 */
import { SectionHeader } from "./SectionHeader";
import { KanaCheckpointNode } from "@/app/path/components/KanaCheckpointNode";

interface FoundationsProps {
  title?: string;
  viewAllLabel?: string;
}

export function Foundations({ title = "Foundations", viewAllLabel = "Open Kana" }: FoundationsProps) {
  return (
    <section data-testid="foundations" className="pb-8">
      <SectionHeader titleJp="基礎" title={title} viewAll="/kana" viewAllLabel={viewAllLabel} />
      <div className="flex gap-3 px-4">
        <KanaCheckpointNode script="hiragana" size="home" />
        <KanaCheckpointNode script="katakana" size="home" />
      </div>
    </section>
  );
}
