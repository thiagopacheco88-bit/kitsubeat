/**
 * ab-build-shards.ts — Split data/ab-repass-rank.json into N shard files
 * for parallel ab-worker.py invocations.
 *
 * Round-robin assignment on the worst-to-best sorted list so each shard
 * sees a mix of hard+easy songs and finishes at roughly the same time
 * (vs. one shard getting all the expensive unknowns up front).
 *
 * Output:
 *   data/ab-shard-0.txt, data/ab-shard-1.txt, ...  (one slug per line)
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/seed/ab-build-shards.ts --workers 2
 */

import { readFileSync, writeFileSync } from "fs";

const RANK_PATH = "data/ab-repass-rank.json";

function main() {
  const args = process.argv.slice(2);
  const nIdx = args.indexOf("--workers");
  const N = nIdx !== -1 ? parseInt(args[nIdx + 1], 10) : 2;
  if (!Number.isFinite(N) || N < 1 || N > 8) {
    console.error(`[error] --workers must be 1..8, got ${args[nIdx + 1]}`);
    process.exit(1);
  }

  const rank = JSON.parse(readFileSync(RANK_PATH, "utf-8")) as {
    processable: Array<{ slug: string; tier: string; kcov: number | null; already_has_stem: boolean }>;
  };

  const remaining = rank.processable.filter((e) => !e.already_has_stem);
  console.log(`[shards] total processable=${rank.processable.length}  remaining (no stem yet)=${remaining.length}  workers=${N}`);

  const shards: string[][] = Array.from({ length: N }, () => []);
  remaining.forEach((e, i) => shards[i % N].push(e.slug));

  for (let i = 0; i < N; i++) {
    const path = `data/ab-shard-${i}.txt`;
    const body =
      `# shard ${i} of ${N}  — ${shards[i].length} slugs\n` +
      `# generated ${new Date().toISOString()}\n` +
      shards[i].join("\n") +
      "\n";
    writeFileSync(path, body, "utf-8");
    console.log(`  wrote ${path}  (${shards[i].length} slugs)`);
  }

  console.log();
  console.log("launch commands (from project root):");
  for (let i = 0; i < N; i++) {
    console.log(
      `  PATH=".venv/Scripts:$PATH" .venv/Scripts/python.exe scripts/seed/ab-worker.py ` +
        `--shard-file data/ab-shard-${i}.txt --worker-id ${i}  > data/ab-worker-${i}.log 2>&1 &`,
    );
  }
}

main();
