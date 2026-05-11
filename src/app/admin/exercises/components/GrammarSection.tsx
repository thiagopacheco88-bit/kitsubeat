import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  songVersionGrammarRules,
  grammarRules,
  grammarExercises,
} from "@/lib/db/schema";
import { localize } from "@/lib/types/lesson";
import GrammarRuleRow, { type GrammarRuleMeta } from "./GrammarRuleRow";
import CollapsableSection from "./CollapsableSection";

interface Props {
  songVersionId: string;
}

export default async function GrammarSection({ songVersionId }: Props) {
  // Load all grammar rules linked to this song version, ordered by display_order
  const linked = await db
    .select({
      rule_id: grammarRules.id,
      name: grammarRules.name,
      jlpt_reference: grammarRules.jlpt_reference,
      explanation: grammarRules.explanation,
      conjugation_path: songVersionGrammarRules.conjugation_path,
      display_order: songVersionGrammarRules.display_order,
    })
    .from(songVersionGrammarRules)
    .innerJoin(grammarRules, eq(grammarRules.id, songVersionGrammarRules.grammar_rule_id))
    .where(eq(songVersionGrammarRules.song_version_id, songVersionId))
    .orderBy(songVersionGrammarRules.display_order);

  if (linked.length === 0) {
    return (
      <CollapsableSection title="Grammar Rules" badge="0 rules">
        <p style={{ padding: "16px 0", textAlign: "center", fontSize: "13px", color: "var(--color-text-muted)" }}>
          No grammar rules linked to this song version.
        </p>
      </CollapsableSection>
    );
  }

  // Load exercise counts grouped by (rule_id, level) in one query
  const ruleIds = linked.map((r) => r.rule_id);
  const countRows = await db
    .select({
      grammar_rule_id: grammarExercises.grammar_rule_id,
      level: grammarExercises.level,
      count: sql<number>`count(*)::int`,
    })
    .from(grammarExercises)
    .where(sql`${grammarExercises.grammar_rule_id} = ANY(ARRAY[${sql.raw(ruleIds.map((id) => `'${id}'::uuid`).join(","))}])`)
    .groupBy(grammarExercises.grammar_rule_id, grammarExercises.level);

  // Build a map: ruleId → { beginner, intermediate, advanced }
  const countMap = new Map<string, { beginner: number; intermediate: number; advanced: number }>();
  for (const row of countRows) {
    if (!countMap.has(row.grammar_rule_id)) {
      countMap.set(row.grammar_rule_id, { beginner: 0, intermediate: 0, advanced: 0 });
    }
    const entry = countMap.get(row.grammar_rule_id)!;
    if (row.level === "beginner") entry.beginner = row.count;
    else if (row.level === "intermediate") entry.intermediate = row.count;
    else if (row.level === "advanced") entry.advanced = row.count;
  }

  const rules: GrammarRuleMeta[] = linked.map((r) => ({
    rule_id: r.rule_id,
    name: r.name,
    jlpt_reference: r.jlpt_reference,
    explanation_en: localize(r.explanation as Parameters<typeof localize>[0], "en"),
    conjugation_path: r.conjugation_path,
    counts: countMap.get(r.rule_id) ?? { beginner: 0, intermediate: 0, advanced: 0 },
  }));

  const totalExercises = rules.reduce(
    (sum, r) => sum + r.counts.beginner + r.counts.intermediate + r.counts.advanced,
    0
  );

  const badge = `${rules.length} rule${rules.length !== 1 ? "s" : ""} · ${totalExercises} exercises`;

  return (
    <CollapsableSection title="Grammar Rules" badge={badge}>
      {rules.map((rule, i) => (
        <GrammarRuleRow
          key={rule.rule_id}
          rule={rule}
          displayOrder={i + 1}
        />
      ))}
    </CollapsableSection>
  );
}
